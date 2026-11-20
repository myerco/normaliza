alter table public.quests
  add column if not exists order_index integer not null default 1;

alter table public.quests
  add column if not exists attribute_rewards jsonb not null default '{}'::jsonb;

alter table public.quests
  add column if not exists is_optional boolean not null default false;
