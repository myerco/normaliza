create extension if not exists pgcrypto;

create table if not exists public.players (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  name_normalized text not null,
  avatar_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  constraint players_name_length check (char_length(name) between 3 and 20),
  constraint players_avatar check (
    avatar_id in ('construtor', 'arquiteto', 'engenheiro', 'analista', 'cientista')
  )
);

create unique index if not exists players_name_normalized_key
  on public.players (name_normalized);

create index if not exists players_owner_id_idx on public.players (owner_id);

create table if not exists public.phase_attempts (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  phase_id text not null,
  hint_count integer not null default 0 check (hint_count >= 0),
  validation_count integer not null default 0 check (validation_count >= 0),
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists phase_attempts_player_idx
  on public.phase_attempts (player_id, started_at desc);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  phase_id text not null,
  attempt_id uuid references public.phase_attempts(id) on delete set null,
  client_match_id uuid not null,
  score integer not null check (score between 0 and 100),
  source text not null default 'online' check (source in ('online', 'offline', 'legacy')),
  snapshot jsonb not null,
  accepted_at timestamptz not null default now(),
  unique (player_id, client_match_id)
);

create index if not exists matches_player_idx on public.matches (player_id, accepted_at desc);

create table if not exists public.phase_results (
  player_id uuid not null references public.players(id) on delete cascade,
  phase_id text not null,
  best_score integer not null check (best_score between 0 and 100),
  completed_at timestamptz not null default now(),
  score_achieved_at timestamptz not null default now(),
  primary key (player_id, phase_id)
);

alter table public.players enable row level security;
alter table public.phase_attempts enable row level security;
alter table public.matches enable row level security;
alter table public.phase_results enable row level security;

drop policy if exists players_select_own on public.players;
create policy players_select_own on public.players
  for select to authenticated using (owner_id = auth.uid());

drop policy if exists attempts_select_own on public.phase_attempts;
create policy attempts_select_own on public.phase_attempts
  for select to authenticated using (
    exists (
      select 1 from public.players p
      where p.id = phase_attempts.player_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists matches_select_own on public.matches;
create policy matches_select_own on public.matches
  for select to authenticated using (
    exists (
      select 1 from public.players p
      where p.id = matches.player_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists results_select_own on public.phase_results;
create policy results_select_own on public.phase_results
  for select to authenticated using (
    exists (
      select 1 from public.players p
      where p.id = phase_results.player_id and p.owner_id = auth.uid()
    )
  );

create or replace view public.leaderboard as
with totals as (
  select
    p.id as player_id,
    p.name,
    p.avatar_id,
    coalesce(sum(r.best_score), 0)::integer as total_score,
    count(r.phase_id)::integer as completed_phases,
    max(r.score_achieved_at) as score_achieved_at
  from public.players p
  left join public.phase_results r on r.player_id = p.id
  group by p.id, p.name, p.avatar_id
)
select
  player_id,
  name,
  avatar_id,
  total_score,
  completed_phases,
  score_achieved_at,
  row_number() over (
    order by total_score desc, completed_phases desc, score_achieved_at asc nulls last, name asc
  )::integer as rank
from totals;

grant select on public.leaderboard to anon, authenticated;

create or replace function public.record_phase_result(
  p_player_id uuid,
  p_phase_id text,
  p_match_id uuid,
  p_score integer,
  p_snapshot jsonb,
  p_source text default 'online',
  p_attempt_id uuid default null
)
returns table (best_score integer, accepted boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing integer;
  v_best integer;
begin
  insert into public.matches (
    player_id, phase_id, attempt_id, client_match_id, score, source, snapshot
  ) values (
    p_player_id, p_phase_id, p_attempt_id, p_match_id, p_score, p_source, p_snapshot
  )
  on conflict (player_id, client_match_id) do nothing;

  if not found then
    select pr.best_score into v_best
    from public.phase_results pr
    where pr.player_id = p_player_id and pr.phase_id = p_phase_id
    limit 1;

    return query select coalesce(v_best, 0), true;
    return;
  end if;

  select pr.best_score into v_existing
  from public.phase_results pr
  where pr.player_id = p_player_id and pr.phase_id = p_phase_id;

  if v_existing is null or p_score > v_existing then
    insert into public.phase_results (
      player_id, phase_id, best_score, completed_at, score_achieved_at
    ) values (
      p_player_id, p_phase_id, p_score, now(), now()
    )
    on conflict (player_id, phase_id) do update
      set best_score = excluded.best_score,
          completed_at = excluded.completed_at,
          score_achieved_at = excluded.score_achieved_at;
    v_best := p_score;
  else
    v_best := v_existing;
  end if;

  update public.players
  set last_activity_at = now(), updated_at = now()
  where id = p_player_id;

  return query select v_best, true;
end;
$$;

revoke all on function public.record_phase_result(uuid, text, uuid, integer, jsonb, text, uuid) from public;
grant execute on function public.record_phase_result(uuid, text, uuid, integer, jsonb, text, uuid) to service_role;
