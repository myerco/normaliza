create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  email_normalized text not null unique,
  password_hash text not null,
  auth_provider text not null default 'local',
  status text not null default 'active' check (status in ('active', 'pending', 'disabled')),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.players
  add column if not exists user_id uuid references public.users(id) on delete cascade;

alter table public.players
  add column if not exists bio text not null default '';

create unique index if not exists players_user_id_key
  on public.players (user_id)
  where user_id is not null;

create index if not exists players_user_id_idx
  on public.players (user_id);

alter table public.local_sessions
  add column if not exists user_id uuid references public.users(id) on delete cascade;

create index if not exists local_sessions_user_idx
  on public.local_sessions (user_id);
