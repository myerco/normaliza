create table if not exists public.platform_player_progress (
  player_id uuid primary key references public.players(id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_quest_results (
  player_id uuid not null references public.players(id) on delete cascade,
  character_id uuid not null,
  quest_id text not null,
  best_score integer not null check (best_score between 0 and 400),
  xp_awarded integer not null check (xp_awarded >= 0),
  level integer not null check (level >= 1),
  completed_at timestamptz not null default now(),
  primary key (player_id, quest_id)
);

create table if not exists public.platform_xp_history (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  quest_id text not null,
  amount integer not null check (amount >= 0),
  source text not null default 'quest',
  created_at timestamptz not null default now(),
  unique (player_id, quest_id, source)
);

create index if not exists platform_xp_history_player_idx
  on public.platform_xp_history (player_id, created_at desc);

create or replace function public.record_quest_completion(
  p_player_id uuid,
  p_character_id uuid,
  p_quest_id text,
  p_best_score integer,
  p_xp integer,
  p_level integer
)
returns table (xp_awarded integer, level integer, accepted boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_xp integer;
  v_level integer;
begin
  insert into public.platform_quest_results (
    player_id, character_id, quest_id, best_score, xp_awarded, level
  ) values (
    p_player_id, p_character_id, p_quest_id, p_best_score, p_xp, p_level
  )
  on conflict (player_id, quest_id) do nothing;

  if not found then
    select q.xp_awarded, q.level into v_xp, v_level
    from public.platform_quest_results q
    where q.player_id = p_player_id and q.quest_id = p_quest_id;

    return query select v_xp, v_level, true;
    return;
  end if;

  insert into public.platform_xp_history (
    player_id, quest_id, amount, source
  ) values (
    p_player_id, p_quest_id, p_xp, 'quest'
  )
  on conflict (player_id, quest_id, source) do nothing;

  insert into public.platform_player_progress (player_id, xp, level)
  values (p_player_id, p_xp, p_level)
  on conflict (player_id) do update
    set xp = platform_player_progress.xp + excluded.xp,
        level = greatest(platform_player_progress.level, excluded.level),
        updated_at = now();

  return query select p_xp, p_level, true;
end;
$$;


