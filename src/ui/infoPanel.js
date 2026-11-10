import { el } from './dom.js';

export function renderPanel(
  root,
  {
    city,
    selectedBuilding,
    onSelect,
    onClose,
    onOpenMission,
    onOpenHelp,
    onResetGame,
    progress,
    phaseActions = []
  }
) {
  const switcher = el(
    'div',
    { class: 'city-switcher', role: 'group', 'aria-label': 'Edifícios da cidade' },
    city.buildings.map((building) => {
      const isActive = selectedBuilding && selectedBuilding.id === building.id;

      return el(
        'button',
        {
          class: `city-switcher__btn${isActive ? ' is-active' : ''}`,
          type: 'button',
          'aria-pressed': String(Boolean(isActive)),
          onclick: () => onSelect(building.id)
        },
        [
          el('span', { class: 'city-switcher__name' }, building.name),
          el('span', { class: 'city-switcher__count' }, `${building.recordCount} reg.`)
        ]
      );
    })
  );

  const content = selectedBuilding
    ? buildDetails(selectedBuilding, onClose, phaseActions)
    : buildEmpty(city, onSelect);

  root.replaceChildren(
    el('header', { class: 'panel__header' }, [
      el('div', {}, [
        el('p', { class: 'panel__eyebrow' }, 'Inspeção da cidade'),
        el('h2', { class: 'panel__title' }, selectedBuilding ? selectedBuilding.name : 'Explore os edifícios')
      ]),
      selectedBuilding
        ? el(
            'button',
            {
              class: 'icon-button',
              type: 'button',
              'aria-label': 'Fechar edifício',
              onclick: onClose
            },
            '×'
          )
        : null
    ]),
    progress ? buildProgressSection(progress, onResetGame, onOpenHelp) : null,
    switcher,
    el('div', { class: 'panel__content', 'aria-live': 'polite' }, [content]),
    typeof onOpenMission === 'function'
      ? el('div', { class: 'panel__mission' }, [
          el('p', { class: 'panel__phase-label' }, 'Missão especial'),
          el(
            'p',
            { class: 'panel__note' },
            'Administração da Cidade: veja como a redundância provoca anomalias de atualização, inserção e exclusão.'
          ),
          el(
            'button',
            {
              class: 'btn btn--ghost btn--block',
              type: 'button',
              onclick: onOpenMission
            },
            'Abrir Administração da Cidade'
          )
        ])
      : null
  );
}

function buildProgressSection(progress, onResetGame, onOpenHelp) {
  return el(
    'section',
    { class: 'panel__progress', 'aria-label': 'Evolução da cidade' },
    [
      el('div', { class: 'panel__progress-head' }, [
        el('p', { class: 'panel__phase-label' }, 'Evolução da cidade'),
        el('strong', {}, `${progress.completedPhases}/${progress.totalPhases}`)
      ]),
      el(
        'div',
        {
          class: 'progress-meter',
          role: 'progressbar',
          'aria-label': 'Fases concluídas',
          'aria-valuemin': '0',
          'aria-valuemax': '100',
          'aria-valuenow': String(progress.evolutionPercent)
        },
        [el('span', { class: 'progress-meter__fill', style: `width: ${progress.evolutionPercent}%` })]
      ),
      el(
        'div',
        { class: 'medal-strip' },
        progress.phases.map((phase) =>
          el(
            'div',
            {
              class: `medal${phase.completed ? ' is-earned' : ' is-locked'}`,
              title: phase.title,
              'aria-label': `${phase.title}: ${phase.completed ? 'concluída' : 'não concluída'}, ${phase.score} pontos`
            },
            [
              el('span', { class: 'medal__icon' }, phase.medalLabel),
              el('span', { class: 'medal__score' }, String(phase.score))
            ]
          )
        )
      ),
      el(
        'p',
        { class: 'panel__progress-total' },
        `Pontuação acumulada: ${progress.totalScore} pts`
      ),
      el(
        'p',
        { class: 'panel__progress-note' },
        'Progresso salvo automaticamente. Reinicie uma fase no próprio cabeçalho.'
      ),
      el('div', { class: 'panel__progress-actions' }, [
        el(
          'button',
          {
            class: 'btn btn--ghost btn--small btn--block btn--help',
            type: 'button',
            onclick: onOpenHelp
          },
          'Ajuda e glossário'
        ),
        el(
          'button',
          {
            class: 'btn btn--ghost btn--small btn--block btn--reset-game',
            type: 'button',
            onclick: onResetGame
          },
          'Reiniciar todo o jogo'
        )
      ])
    ]
  );
}

function buildDetails(building, onClose, phaseActions) {
  const completedPhase = phaseActions.find(
    (action) => action.completed && action.normalizedAttributes
  );
  const attributes = completedPhase?.normalizedAttributes || building.attributes;

  return el('div', { class: 'panel__details' }, [
    el('p', { class: 'panel__description' }, building.description),
    el('dl', { class: 'panel__stats' }, [
      stat('Registros', building.recordCount),
      stat('Atributos', attributes.length)
    ]),
    el('h3', { class: 'panel__subtitle' }, 'Atributos'),
    el(
      'ul',
      { class: 'attribute-list' },
      attributes.map((attribute) => el('li', {}, [el('code', {}, attribute)]))
    ),
    phaseActions.length > 0
      ? el(
          'div',
          { class: 'panel__phases' },
          phaseActions.map((action) =>
            el('div', { class: 'panel__phase' }, [
              el('p', { class: 'panel__phase-label' }, action.label),
              el(
                'p',
                { class: 'panel__note panel__note--phase' },
                action.completed ? action.completedNote : action.availableNote
              ),
              el(
                'button',
                {
                  class: 'btn btn--primary btn--block',
                  type: 'button',
                  onclick: action.onStart
                },
                action.completed ? action.revisitLabel : action.startLabel
              )
            ])
          )
        )
      : el(
          'p',
          { class: 'panel__note' },
          'Estrutura atual. As regras de normalização serão aplicadas nas próximas fases.'
        ),
    el(
      'button',
      {
        class: 'btn btn--ghost btn--block',
        type: 'button',
        onclick: onClose
      },
      'Voltar para a cidade'
    )
  ]);
}

function buildEmpty(city, onSelect) {
  return el('div', { class: 'panel__empty' }, [
    el(
      'p',
      {},
      'Selecione um edifício no mapa ou use a lista abaixo para inspecionar a tabela.'
    ),
    el(
      'ul',
      { class: 'building-list' },
      city.buildings.map((building) =>
        el('li', {}, [
          el(
            'button',
            {
              class: 'building-list__btn',
              type: 'button',
              onclick: () => onSelect(building.id)
            },
            [
              el('span', { class: 'building-list__name' }, building.name),
              el('span', { class: 'building-list__meta' }, `${building.recordCount} registros`)
            ]
          )
        ])
      )
    )
  ]);
}

function stat(label, value) {
  return el('div', { class: 'panel__stat' }, [
    el('dt', {}, label),
    el('dd', {}, String(value))
  ]);
}
