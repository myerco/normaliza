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
  user_id uuid not null references public.users(id) on delete cascade,
  role_id text not null references public.roles(id) on delete cascade,
  granted_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create index if not exists user_roles_role_idx on public.user_roles (role_id);
create index if not exists user_roles_user_idx on public.user_roles (user_id);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users(id) on delete set null,
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

insert into public.user_roles (user_id, role_id)
select owner_id, case when role = 'owner' then 'administrator' else 'content_manager' end
from public.platform_admins
where owner_id in (select id from public.users)
on conflict do nothing;
