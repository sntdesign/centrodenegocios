-- Ejecutar UNA vez en SQL Editor de Supabase.
create table if not exists public.business_state (
 id integer primary key check (id = 1),
 data jsonb not null default '{}'::jsonb,
 version bigint not null default 0,
 updated_at timestamptz not null default now()
);
alter table public.business_state enable row level security;
revoke all on table public.business_state from anon, authenticated;
-- Solo el backend con clave secreta podrá leer y escribir esta tabla.
insert into public.business_state (id,data) values (1,'{}'::jsonb) on conflict (id) do nothing;
