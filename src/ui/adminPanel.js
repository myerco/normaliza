import { el } from './dom.js';

const LOGO = './assets/images/branding/cafegeek-logo.webp';

const NAV_ITEMS = [
  { id: 'adminDashboard', label: 'Dashboard', permission: 'admin.dashboard' },
  { id: 'adminUsers', label: 'Usuários', permission: 'admin.users.read' },
  { id: 'adminPlayers', label: 'Jogadores', permission: 'admin.players.read' },
  { id: 'adminContent', label: 'Catálogos', permission: 'admin.content.read' },
  { id: 'adminWorld', label: 'Mapas', permission: 'admin.content.read' },
  { id: 'adminSettings', label: 'Configurações', permission: 'admin.settings.read' },
  { id: 'adminAudit', label: 'Auditoria', permission: 'admin.audit.read' }
];

export function renderAdminDashboard(root, {
  player,
  access,
  data,
  notice = '',
  error = '',
  onNavigate,
  onLogout
}) {
  const counts = data?.counts ?? {};
  const cards = [
    ['Usuários', counts.users],
    ['Jogadores', counts.players],
    ['Ativos', counts.active_users],
    ['Bloqueados', counts.blocked_users],
    ['Territórios', counts.territories],
    ['Trilhas', counts.tracks],
    ['Quests', counts.quests],
    ['Habilidades', counts.skills],
    ['Especializações', counts.professions]
  ];

  adminShell(root, {
    player,
    access,
    section: 'adminDashboard',
    title: 'Dashboard',
    notice,
    error,
    onNavigate,
    onLogout,
    children: el('div', { class: 'admin-dashboard' }, [
      el('section', { class: 'admin-metrics' }, cards.map(([label, value]) =>
        el('article', { class: 'admin-metric' }, [
          el('span', {}, label),
          el('strong', {}, String(value ?? 0))
        ])
      )),
      el('div', { class: 'admin-two-column' }, [
        adminList('Últimos usuários', (data?.recentUsers ?? []).map((user) =>
          el('div', { class: 'admin-activity-row' }, [
            el('strong', {}, user.email),
            el('span', {}, `${user.status} · ${formatDate(user.created_at)}`)
          ])
        )),
        adminList('Auditoria recente', (data?.recentAudit ?? []).map((entry) =>
          el('div', { class: 'admin-activity-row' }, [
            el('strong', {}, entry.action),
            el('span', {}, `${entry.entity_type} · ${formatDate(entry.created_at)}`)
          ])
        ))
      ])
    ])
  });
}

export function renderAdminUsers(root, {
  player,
  access,
  data,
  query = {},
  notice = '',
  error = '',
  onNavigate,
  onLogout,
  onSearch,
  onOpenUser
}) {
  adminShell(root, {
    player,
    access,
    section: 'adminUsers',
    title: 'Usuários',
    notice,
    error,
    onNavigate,
    onLogout,
    children: el('div', { class: 'admin-dashboard' }, [
      usersFilter(query, onSearch),
      usersTable(data, onOpenUser)
    ])
  });
}

export function renderAdminPlayers(root, {
  player,
  access,
  data,
  notice = '',
  error = '',
  onNavigate,
  onLogout,
  onOpenUser
}) {
  adminShell(root, {
    player,
    access,
    section: 'adminPlayers',
    title: 'Jogadores',
    notice,
    error,
    onNavigate,
    onLogout,
    children: el('div', { class: 'admin-dashboard' }, [
      usersTable(data, onOpenUser, true)
    ])
  });
}

export function renderAdminUserDetail(root, {
  player,
  access,
  detail,
  notice = '',
  error = '',
  onNavigate,
  onLogout,
  onBack,
  onBlock,
  onUnblock,
  onEmail,
  onResetPassword,
  onRoles
}) {
  if (!detail) {
    adminShell(root, {
      player,
      access,
      section: 'adminUsers',
      title: 'Usuário não encontrado',
      notice,
      error: error || 'O usuário solicitado não existe.',
      onNavigate,
      onLogout,
      children: el('p', { class: 'panel__note' }, 'Volte para a lista de usuários.'),
    });
    return;
  }

  const roles = detail.roles ?? [];
  const email = input(detail.email, 'email');
  const reason = input('', 'text');
  const roleInputs = new Map(
    ['administrator', 'content_manager', 'support'].map((roleId) => [
      roleId,
      el('input', { type: 'checkbox', value: roleId, checked: roles.some((role) => role.role_id === roleId) })
    ])
  );

  adminShell(root, {
    player,
    access,
    section: 'adminUsers',
    title: detail.email,
    notice,
    error,
    onNavigate,
    onLogout,
    children: el('div', { class: 'admin-dashboard' }, [
      el('div', { class: 'admin-page-actions' }, [
        el('button', { class: 'btn btn--ghost btn--small', type: 'button', onclick: onBack }, 'Voltar aos usuários')
      ]),
      el('div', { class: 'admin-two-column' }, [
        el('section', { class: 'admin-panel' }, [
          el('h3', {}, 'Identificação'),
          infoRow('ID', detail.id),
          infoRow('E-mail', detail.email),
          infoRow('Provider', detail.authProvider),
          infoRow('Situação', detail.status),
          infoRow('Cadastro', formatDate(detail.createdAt)),
          infoRow('Último acesso', detail.lastLoginAt ? formatDate(detail.lastLoginAt) : 'Nunca')
        ]),
        el('section', { class: 'admin-panel' }, [
          el('h3', {}, 'Jogador'),
          detail.player
            ? el('div', {}, [
                infoRow('ID', detail.player.id),
                infoRow('Nome', detail.player.name),
                infoRow('Avatar', detail.player.avatarId),
                infoRow('XP', detail.player.xpTotal),
                infoRow('Bio', detail.player.bio || 'Sem biografia')
              ])
            : el('p', { class: 'panel__note' }, 'Nenhum jogador associado.')
        ])
      ]),
      el('div', { class: 'admin-two-column' }, [
        el('section', { class: 'admin-panel' }, [
          el('h3', {}, 'Alterar e-mail'),
          label('Novo e-mail', email),
          el('button', {
            class: 'btn btn--ghost btn--small',
            type: 'button',
            onclick: () => onEmail(detail.id, email.value, reason.value)
          }, 'Solicitar alteração')
        ]),
        el('section', { class: 'admin-panel' }, [
          el('h3', {}, 'Acesso'),
          el('div', { class: 'admin-inline-actions' }, [
            detail.status === 'active'
              ? el('button', {
                  class: 'btn btn--ghost btn--small',
                  type: 'button',
                  onclick: () => onBlock(detail.id, reason.value)
                }, 'Bloquear conta')
              : el('button', {
                  class: 'btn btn--cafe btn--small',
                  type: 'button',
                  onclick: () => onUnblock(detail.id, reason.value)
                }, 'Reativar conta'),
            el('button', {
              class: 'btn btn--ghost btn--small',
              type: 'button',
              onclick: () => onResetPassword(detail.id, reason.value)
            }, 'Solicitar recuperação de senha')
          ]),
          label('Motivo / justificativa', reason)
        ])
      ]),
      el('section', { class: 'admin-panel' }, [
        el('h3', {}, 'Papéis administrativos'),
        el('div', { class: 'admin-role-list' }, [...roleInputs.entries()].map(([roleId, node]) =>
          el('label', { class: 'admin-role-choice' }, [node, roleLabel(roleId)])
        )),
        el('button', {
          class: 'btn btn--cafe btn--small',
          type: 'button',
          onclick: () => onRoles(detail.id, [...roleInputs.entries()].filter(([, node]) => node.checked).map(([roleId]) => roleId))
        }, 'Salvar papéis')
      ])
    ])
  });
}

export function renderAdminAudit(root, {
  player,
  access,
  data,
  query = {},
  notice = '',
  error = '',
  onNavigate,
  onLogout,
  onSearch
}) {
  adminShell(root, {
    player,
    access,
    section: 'adminAudit',
    title: 'Auditoria',
    notice,
    error,
    onNavigate,
    onLogout,
    children: el('div', { class: 'admin-dashboard' }, [
      auditFilter(query, onSearch),
      el('div', { class: 'admin-table-wrap' }, [
        el('table', { class: 'admin-table' }, [
          el('thead', {}, [el('tr', {}, ['Data', 'Ator', 'Operação', 'Entidade', 'Resultado'].map((label) => el('th', {}, label)))]),
          el('tbody', {}, (data?.logs ?? []).map((entry) =>
            el('tr', {}, [
              el('td', {}, formatDate(entry.created_at)),
              el('td', {}, entry.actor_user_id ?? 'Sistema'),
              el('td', {}, entry.action),
              el('td', {}, `${entry.entity_type}${entry.entity_id ? ` · ${entry.entity_id}` : ''}`),
              el('td', {}, entry.result)
            ])
          ))
        ])
      ])
    ])
  });
}

export function renderAdminSettings(root, {
  player,
  access,
  data,
  notice = '',
  error = '',
  onNavigate,
  onLogout,
  onSave
}) {
  const settings = Object.fromEntries((data?.settings ?? []).map((entry) => [entry.key, entry.value]));
  const flags = Object.fromEntries((data?.flags ?? []).map((entry) => [entry.key, entry.enabled]));
  const name = input(settings['platform.name']?.replace(/^"|"$/g, '') ?? 'Cafegeek', 'text');
  const description = input(settings['platform.description']?.replace(/^"|"$/g, '') ?? 'Jornada do Conhecimento', 'text');
  const flagInputs = new Map(
    Object.keys(flags).map((key) => [key, el('input', { type: 'checkbox', checked: Boolean(flags[key]) })])
  );

  adminShell(root, {
    player,
    access,
    section: 'adminSettings',
    title: 'Configurações',
    notice,
    error,
    onNavigate,
    onLogout,
    children: el('div', { class: 'admin-dashboard' }, [
      el('section', { class: 'admin-panel' }, [
        el('h3', {}, 'Configurações gerais'),
        label('Nome da plataforma', name),
        label('Descrição', description)
      ]),
      el('section', { class: 'admin-panel' }, [
        el('h3', {}, 'Funcionalidades'),
        el('div', { class: 'admin-role-list' }, [...flagInputs.entries()].map(([key, node]) =>
          el('label', { class: 'admin-role-choice' }, [node, key])
        ))
      ]),
      el('button', {
        class: 'btn btn--cafe',
        type: 'button',
        onclick: () => onSave({
          settings: {
            'platform.name': name.value,
            'platform.description': description.value
          },
          flags: Object.fromEntries([...flagInputs.entries()].map(([key, node]) => [key, node.checked]))
        })
      }, 'Salvar configurações')
    ])
  });
}

export function renderAdminForbidden(root, { player, onLogout }) {
  root.replaceChildren(
    el('div', { class: 'admin-shell' }, [
      el('main', { class: 'admin-forbidden' }, [
        el('h1', {}, 'Acesso administrativo negado'),
        el('p', {}, 'Sua conta não possui permissão para acessar esta área.'),
        el('button', { class: 'btn btn--ghost', type: 'button', onclick: onLogout }, 'Sair da conta')
      ])
    ])
  );
}

function adminShell(root, {
  player,
  access,
  section,
  title,
  notice,
  error,
  onNavigate,
  onLogout,
  children
}) {
  const permissions = new Set(access?.permissions ?? []);
  const navItems = NAV_ITEMS.filter((item) => !item.permission || permissions.has(item.permission));

  root.replaceChildren(
    el('div', { class: 'admin-shell' }, [
      el('aside', { class: 'admin-sidebar' }, [
        el('a', { class: 'public-brand', href: '#/' }, [
          el('img', { src: LOGO, alt: '' }),
          el('span', {}, [el('strong', {}, 'Cafegeek'), el('small', {}, 'Admin')])
        ]),
        el('nav', { class: 'admin-nav', 'aria-label': 'Navegação administrativa' }, navItems.map((item) =>
          el('button', {
            class: `admin-nav__item${section === item.id ? ' is-active' : ''}`,
            type: 'button',
            onclick: () => onNavigate(item.id)
          }, item.label)
        )),
        el('div', { class: 'admin-sidebar__footer' }, [
          el('span', {}, player?.name ?? ''),
          el('button', { class: 'auth-link', type: 'button', onclick: onLogout }, 'Sair da conta')
        ])
      ]),
      el('main', { class: 'admin-main' }, [
        el('header', { class: 'admin-header' }, [
          el('div', {}, [
            el('p', { class: 'panel__phase-label' }, 'Cafegeek — Administração'),
            el('h1', {}, title)
          ]),
          el('a', { class: 'btn btn--ghost btn--small', href: '#/jogador' }, 'Voltar ao jogo')
        ]),
        notice ? el('p', { class: 'form-success', role: 'status' }, notice) : null,
        error ? el('p', { class: 'form-error', role: 'alert' }, error) : null,
        children
      ])
    ])
  );
}

function usersFilter(query, onSearch) {
  const search = input(query.search ?? '', 'search');
  const status = select(['', 'active', 'disabled', 'pending'], query.status ?? '', ['Todos', 'Ativos', 'Bloqueados', 'Pendentes']);
  const role = select(['', 'administrator', 'content_manager', 'support'], query.role ?? '', ['Todos', 'Administrador', 'Gestor de conteúdo', 'Suporte']);
  const form = el('form', { class: 'admin-filter' }, [
    search,
    status,
    role,
    el('button', { class: 'btn btn--cafe btn--small', type: 'submit' }, 'Filtrar')
  ]);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    onSearch?.({ search: search.value, status: status.value, role: role.value, page: 1 });
  });
  return form;
}

function auditFilter(query, onSearch) {
  const action = input(query.action ?? '', 'text');
  const entity = input(query.entityType ?? '', 'text');
  const actor = input(query.actor ?? '', 'text');
  const form = el('form', { class: 'admin-filter' }, [
    action,
    entity,
    actor,
    el('button', { class: 'btn btn--cafe btn--small', type: 'submit' }, 'Filtrar')
  ]);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    onSearch?.({ action: action.value, entityType: entity.value, actor: actor.value, page: 1 });
  });
  return form;
}

function usersTable(data, onOpenUser, playersOnly = false) {
  const rows = data?.users ?? [];
  return el('div', { class: 'admin-table-wrap' }, [
    el('table', { class: 'admin-table' }, [
      el('thead', {}, [
        el('tr', {}, [
          el('th', {}, 'E-mail'),
          el('th', {}, 'Jogador'),
          el('th', {}, 'Cadastro'),
          el('th', {}, 'Último acesso'),
          el('th', {}, 'Situação'),
          el('th', {}, 'Ações')
        ])
      ]),
      el('tbody', {}, rows.length > 0
        ? rows.map((user) =>
            el('tr', {}, [
              el('td', {}, user.email),
              el('td', {}, user.playerName ?? 'Sem jogador'),
              el('td', {}, formatDate(user.createdAt)),
              el('td', {}, user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Nunca'),
              el('td', {}, user.status),
              el('td', {}, el('button', {
                class: 'btn btn--ghost btn--small',
                type: 'button',
                onclick: () => onOpenUser?.(user.id)
              }, 'Detalhes'))
            ])
          )
        : [el('tr', {}, [el('td', { colspan: '6' }, playersOnly ? 'Nenhum jogador encontrado.' : 'Nenhum usuário encontrado.')])]
      )
    ]),
    el('p', { class: 'panel__note' }, `${data?.total ?? 0} registros`)
  ]);
}

function adminList(title, children) {
  return el('section', { class: 'admin-panel' }, [
    el('h3', {}, title),
    children.length > 0 ? el('div', { class: 'admin-activity-list' }, children) : el('p', { class: 'panel__note' }, 'Sem atividades recentes.')
  ]);
}

function infoRow(labelText, value) {
  return el('div', { class: 'admin-info-row' }, [
    el('span', {}, labelText),
    el('strong', {}, String(value ?? '—'))
  ]);
}

function label(text, node) {
  return el('label', { class: 'admin-field' }, [el('span', {}, text), node]);
}

function input(value, type = 'text') {
  return el('input', { class: 'text-input', type, value: value ?? '' });
}

function select(options, selected, labels) {
  return el('select', { class: 'text-input' }, options.map((value, index) =>
    el('option', { value, selected: value === selected }, labels[index])
  ));
}

function roleLabel(roleId) {
  return {
    administrator: 'Administrador',
    content_manager: 'Gestor de conteúdo',
    support: 'Suporte'
  }[roleId] ?? roleId;
}

function formatDate(value) {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}
