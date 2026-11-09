-- =====================================================================
-- NOSSO QUADRO DOS SONHOS — schema, segurança (RLS), funções e storage
-- Execute no SQL Editor do Supabase (ou via `supabase db push`).
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- TABELAS
-- ---------------------------------------------------------------------

create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  email        text,
  avatar_path  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.couples (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 80),
  motto      text check (motto is null or char_length(motto) <= 160),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Um usuário participa de no máximo um quadro (unique em user_id).
create table public.couple_members (
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id   uuid not null unique references auth.users(id) on delete cascade,
  role      text not null default 'partner' check (role in ('owner', 'partner')),
  joined_at timestamptz not null default now(),
  primary key (couple_id, user_id)
);

create table public.invitations (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references public.couples(id) on delete cascade,
  invited_by   uuid references auth.users(id) on delete set null,
  invited_name text check (invited_name is null or char_length(invited_name) <= 60),
  invited_email text check (invited_email is null or invited_email = lower(invited_email)),
  code         text not null unique,
  status       text not null default 'pending'
               check (status in ('pending', 'accepted', 'declined', 'canceled', 'expired')),
  expires_at   timestamptz not null default (now() + interval '14 days'),
  accepted_by  uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  responded_at timestamptz
);
-- Só um convite pendente por quadro.
create unique index invitations_one_pending_per_couple
  on public.invitations (couple_id) where status = 'pending';

create table public.dream_categories (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 40),
  icon       text not null default 'star',
  tone       smallint not null default 0 check (tone between 0 and 7),
  sort_order int not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (couple_id, id)
);
create unique index dream_categories_unique_name
  on public.dream_categories (couple_id, lower(name));

create table public.dreams (
  id              uuid primary key default gen_random_uuid(),
  couple_id       uuid not null references public.couples(id) on delete cascade,
  title           text not null check (char_length(title) between 1 and 120),
  description     text check (description is null or char_length(description) <= 2000),
  category_id     uuid,
  status          text not null default 'planning' check (status in ('planning', 'achieved')),
  estimated_value numeric(14,2) check (estimated_value is null or estimated_value >= 0),
  saved_value     numeric(14,2) check (saved_value is null or saved_value >= 0),
  target_date     date,
  format          text not null default 'quadrado'
                  check (format in ('quadrado', 'retrato', 'paisagem', 'destaque')),
  created_by      uuid references auth.users(id) on delete set null,
  updated_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  achieved_at     timestamptz,
  achieved_by     uuid references auth.users(id) on delete set null,
  achievement_note text check (achievement_note is null or char_length(achievement_note) <= 2000),
  unique (couple_id, id),
  -- a categoria precisa ser do mesmo quadro
  foreign key (couple_id, category_id)
    references public.dream_categories (couple_id, id) on delete set null (category_id)
);
create index dreams_couple_idx on public.dreams (couple_id, created_at desc);

create table public.dream_images (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null,
  dream_id   uuid not null,
  kind       text not null default 'cover' check (kind in ('cover', 'gallery', 'achievement')),
  path       text not null,
  thumb_path text,
  width      int,
  height     int,
  focus_x    real not null default 50 check (focus_x between 0 and 100),
  focus_y    real not null default 50 check (focus_y between 0 and 100),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (couple_id, dream_id) references public.dreams (couple_id, id) on delete cascade
);
create unique index dream_images_one_cover on public.dream_images (dream_id) where kind = 'cover';
create index dream_images_dream_idx on public.dream_images (dream_id);

-- Histórico de atividades (também serve de "barramento" para o tempo real).
create table public.dream_updates (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples(id) on delete cascade,
  dream_id    uuid references public.dreams(id) on delete set null,
  actor_id    uuid references auth.users(id) on delete set null,
  kind        text not null check (kind in (
    'board_created','created','updated','value_changed','image_added','achieved',
    'reopened','comment','deleted','member_joined','member_left','sync'
  )),
  dream_title text,
  body        text check (body is null or char_length(body) <= 2000),
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index dream_updates_couple_idx on public.dream_updates (couple_id, created_at desc);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  couple_id  uuid not null references public.couples(id) on delete cascade,
  update_id  uuid not null references public.dream_updates(id) on delete cascade,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- FUNÇÕES AUXILIARES
-- ---------------------------------------------------------------------

create or replace function public.my_couple_id()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select couple_id from public.couple_members where user_id = auth.uid() limit 1
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger couples_touch before update on public.couples
  for each row execute function public.touch_updated_at();

-- Cria o perfil automaticamente quando a conta é criada.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
                  split_part(new.email, '@', 1), 'Você'), 60),
    lower(new.email)
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Registra uma atividade e notifica o(a) parceiro(a).
create or replace function public.log_update(
  p_couple uuid, p_dream uuid, p_kind text, p_title text,
  p_body text default null, p_meta jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare v_id uuid;
begin
  insert into public.dream_updates (couple_id, dream_id, actor_id, kind, dream_title, body, meta)
  values (p_couple, p_dream, auth.uid(), p_kind, p_title, p_body, coalesce(p_meta, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.notify_partner()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  if new.kind <> 'sync' and new.kind <> 'board_created' then
    insert into public.notifications (user_id, couple_id, update_id)
    select m.user_id, new.couple_id, new.id
    from public.couple_members m
    where m.couple_id = new.couple_id
      and m.user_id is distinct from new.actor_id;
  end if;
  return new;
end $$;

create trigger dream_updates_notify
  after insert on public.dream_updates
  for each row execute function public.notify_partner();

-- ---------------------------------------------------------------------
-- TRIGGERS DOS SONHOS
-- ---------------------------------------------------------------------

create or replace function public.dreams_before_write()
returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    if new.couple_id <> old.couple_id then
      raise exception 'Um sonho não pode mudar de quadro.' using errcode = '42501';
    end if;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_at := now();
    new.updated_by := auth.uid();
    if new.status = 'achieved' and old.status <> 'achieved' then
      new.achieved_at := coalesce(new.achieved_at, now());
      new.achieved_by := auth.uid();
    elsif new.status = 'planning' and old.status = 'achieved' then
      new.achieved_at := null;
      new.achieved_by := null;
      new.achievement_note := null;
    end if;
  else
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.updated_by := new.created_by;
    if new.status = 'achieved' then
      new.achieved_at := coalesce(new.achieved_at, now());
      new.achieved_by := new.created_by;
    end if;
  end if;
  return new;
end $$;

create trigger dreams_before_write
  before insert or update on public.dreams
  for each row execute function public.dreams_before_write();

create or replace function public.dreams_after_insert()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  perform public.log_update(new.couple_id, new.id,
    case when new.status = 'achieved' then 'achieved' else 'created' end, new.title);
  return null;
end $$;

create trigger dreams_after_insert
  after insert on public.dreams
  for each row execute function public.dreams_after_insert();

create or replace function public.dreams_after_update()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  if new.status = 'achieved' and old.status = 'planning' then
    perform public.log_update(new.couple_id, new.id, 'achieved', new.title, new.achievement_note);
  elsif new.status = 'planning' and old.status = 'achieved' then
    perform public.log_update(new.couple_id, new.id, 'reopened', new.title);
  elsif new.status = 'achieved' and old.status = 'achieved'
        and new.achievement_note is distinct from old.achievement_note then
    perform public.log_update(new.couple_id, new.id, 'updated', new.title, new.achievement_note);
  end if;

  if new.estimated_value is distinct from old.estimated_value
     or new.saved_value is distinct from old.saved_value then
    perform public.log_update(new.couple_id, new.id, 'value_changed', new.title, null,
      jsonb_build_object(
        'estimated_old', old.estimated_value, 'estimated_new', new.estimated_value,
        'saved_old', old.saved_value, 'saved_new', new.saved_value));
  end if;

  if new.title is distinct from old.title
     or new.description is distinct from old.description
     or new.category_id is distinct from old.category_id
     or new.target_date is distinct from old.target_date
     or new.format is distinct from old.format then
    perform public.log_update(new.couple_id, new.id, 'updated', new.title,
      case when new.description is distinct from old.description then new.description end,
      jsonb_build_object('previous_title', old.title));
  end if;
  return null;
end $$;

create trigger dreams_after_update
  after update on public.dreams
  for each row execute function public.dreams_after_update();

create or replace function public.dreams_before_delete()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  -- Na exclusão em cascata do quadro inteiro, o quadro já não existe: não registra.
  if exists (select 1 from public.couples where id = old.couple_id) then
    perform public.log_update(old.couple_id, old.id, 'deleted', old.title);
  end if;
  return old;
end $$;

create trigger dreams_before_delete
  before delete on public.dreams
  for each row execute function public.dreams_before_delete();

-- Imagens: novas fotos viram atividade; remoções e trocas sincronizam o outro lado.
create or replace function public.dream_images_after_insert()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare v_dream public.dreams;
begin
  select * into v_dream from public.dreams where id = new.dream_id;
  if new.kind = 'cover' and v_dream.created_at > now() - interval '3 minutes' then
    perform public.log_update(new.couple_id, new.dream_id, 'sync', v_dream.title);
  else
    perform public.log_update(new.couple_id, new.dream_id, 'image_added', v_dream.title, null,
      jsonb_build_object('image_kind', new.kind));
  end if;
  return null;
end $$;

create trigger dream_images_after_insert
  after insert on public.dream_images
  for each row execute function public.dream_images_after_insert();

create or replace function public.dream_images_after_write()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if exists (select 1 from public.dreams where id = old.dream_id) then
      perform public.log_update(old.couple_id, old.dream_id, 'sync', null);
    end if;
    return old;
  end if;
  perform public.log_update(new.couple_id, new.dream_id, 'sync', null);
  return new;
end $$;

create trigger dream_images_after_update
  after update on public.dream_images
  for each row execute function public.dream_images_after_write();
create trigger dream_images_after_delete
  after delete on public.dream_images
  for each row execute function public.dream_images_after_write();

create or replace function public.sync_on_change()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare v_couple uuid;
begin
  if tg_table_name = 'couples' then
    v_couple := new.id;
  elsif tg_table_name = 'profiles' then
    select couple_id into v_couple from public.couple_members where user_id = new.id;
  elsif tg_op = 'DELETE' then
    v_couple := old.couple_id;
  else
    v_couple := new.couple_id;
  end if;
  if v_couple is not null and exists (select 1 from public.couples where id = v_couple) then
    perform public.log_update(v_couple, null, 'sync', null);
  end if;
  return null;
end $$;

create trigger categories_sync after insert or update or delete on public.dream_categories
  for each row execute function public.sync_on_change();
create trigger couples_sync after update on public.couples
  for each row execute function public.sync_on_change();
create trigger profiles_sync after update on public.profiles
  for each row execute function public.sync_on_change();

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------

alter table public.profiles         enable row level security;
alter table public.couples          enable row level security;
alter table public.couple_members   enable row level security;
alter table public.invitations      enable row level security;
alter table public.dream_categories enable row level security;
alter table public.dreams           enable row level security;
alter table public.dream_images     enable row level security;
alter table public.dream_updates    enable row level security;
alter table public.notifications    enable row level security;

revoke all on all tables in schema public from anon, authenticated;

grant select, update (display_name, avatar_path) on public.profiles to authenticated;
grant select, update (name, motto)               on public.couples to authenticated;
grant select                                      on public.couple_members to authenticated;
grant select                                      on public.invitations to authenticated;
grant select, insert, update, delete              on public.dream_categories to authenticated;
grant select, insert, update, delete              on public.dreams to authenticated;
grant select, insert, update, delete              on public.dream_images to authenticated;
grant select, insert                              on public.dream_updates to authenticated;
grant select, update (read_at), delete            on public.notifications to authenticated;

-- profiles: o próprio perfil e o do parceiro
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid()
         or id in (select user_id from public.couple_members where couple_id = public.my_couple_id()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- couples
create policy couples_select on public.couples for select to authenticated
  using (id = public.my_couple_id());
create policy couples_update on public.couples for update to authenticated
  using (id = public.my_couple_id()) with check (id = public.my_couple_id());

-- couple_members (escritas somente por funções)
create policy members_select on public.couple_members for select to authenticated
  using (couple_id = public.my_couple_id());

-- invitations (escritas somente por funções)
create policy invitations_select on public.invitations for select to authenticated
  using (couple_id = public.my_couple_id());

-- categorias
create policy categories_all on public.dream_categories for all to authenticated
  using (couple_id = public.my_couple_id())
  with check (couple_id = public.my_couple_id());

-- sonhos
create policy dreams_select on public.dreams for select to authenticated
  using (couple_id = public.my_couple_id());
create policy dreams_insert on public.dreams for insert to authenticated
  with check (couple_id = public.my_couple_id());
create policy dreams_update on public.dreams for update to authenticated
  using (couple_id = public.my_couple_id())
  with check (couple_id = public.my_couple_id());
create policy dreams_delete on public.dreams for delete to authenticated
  using (couple_id = public.my_couple_id());

-- imagens
create policy images_select on public.dream_images for select to authenticated
  using (couple_id = public.my_couple_id());
create policy images_insert on public.dream_images for insert to authenticated
  with check (couple_id = public.my_couple_id() and created_by = auth.uid());
create policy images_update on public.dream_images for update to authenticated
  using (couple_id = public.my_couple_id())
  with check (couple_id = public.my_couple_id());
create policy images_delete on public.dream_images for delete to authenticated
  using (couple_id = public.my_couple_id());

-- atividades: leitura do quadro; o cliente só pode inserir comentários próprios
create policy updates_select on public.dream_updates for select to authenticated
  using (couple_id = public.my_couple_id());
create policy updates_insert_comment on public.dream_updates for insert to authenticated
  with check (
    kind = 'comment'
    and actor_id = auth.uid()
    and couple_id = public.my_couple_id()
    and dream_id in (select id from public.dreams)
  );

-- notificações: somente as minhas
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete on public.notifications for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- FUNÇÕES DE NEGÓCIO (RPC)
-- ---------------------------------------------------------------------

create or replace function public.seed_default_categories(p_couple uuid)
returns void language sql security definer
set search_path = ''
as $$
  insert into public.dream_categories (couple_id, name, icon, tone, sort_order, is_default) values
    (p_couple, 'Viagens e experiências', 'plane',          0, 1,  true),
    (p_couple, 'Casa e imóveis',         'house',          1, 2,  true),
    (p_couple, 'Carros e transportes',   'car',            2, 3,  true),
    (p_couple, 'Investimentos e finanças','trending-up',   3, 4,  true),
    (p_couple, 'Móveis e decoração',     'sofa',           4, 5,  true),
    (p_couple, 'Casamento e família',    'gem',            5, 6,  true),
    (p_couple, 'Estudos e carreira',     'graduation-cap', 6, 7,  true),
    (p_couple, 'Experiências a dois',    'heart',          7, 8,  true),
    (p_couple, 'Estilo de vida',         'globe',          0, 9,  true),
    (p_couple, 'Outros sonhos',          'star',           1, 10, true)
$$;

create or replace function public.create_couple(p_name text, p_partner_name text default null)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare v_uid uuid := auth.uid(); v_couple uuid;
begin
  if v_uid is null then raise exception 'Entre na sua conta para continuar.' using errcode = '28000'; end if;
  if exists (select 1 from public.couple_members where user_id = v_uid) then
    raise exception 'Você já participa de um quadro.' using errcode = 'P0001';
  end if;
  if char_length(trim(coalesce(p_name, ''))) = 0 then
    raise exception 'Informe o nome do casal.' using errcode = 'P0001';
  end if;
  insert into public.couples (name, created_by) values (left(trim(p_name), 80), v_uid)
    returning id into v_couple;
  insert into public.couple_members (couple_id, user_id, role) values (v_couple, v_uid, 'owner');
  perform public.seed_default_categories(v_couple);
  perform public.log_update(v_couple, null, 'board_created', null, null,
    jsonb_build_object('partner_name', left(trim(coalesce(p_partner_name, '')), 60)));
  return v_couple;
end $$;

create or replace function public.gen_invite_code()
returns text language plpgsql
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(10);
  result text := '';
begin
  for i in 0..9 loop
    result := result || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  return result;
end $$;

create or replace function public.create_invitation(p_invited_name text default null, p_invited_email text default null)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_couple uuid := public.my_couple_id();
  v_email text := nullif(lower(trim(coalesce(p_invited_email, ''))), '');
  v_code text; v_id uuid;
begin
  if v_uid is null then raise exception 'Entre na sua conta para continuar.' using errcode = '28000'; end if;
  if v_couple is null then raise exception 'Crie o quadro antes de convidar.' using errcode = 'P0001'; end if;
  if (select count(*) from public.couple_members where couple_id = v_couple) >= 2 then
    raise exception 'Este quadro já tem duas pessoas.' using errcode = 'P0001';
  end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Informe um e-mail válido.' using errcode = 'P0001';
  end if;
  update public.invitations set status = 'canceled', responded_at = now()
    where couple_id = v_couple and status = 'pending';
  v_code := public.gen_invite_code();
  insert into public.invitations (couple_id, invited_by, invited_name, invited_email, code)
    values (v_couple, v_uid, left(trim(coalesce(p_invited_name, '')), 60), v_email, v_code)
    returning id into v_id;
  return jsonb_build_object('id', v_id, 'code', v_code);
end $$;

create or replace function public.cancel_invitation(p_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.invitations set status = 'canceled', responded_at = now()
   where id = p_id and couple_id = public.my_couple_id() and status = 'pending';
end $$;

-- Visão pública mínima do convite (para quem ainda não tem conta).
create or replace function public.invitation_preview(p_code text)
returns table (couple_name text, inviter_name text, invited_name text, restricted_to_email boolean)
language sql stable security definer
set search_path = ''
as $$
  select c.name,
         (select p.display_name from public.profiles p where p.id = i.invited_by),
         i.invited_name,
         i.invited_email is not null
  from public.invitations i
  join public.couples c on c.id = i.couple_id
  where i.code = upper(trim(p_code)) and i.status = 'pending' and i.expires_at > now()
$$;

-- Convites endereçados ao e-mail da conta logada.
create or replace function public.my_incoming_invitations()
returns table (code text, couple_name text, inviter_name text, created_at timestamptz)
language sql stable security definer
set search_path = ''
as $$
  select i.code, c.name,
         (select p.display_name from public.profiles p where p.id = i.invited_by),
         i.created_at
  from public.invitations i
  join public.couples c on c.id = i.couple_id
  where i.status = 'pending' and i.expires_at > now()
    and i.invited_email is not null
    and i.invited_email = lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

create or replace function public.accept_invitation(p_code text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_inv public.invitations;
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if v_uid is null then raise exception 'Entre na sua conta para continuar.' using errcode = '28000'; end if;
  if exists (select 1 from public.couple_members where user_id = v_uid) then
    raise exception 'Você já participa de um quadro. Desvincule-se dele antes de aceitar outro convite.' using errcode = 'P0001';
  end if;

  select * into v_inv from public.invitations
   where code = upper(trim(p_code)) and status = 'pending' and expires_at > now()
   for update;
  if not found then
    raise exception 'Este convite não existe, expirou ou já foi respondido.' using errcode = 'P0001';
  end if;
  if v_inv.invited_email is not null and v_inv.invited_email <> v_email then
    raise exception 'Este convite foi enviado para outro e-mail.' using errcode = 'P0001';
  end if;
  if v_inv.invited_by = v_uid then
    raise exception 'Você não pode aceitar o próprio convite.' using errcode = 'P0001';
  end if;

  perform 1 from public.couples where id = v_inv.couple_id for update;
  if (select count(*) from public.couple_members where couple_id = v_inv.couple_id) >= 2 then
    raise exception 'Este quadro já tem duas pessoas.' using errcode = 'P0001';
  end if;

  insert into public.couple_members (couple_id, user_id, role) values (v_inv.couple_id, v_uid, 'partner');
  update public.invitations set status = 'accepted', accepted_by = v_uid, responded_at = now()
   where id = v_inv.id;
  perform public.log_update(v_inv.couple_id, null, 'member_joined', null);
  return v_inv.couple_id;
end $$;

create or replace function public.decline_invitation(p_code text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para continuar.' using errcode = '28000'; end if;
  update public.invitations set status = 'declined', responded_at = now()
   where code = upper(trim(p_code)) and status = 'pending'
     and (invited_email is null or invited_email = v_email);
end $$;

-- Sai do quadro compartilhado (o parceiro continua com o quadro).
create or replace function public.leave_couple()
returns void
language plpgsql security definer
set search_path = ''
as $$
declare v_uid uuid := auth.uid(); v_couple uuid := public.my_couple_id();
begin
  if v_couple is null then return; end if;
  if (select count(*) from public.couple_members where couple_id = v_couple) < 2 then
    raise exception 'Você é a única pessoa neste quadro. Use "Excluir quadro" para apagá-lo.' using errcode = 'P0001';
  end if;
  perform public.log_update(v_couple, null, 'member_left', null);
  delete from public.notifications where user_id = v_uid and couple_id = v_couple;
  delete from public.couple_members where user_id = v_uid and couple_id = v_couple;
  update public.invitations set status = 'canceled', responded_at = now()
   where couple_id = v_couple and status = 'pending';
end $$;

-- Apaga o quadro inteiro (somente quando restou uma pessoa).
create or replace function public.delete_board()
returns void
language plpgsql security definer
set search_path = ''
as $$
declare v_couple uuid := public.my_couple_id();
begin
  if v_couple is null then return; end if;
  if (select count(*) from public.couple_members where couple_id = v_couple) > 1 then
    raise exception 'Desvincule o parceiro antes de excluir o quadro.' using errcode = 'P0001';
  end if;
  delete from public.couples where id = v_couple;
end $$;

-- Estado completo do quadro em uma única chamada (respeita RLS do usuário).
create or replace function public.get_board_state()
returns jsonb
language plpgsql stable security invoker
set search_path = ''
as $$
declare v_couple uuid := public.my_couple_id(); v_result jsonb;
begin
  select jsonb_build_object(
    'me', (select to_jsonb(p) from public.profiles p where p.id = auth.uid()),
    'couple', (select to_jsonb(c) from public.couples c where c.id = v_couple),
    'members', coalesce((
        select jsonb_agg(jsonb_build_object(
          'user_id', m.user_id, 'role', m.role, 'joined_at', m.joined_at,
          'display_name', p.display_name, 'email', p.email, 'avatar_path', p.avatar_path)
          order by m.joined_at)
        from public.couple_members m left join public.profiles p on p.id = m.user_id
        where m.couple_id = v_couple), '[]'::jsonb),
    'categories', coalesce((
        select jsonb_agg(to_jsonb(k) order by k.sort_order, k.created_at)
        from public.dream_categories k where k.couple_id = v_couple), '[]'::jsonb),
    'dreams', coalesce((
        select jsonb_agg(to_jsonb(d) || jsonb_build_object('images', coalesce((
            select jsonb_agg(to_jsonb(i) order by i.created_at)
            from public.dream_images i where i.dream_id = d.id), '[]'::jsonb))
          order by d.created_at desc)
        from public.dreams d where d.couple_id = v_couple), '[]'::jsonb),
    'invitation', (
        select to_jsonb(i) from public.invitations i
        where i.couple_id = v_couple and i.status = 'pending' and i.expires_at > now()
        limit 1)
  ) into v_result;
  return v_result;
end $$;

-- Permissões de execução
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.my_couple_id()                         to authenticated;
grant execute on function public.get_board_state()                      to authenticated;
grant execute on function public.create_couple(text, text)              to authenticated;
grant execute on function public.create_invitation(text, text)          to authenticated;
grant execute on function public.cancel_invitation(uuid)                to authenticated;
grant execute on function public.accept_invitation(text)                to authenticated;
grant execute on function public.decline_invitation(text)               to authenticated;
grant execute on function public.leave_couple()                         to authenticated;
grant execute on function public.delete_board()                         to authenticated;
grant execute on function public.my_incoming_invitations()              to authenticated;
grant execute on function public.invitation_preview(text)               to anon, authenticated;

-- ---------------------------------------------------------------------
-- TEMPO REAL
-- ---------------------------------------------------------------------
-- O quadro escuta apenas dream_updates (filtrado por couple_id) e notifications
-- (filtrado por user_id): INSERTs respeitam RLS e todo evento relevante passa por eles.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.dream_updates;
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- STORAGE (bucket privado; pasta raiz = id do quadro)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dream-images', 'dream-images', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "quadro le imagens" on storage.objects for select to authenticated
  using (bucket_id = 'dream-images' and (storage.foldername(name))[1] = public.my_couple_id()::text);
create policy "quadro envia imagens" on storage.objects for insert to authenticated
  with check (bucket_id = 'dream-images' and (storage.foldername(name))[1] = public.my_couple_id()::text);
create policy "quadro atualiza imagens" on storage.objects for update to authenticated
  using (bucket_id = 'dream-images' and (storage.foldername(name))[1] = public.my_couple_id()::text)
  with check (bucket_id = 'dream-images' and (storage.foldername(name))[1] = public.my_couple_id()::text);
create policy "quadro remove imagens" on storage.objects for delete to authenticated
  using (bucket_id = 'dream-images' and (storage.foldername(name))[1] = public.my_couple_id()::text);
