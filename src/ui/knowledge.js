import { formatPlayerName } from '../core/players.js';
import { getArchetype } from '../core/archetypes.js';
import {
  KNOWLEDGE_STATUS,
  KNOWLEDGE_STATUS_LABELS,
  computeNodeStatuses
} from '../core/knowledge.js';
import { levelProgress } from '../core/progression.js';
import { questStatusFor } from '../core/quests.js';
import { avatarNode } from './avatar.js';
import { el, svgEl } from './dom.js';
import { renderPage } from './page.js';

export function renderKnowledgePage(root, {
  player,
  character,
  knowledgeCatalog,
  characterCatalog,
  questCatalog,
  progression,
  questProgress,
  onBack,
  onOpenJourney,
  onStartQuest
}) {
  const areas = (knowledgeCatalog?.areas ?? []).filter((area) => area.active);
  const nodes = (knowledgeCatalog?.nodes ?? []).filter((node) => node.active);
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const quests = questCatalog?.quests ?? [];
  const statuses = computeNodeStatuses(nodes, {
    nodes,
    quests,
    questProgress,
    questDependencies: questCatalog?.dependencies ?? [],
    attributes: progression?.attributes ?? {}
  });
  const archetype = character
    ? characterCatalog?.archetypes?.find((item) => item.id === character.archetypeId) ??
      getArchetype(character.archetypeId)
    : null;
  const level = levelProgress(progression?.xp ?? character?.xp ?? 0);
  const completedNodes = [...statuses.values()].filter(
    (status) => status === KNOWLEDGE_STATUS.completed
  ).length;
  const availableNodes = [...statuses.values()].filter(
    (status) => status !== KNOWLEDGE_STATUS.locked
  ).length;
  let selectedId = nodes.find((node) => node.id === 'normaliza')?.id ?? nodes[0]?.id ?? null;

  const detail = el('div', { class: 'knowledge-detail', 'aria-live': 'polite' });
  const nodeButtons = new Map();

  const selectNode = (nodeId) => {
    selectedId = nodeId;

    for (const [id, button] of nodeButtons) {
      button.classList.toggle('is-selected', id === selectedId);
    }

    renderDetail(detail, {
      node: nodeMap.get(selectedId),
      nodes,
      areas,
      statuses,
      questCatalog,
      questProgress,
      progression,
      quests,
      onStartQuest
    });
  };

  const canvas = el('div', { class: 'knowledge-canvas' });
  const connectors = svgEl('svg', {
    class: 'knowledge-connectors',
    viewBox: '0 0 1000 700',
    preserveAspectRatio: 'none',
    'aria-hidden': 'true'
  });

  for (const area of areas) {
    const bounds = areaBounds(area.id, nodes);

    canvas.append(
      el(
        'div',
        {
          class: 'knowledge-domain',
          style: `--domain-color: ${area.color}; left: ${bounds.left}%; top: ${bounds.top}%; width: ${bounds.width}%; height: ${bounds.height}%;`
        },
        [
          el('span', { class: 'knowledge-domain__name' }, area.shortName ?? area.name),
          el('span', { class: 'knowledge-domain__line' })
        ]
      )
    );
  }

  for (const node of nodes) {
    const parents = (node.parents ?? [])
      .map((parentId) => nodeMap.get(parentId))
      .filter(Boolean);

    for (const parent of parents) {
      const childStatus = statuses.get(node.id);
      const active = childStatus !== KNOWLEDGE_STATUS.locked;
      connectors.append(
        svgEl('path', {
          d: connectorPath(parent, node),
          class: `knowledge-connector${active ? ' is-active' : ''}${
            childStatus === KNOWLEDGE_STATUS.completed ? ' is-complete' : ''
          }`
        })
      );
    }
  }

  canvas.append(connectors);

  for (const node of nodes) {
    const status = statuses.get(node.id) ?? KNOWLEDGE_STATUS.locked;
    const button = el(
      'button',
      {
        class: `knowledge-node is-${status}${node.type === 'quest' ? ' is-quest' : ''}${node.areaId ? '' : ' is-root'}`,
        type: 'button',
        'data-knowledge-node': node.id,
        style: `left: ${node.x / 10}%; top: ${node.y / 7}%;`,
        'aria-label': `${node.name}: ${KNOWLEDGE_STATUS_LABELS[status] ?? status}`
      },
      [
        el('span', { class: 'knowledge-node__shape' }, [
          el('span', { class: 'knowledge-node__icon' }, node.icon)
        ]),
        el('span', { class: 'knowledge-node__name' }, node.name)
      ]
    );

    button.addEventListener('click', () => selectNode(node.id));
    nodeButtons.set(node.id, button);
    canvas.append(button);
  }

  if (selectedId) {
    selectNode(selectedId);
  }

  renderPage(root, {
    title: 'Árvore de Conhecimento',
    eyebrow: 'Cafegeek — Mapa de habilidades',
    player,
    onBack,
    children: el('div', { class: 'knowledge-page' }, [
      el('div', { class: 'knowledge-layout' }, [
        el('aside', { class: 'knowledge-sidebar' }, [
          el('section', { class: 'knowledge-profile' }, [
            avatarNode(character?.imageId ?? player.avatarId, { size: 'xl' }),
            el('div', {}, [
              el('p', { class: 'panel__phase-label' }, 'Personagem'),
              el('h2', {}, character?.name ?? formatPlayerName(player.name)),
              el(
                'p',
                { class: 'panel__note' },
                character
                  ? `${archetype.name ?? archetype.label} · Nível ${level.level}`
                  : 'Crie um personagem para explorar a árvore.'
              )
            ])
          ]),
          el('div', { class: 'knowledge-xp' }, [
            el('div', { class: 'knowledge-xp__head' }, [
              el('span', {}, `Nível ${level.level} · ${level.title}`),
              el('strong', {}, `${level.xp} XP`)
            ]),
            el('span', { class: 'platform-level__track' }, [
              el('span', {
                class: 'platform-level__fill',
                style: `width: ${level.percent}%`
              })
            ])
          ]),
          el('div', { class: 'knowledge-stats' }, [
            knowledgeStat('Nós disponíveis', `${availableNodes} / ${nodes.length}`),
            knowledgeStat('Nós desenvolvidos', `${completedNodes}`),
            knowledgeStat('Quests concluídas', `${completedQuestCount(questProgress)}`)
          ]),
          el('section', { class: 'knowledge-attributes' }, [
            el('p', { class: 'panel__phase-label' }, 'Habilidades'),
            ...(characterCatalog?.attributes ?? [])
              .filter((attribute) => attribute.active)
              .map((attribute) => {
                const entry = progression?.attributes?.[attribute.id];
                const value = entry?.current ?? 1;
                return el('div', { class: 'knowledge-attribute' }, [
                  el('span', {}, attribute.name),
                  el('strong', {}, `${value} / 10`)
                ]);
              })
          ]),
          el('button', {
            class: 'btn btn--ghost btn--small btn--block',
            type: 'button',
            onclick: onOpenJourney
          }, 'Abrir jornada'),
          detail
        ]),
        el('section', { class: 'knowledge-main' }, [
          el('div', { class: 'knowledge-main__head' }, [
            el('div', {}, [
              el('p', { class: 'panel__phase-label' }, 'Mapa de evolução'),
              el('h2', {}, 'Explore suas áreas de conhecimento'),
              el(
                'p',
                { class: 'panel__note' },
                'Passe pelas áreas e conecte habilidades às suas quests. Nós disponíveis brilham; nós bloqueados aguardam pré-requisitos.'
              )
            ]),
            el('div', { class: 'knowledge-legend', 'aria-label': 'Legenda' }, [
              legendDot('available', 'Disponível'),
              legendDot('in_progress', 'Em andamento'),
              legendDot('completed', 'Concluído'),
              legendDot('locked', 'Bloqueado')
            ])
          ]),
          el('div', { class: 'knowledge-canvas-scroll' }, [canvas])
        ])
      ])
    ])
  });
}

function renderDetail(container, {
  node,
  nodes,
  areas,
  statuses,
  questCatalog,
  questProgress,
  progression,
  quests,
  onStartQuest
}) {
  container.replaceChildren();

  if (!node) {
    container.append(el('p', { class: 'panel__note' }, 'Selecione um nó da árvore.'));
    return;
  }

  const status = statuses.get(node.id) ?? KNOWLEDGE_STATUS.locked;
  const area = areas.find((item) => item.id === node.areaId);
  const quest = quests.find((item) => item.id === node.questId);
  const attribute = node.attributeId
    ? progression?.attributes?.[node.attributeId]
    : null;
  const questStatus = quest
    ? questStatusFor(quest, questProgress ?? {}, questCatalog?.dependencies ?? [])
    : null;

  container.append(
    el('p', { class: 'panel__phase-label' }, area?.name ?? 'Nó de conexão'),
    el('h3', {}, node.name),
    el(
      'span',
      { class: `knowledge-detail__status is-${status}` },
      KNOWLEDGE_STATUS_LABELS[status] ?? status
    ),
    el('p', { class: 'knowledge-detail__description' }, node.description)
  );

  if (attribute) {
    container.append(
      el(
        'p',
        { class: 'panel__note' },
        `Habilidade individual: ${attribute.current} / 10 · inicial ${attribute.initial}`
      )
    );
  }

  if (quest) {
    container.append(
      el('p', { class: 'panel__note' }, `Quest vinculada: ${quest.name} · ${quest.xpReward} XP`)
    );

    if (
      (questStatus === 'available' || questStatus === 'in_progress' || questStatus === 'completed') &&
      node.questId === 'normaliza'
    ) {
      container.append(
        el(
          'button',
          {
            class: 'btn btn--cafe btn--small btn--block',
            type: 'button',
            onclick: () => onStartQuest?.(quest)
          },
          questStatus === 'completed' ? 'Revisitar quest' : 'Abrir quest'
        )
      );
    }
  }

  const parentNames = (node.parents ?? [])
    .map((parentId) => nodes.find((candidate) => candidate.id === parentId))
    .filter(Boolean)
    .map((parent) => parent.name);

  if (parentNames.length > 0) {
    container.append(
      el('p', { class: 'panel__note' }, `Pré-requisitos: ${parentNames.join(', ')}`)
    );
  }
}

function knowledgeStat(label, value) {
  return el('div', { class: 'knowledge-stat' }, [
    el('span', {}, label),
    el('strong', {}, value)
  ]);
}

function legendDot(status, label) {
  return el('span', { class: `knowledge-legend__item is-${status}` }, [
    el('span', {}),
    label
  ]);
}

function completedQuestCount(questProgress = {}) {
  return Object.values(questProgress).filter((entry) => entry?.status === 'completed').length;
}

function areaBounds(areaId, nodes) {
  const areaNodes = nodes.filter((node) => node.areaId === areaId);
  if (areaNodes.length === 0) {
    return { left: 0, top: 0, width: 0, height: 0 };
  }

  const minX = Math.min(...areaNodes.map((node) => node.x)) - 72;
  const maxX = Math.max(...areaNodes.map((node) => node.x)) + 72;
  return {
    left: Math.max(1, minX / 10),
    top: 4,
    width: Math.min(98, maxX / 10 - minX / 10),
    height: 84
  };
}

function connectorPath(from, to) {
  const fromX = from.x;
  const fromY = from.y;
  const toX = to.x;
  const toY = to.y;
  const midY = fromY + (toY - fromY) * 0.5;

  return `M ${fromX} ${fromY} C ${fromX} ${midY} ${toX} ${midY} ${toX} ${toY}`;
}
