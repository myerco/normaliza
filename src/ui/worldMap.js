import {
  QUEST_STATUS,
  QUEST_STATUS_LABELS,
  describePrerequisites,
  questStatusFor
} from '../core/quests.js';
import {
  TERRITORY_STATUS_LABELS,
  TRACK_STATUS_LABELS,
  progressForTerritory,
  progressForTrack,
  skillLevelsFromProgression,
  territoryTracks,
  trackProgressMap,
  trackQuestLinks,
  trackSkills
} from '../core/world.js';
import { el, svgEl } from './dom.js';
import { renderPage } from './page.js';

export function renderWorldMapSection({
  world,
  questCatalog,
  questProgress = {},
  progression = null,
  onOpenTerritory,
  onOpenTrack
}) {
  const territories = (world?.territories ?? []).filter((territory) => (territory.status ?? 'published') === 'published');

  if (territories.length === 0) {
    return el('section', { class: 'world-map world-map--empty' }, [
      el('p', { class: 'panel__note' }, 'Nenhum território publicado.')
    ]);
  }

  const trackProgress = trackProgressMap(world, questProgress);
  const levels = skillLevelsFromProgression(progression);
  const buttons = new Map();
  let selectedId =
    territories.find((territory) => territory.id === 'dados')?.id ?? territories[0].id;

  const detail = el('aside', { class: 'world-detail', 'aria-live': 'polite' });
  const board = el('div', { class: 'world-map__board' });
  const roads = svgEl('svg', {
    class: 'world-map__roads',
    viewBox: '0 0 100 100',
    preserveAspectRatio: 'none',
    'aria-hidden': 'true'
  });

  for (const path of [
    'M 17 26 C 28 10, 38 11, 45 15',
    'M 45 15 C 58 4, 73 14, 79 29',
    'M 31 50 C 36 39, 41 27, 45 15',
    'M 36 57 C 53 61, 63 63, 70 63',
    'M 71 56 C 75 48, 77 39, 79 29',
    'M 45 21 C 48 36, 53 51, 68 65'
  ]) {
    roads.append(
      svgEl('path', {
        d: path,
        class: 'world-map__road'
      })
    );
  }

  board.append(roads);

  const paintDetail = () => {
    const territory = territories.find((item) => item.id === selectedId) ?? territories[0];
    const progress = progressForTerritory(territory.id, world, questProgress);
    const tracks = territoryTracks(territory.id, world);
    const territorySkillIds = new Set();

    for (const track of tracks) {
      for (const skill of trackSkills(track.id, world)) {
        territorySkillIds.add(skill.skillId);
      }
    }

    const skills = [...territorySkillIds]
      .map((skillId) => world.skills.find((skill) => skill.id === skillId))
      .filter(Boolean)
      .slice(0, 6);

    detail.replaceChildren(
      el('div', { class: 'world-detail__top' }, [
        el('span', { class: 'world-detail__icon', style: `--territory-color:${territory.color}` }, territory.icon),
        el('div', {}, [
          el('p', { class: 'panel__phase-label' }, 'Território'),
          el('h3', {}, territory.name),
          el('p', { class: 'panel__note' }, territory.description)
        ])
      ]),
      el('div', { class: 'world-detail__progress' }, [
        el('div', { class: 'world-detail__progress-head' }, [
          el('span', {}, TERRITORY_STATUS_LABELS[progress.status] ?? progress.status),
          el('strong', {}, `${progress.percent}%`)
        ]),
        progressBar(progress.percent, territory.color)
      ]),
      el('div', { class: 'world-detail__stats' }, [
        stat('Trilhas', `${progress.completedTracks} / ${progress.totalTracks}`),
        stat('Quests', `${progress.completed} / ${progress.total}`),
        stat('Explorado', progress.explored ? 'Sim' : 'Ainda não')
      ]),
      tracks.length > 0
        ? el('div', { class: 'world-detail__tracks' }, [
            el('p', { class: 'panel__phase-label' }, 'Trilhas'),
            ...tracks.slice(0, 5).map((track) =>
              trackRow(track, trackProgress.get(track.id), onOpenTrack)
            )
          ])
        : el('p', { class: 'panel__note' }, 'Território em expansão. Novas trilhas serão publicadas.'),
      skills.length > 0
        ? el('div', { class: 'world-detail__skills' }, [
            el('p', { class: 'panel__phase-label' }, 'Competências'),
            el('div', { class: 'world-skill-tags' }, skills.map((skill) =>
              el('span', { class: 'world-skill-tag' }, [
                skill.name,
                el('strong', {}, `${levels[skill.id] ?? 0}/${skill.maxLevel ?? 10}`)
              ])
            ))
          ])
        : null,
      onOpenTerritory
        ? el('button', {
            class: 'btn btn--ghost btn--small btn--block',
            type: 'button',
            onclick: () => onOpenTerritory(territory.id)
          }, 'Explorar território')
        : null
    );
  };

  const select = (territoryId) => {
    selectedId = territoryId;

    for (const [id, button] of buttons) {
      button.classList.toggle('is-selected', id === selectedId);
      button.setAttribute('aria-pressed', String(id === selectedId));
    }

    paintDetail();
  };

  for (const territory of territories) {
    const progress = progressForTerritory(territory.id, world, questProgress);
    const button = el(
      'button',
      {
        class: `world-territory is-${progress.status}`,
        type: 'button',
        'data-territory-id': territory.id,
        'aria-pressed': 'false',
        style: `--territory-color:${territory.color}; left:${territory.mapX}%; top:${territory.mapY}%`,
        onclick: () => select(territory.id)
      },
      [
        el('span', { class: 'world-territory__icon' }, territory.icon),
        el('span', { class: 'world-territory__name' }, territory.name),
        el('span', { class: 'world-territory__meta' }, [
          `${progress.percent}%`,
          territory.frontier ? el('em', {}, 'fronteira') : null
        ])
      ]
    );
    buttons.set(territory.id, button);
    board.append(button);
  }

  select(selectedId);

  return el('section', { class: 'world-map', 'aria-labelledby': 'world-map-title' }, [
    el('div', { class: 'world-map__head' }, [
      el('div', {}, [
        el('p', { class: 'panel__phase-label' }, 'Mapa do mundo'),
        el('h2', { id: 'world-map-title' }, 'Territórios do conhecimento'),
        el('p', { class: 'panel__note' }, 'Escolha uma região para revelar suas trilhas e quests.')
      ]),
      el('div', { class: 'world-map__legend', 'aria-label': 'Legenda dos territórios' }, [
        legend('Disponível', 'available'),
        legend('Explorando', 'in_progress'),
        legend('Concluído', 'completed')
      ])
    ]),
    el('div', { class: 'world-map__layout' }, [board, detail])
  ]);
}

export function renderWorldMapPage(root, {
  player,
  world,
  questCatalog,
  questProgress = {},
  progression = null,
  onBack,
  onOpenTerritory,
  onOpenTrack
}) {
  renderPage(root, {
    title: 'Mapa do Mundo',
    eyebrow: 'Cafegeek — Territórios de conhecimento',
    player,
    onBack,
    children: el('div', { class: 'world-map-page' }, [
      renderWorldMapSection({
        world,
        questCatalog,
        questProgress,
        progression,
        onOpenTerritory,
        onOpenTrack
      })
    ])
  });
}

export function renderTerritoryPage(root, {
  player,
  world,
  territory,
  questCatalog,
  questProgress = {},
  progression = null,
  onBack,
  onOpenTrack
}) {
  if (!territory) {
    renderPage(root, {
      title: 'Território não encontrado',
      eyebrow: 'Mapa do Mundo',
      player,
      onBack,
      children: el('p', { class: 'panel__note' }, 'Este território não está publicado.')
    });
    return;
  }

  const progress = progressForTerritory(territory.id, world, questProgress);
  const tracks = territoryTracks(territory.id, world);
  const trackProgress = trackProgressMap(world, questProgress);
  const levels = skillLevelsFromProgression(progression);

  renderPage(root, {
    title: territory.name,
    eyebrow: 'Território de conhecimento',
    player,
    onBack,
    children: el('div', { class: 'world-territory-page' }, [
      el('section', { class: 'world-territory-hero', style: `--territory-color:${territory.color}` }, [
        el('span', { class: 'world-territory-hero__icon' }, territory.icon),
        el('div', { class: 'world-territory-hero__copy' }, [
          el('p', { class: 'panel__phase-label' }, territory.shortName ?? 'Território'),
          el('h2', {}, territory.name),
          el('p', { class: 'panel__note' }, territory.description),
          el('div', { class: 'world-detail__progress' }, [
            el('div', { class: 'world-detail__progress-head' }, [
              el('span', {}, TERRITORY_STATUS_LABELS[progress.status] ?? progress.status),
              el('strong', {}, `${progress.percent}%`)
            ]),
            progressBar(progress.percent, territory.color)
          ])
        ]),
        el('div', { class: 'world-territory-hero__stats' }, [
          stat('Trilhas', `${progress.completedTracks} / ${progress.totalTracks}`),
          stat('Quests', `${progress.completed} / ${progress.total}`),
          stat('Explorado', progress.explored ? 'Sim' : 'Ainda não')
        ])
      ]),
      el('section', { class: 'world-track-list' }, [
        el('div', { class: 'platform-section-head' }, [
          el('div', {}, [
            el('p', { class: 'panel__phase-label' }, 'Trilhas'),
            el('h2', {}, 'Caminhos deste território')
          ]),
          el('span', { class: 'panel__note' }, `${tracks.length} trilhas publicadas`)
        ]),
        tracks.length > 0
          ? el('div', { class: 'world-track-grid' }, tracks.map((track) =>
              trackCard(track, trackProgress.get(track.id), world, levels, onOpenTrack)
            ))
          : el('p', { class: 'panel__note' }, 'Este território está em expansão.')
      ])
    ])
  });
}

export function renderTrackPage(root, {
  player,
  world,
  track,
  questCatalog,
  questProgress = {},
  progression = null,
  onBack,
  onOpenQuest
}) {
  if (!track) {
    renderPage(root, {
      title: 'Trilha não encontrada',
      eyebrow: 'Mapa do Mundo',
      player,
      onBack,
      children: el('p', { class: 'panel__note' }, 'Esta trilha não está publicada.')
    });
    return;
  }

  const progress = progressForTrack(track.id, world, questProgress);
  const skills = trackSkills(track.id, world);
  const levels = skillLevelsFromProgression(progression);
  const quests = trackQuestLinks(track.id, world)
    .map((link) => ({
      link,
      quest: (questCatalog?.quests ?? []).find((quest) => quest.id === link.questId)
    }))
    .filter((item) => item.quest);

  renderPage(root, {
    title: track.name,
    eyebrow: 'Trilha de conhecimento',
    player,
    onBack,
    children: el('div', { class: 'world-track-page' }, [
      el('section', { class: 'world-track-hero' }, [
        el('div', {}, [
          el('p', { class: 'panel__phase-label' }, 'Objetivo'),
          el('h2', {}, track.name),
          el('p', { class: 'panel__note' }, track.description),
          el('p', { class: 'world-track-objective' }, track.objective)
        ]),
        el('div', { class: 'world-track-hero__stats' }, [
          stat('Progresso', `${progress.percent}%`),
          stat('Quests', `${progress.completed} / ${progress.total}`),
          stat('Status', TRACK_STATUS_LABELS[progress.status] ?? progress.status)
        ])
      ]),
      progressBar(progress.percent, '#9acb45'),
      el('section', { class: 'world-track-skills' }, [
        el('p', { class: 'panel__phase-label' }, 'Habilidades desenvolvidas'),
        skills.length > 0
          ? el('div', { class: 'world-skill-tags' }, skills.map((link) => {
              const skill = world.skills.find((item) => item.id === link.skillId);
              return el('span', { class: 'world-skill-tag' }, [
                skill?.name ?? link.skillId,
                el('strong', {}, `${levels[link.skillId] ?? 0}/${skill?.maxLevel ?? 10}`)
              ]);
            }))
          : el('p', { class: 'panel__note' }, 'Habilidades em definição.')
      ]),
      el('section', { class: 'world-quest-list' }, [
        el('div', { class: 'platform-section-head' }, [
          el('div', {}, [
            el('p', { class: 'panel__phase-label' }, 'Quests'),
            el('h2', {}, 'Desafios desta trilha')
          ])
        ]),
        quests.length > 0
          ? el('div', { class: 'world-quest-list__items' }, quests.map(({ link, quest }) =>
              questRow(quest, link, questCatalog, questProgress, onOpenQuest)
            ))
          : el('p', { class: 'panel__note' }, 'Nenhuma quest publicada nesta trilha ainda.')
      ])
    ])
  });
}

export function renderQuestDetailPage(root, {
  player,
  character,
  world,
  quest,
  questCatalog,
  questProgress = {},
  progression = null,
  onBack,
  onStartQuest
}) {
  const status = quest
    ? questStatusFor(quest, questProgress, questCatalog?.dependencies ?? [])
    : QUEST_STATUS.locked;
  const skills = quest
    ? (world?.questSkills ?? []).filter((link) => link.questId === quest.id)
    : [];
  const levels = skillLevelsFromProgression(progression);
  const prerequisites = quest
    ? describePrerequisites(quest.id, questCatalog?.quests ?? [], questCatalog?.dependencies ?? [])
    : [];
  const canStart =
    Boolean(character) &&
    Boolean(quest?.moduleKey) &&
    status !== QUEST_STATUS.locked;

  renderPage(root, {
    title: quest?.name ?? 'Quest não encontrada',
    eyebrow: 'Detalhe da quest',
    player,
    onBack,
    children: quest
      ? el('div', { class: 'world-quest-page' }, [
          el('section', { class: 'world-quest-hero' }, [
            el('div', { class: 'world-quest-hero__sigil' }, String(quest.order ?? 1).padStart(2, '0')),
            el('div', { class: 'world-quest-hero__copy' }, [
              el('p', { class: 'panel__phase-label' }, quest.category ?? 'Quest'),
              el('h2', {}, quest.name),
              el('p', { class: 'panel__note' }, quest.description),
              el('p', { class: 'world-quest-objective' }, quest.objective ?? 'Conclua o desafio para desenvolver suas habilidades.'),
              el('div', { class: 'quest-spotlight__tags' }, [
                el('span', {}, QUEST_STATUS_LABELS[status] ?? status),
                el('span', {}, `${quest.xpReward ?? 0} XP`),
                el('span', {}, `Dificuldade ${quest.difficulty ?? 1}/5`)
              ])
            ]),
            el('button', {
              class: 'btn btn--cafe',
              type: 'button',
              disabled: !canStart,
              onclick: canStart ? () => onStartQuest?.(quest) : undefined
            }, canStart ? (status === QUEST_STATUS.completed ? 'Revisitar quest' : 'Iniciar quest') : 'Indisponível')
          ]),
          el('div', { class: 'world-quest-grid' }, [
            el('section', { class: 'panel' }, [
              el('p', { class: 'panel__phase-label' }, 'Habilidades'),
              skills.length > 0
                ? el('div', { class: 'world-skill-tags' }, skills.map((link) => {
                    const skill = world.skills.find((item) => item.id === link.skillId);
                    return el('span', { class: 'world-skill-tag' }, [
                      skill?.name ?? link.skillId,
                      el('strong', {}, `+${link.levelDelta ?? 1}`)
                    ]);
                  }))
                : el('p', { class: 'panel__note' }, 'Habilidades em definição.')
            ]),
            el('section', { class: 'panel' }, [
              el('p', { class: 'panel__phase-label' }, 'Pré-requisitos'),
              prerequisites.length > 0
                ? el('ul', { class: 'world-prerequisite-list' }, prerequisites.map((item) =>
                    el('li', {}, item.name)
                  ))
                : el('p', { class: 'panel__note' }, 'Nenhum pré-requisito.')
            ]),
            el('section', { class: 'panel' }, [
              el('p', { class: 'panel__phase-label' }, 'Seu progresso'),
              el('div', { class: 'world-detail__stats' }, [
                stat('Estado', QUEST_STATUS_LABELS[status] ?? status),
                stat('Melhor score', `${questProgress[quest.id]?.bestScore ?? 0} / ${quest.maxScore ?? 100}`),
                stat('Tentativas', `${questProgress[quest.id]?.attempts ?? 0}`)
              ]),
              skills.length > 0
                ? el('p', { class: 'panel__note' }, `Níveis atuais: ${skills.map((link) => {
                    const skill = world.skills.find((item) => item.id === link.skillId);
                    return `${skill?.name ?? link.skillId} ${levels[link.skillId] ?? 0}`;
                  }).join(' · ')}`)
                : null
            ])
          ])
        ])
      : el('p', { class: 'panel__note' }, 'A quest solicitada não está publicada.')
  });
}

function trackRow(track, progress, onOpenTrack) {
  return el('button', {
    class: `world-track-row is-${progress?.status ?? 'locked'}`,
    type: 'button',
    onclick: onOpenTrack ? () => onOpenTrack(track.id) : undefined
  }, [
    el('span', { class: 'world-track-row__name' }, track.name),
    el('span', { class: 'world-track-row__meta' }, `${progress?.percent ?? 0}%`),
    el('span', { class: 'world-track-row__status' }, TRACK_STATUS_LABELS[progress?.status] ?? 'Bloqueada')
  ]);
}

function trackCard(track, progress, world, levels, onOpenTrack) {
  const skills = trackSkills(track.id, world).slice(0, 4);

  return el('article', { class: `world-track-card is-${progress?.status ?? 'locked'}` }, [
    el('div', { class: 'world-track-card__top' }, [
      el('span', { class: 'panel__phase-label' }, 'Trilha'),
      el('span', { class: 'challenge-card__status' }, TRACK_STATUS_LABELS[progress?.status] ?? 'Bloqueada')
    ]),
    el('h3', {}, track.name),
    el('p', {}, track.description),
    progressBar(progress?.percent ?? 0, '#9acb45'),
    el('div', { class: 'world-skill-tags' }, skills.map((link) => {
      const skill = world.skills.find((item) => item.id === link.skillId);
      return el('span', { class: 'world-skill-tag' }, [
        skill?.name ?? link.skillId,
        el('strong', {}, `${levels[link.skillId] ?? 0}`)
      ]);
    })),
    el('button', {
      class: 'btn btn--ghost btn--small btn--block',
      type: 'button',
      disabled: !onOpenTrack,
      onclick: onOpenTrack ? () => onOpenTrack(track.id) : undefined
    }, 'Abrir trilha')
  ]);
}

function questRow(quest, link, questCatalog, questProgress, onOpenQuest) {
  const status = questStatusFor(quest, questProgress, questCatalog?.dependencies ?? []);

  return el('article', {
    class: `world-quest-row is-${status}`,
    'data-quest-id': quest.id
  }, [
    el('div', { class: 'world-quest-row__index' }, String(link.order ?? quest.order ?? 1).padStart(2, '0')),
    el('div', { class: 'world-quest-row__copy' }, [
      el('strong', {}, quest.name),
      el('span', {}, quest.description),
      el('small', {}, `${QUEST_STATUS_LABELS[status] ?? status} · ${quest.xpReward ?? 0} XP`)
    ]),
    el('button', {
      class: 'btn btn--ghost btn--small',
      type: 'button',
      onclick: onOpenQuest ? () => onOpenQuest(quest.id) : undefined
    }, 'Ver quest')
  ]);
}

function progressBar(percent, color) {
  return el('span', {
    class: 'world-progress',
    role: 'progressbar',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    'aria-valuenow': String(percent),
    style: `--progress-color:${color ?? '#9acb45'}`
  }, [
    el('span', { class: 'world-progress__fill', style: `width:${percent}%` })
  ]);
}

function stat(label, value) {
  return el('div', { class: 'world-stat' }, [
    el('span', {}, label),
    el('strong', {}, value)
  ]);
}

function legend(label, status) {
  return el('span', { class: `world-map__legend-item is-${status}` }, [
    el('span'),
    label
  ]);
}
