import {
  QUEST_STATUS,
  QUEST_STATUS_LABELS,
  campaignQuests,
  describePrerequisites,
  questStatusFor
} from '../core/quests.js';
import { el } from './dom.js';
import { renderPage } from './page.js';

export function renderChallengesPage(root, {
  player,
  character,
  catalog,
  progress = {},
  onBack,
  onStartQuest
}) {
  const campaigns = (catalog?.campaigns ?? []).filter((campaign) => campaign.active);
  const quests = catalog?.quests ?? [];
  const dependencies = catalog?.dependencies ?? [];

  renderPage(root, {
    title: 'Jornada do Conhecimento',
    eyebrow: 'Cafegeek — Mapa de quests',
    player,
    onBack,
    children: el('div', { class: 'challenges-page' }, [
      el('section', { class: 'challenges-intro' }, [
        el('p', { class: 'panel__phase-label' }, 'Sua jornada'),
        el('h2', {}, 'Escolha seu próximo desafio'),
        el(
          'p',
          { class: 'panel__note' },
          'As quests são liberadas conforme os pré-requisitos são concluídos. Caminhos opcionais poderão ser adicionados.'
        )
      ]),
      ...campaigns.map((campaign) => {
        const campaignQuestList = campaignQuests(campaign.id, quests).filter(
          (quest) => quest.active
        );
        return el('section', { class: 'campaign-section' }, [
          el('div', { class: 'platform-section-head' }, [
            el('div', {}, [
              el('p', { class: 'panel__phase-label' }, 'Campanha'),
              el('h3', {}, campaign.name),
              campaign.description
                ? el('p', { class: 'panel__note' }, campaign.description)
                : null
            ])
          ]),
          el(
            'div',
            { class: 'challenge-grid' },
            campaignQuestList.length > 0
              ? campaignQuestList.map((quest) => questCard({
                  quest,
                  quests,
                  dependencies,
                  progress,
                  character,
                  onStartQuest
                }))
              : [el('p', { class: 'panel__note' }, 'Nenhuma quest ativa nesta campanha.')]
          )
        ]);
      })
    ])
  });
}

function questCard({ quest, quests, dependencies, progress, character, onStartQuest }) {
  const status = questStatusFor(quest, progress, dependencies);
  const prerequisites = describePrerequisites(quest.id, quests, dependencies);
  const statusLabel = QUEST_STATUS_LABELS[status] ?? status;
  const isCompleted = status === QUEST_STATUS.completed;
  const isInProgress = status === QUEST_STATUS.in_progress;
  const hasModule = Boolean(quest.moduleKey);
  const canStart = Boolean(character) && hasModule && status !== QUEST_STATUS.locked;
  const actionLabel = !character
    ? 'Crie um personagem'
    : isCompleted
      ? 'Revisitar quest'
      : isInProgress
        ? 'Continuar quest'
        : !hasModule
          ? 'Aguardando módulo'
          : 'Iniciar quest';

  return el(
    'article',
    {
      class: `challenge-card challenge-card--${status}${status === QUEST_STATUS.available ? ' is-available' : ''}${status === QUEST_STATUS.locked ? ' is-locked' : ''}${isCompleted ? ' is-completed' : ''}`,
      'data-quest-id': quest.id,
      'data-quest-status': status
    },
    [
      el('div', { class: 'challenge-card__top' }, [
        el('span', { class: 'challenge-card__number' }, `Quest ${String(quest.order).padStart(2, '0')}`),
        el('span', { class: `challenge-card__status is-${status}` }, statusLabel)
      ]),
      el('div', { class: 'challenge-card__sigil', 'aria-hidden': 'true' }, String(quest.order).padStart(2, '0')),
      el('h2', {}, quest.name),
      el('p', {}, quest.description),
      el('div', { class: 'challenge-card__meta' }, [
        el('span', {}, quest.category),
        el('span', {}, `Dificuldade ${quest.difficulty}/5`),
        el('span', {}, `${quest.xpReward} XP`)
      ]),
      prerequisites.length > 0
        ? el('p', { class: 'challenge-card__prerequisites' }, [
            'Pré-requisitos: ',
            prerequisites.map((prerequisite) => prerequisite.name).join(', ')
          ])
        : el('p', { class: 'challenge-card__prerequisites' }, 'Sem pré-requisitos'),
      el(
        'button',
        {
          class: 'btn btn--cafe',
          type: 'button',
          disabled: !canStart,
          onclick: canStart ? () => onStartQuest?.(quest) : undefined
        },
        actionLabel
      )
    ]
  );
}
