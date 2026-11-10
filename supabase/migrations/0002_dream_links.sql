-- Dreamspace — links de cada sonho (lojas, mapas, referências).
-- Lista de objetos { "label": texto, "url": endereço http(s) }, no máximo 8.
alter table public.dreams
  add column if not exists links jsonb not null default '[]'::jsonb;

alter table public.dreams drop constraint if exists dreams_links_shape;
alter table public.dreams
  add constraint dreams_links_shape
  check (jsonb_typeof(links) = 'array' and jsonb_array_length(links) <= 8 and pg_column_size(links) <= 8192);
