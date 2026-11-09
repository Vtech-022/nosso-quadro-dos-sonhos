-- Testes de isolamento e regras. Cada bloco falha (raise exception) se algo vazar.
\set ON_ERROR_STOP on
\set ECHO none
set client_min_messages = warning;

insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000a1','ana@test.com','{"display_name":"Ana"}'),
 ('00000000-0000-0000-0000-0000000000a2','bia@test.com','{"display_name":"Bia"}'),
 ('00000000-0000-0000-0000-0000000000b1','carla@test.com','{"display_name":"Carla"}'),
 ('00000000-0000-0000-0000-0000000000c1','dani@test.com','{"display_name":"Dani"}'),
 ('00000000-0000-0000-0000-0000000000d1','eva@test.com','{"display_name":"Eva"}');

create or replace function t_as(uid uuid, mail text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'email', mail, 'role','authenticated')::text, false);
end $$;
grant execute on function t_as(uuid,text) to authenticated;

create temp table ctx (k text primary key, v text);
grant all on ctx to authenticated;

-- 1) Ana cria o quadro A e convida
set role authenticated;
select t_as('00000000-0000-0000-0000-0000000000a1','ana@test.com');
insert into ctx select 'coupleA', public.create_couple('Ana & Bia', 'Bia')::text;
insert into ctx select 'invA', (public.create_invitation('Bia', 'bia@test.com')->>'code');
do $$ begin
  assert (select count(*) from public.dream_categories) = 10, 'categorias padrão não criadas';
end $$;

-- sonho + imagem de Ana
insert into public.dreams (couple_id, title, estimated_value, saved_value, category_id)
  select v::uuid, 'Casa própria', 450000, 35000, (select id from public.dream_categories where name='Casa e imóveis')
  from ctx where k='coupleA';
insert into public.dream_images (couple_id, dream_id, kind, path, created_by)
  select d.couple_id, d.id, 'cover', d.couple_id||'/'||d.id||'/a.jpg', auth.uid() from public.dreams d;

-- 2) Carla cria quadro B (isolado)
select t_as('00000000-0000-0000-0000-0000000000b1','carla@test.com');
insert into ctx select 'coupleB', public.create_couple('Carla & Dani')::text;
insert into public.dreams (couple_id, title) select v::uuid, 'Viagem a Paris' from ctx where k='coupleB';

do $$
declare n int;
begin
  select count(*) into n from public.dreams;                       assert n = 1, 'Carla vê sonhos que não são dela: '||n;
  select count(*) into n from public.dreams where title='Casa própria'; assert n = 0, 'vazamento de sonho do casal A';
  select count(*) into n from public.dream_images;                 assert n = 0, 'vazamento de imagens';
  select count(*) into n from public.dream_updates;                assert n >= 1, 'sem atividade própria';
  select count(*) into n from public.dream_updates where couple_id = (select v::uuid from ctx where k='coupleA');
  assert n = 0, 'vazamento de atividades';
  select count(*) into n from public.profiles;                     assert n = 1, 'Carla enxerga perfis alheios: '||n;
  select count(*) into n from public.invitations;                  assert n = 0, 'vazamento de convites';
  select count(*) into n from public.couples;                      assert n = 1, 'vazamento de casais';
  select count(*) into n from public.dream_categories;             assert n = 10, 'categorias misturadas';
end $$;

-- Carla tenta escrever no quadro A
do $$
begin
  begin
    insert into public.dreams (couple_id, title) select v::uuid, 'invasão' from ctx where k='coupleA';
    raise exception 'FALHA: inseriu sonho em outro quadro';
  exception when insufficient_privilege or check_violation then null; end;
  update public.dreams set title = 'hackeado' where title = 'Casa própria';
  delete from public.dreams where title = 'Casa própria';
  begin
    update public.dreams set couple_id = (select v::uuid from ctx where k='coupleA') where title='Viagem a Paris';
    raise exception 'FALHA: moveu sonho para outro quadro';
  exception when insufficient_privilege or check_violation or foreign_key_violation then null; end;
  begin
    insert into public.dream_updates (couple_id, actor_id, kind, body)
      select v::uuid, auth.uid(), 'comment', 'oi' from ctx where k='coupleA';
    raise exception 'FALHA: comentou em outro quadro';
  exception when insufficient_privilege or check_violation then null; end;
  begin
    insert into public.dream_updates (couple_id, actor_id, kind)
      select v::uuid, auth.uid(), 'achieved' from ctx where k='coupleB';
    raise exception 'FALHA: forjou atividade';
  exception when insufficient_privilege or check_violation then null; end;
  begin
    insert into public.couple_members (couple_id, user_id) select v::uuid, auth.uid() from ctx where k='coupleA';
    raise exception 'FALHA: escreveu em couple_members';
  exception when insufficient_privilege then null; end;
  begin
    perform public.accept_invitation('ZZZZZZZZZZ');
    raise exception 'FALHA: aceitou convite inexistente';
  exception when raise_exception then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;
end $$;

-- storage: Carla só enxerga/escreve na própria pasta
reset role;
insert into storage.objects (bucket_id, name)
  select 'dream-images', v||'/x/a.jpg' from ctx where k='coupleA';
insert into storage.objects (bucket_id, name)
  select 'dream-images', v||'/x/b.jpg' from ctx where k='coupleB';
set role authenticated;
select t_as('00000000-0000-0000-0000-0000000000b1','carla@test.com');
do $$
declare n int;
begin
  select count(*) into n from storage.objects; assert n = 1, 'Carla vê arquivos do outro casal: '||n;
  begin
    insert into storage.objects (bucket_id, name) select 'dream-images', v||'/y/c.jpg' from ctx where k='coupleA';
    raise exception 'FALHA: subiu arquivo na pasta do outro quadro';
  exception when insufficient_privilege then null; end;
end $$;

-- 3) Bia (e-mail errado ou certo) aceita convite de Ana
select t_as('00000000-0000-0000-0000-0000000000d1','eva@test.com');
do $$
begin
  begin
    perform public.accept_invitation((select v from ctx where k='invA'));
    raise exception 'FALHA: e-mail errado aceitou convite restrito';
  exception when raise_exception then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;
end $$;

select t_as('00000000-0000-0000-0000-0000000000a2','bia@test.com');
do $$
declare n int;
begin
  assert (select count(*) from public.my_incoming_invitations()) = 1, 'convite por e-mail não apareceu';
  assert (select couple_name from public.invitation_preview((select v from ctx where k='invA'))) = 'Ana & Bia', 'preview incorreto';
  perform public.accept_invitation((select v from ctx where k='invA'));
  select count(*) into n from public.dreams; assert n = 1, 'Bia não vê o sonho de Ana';
  select count(*) into n from public.couple_members; assert n = 2, 'membros incorretos';
  select count(*) into n from public.profiles; assert n = 2, 'perfis do casal incorretos: '||n;
  select count(*) into n from public.notifications; assert n = 0, 'Bia recebeu notificação de algo anterior à sua entrada: '||n;
end $$;

-- Bia edita, marca como conquistado e comenta; Ana é notificada
update public.dreams set saved_value = 50000;
update public.dreams set status='achieved', achievement_note='Chaves na mão!';
insert into public.dream_updates (couple_id, dream_id, actor_id, kind, body)
  select couple_id, id, auth.uid(), 'comment', 'Que dia lindo' from public.dreams;
do $$
declare d public.dreams;
begin
  select * into d from public.dreams;
  assert d.achieved_by = '00000000-0000-0000-0000-0000000000a2', 'achieved_by incorreto';
  assert d.achieved_at is not null, 'achieved_at ausente';
  assert d.updated_by = '00000000-0000-0000-0000-0000000000a2', 'updated_by incorreto';
  assert d.created_by = '00000000-0000-0000-0000-0000000000a1', 'created_by foi alterado';
end $$;

select t_as('00000000-0000-0000-0000-0000000000a1','ana@test.com');
do $$
declare n int;
begin
  select count(*) into n from public.notifications n join public.dream_updates u on u.id=n.update_id where u.kind='achieved';
  assert n = 1, 'Ana não recebeu notificação de conquista';
  select count(*) into n from public.notifications n join public.dream_updates u on u.id=n.update_id where u.kind='value_changed';
  assert n = 1, 'Ana não recebeu notificação de valor';
  select count(*) into n from public.notifications n join public.dream_updates u on u.id=n.update_id where u.kind='comment';
  assert n = 1, 'Ana não recebeu notificação de comentário';
  assert (select count(*) from public.notifications where user_id <> auth.uid()) = 0, 'vê notificações alheias';
  update public.notifications set read_at = now();
  assert (select count(*) from public.notifications where read_at is null) = 0, 'marcar como lida falhou';
  -- reabrir limpa a conquista
  update public.dreams set status='planning';
  assert (select achieved_at from public.dreams) is null, 'reabrir não limpou achieved_at';
end $$;

-- 4) Terceira pessoa não entra em quadro cheio; Ana não cria convite com 2 membros
do $$
begin
  begin perform public.create_invitation('x', null); raise exception 'FALHA: convidou com quadro cheio';
  exception when raise_exception then if sqlerrm like 'FALHA%' then raise; end if; end;
end $$;

-- 5) Desvincular: Bia sai; perde acesso; Ana continua; Bia pode criar outro quadro
select t_as('00000000-0000-0000-0000-0000000000a2','bia@test.com');
select public.leave_couple();
do $$
begin
  assert (select count(*) from public.dreams) = 0, 'Bia ainda vê sonhos após sair';
  assert (select count(*) from public.profiles) = 1, 'Bia ainda vê perfil da Ana';
  assert (select count(*) from public.notifications) = 0, 'notificações antigas ficaram';
  perform public.create_couple('Bia sozinha');
end $$;
select t_as('00000000-0000-0000-0000-0000000000a1','ana@test.com');
do $$
begin
  assert (select count(*) from public.dreams) = 1, 'Ana perdeu o quadro';
  assert (select count(*) from public.couple_members) = 1, 'membros incorretos após sair';
  assert (select count(*) from public.dream_updates where kind='member_left') = 1, 'saída não registrada';
  begin perform public.leave_couple(); raise exception 'FALHA: último membro saiu sem excluir';
  exception when raise_exception then if sqlerrm like 'FALHA%' then raise; end if; end;
end $$;

-- 6) Convite: cancelar e recusar
do $$
declare r jsonb; c text;
begin
  r := public.create_invitation('Fulano', null); c := r->>'code';
  perform public.cancel_invitation((r->>'id')::uuid);
  assert (select count(*) from public.invitation_preview(c)) = 0, 'convite cancelado ainda válido';
  r := public.create_invitation('Fulano', null); c := r->>'code';
  assert (select count(*) from public.invitation_preview(c)) = 1, 'convite novo inválido';
end $$;
select t_as('00000000-0000-0000-0000-0000000000c1','dani@test.com');
do $$
declare c text;
begin
  select code into c from public.invitations_for_test();
exception when undefined_function then null;
end $$;

-- 7) Excluir quadro em cascata sem erro
select t_as('00000000-0000-0000-0000-0000000000a1','ana@test.com');
select public.delete_board();
reset role;
do $$
begin
  assert (select count(*) from public.dreams where title='Casa própria') = 0, 'quadro não foi excluído';
  assert (select count(*) from public.dream_images) = 0, 'imagens órfãs';
end $$;

-- 8) anon não acessa nada
set role anon;
do $$
begin
  begin perform count(*) from public.dreams; raise exception 'FALHA: anon leu dreams';
  exception when insufficient_privilege then null; end;
  begin perform public.get_board_state(); raise exception 'FALHA: anon executou get_board_state';
  exception when insufficient_privilege then null; end;
  perform * from public.invitation_preview('ABC');
end $$;
reset role;
\echo 'TODOS OS TESTES DE SEGURANÇA PASSARAM'
