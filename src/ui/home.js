import { getArchetype } from '../core/archetypes.js';
import { levelProgress } from '../core/progression.js';
import {
  AVATARS,
  formatPlayerName,
  validatePlayerName
} from '../core/players.js';
import { formatLastActivity } from '../core/profile.js';
import { avatarNode, createAvatarPicker } from './avatar.js';
import { el } from './dom.js';
import { renderWorldMapSection } from './worldMap.js';

const CAFEGEEK_LOGO = './assets/images/branding/cafegeek-logo.webp';

const FUTURE_QUESTS = [
  {
    id: 'sql',
    title: 'SQL',
    description: 'Consultas, filtros e manipulação de dados.',
    tag: 'Em breve'
  },
  {
    id: 'postgresql-admin',
    title: 'PostgreSQL Admin',
    description: 'Administração, desempenho e segurança de dados.',
    tag: 'Em breve'
  },
  {
    id: 'desenvolvimento',
    title: 'Desenvolvimento',
    description: 'Aplicações conectadas a dados reais.',
    tag: 'Em breve'
  }
];

export function renderHome(root, {
  player,
  character = null,
  catalog = null,
  progression = null,
  profiles = [],
  summary = null,
  showIdentity = false,
  hasLegacy = false,
  rankingMessage = '',
  world = null,
  questCatalog = null,
  questProgress = {},
  isAuthenticatedAccount = false,
  onLogout,
  onSelectProfile,
  onCreateProfile,
  onShowIdentity,
  onStart,
  onOpenProfile,
  onOpenCharacter,
  onOpenRanking,
  onOpenAchievements,
  onOpenChallenges,
  onOpenKnowledge,
  onOpenTerritory,
  onOpenTrack,
  onOpenQuest,
  onOpenHelp,
  onOpenAbout
}) {
  const identity = !player || showIdentity;
  const safeSummary = summary ?? emptySummary();
  const content = el('div', { class: 'platform-shell' }, [
    renderPlatformHeader({
      player,
      onOpenChallenges,
      onOpenKnowledge,
      onOpenRanking,
      onOpenAchievements
    }),
    renderPlatformHero(),
    identity
      ? renderIdentity({
          profiles,
          hasLegacy,
          onCreateProfile,
          onSelectProfile
        })
      : el('div', { class: 'platform-dashboard' }, [
          world
            ? renderWorldMapSection({
                world,
                questCatalog,
                questProgress,
                progression,
                onOpenTerritory,
                onOpenTrack
              })
            : null,
          el('div', { class: 'platform-primary-grid' }, [
            renderPlayerHome({
              player,
              character,
              catalog,
              progression,
              summary: safeSummary,
              rankingMessage,
              onOpenCharacter
            }),
            renderQuestSpotlight({
              summary: safeSummary,
              hasCharacter: Boolean(character),
              onStart: character ? onStart : onOpenCharacter
            })
          ]),
          renderHomeMenu({
            summary: safeSummary,
            hasCharacter: Boolean(character),
            onStart,
            onShowIdentity,
            onOpenProfile,
            onOpenCharacter,
            onOpenRanking,
            onOpenAchievements,
            onOpenChallenges,
            onOpenKnowledge,
            isAuthenticatedAccount,
            onLogout,
            onOpenHelp,
            onOpenAbout
          }),
          renderFutureCampaigns()
        ]),
    identity
      ? el('p', { class: 'splash__hint' }, 'Crie seu perfil para iniciar a jornada. Você pode adicionar mais perfis depois.')
      : el('p', { class: 'splash__hint' }, 'Dica: use Tab e Enter para navegar também pelo teclado.')
  ]);

  root.replaceChildren(content);
}

function renderPlatformHeader({
  player,
  onOpenChallenges,
  onOpenKnowledge,
  onOpenRanking,
  onOpenAchievements
}) {
  return el('header', { class: 'platform-header' }, [
    el('div', { class: 'platform-header__brand' }, [
      el('img', {
        class: 'platform-header__logo',
        src: CAFEGEEK_LOGO,
        alt: ''
      }),
      el('div', { class: 'platform-header__wordmark' }, [
        el('strong', {}, 'Cafegeek'),
        el('span', {}, 'Jornada do Conhecimento')
      ])
    ]),
    player
      ? el('nav', { class: 'platform-nav', 'aria-label': 'Navegação da plataforma' }, [
          el('span', { class: 'platform-nav__item is-active', 'aria-current': 'page' }, 'Início'),
          el(
            'button',
            {
              class: 'platform-nav__item',
              type: 'button',
              onclick: onOpenChallenges
            },
            'Desafios'
          ),
          el(
            'button',
            {
              class: 'platform-nav__item',
              type: 'button',
              onclick: onOpenKnowledge
            },
            'Mapa'
          ),
          el(
            'button',
            {
              class: 'platform-nav__item',
              type: 'button',
              onclick: onOpenRanking
            },
            'Ranking'
          ),
          el(
            'button',
            {
              class: 'platform-nav__item',
              type: 'button',
              onclick: onOpenAchievements
            },
            'Conquistas'
          )
        ])
      : el('span', { class: 'platform-header__status' }, 'Uma jornada de conhecimento')
  ]);
}

function renderPlatformHero() {
  return el('section', { class: 'platform-hero', 'aria-labelledby': 'platform-title' }, [
    el('div', { class: 'platform-hero__logo-plate' }, [
      el('img', {
        class: 'platform-logo',
        src: CAFEGEEK_LOGO,
        alt: 'Cafegeek — Jornada do Conhecimento'
      })
    ]),
    el('div', { class: 'platform-hero__content' }, [
      el('p', { class: 'platform-kicker' }, 'Cafegeek apresenta'),
      el(
        'h1',
        { class: 'platform-title splash__title cafe-brand__title', id: 'platform-title' },
        'Jornada do Conhecimento'
      ),
      el(
        'p',
        { class: 'platform-lead' },
        'Aprenda, desenvolva suas habilidades e supere desafios.'
      ),
      el('div', { class: 'platform-hero__tags', 'aria-label': 'Temas da jornada' }, [
        el('span', {}, 'Aventura'),
        el('span', {}, 'Tecnologia'),
        el('span', {}, 'Educação')
      ])
    ])
  ]);
}

function renderPlayerHome({
  player,
  character,
  catalog,
  progression,
  summary,
  rankingMessage,
  onOpenCharacter
}) {
  const rankText = summary.rank
    ? `#${summary.rank}`
    : rankingMessage || 'Ainda não ranqueado';
  const archetype = character
    ? catalog?.archetypes?.find((item) => item.id === character.archetypeId) ??
      getArchetype(character.archetypeId)
    : null;
  const archetypeLabel = archetype?.name ?? archetype?.label ?? 'Sem arquétipo';
  const title = character?.name ?? formatPlayerName(player.name);
  const imageId = character?.imageId ?? player.avatarId;
  const level = levelProgress(progression?.xp ?? character?.xp ?? 0);

  return el('section', { class: 'home-player platform-player', 'aria-labelledby': 'home-player-title' }, [
    el('div', { class: 'home-player__identity' }, [
      avatarNode(imageId, { size: 'xl' }),
      el('div', { class: 'platform-player__copy' }, [
        el('p', { class: 'panel__phase-label' }, character ? 'Personagem' : 'Jogador'),
        el('h2', { id: 'home-player-title' }, title),
        el(
          'p',
          { class: 'home-player__activity' },
          character
            ? `Jogador: ${formatPlayerName(player.name)} · ${archetypeLabel}`
            : `Jogador: ${formatPlayerName(player.name)} · personagem ainda não criado`
        ),
        el(
          'p',
          { class: 'home-player__activity' },
          `Última atividade: ${formatLastActivity(player.lastActivityAt)}`
        )
      ]),
      el(
        'button',
        {
          class: 'btn btn--ghost btn--small',
          type: 'button',
          onclick: onOpenCharacter
        },
        character ? 'Ficha do personagem' : 'Criar personagem'
      )
    ]),
    el('div', { class: 'platform-level', 'aria-label': `Nível ${level.level}, ${level.title}` }, [
      el('div', { class: 'platform-level__head' }, [
        el('span', {}, `Nível ${level.level} · ${level.title}`),
        el('strong', {}, `${level.xp} XP`)
      ]),
      el('span', { class: 'platform-level__track' }, [
        el('span', {
          class: 'platform-level__fill',
          style: `width: ${level.percent}%`
        })
      ]),
      el(
        'p',
        { class: 'panel__note' },
        level.nextLevel
          ? `${level.totalToNext} XP para o nível ${level.nextLevel}`
          : 'Nível máximo alcançado'
      )
    ]),
    el('div', { class: 'home-player__stats' }, [
      statCard('Pontuação NORMALIZA', `${summary.totalScore} pts`, 'home-stat--score'),
      statCard('Ranking', rankText, 'home-stat--rank'),
      statCard('Fases concluídas', `${summary.completedPhases} / ${summary.totalPhases}`, 'home-stat--phases')
    ]),
    summary.pendingCount > 0
      ? el(
          'p',
          { class: 'sync-note' },
          `${summary.pendingCount} resultado(s) aguardando sincronização com o ranking.`
        )
      : null,
    el(
      'div',
      {
        class: 'home-progress',
        role: 'progressbar',
        'aria-label': 'Progresso da Quest 01',
        'aria-valuemin': '0',
        'aria-valuemax': '100',
        'aria-valuenow': String(summary.evolutionPercent)
      },
      [
        el('div', { class: 'home-progress__head' }, [
          el('span', {}, 'Evolução da Quest 01'),
          el('strong', {}, `${summary.evolutionPercent}%`)
        ]),
        el('span', { class: 'home-progress__track' }, [
          el('span', {
            class: 'progress-meter__fill',
            style: `width: ${summary.evolutionPercent}%`
          })
        ])
      ]
    )
  ]);
}

function renderQuestSpotlight({ summary, hasCharacter, onStart }) {
  const completed = summary.completedPhases;
  const total = summary.totalPhases || 4;
  const status = !hasCharacter
    ? 'Personagem necessário'
    : completed >= total
      ? 'Concluída'
      : completed > 0
        ? 'Em andamento'
        : 'Disponível';

  return el(
    'section',
    { class: 'quest-spotlight', 'aria-labelledby': 'quest-spotlight-title' },
    [
      el('div', { class: 'quest-spotlight__top' }, [
        el('span', { class: 'quest-spotlight__eyebrow' }, 'Quest 01'),
        el('span', { class: 'quest-spotlight__status' }, status)
      ]),
      el('div', { class: 'quest-spotlight__body' }, [
        el('div', { class: 'quest-spotlight__sigil', 'aria-hidden': 'true' }, 'N'),
        el('div', { class: 'quest-spotlight__copy' }, [
          el('p', { class: 'panel__phase-label' }, 'Primeira aventura'),
          el('h2', { id: 'quest-spotlight-title' }, 'NORMALIZA!'),
          el(
            'p',
            {},
            'Organize uma cidade de dados e domine a Primeira, a Segunda e a Terceira Forma Normal.'
          ),
          el('div', { class: 'quest-spotlight__tags' }, [
            el('span', {}, '1FN'),
            el('span', {}, '2FN'),
            el('span', {}, '3FN'),
            el('span', {}, `${completed} / ${total} fases`)
          ])
        ]),
        el(
          'button',
          { class: 'btn btn--cafe', type: 'button', onclick: onStart },
          !hasCharacter
            ? 'Criar personagem'
            : completed >= total
              ? 'Revisitar quest'
              : completed > 0
                ? 'Continuar quest'
                : 'Abrir quest'
        )
      ])
    ]
  );
}

function renderFutureCampaigns() {
  return el('section', { class: 'future-campaigns', 'aria-labelledby': 'future-title' }, [
    el('div', { class: 'platform-section-head' }, [
      el('div', {}, [
        el('p', { class: 'panel__phase-label' }, 'Jornada'),
        el('h2', { id: 'future-title' }, 'Próximos desafios')
      ]),
      el('span', { class: 'panel__note' }, 'Novas campanhas serão adicionadas à jornada.')
    ]),
    el(
      'div',
      { class: 'future-grid' },
      FUTURE_QUESTS.map((quest) =>
        el('article', { class: 'future-card', 'aria-disabled': 'true' }, [
          el('span', { class: 'future-card__tag' }, quest.tag),
          el('strong', {}, quest.title),
          el('p', {}, quest.description)
        ])
      )
    )
  ]);
}

function renderHomeMenu({
  summary,
  hasCharacter,
  onStart,
  onShowIdentity,
  onOpenProfile,
  onOpenCharacter,
  onOpenRanking,
  onOpenAchievements,
  onOpenChallenges,
  onOpenKnowledge,
  isAuthenticatedAccount = false,
  onLogout,
  onOpenHelp,
  onOpenAbout
}) {
  const hasProgress = summary.completedPhases > 0;
  const primaryLabel = !hasCharacter
    ? 'Criar personagem'
    : hasProgress
      ? 'Continuar jornada'
      : 'Iniciar jornada';

  return el('nav', { class: 'home-menu platform-menu', 'aria-label': 'Menu principal' }, [
    menuButton(
      primaryLabel,
      hasCharacter ? 'Entrar na Quest 01 — NORMALIZA!' : 'Prepare sua ficha para começar',
      hasCharacter ? onStart : onOpenCharacter,
      true
    ),
    menuButton(
      hasCharacter ? 'Selecionar personagem' : 'Criar personagem',
      hasCharacter ? 'Abrir a ficha do personagem ativo' : 'Escolher nome, imagem e arquétipo',
      onOpenCharacter
    ),
    isAuthenticatedAccount
      ? null
      : menuButton('Trocar jogador', 'Escolher outro perfil deste navegador', onShowIdentity),
    menuButton('Meu Perfil', 'Ver e editar seus dados', onOpenProfile),
    menuButton('Consultar desafios', 'Conhecer as quests da plataforma', onOpenChallenges),
    menuButton('Mapa do conhecimento', 'Explorar territórios, trilhas e habilidades', onOpenKnowledge),
    menuButton('Ranking', 'Classificação dos jogadores', onOpenRanking),
    menuButton('Conquistas', 'Medalhas e resultados', onOpenAchievements),
    menuButton('Glossário', 'Conceitos de normalização', onOpenHelp),
    menuButton('Sobre o jogo', 'Como o NORMALIZA! funciona', onOpenAbout),
    isAuthenticatedAccount && onLogout
      ? menuButton('Sair da conta', 'Encerrar a sessão neste navegador', onLogout)
      : null
  ]);
}

function renderIdentity({ profiles, hasLegacy, onCreateProfile, onSelectProfile }) {
  let error = '';
  let selectedAvatarId = AVATARS[0].id;
  const nameInput = el('input', {
    id: 'player-name',
    class: 'text-input',
    type: 'text',
    name: 'player-name',
    maxlength: '20',
    minlength: '3',
    required: true,
    autocomplete: 'nickname',
    placeholder: 'Como você quer ser chamado?',
    'aria-describedby': 'player-name-help player-name-error'
  });
  const errorNode = el('p', { class: 'form-error', id: 'player-name-error', role: 'alert' });
  const bioInput = el('textarea', {
    id: 'player-bio',
    class: 'text-area',
    name: 'player-bio',
    maxlength: '280',
    rows: '3',
    placeholder: 'Uma breve apresentação (opcional)',
    'aria-describedby': 'player-bio-help'
  });
  const picker = createAvatarPicker({
    selectedId: selectedAvatarId,
    onSelect: (avatarId) => {
      selectedAvatarId = avatarId;
    }
  });
  const form = el('form', { class: 'identity-form' }, [
    el('div', { class: 'identity-form__heading' }, [
      el('p', { class: 'panel__phase-label' }, profiles.length > 0 ? 'Novo jogador' : 'Comece aqui'),
      el(
        'h2',
        {},
        profiles.length > 0 ? 'Crie outro perfil' : 'Quem está entrando na jornada?'
      ),
      el(
        'p',
        { class: 'panel__note' },
        'Escolha um nome e um avatar inicial. Não pedimos nome completo, CPF ou email.'
      )
    ]),
    el('label', { class: 'field-label', for: 'player-name' }, 'Nome ou apelido'),
    nameInput,
    el(
      'p',
      { class: 'field-help', id: 'player-name-help' },
      'Entre 3 e 20 caracteres: letras, números, espaço, hífen ou sublinhado.'
    ),
    errorNode,
    el('label', { class: 'field-label', for: 'player-bio' }, 'Biografia (opcional)'),
    bioInput,
    el(
      'p',
      { class: 'field-help', id: 'player-bio-help' },
      'Uma breve descrição para seu perfil, com até 280 caracteres.'
    ),
    el('p', { class: 'field-label' }, 'Retrato inicial'),
    picker.element,
    el(
      'p',
      { class: 'field-help' },
      'Depois de criar seu perfil, você escolhe o nome, o arquétipo e a imagem do personagem na próxima tela.'
    ),
    hasLegacy
      ? el(
          'p',
          { class: 'identity-legacy-note' },
          'Encontramos um progresso antigo neste navegador. Ele será migrado para o primeiro perfil criado.'
        )
      : null,
    el(
      'button',
      { class: 'btn btn--cafe btn--block', type: 'submit' },
      'Começar jornada'
    )
  ]);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const validation = validatePlayerName(nameInput.value, {
      existingNames: profiles.map((profile) => profile.name)
    });

    if (!validation.valid) {
      error = validation.errors[0];
      errorNode.textContent = error;
      nameInput.setAttribute('aria-invalid', 'true');
      nameInput.focus();
      return;
    }

    errorNode.textContent = '';
    nameInput.removeAttribute('aria-invalid');
    onCreateProfile?.({
      name: validation.name,
      bio: bioInput.value,
      avatarId: picker.getSelected()
    });
  });

  return el('section', { class: 'identity-card platform-identity', 'aria-labelledby': 'identity-title' }, [
    el('h2', { class: 'sr-only', id: 'identity-title' }, 'Seleção de jogador'),
    profiles.length > 0
      ? el('div', { class: 'profile-picker' }, [
          el('div', { class: 'identity-form__heading' }, [
            el('p', { class: 'panel__phase-label' }, 'Continuar'),
            el('h2', {}, 'Perfis neste navegador'),
            el(
              'p',
              { class: 'panel__note' },
              'Cada perfil tem pontuação e progresso independentes.'
            )
          ]),
          el(
            'div',
            { class: 'profile-picker__list' },
            profiles.map((profile) =>
              el(
                'button',
                {
                  class: 'profile-pick',
                  type: 'button',
                  onclick: () => onSelectProfile?.(profile.id)
                },
                [
                  avatarNode(profile.avatarId, { size: 'md' }),
                  el('span', { class: 'profile-pick__main' }, [
                    el('strong', {}, formatPlayerName(profile.name)),
                    el(
                      'span',
                      {},
                      `Última atividade: ${formatLastActivity(profile.lastActivityAt)}`
                    )
                  ]),
                  el('span', { class: 'profile-pick__action' }, 'Entrar')
                ]
              )
            )
          ),
          el('div', { class: 'identity-divider' }, 'ou crie um novo perfil')
        ])
      : null,
    form
  ]);
}

function menuButton(label, description, onClick, primary = false) {
  return el(
    'button',
    {
      class: `home-menu__btn${primary ? ' is-primary' : ''}`,
      type: 'button',
      onclick: onClick
    },
    [
      el('strong', {}, label),
      el('span', {}, description)
    ]
  );
}

function statCard(label, value, className) {
  return el('div', { class: `home-stat ${className}` }, [
    el('span', {}, label),
    el('strong', {}, value)
  ]);
}

function emptySummary() {
  return {
    totalScore: 0,
    completedPhases: 0,
    totalPhases: 4,
    evolutionPercent: 0,
    medals: [],
    rank: null,
    pendingCount: 0
  };
}
