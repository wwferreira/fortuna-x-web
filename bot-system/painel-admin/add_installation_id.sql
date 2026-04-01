alter table public.usuarios
add column if not exists installation_id text;

create index if not exists idx_usuarios_installation_id
on public.usuarios (installation_id);
