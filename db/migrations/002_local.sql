create table if not exists public.local_sessions (
  token_hash text primary key,
  owner_id uuid not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists local_sessions_owner_idx
  on public.local_sessions (owner_id);
