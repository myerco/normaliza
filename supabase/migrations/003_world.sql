create table if not exists public.archetypes (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.archetypes (id, slug, name, description)
values
  ('engenheiro', 'engenheiro', 'Engenheiro', 'Origem voltada à construção e implementação de soluções.'),
  ('arquiteto', 'arquiteto', 'Arquiteto', 'Origem voltada à estruturação e modelagem de soluções.'),
  ('analista', 'analista', 'Analista', 'Origem voltada à análise e investigação de dados.')
on conflict (id) do nothing;

create table if not exists public.knowledge_territories (
  id text primary key,
  slug text not null unique,
  name text not null,
  short_name text not null,
  description text not null default '',
  color text not null default '#9acb45',
  icon text not null default '',
  map_x integer not null default 50,
  map_y integer not null default 50,
  order_index integer not null default 1,
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  is_frontier boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_tracks (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text not null default '',
  objective text not null default '',
  order_index integer not null default 1,
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_skills (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text not null default '',
  category_id text not null default 'geral',
  icon text not null default '',
  max_level smallint not null default 10 check (max_level between 1 and 100),
  order_index integer not null default 1,
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_professions (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text not null default '',
  suggestion_threshold smallint not null default 60 check (suggestion_threshold between 0 and 100),
  minimum_skills smallint not null default 2 check (minimum_skills >= 1),
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_track_territories (
  territory_id text not null references public.knowledge_territories(id) on delete cascade,
  track_id text not null references public.knowledge_tracks(id) on delete cascade,
  order_index integer not null default 1,
  map_x integer not null default 50,
  map_y integer not null default 50,
  primary key (territory_id, track_id)
);

create index if not exists knowledge_track_territories_track_idx
  on public.knowledge_track_territories (track_id);

create table if not exists public.knowledge_track_skills (
  track_id text not null references public.knowledge_tracks(id) on delete cascade,
  skill_id text not null references public.knowledge_skills(id) on delete cascade,
  target_level smallint not null default 1 check (target_level >= 1),
  weight numeric(6, 2) not null default 1 check (weight > 0),
  primary key (track_id, skill_id)
);

create table if not exists public.knowledge_track_prerequisites (
  track_id text not null references public.knowledge_tracks(id) on delete cascade,
  prerequisite_track_id text not null references public.knowledge_tracks(id) on delete cascade,
  primary key (track_id, prerequisite_track_id),
  check (track_id <> prerequisite_track_id)
);

create table if not exists public.quests (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text not null default '',
  objective text not null default '',
  category text not null default 'Geral',
  module_key text,
  entry_path text,
  difficulty smallint not null default 1 check (difficulty between 1 and 5),
  order_index integer not null default 1,
  xp_reward integer not null default 0 check (xp_reward >= 0),
  max_score integer not null default 100 check (max_score > 0),
  attribute_rewards jsonb not null default '{}'::jsonb,
  is_optional boolean not null default false,
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quest_tracks (
  quest_id text not null references public.quests(id) on delete cascade,
  track_id text not null references public.knowledge_tracks(id) on delete cascade,
  order_index integer not null default 1,
  is_required boolean not null default true,
  primary key (quest_id, track_id)
);

create index if not exists quest_tracks_track_idx
  on public.quest_tracks (track_id, order_index);

create table if not exists public.quest_skills (
  quest_id text not null references public.quests(id) on delete cascade,
  skill_id text not null references public.knowledge_skills(id) on delete cascade,
  level_delta smallint not null default 1 check (level_delta > 0),
  primary key (quest_id, skill_id)
);

create table if not exists public.quest_prerequisites (
  quest_id text not null references public.quests(id) on delete cascade,
  prerequisite_quest_id text not null references public.quests(id) on delete cascade,
  primary key (quest_id, prerequisite_quest_id),
  check (quest_id <> prerequisite_quest_id)
);

create table if not exists public.knowledge_profession_skills (
  profession_id text not null references public.knowledge_professions(id) on delete cascade,
  skill_id text not null references public.knowledge_skills(id) on delete cascade,
  weight numeric(6, 2) not null default 1 check (weight > 0),
  target_level smallint not null default 1 check (target_level >= 1),
  primary key (profession_id, skill_id)
);

create table if not exists public.archetype_skills (
  archetype_id text not null references public.archetypes(id) on delete cascade,
  skill_id text not null references public.knowledge_skills(id) on delete cascade,
  initial_level smallint not null default 1 check (initial_level >= 0),
  primary key (archetype_id, skill_id)
);

create table if not exists public.characters (
  id uuid primary key,
  player_id uuid not null references public.players(id) on delete cascade,
  name text not null,
  name_normalized text not null,
  archetype_id text not null references public.archetypes(id),
  image_asset_id text,
  xp_total integer not null default 0 check (xp_total >= 0),
  is_primary boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (player_id, name_normalized)
);

create index if not exists characters_player_idx
  on public.characters (player_id, is_primary desc);

create table if not exists public.character_skills (
  character_id uuid not null references public.characters(id) on delete cascade,
  skill_id text not null references public.knowledge_skills(id) on delete cascade,
  level smallint not null default 0 check (level between 0 and 100),
  updated_at timestamptz not null default now(),
  primary key (character_id, skill_id)
);

create table if not exists public.character_skill_history (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  skill_id text not null references public.knowledge_skills(id) on delete cascade,
  previous_level smallint not null default 0,
  new_level smallint not null default 0,
  source_type text not null default 'quest',
  source_id text,
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists character_skill_history_character_idx
  on public.character_skill_history (character_id, created_at desc);

create table if not exists public.character_quest_progress (
  character_id uuid not null references public.characters(id) on delete cascade,
  quest_id text not null references public.quests(id) on delete cascade,
  status text not null default 'available' check (status in ('locked', 'available', 'in_progress', 'completed')),
  attempts integer not null default 0 check (attempts >= 0),
  best_score integer not null default 0 check (best_score >= 0),
  xp_awarded integer not null default 0 check (xp_awarded >= 0),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (character_id, quest_id)
);

create table if not exists public.achievements (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text not null default '',
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.character_achievements (
  character_id uuid not null references public.characters(id) on delete cascade,
  achievement_id text not null references public.achievements(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  source_quest_id text references public.quests(id) on delete set null,
  primary key (character_id, achievement_id)
);

create table if not exists public.level_thresholds (
  level integer primary key check (level >= 1),
  xp_required integer not null unique check (xp_required >= 0),
  title text not null
);

insert into public.level_thresholds (level, xp_required, title)
values
  (1, 0, 'Aprendiz'),
  (2, 150, 'Explorador'),
  (3, 350, 'Praticante'),
  (4, 600, 'Analista'),
  (5, 900, 'Especialista'),
  (6, 1250, 'Arquiteto de Dados'),
  (7, 1650, 'Mentor'),
  (8, 2100, 'Guardião dos Dados'),
  (9, 2600, 'Mestre'),
  (10, 3150, 'Lenda do Conhecimento')
on conflict (level) do nothing;

create table if not exists public.platform_admins (
  owner_id uuid primary key,
  role text not null default 'editor' check (role in ('owner', 'editor')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace view public.character_track_progress as
with tracks as (
  select
    c.id as character_id,
    qt.track_id,
    count(distinct qt.quest_id) filter (where qt.is_required)::integer as total_required,
    count(distinct cqp.quest_id) filter (
      where qt.is_required and cqp.status = 'completed'
    )::integer as completed_required
  from public.characters c
  cross join public.quest_tracks qt
  left join public.character_quest_progress cqp
    on cqp.character_id = c.id and cqp.quest_id = qt.quest_id
  group by c.id, qt.track_id
)
select
  character_id,
  track_id,
  total_required,
  completed_required,
  case
    when total_required = 0 then 0
    else round((completed_required::numeric / total_required) * 100)::integer
  end as percent,
  case
    when total_required > 0 and completed_required >= total_required then 'completed'
    when completed_required > 0 then 'in_progress'
    else 'available'
  end as status
from tracks;

create or replace view public.character_territory_progress as
with territory_quests as (
  select distinct
    tt.territory_id,
    qt.quest_id
  from public.knowledge_track_territories tt
  join public.quest_tracks qt on qt.track_id = tt.track_id
  where qt.is_required
),
progress as (
  select
    c.id as character_id,
    tq.territory_id,
    count(distinct tq.quest_id)::integer as total_required,
    count(distinct cqp.quest_id) filter (where cqp.status = 'completed')::integer as completed_required
  from public.characters c
  cross join territory_quests tq
  left join public.character_quest_progress cqp
    on cqp.character_id = c.id
    and cqp.quest_id = tq.quest_id
  group by c.id, tq.territory_id
)
select
  character_id,
  territory_id,
  total_required,
  completed_required,
  case
    when total_required = 0 then 0
    else round((completed_required::numeric / total_required) * 100)::integer
  end as percent,
  case
    when total_required > 0 and completed_required >= total_required then 'completed'
    when completed_required > 0 then 'in_progress'
    else 'available'
  end as status,
  completed_required > 0 as explored
from progress;

create or replace view public.character_profession_affinity as
select
  c.id as character_id,
  p.id as profession_id,
  p.name as profession_name,
  round(
    100 * sum(ps.weight * least(1, coalesce(cs.level, 0)::numeric / greatest(ps.target_level, 1)))
    / nullif(sum(ps.weight), 0)
  )::integer as affinity,
  count(*) filter (where coalesce(cs.level, 0) > 0)::integer as active_skills,
  (
    round(
      100 * sum(ps.weight * least(1, coalesce(cs.level, 0)::numeric / greatest(ps.target_level, 1)))
      / nullif(sum(ps.weight), 0)
    ) >= p.suggestion_threshold
    and count(*) filter (where coalesce(cs.level, 0) > 0) >= p.minimum_skills
  ) as suggested
from public.characters c
cross join public.knowledge_professions p
join public.knowledge_profession_skills ps on ps.profession_id = p.id
left join public.character_skills cs
  on cs.character_id = c.id and cs.skill_id = ps.skill_id
where p.status = 'published'
group by c.id, p.id, p.name, p.suggestion_threshold, p.minimum_skills;
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins
    where owner_id = auth.uid() and active
  );
$$;

alter table public.knowledge_territories enable row level security;
alter table public.knowledge_tracks enable row level security;
alter table public.knowledge_skills enable row level security;
alter table public.knowledge_professions enable row level security;
alter table public.knowledge_track_territories enable row level security;
alter table public.knowledge_track_skills enable row level security;
alter table public.knowledge_track_prerequisites enable row level security;
alter table public.quests enable row level security;
alter table public.quest_tracks enable row level security;
alter table public.quest_skills enable row level security;
alter table public.quest_prerequisites enable row level security;
alter table public.knowledge_profession_skills enable row level security;
alter table public.archetypes enable row level security;
alter table public.archetype_skills enable row level security;
alter table public.achievements enable row level security;
alter table public.level_thresholds enable row level security;
alter table public.characters enable row level security;
alter table public.character_skills enable row level security;
alter table public.character_skill_history enable row level security;
alter table public.character_quest_progress enable row level security;
alter table public.character_achievements enable row level security;
alter table public.platform_admins enable row level security;

drop policy if exists knowledge_territories_read on public.knowledge_territories;
create policy knowledge_territories_read on public.knowledge_territories
  for select to anon, authenticated using (status = 'published');

drop policy if exists knowledge_territories_admin on public.knowledge_territories;
create policy knowledge_territories_admin on public.knowledge_territories
  for all to authenticated using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists knowledge_tracks_read on public.knowledge_tracks;
create policy knowledge_tracks_read on public.knowledge_tracks
  for select to anon, authenticated using (status = 'published');

drop policy if exists knowledge_tracks_admin on public.knowledge_tracks;
create policy knowledge_tracks_admin on public.knowledge_tracks
  for all to authenticated using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists knowledge_skills_read on public.knowledge_skills;
create policy knowledge_skills_read on public.knowledge_skills
  for select to anon, authenticated using (status = 'published');

drop policy if exists knowledge_skills_admin on public.knowledge_skills;
create policy knowledge_skills_admin on public.knowledge_skills
  for all to authenticated using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists knowledge_professions_read on public.knowledge_professions;
create policy knowledge_professions_read on public.knowledge_professions
  for select to anon, authenticated using (status = 'published');

drop policy if exists knowledge_professions_admin on public.knowledge_professions;
create policy knowledge_professions_admin on public.knowledge_professions
  for all to authenticated using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists knowledge_track_territories_read on public.knowledge_track_territories;
create policy knowledge_track_territories_read on public.knowledge_track_territories
  for select to anon, authenticated using (
    exists (
      select 1 from public.knowledge_territories t
      where t.id = territory_id and t.status = 'published'
    )
    and exists (
      select 1 from public.knowledge_tracks tr
      where tr.id = track_id and tr.status = 'published'
    )
  );

drop policy if exists knowledge_track_territories_admin on public.knowledge_track_territories;
create policy knowledge_track_territories_admin on public.knowledge_track_territories
  for all to authenticated using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists knowledge_track_skills_read on public.knowledge_track_skills;
create policy knowledge_track_skills_read on public.knowledge_track_skills
  for select to anon, authenticated using (
    exists (
      select 1 from public.knowledge_tracks tr
      where tr.id = track_id and tr.status = 'published'
    )
    and exists (
      select 1 from public.knowledge_skills s
      where s.id = skill_id and s.status = 'published'
    )
  );

drop policy if exists knowledge_track_skills_admin on public.knowledge_track_skills;
create policy knowledge_track_skills_admin on public.knowledge_track_skills
  for all to authenticated using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists knowledge_track_prerequisites_read on public.knowledge_track_prerequisites;
create policy knowledge_track_prerequisites_read on public.knowledge_track_prerequisites
  for select to anon, authenticated using (
    exists (
      select 1 from public.knowledge_tracks tr
      where tr.id = track_id and tr.status = 'published'
    )
    and exists (
      select 1 from public.knowledge_tracks pr
      where pr.id = prerequisite_track_id and pr.status = 'published'
    )
  );

drop policy if exists knowledge_track_prerequisites_admin on public.knowledge_track_prerequisites;
create policy knowledge_track_prerequisites_admin on public.knowledge_track_prerequisites
  for all to authenticated using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists quests_read on public.quests;
create policy quests_read on public.quests
  for select to anon, authenticated using (status = 'published');

drop policy if exists quests_admin on public.quests;
create policy quests_admin on public.quests
  for all to authenticated using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists quest_tracks_read on public.quest_tracks;
create policy quest_tracks_read on public.quest_tracks
  for select to anon, authenticated using (
    exists (select 1 from public.quests q where q.id = quest_id and q.status = 'published')
    and exists (select 1 from public.knowledge_tracks t where t.id = track_id and t.status = 'published')
  );

drop policy if exists quest_tracks_admin on public.quest_tracks;
create policy quest_tracks_admin on public.quest_tracks
  for all to authenticated using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists quest_skills_read on public.quest_skills;
create policy quest_skills_read on public.quest_skills
  for select to anon, authenticated using (
    exists (select 1 from public.quests q where q.id = quest_id and q.status = 'published')
    and exists (select 1 from public.knowledge_skills s where s.id = skill_id and s.status = 'published')
  );

drop policy if exists quest_skills_admin on public.quest_skills;
create policy quest_skills_admin on public.quest_skills
  for all to authenticated using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists quest_prerequisites_read on public.quest_prerequisites;
create policy quest_prerequisites_read on public.quest_prerequisites
  for select to anon, authenticated using (
    exists (select 1 from public.quests q where q.id = quest_id and q.status = 'published')
    and exists (select 1 from public.quests p where p.id = prerequisite_quest_id and p.status = 'published')
  );

drop policy if exists quest_prerequisites_admin on public.quest_prerequisites;
create policy quest_prerequisites_admin on public.quest_prerequisites
  for all to authenticated using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists knowledge_profession_skills_read on public.knowledge_profession_skills;
create policy knowledge_profession_skills_read on public.knowledge_profession_skills
  for select to anon, authenticated using (
    exists (select 1 from public.knowledge_professions p where p.id = profession_id and p.status = 'published')
    and exists (select 1 from public.knowledge_skills s where s.id = skill_id and s.status = 'published')
  );

drop policy if exists knowledge_profession_skills_admin on public.knowledge_profession_skills;
create policy knowledge_profession_skills_admin on public.knowledge_profession_skills
  for all to authenticated using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists archetypes_read on public.archetypes;
create policy archetypes_read on public.archetypes
  for select to anon, authenticated using (active or public.is_platform_admin());

drop policy if exists archetypes_admin on public.archetypes;
create policy archetypes_admin on public.archetypes
  for all to authenticated using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists archetype_skills_read on public.archetype_skills;
create policy archetype_skills_read on public.archetype_skills
  for select to anon, authenticated using (
    exists (select 1 from public.archetypes a where a.id = archetype_id and a.active)
    and exists (select 1 from public.knowledge_skills s where s.id = skill_id and s.status = 'published')
  );

drop policy if exists archetype_skills_admin on public.archetype_skills;
create policy archetype_skills_admin on public.archetype_skills
  for all to authenticated using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists achievements_read on public.achievements;
create policy achievements_read on public.achievements
  for select to anon, authenticated using (status = 'published');

drop policy if exists achievements_admin on public.achievements;
create policy achievements_admin on public.achievements
  for all to authenticated using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists level_thresholds_read on public.level_thresholds;
create policy level_thresholds_read on public.level_thresholds
  for select to anon, authenticated using (true);

drop policy if exists characters_select_own on public.characters;
create policy characters_select_own on public.characters
  for select to authenticated using (
    exists (select 1 from public.players p where p.id = player_id and p.owner_id = auth.uid())
  );

drop policy if exists character_skills_select_own on public.character_skills;
create policy character_skills_select_own on public.character_skills
  for select to authenticated using (
    exists (
      select 1 from public.characters c
      join public.players p on p.id = c.player_id
      where c.id = character_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists character_skill_history_select_own on public.character_skill_history;
create policy character_skill_history_select_own on public.character_skill_history
  for select to authenticated using (
    exists (
      select 1 from public.characters c
      join public.players p on p.id = c.player_id
      where c.id = character_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists character_quest_progress_select_own on public.character_quest_progress;
create policy character_quest_progress_select_own on public.character_quest_progress
  for select to authenticated using (
    exists (
      select 1 from public.characters c
      join public.players p on p.id = c.player_id
      where c.id = character_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists character_achievements_select_own on public.character_achievements;
create policy character_achievements_select_own on public.character_achievements
  for select to authenticated using (
    exists (
      select 1 from public.characters c
      join public.players p on p.id = c.player_id
      where c.id = character_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists platform_admins_select_own on public.platform_admins;
create policy platform_admins_select_own on public.platform_admins
  for select to authenticated using (owner_id = auth.uid());

grant select on public.knowledge_territories, public.knowledge_tracks, public.knowledge_skills,
  public.knowledge_professions, public.knowledge_track_territories, public.knowledge_track_skills,
  public.knowledge_track_prerequisites, public.quests, public.quest_tracks, public.quest_skills,
  public.quest_prerequisites, public.knowledge_profession_skills, public.archetypes,
  public.archetype_skills, public.achievements, public.level_thresholds
  to anon, authenticated;

grant select on public.characters, public.character_skills, public.character_skill_history,
  public.character_quest_progress, public.character_achievements, public.platform_admins
  to authenticated;

grant execute on function public.is_platform_admin() to authenticated;
grant select on public.character_track_progress, public.character_territory_progress, public.character_profession_affinity to authenticated;
