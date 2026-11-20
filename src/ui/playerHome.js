import { getArchetype } from '../core/archetypes.js';
import {
  PROGRESSION_ACHIEVEMENTS,
  levelProgress
} from '../core/progression.js';
import {
  QUEST_STATUS,
  QUEST_STATUS_LABELS,
  questStatusFor
} from '../core/quests.js';
import {
  progressForTerritory,
  skillLevelsFromProgression,
  worldProgress
} from '../core/world.js';
import { avatarNode } from './avatar.js';
import { el } from './dom.js';
import { renderPlayerNavigation } from './playerLayout.js';

export function renderPlayerHome(root, {
  player,
  character = null,
  catalog = null,
  progression = null,
  summary = null,
  world = null,
  questCatalog = null,
  questProgress = {},
  rankingMessage = '',
  onEditCharacter,
  onOpenWorld,
  onOpenMissions,
  onOpenTalents,
  onOpenProfile,
  onOpenRanking,
  onOpenAchievements,
  onStartQuest,
  onOpenQuest,
  onLogout
}) {
  const safeSummary = summary ?? {};
  const level = levelProgress(progression?.xp ?? character?.xp ?? 0);
  const archetype = character
    ? catalog?.archetypes?.find((item) => item.id === character.archetypeId) ??
      getArchetype(character.archetypeId)
    : null;
  const imageId = character?.imageId ?? player?.avatarId;
  const quests = (questCatalog?.quests ?? []).filter((quest) => quest.active !== false);
  const dependencies = questCatalog?.dependencies ?? [];
  const currentQuest =
    quests.find((quest) => quest.id === 'normaliza') ??
    quests.find((quest) => questStatusFor(quest, questProgress, dependencies) === QUEST_STATUS.in_progress) ??
    quests.find((quest) => questStatusFor(quest, questProgress, dependencies) === QUEST_STATUS.available) ??
    quests[0] ??
    null;
  const currentStatus = currentQuest
    ? questStatusFor(currentQuest, questProgress, dependencies)
    : QUEST_STATUS.locked;
  const nextActivity = quests
    .filter((quest) => quest.id !== currentQuest?.id)
    .map((quest) => ({
      quest,
      status: questStatusFor(quest, questProgress, dependencies)
    }))
    .find((entry) => entry.status !== QUEST_STATUS.completed) ?? null;
  const worldSummary = worldProgress(world, questProgress);
  const skillLevels = skillLevelsFromProgression(progression);
  const topTalents = (world?.skills ?? [])
    .filter((skill) => skill.status === 'published')
    .map((skill) => ({ ...skill, level: skillLevels[skill.id] ?? 0 }))
    .sort((first, second) => second.level - first.level || (first.order ?? 0) - (second.order ?? 0))
    .slice(0, 4);
  const earnedAchievements = new Set(progression?.achievements ?? []);
  const achievements = PROGRESSION_ACHIEVEMENTS
    .map((achievement) => ({
      ...achievement,
      earned: earnedAchievements.has(achievement.id)
    }))
    .sort((first, second) => Number(second.earned) - Number(first.earned))
    .slice(0, 3);
  const territories = (world?.territories ?? [])
    .filter((territory) => (territory.status ?? 'published') === 'published')
    .map((territory) => ({
      ...territory,
      progress: progressForTerritory(territory.id, world, questProgress)
    }));
  const rankText = safeSummary.rank
    ? `#${safeSummary.rank}`
    : rankingMessage || 'Sem ranking';

  root.replaceChildren(
    el('div', { class: 'rpg-shell' }, [
      renderPlayerNavigation({
        active: 'characters',
        player,
        character,
        onLogout
      }),
      el('main', { class: 'rpg-character-layout' }, [
        leftPanel({
          player,
          character,
          level,
          summary: safeSummary,
          topTalents,
          achievements,
          territories,
          onOpenTalents,
          onOpenAchievements,
          onOpenWorld
        }),
        centerStage({
          player,
          character,
          archetype,
          imageId,
          level,
          quest: currentQuest,
          status: currentStatus,
          onEditCharacter,
          onStartQuest,
          onOpenQuest,
          onOpenMissions
        }),
        rightPanel({
          currentQuest,
          currentStatus,
          nextActivity,
          summary: safeSummary,
          worldSummary,
          rankText,
          onOpenMissions,
          onStartQuest,
          onOpenQuest
        })
      ]),
      el('footer', { class: 'rpg-footer' }, [
        el('span', {}, `${worldSummary.explored} de ${worldSummary.territories} territórios explorados`),
        el('span', {}, `${safeSummary.completedPhases ?? 0} de ${safeSummary.totalPhases ?? 4} fases do NORMALIZA concluídas`),
        el('a', { href: '#/perfil', onclick: onOpenProfile }, 'Configurações da conta')
      ])
    ])
  );
}

function leftPanel({
  player,
  character,
  level,
  summary,
  topTalents,
  achievements,
  territories,
  onOpenTalents,
  onOpenAchievements,
  onOpenWorld
}) {
  return el('aside', { class: 'rpg-side rpg-side--left', 'aria-label': 'Status do personagem' }, [
    el('section', { class: 'rpg-crest-block' }, [
      el('div', { class: 'rpg-crest', 'aria-hidden': 'true' }, [
        el('span', {}, 'Nível'),
        el('strong', {}, String(level.level))
      ]),
      el('div', { class: 'rpg-crest-copy' }, [
        el('p', { class: 'rpg-overline' }, character ? 'Personagem ativo' : 'Jogador'),
        el('h2', {}, character?.name ?? player?.name ?? 'Jogador'),
        el('span', {}, `${level.title} · ${level.xp} XP`),
        el('span', { class: 'rpg-xp' }, [
          el('span', {
            class: 'rpg-xp__fill',
            style: `width:${Math.min(100, level.percent)}%`
          })
        ]),
        el('small', {}, level.nextLevel
          ? `${level.totalToNext} XP para o nível ${level.nextLevel}`
          : 'Nível máximo alcançado')
      ])
    ]),
    panelSection('Talentos em destaque', onOpenTalents, [
      topTalents.length > 0
        ? el('div', { class: 'rpg-talent-list' }, topTalents.map((talent) =>
            el('div', { class: 'rpg-talent' }, [
              el('span', { class: 'rpg-talent__icon' }, talent.icon ?? talent.name.slice(0, 2).toUpperCase()),
              el('div', {}, [
                el('strong', {}, talent.name),
                el('small', {}, talent.categoryId ? categoryName(talent.categoryId) : 'Talento')
              ]),
              el('em', {}, `${talent.level}/${talent.maxLevel ?? 10}`)
            ])
          ))
        : el('p', { class: 'rpg-empty' }, 'Nenhum talento despertado ainda.')
    ]),
    panelSection('Conquistas', onOpenAchievements, [
      el('div', { class: 'rpg-achievement-list' }, achievements.map((achievement) =>
        el('div', { class: `rpg-achievement${achievement.earned ? ' is-earned' : ''}` }, [
          el('span', { class: 'rpg-achievement__seal', 'aria-hidden': 'true' }, achievement.earned ? '✓' : '·'),
          el('div', {}, [
            el('strong', {}, achievement.title),
            el('small', {}, achievement.earned ? 'Conquistada' : 'Bloqueada')
          ])
        ])
      ))
    ]),
    panelSection('Territórios', onOpenWorld, [
      el('div', { class: 'rpg-territory-list' }, territories.map((territory) =>
        el('div', { class: 'rpg-territory' }, [
          el('span', { class: 'rpg-territory__dot' }),
          el('div', {}, [
            el('strong', {}, territory.name),
            el('small', {}, territory.progress.explored
              ? `${territory.progress.percent}% explorado`
              : 'Ainda não explorado')
          ]),
          el('em', {}, `${territory.progress.completed}/${territory.progress.total}`)
        ])
      ))
    ])
  ]);
}

function centerStage({
  player,
  character,
  archetype,
  imageId,
  level,
  quest,
  status,
  onEditCharacter,
  onStartQuest,
  onOpenQuest,
  onOpenMissions
}) {
  const questLabel = quest ? QUEST_STATUS_LABELS[status] ?? status : 'Sem missão';
  const canPlay = Boolean(character && quest && status !== QUEST_STATUS.locked);

  return el('section', { class: 'rpg-character-stage', 'aria-labelledby': 'rpg-character-name' }, [
    el('div', { class: 'rpg-stage__halo', 'aria-hidden': 'true' }),
    el('div', { class: 'rpg-stage__eyebrow' }, [
      el('span', {}, 'Personagem selecionado'),
      el('span', { class: 'rpg-stage__status' }, `Nível ${level.level}`)
    ]),
    el('div', { class: 'rpg-portrait' }, [
      el('span', { class: 'rpg-portrait__orbit rpg-portrait__orbit--outer', 'aria-hidden': 'true' }),
      el('span', { class: 'rpg-portrait__orbit rpg-portrait__orbit--inner', 'aria-hidden': 'true' }),
      avatarNode(imageId, { size: 'hero', className: 'rpg-avatar' }),
      el('span', { class: 'rpg-portrait__sigil', 'aria-hidden': 'true' }, character ? '✦' : '?')
    ]),
    el('div', { class: 'rpg-stage__identity' }, [
      el('p', { class: 'rpg-overline' }, character ? 'Cafegeek · Jornada do Conhecimento' : 'Sua jornada começa aqui'),
      el('h1', { id: 'rpg-character-name' }, character?.name ?? player?.name ?? 'Jogador'),
      el('p', { class: 'rpg-stage__title' }, character
        ? `${archetype?.name ?? archetype?.label ?? 'Explorador'} · ${level.title}`
        : 'Crie seu personagem para entrar no mundo'),
      el('div', { class: 'rpg-stage__stats' }, [
        stageStat('XP', `${level.xp}`),
        stageStat('Missão', quest?.name ?? 'Nenhuma'),
        stageStat('Estado', questLabel)
      ])
    ]),
    el('div', { class: 'rpg-stage__actions' }, [
      el('button', { class: 'rpg-button rpg-button--primary', type: 'button', onclick: onEditCharacter },
        character ? 'Editar personagem' : 'Criar personagem'),
      canPlay
        ? el('button', { class: 'rpg-button', type: 'button', onclick: () => onStartQuest?.(quest) },
            status === QUEST_STATUS.completed ? 'Revisitar missão' : status === QUEST_STATUS.in_progress ? 'Continuar missão' : 'Iniciar missão')
        : el('button', { class: 'rpg-button', type: 'button', onclick: onOpenMissions }, 'Ver missões')
    ]),
    el('div', { class: 'rpg-character-picker', 'aria-label': 'Personagens' }, [
      el('span', { class: 'rpg-character-picker__label' }, 'Seu personagem'),
      character
        ? el('button', {
            class: 'rpg-character-slot is-active',
            type: 'button',
            onclick: onEditCharacter,
            'aria-current': 'true'
          }, [
            avatarNode(imageId, { size: 'md' }),
            el('span', {}, [
              el('strong', {}, character.name),
              el('small', {}, `Nível ${level.level} · ${level.title}`)
            ]),
            el('em', {}, 'Ativo')
          ])
        : el('span', { class: 'rpg-character-picker__empty' }, 'Nenhum personagem criado'),
      el('button', { class: 'rpg-character-picker__manage', type: 'button', onclick: onEditCharacter },
        character ? 'Gerenciar' : 'Criar')
    ])
  ]);
}

function rightPanel({
  currentQuest,
  currentStatus,
  nextActivity,
  summary,
  worldSummary,
  rankText,
  onOpenMissions,
  onStartQuest,
  onOpenQuest
}) {
  const statusLabel = currentQuest ? QUEST_STATUS_LABELS[currentStatus] ?? currentStatus : 'Sem missão';
  const canPlay = currentQuest && currentStatus !== QUEST_STATUS.locked;

  return el('aside', { class: 'rpg-side rpg-side--right', 'aria-label': 'Missão e progresso' }, [
    el('section', { class: 'rpg-mission' }, [
      el('div', { class: 'rpg-mission__head' }, [
        el('span', { class: 'rpg-overline' }, 'Missão principal'),
        el('span', { class: `rpg-chip is-${currentStatus}` }, statusLabel)
      ]),
      el('div', { class: 'rpg-mission__sigil', 'aria-hidden': 'true' }, 'N'),
      el('h2', {}, currentQuest?.name ?? 'Nenhuma missão ativa'),
      el('p', {}, currentQuest?.description ?? 'Explore o mapa do mundo para descobrir novas missões.'),
      el('div', { class: 'rpg-mission__meta' }, [
        el('span', {}, currentQuest?.category ?? 'Jornada'),
        el('span', {}, `${currentQuest?.xpReward ?? 0} XP`),
        el('span', {}, `${summary.completedPhases ?? 0}/${summary.totalPhases ?? 4} fases`)
      ]),
      el('span', { class: 'rpg-progress' }, [
        el('span', {
          class: 'rpg-progress__fill',
          style: `width:${Math.min(100, summary.evolutionPercent ?? 0)}%`
        })
      ]),
      canPlay
        ? el('button', { class: 'rpg-button rpg-button--wide', type: 'button', onclick: () => onStartQuest?.(currentQuest) },
            currentStatus === QUEST_STATUS.completed ? 'Revisitar missão' : currentStatus === QUEST_STATUS.in_progress ? 'Continuar missão' : 'Abrir missão')
        : el('button', { class: 'rpg-button rpg-button--wide', type: 'button', onclick: onOpenMissions }, 'Explorar missões')
    ]),
    el('section', { class: 'rpg-next' }, [
      el('div', { class: 'rpg-section-head' }, [
        el('span', { class: 'rpg-overline' }, 'Próxima atividade'),
        el('button', { class: 'rpg-link', type: 'button', onclick: onOpenMissions }, 'Ver todas')
      ]),
      nextActivity
        ? el('button', { class: 'rpg-next__item', type: 'button', onclick: () => onOpenQuest?.(nextActivity.quest) }, [
            el('span', { class: `rpg-status-dot is-${nextActivity.status}` }),
            el('span', {}, [
              el('strong', {}, nextActivity.quest.name),
              el('small', {}, nextActivity.quest.category ?? 'Missão')
            ]),
            el('em', {}, `${nextActivity.quest.xpReward ?? 0} XP`)
          ])
        : el('p', { class: 'rpg-empty' }, 'Nenhuma atividade pendente.')
    ]),
    el('section', { class: 'rpg-journey-summary' }, [
      el('div', { class: 'rpg-section-head' }, [
        el('span', { class: 'rpg-overline' }, 'Progresso da jornada'),
        el('strong', {}, `${worldSummary.percent}%`)
      ]),
      el('span', { class: 'rpg-progress rpg-progress--muted' }, [
        el('span', { class: 'rpg-progress__fill', style: `width:${worldSummary.percent}%` })
      ]),
      el('div', { class: 'rpg-summary-grid' }, [
        summaryItem('Territórios', `${worldSummary.explored}/${worldSummary.territories}`),
        summaryItem('Missões', `${worldSummary.completedQuests}/${worldSummary.totalQuests}`),
        summaryItem('Ranking', rankText),
        summaryItem('Pontos', String(summary.totalScore ?? 0))
      ])
    ]),
    el('section', { class: 'rpg-reward' }, [
      el('span', { class: 'rpg-overline' }, 'Recompensa da missão'),
      el('div', { class: 'rpg-reward__line' }, [
        el('strong', {}, `${currentQuest?.xpReward ?? 0} XP`),
        el('span', {}, 'Experiência de personagem')
      ]),
      el('p', {}, 'A conclusão também evolui talentos ligados à trilha da missão.')
    ])
  ]);
}

function panelSection(title, onOpen, children) {
  return el('section', { class: 'rpg-panel-section' }, [
    el('div', { class: 'rpg-section-head' }, [
      el('h3', {}, title),
      onOpen
        ? el('button', { class: 'rpg-link', type: 'button', onclick: onOpen }, 'Abrir')
        : null
    ]),
    ...children
  ]);
}

function stageStat(label, value) {
  return el('span', { class: 'rpg-stage-stat' }, [
    el('small', {}, label),
    el('strong', {}, value)
  ]);
}

function summaryItem(label, value) {
  return el('span', { class: 'rpg-summary-item' }, [
    el('small', {}, label),
    el('strong', {}, value)
  ]);
}

function categoryName(categoryId) {
  const labels = {
    dados: 'Dados',
    computacao: 'Computação',
    jogos: 'Jogos',
    infraestrutura: 'Infraestrutura',
    soberania: 'Soberania'
  };

  return labels[categoryId] ?? 'Talento';
}
