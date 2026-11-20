create table if not exists public.roles (
  id text primary key,
  name text not null,
  description text not null default '',
  rank smallint not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.permissions (
  id text primary key,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role_id text not null references public.roles(id) on delete cascade,
  permission_id text not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id text not null references public.roles(id) on delete cascade,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create index if not exists user_roles_role_idx on public.user_roles (role_id);
create index if not exists user_roles_user_idx on public.user_roles (user_id);

create table if not exists public.system_settings (
  key text primary key,
  category text not null default 'general',
  value jsonb not null,
  description text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.feature_flags (
  key text primary key,
  description text not null default '',
  enabled boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  reason text not null default '',
  result text not null default 'success' check (result in ('success', 'failure')),
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_actor_idx
  on public.admin_audit_logs (actor_user_id, created_at desc);
create index if not exists admin_audit_logs_entity_idx
  on public.admin_audit_logs (entity_type, entity_id, created_at desc);
create index if not exists admin_audit_logs_created_idx
  on public.admin_audit_logs (created_at desc);

insert into public.roles (id, name, description, rank)
values
  ('administrator', 'Administrador', 'Acesso completo ao painel e à configuração.', 100),
  ('content_manager', 'Gestor de Conteúdo', 'Gestão de mapas, trilhas, quests, habilidades e especializações.', 50),
  ('support', 'Suporte', 'Consulta de usuários e jogadores para atendimento.', 20)
on conflict (id) do nothing;

insert into public.permissions (id, description)
values
  ('admin.dashboard', 'Acessar o dashboard administrativo.'),
  ('admin.users.read', 'Consultar usuários.'),
  ('admin.users.write', 'Editar dados de usuários.'),
  ('admin.users.block', 'Bloquear e reativar contas.'),
  ('admin.users.roles', 'Gerenciar papéis administrativos.'),
  ('admin.users.password', 'Solicitar recuperação ou redefinição de senha.'),
  ('admin.players.read', 'Consultar jogadores.'),
  ('admin.players.write', 'Editar dados permitidos de jogadores.'),
  ('admin.content.read', 'Consultar conteúdo.'),
  ('admin.content.write', 'Criar e editar conteúdo.'),
  ('admin.maps.write', 'Editar mapas e posições.'),
  ('admin.settings.read', 'Consultar configurações.'),
  ('admin.settings.write', 'Alterar configurações.'),
  ('admin.audit.read', 'Consultar auditoria.')
on conflict (id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select 'administrator', id from public.permissions
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
values
  ('content_manager', 'admin.dashboard'),
  ('content_manager', 'admin.content.read'),
  ('content_manager', 'admin.content.write'),
  ('content_manager', 'admin.maps.write'),
  ('support', 'admin.dashboard'),
  ('support', 'admin.users.read'),
  ('support', 'admin.users.password'),
  ('support', 'admin.players.read')
on conflict do nothing;

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

insert into public.user_roles (user_id, role_id)
select owner_id, case when role = 'owner' then 'administrator' else 'content_manager' end
from public.platform_admins
on conflict do nothing;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.active and r.id in ('administrator', 'content_manager')
  );
$$;

alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.system_settings enable row level security;
alter table public.feature_flags enable row level security;
alter table public.admin_audit_logs enable row level security;

drop policy if exists roles_admin_read on public.roles;
create policy roles_admin_read on public.roles
  for select to authenticated using (public.is_platform_admin());

drop policy if exists permissions_admin_read on public.permissions;
create policy permissions_admin_read on public.permissions
  for select to authenticated using (public.is_platform_admin());

drop policy if exists role_permissions_admin_read on public.role_permissions;
create policy role_permissions_admin_read on public.role_permissions
  for select to authenticated using (public.is_platform_admin());

drop policy if exists user_roles_read on public.user_roles;
create policy user_roles_read on public.user_roles
  for select to authenticated using (user_id = auth.uid() or public.is_platform_admin());

drop policy if exists settings_admin_read on public.system_settings;
create policy settings_admin_read on public.system_settings
  for select to authenticated using (public.is_platform_admin());

drop policy if exists feature_flags_public_read on public.feature_flags;
create policy feature_flags_public_read on public.feature_flags
  for select to anon, authenticated using (true);

drop policy if exists feature_flags_admin_write on public.feature_flags;
create policy feature_flags_admin_write on public.feature_flags
  for all to authenticated using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists audit_admin_read on public.admin_audit_logs;
create policy audit_admin_read on public.admin_audit_logs
  for select to authenticated using (public.is_platform_admin());

grant select on public.roles, public.permissions, public.role_permissions,
  public.user_roles, public.system_settings, public.feature_flags,
  public.admin_audit_logs
  to authenticated;

grant select on public.feature_flags to anon;
grant execute on function public.is_platform_admin() to authenticated;
