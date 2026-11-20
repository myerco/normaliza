alter table public.players
  add column if not exists bio text not null default '';

create unique index if not exists players_owner_id_key
  on public.players (owner_id);

create index if not exists players_owner_id_lookup_idx
  on public.players (owner_id);
