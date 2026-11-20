create table if not exists public.system_settings (
  key text primary key,
  category text not null default 'general',
  value jsonb not null,
  description text not null default '',
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.feature_flags (
  key text primary key,
  description text not null default '',
  enabled boolean not null default true,
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.system_settings (key, category, value, description)
values
  ('platform.name', 'general', '"Cafegeek"'::jsonb, 'Nome exibido da plataforma.'),
  ('platform.description', 'general', '"Jornada do Conhecimento"'::jsonb, 'Descrição curta da plataforma.'),
  ('registration.enabled', 'registration', 'true'::jsonb, 'Permite novos cadastros.'),
  ('ranking.enabled', 'features', 'true'::jsonb, 'Ativa o ranking.'),
  ('quests.enabled', 'features', 'true'::jsonb, 'Ativa quests.')
on conflict (key) do nothing;

insert into public.feature_flags (key, description, enabled)
values
  ('ranking', 'Ranking de jogadores.', true),
  ('achievements', 'Conquistas de personagem.', true),
  ('maps', 'Mapas de conhecimento.', true),
  ('tracks', 'Trilhas de aprendizagem.', true),
  ('quests', 'Quests e desafios.', true),
  ('specializations', 'Especializações profissionais.', true)
on conflict (key) do nothing;
