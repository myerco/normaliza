import { questStatusFor } from './quests.js';

export const KNOWLEDGE_STATUS = Object.freeze({
  locked: 'locked',
  available: 'available',
  inProgress: 'in_progress',
  completed: 'completed'
});

export const KNOWLEDGE_STATUS_LABELS = Object.freeze({
  locked: 'Bloqueado',
  available: 'Disponível',
  in_progress: 'Em desenvolvimento',
  completed: 'Desenvolvido'
});

export function nodeStatusFor(node, context = {}) {
  const {
    statuses = new Map(),
    questProgress = {},
    questDependencies = [],
    attributes = {}
  } = context;

  if (!node || node.active === false) {
    return KNOWLEDGE_STATUS.locked;
  }

  if (node.questId) {
    const quest = context.quests?.find((item) => item.id === node.questId);
    return quest
      ? questStatusFor(quest, questProgress, questDependencies)
      : KNOWLEDGE_STATUS.locked;
  }

  const parents = Array.isArray(node.parents) ? node.parents : [];
  const nodesById = new Map((context.nodes ?? []).map((item) => [item.id, item]));
  const parentsReady = parents.every((parentId) => {
    const parentStatus = statuses.get(parentId);
    const parentNode = nodesById.get(parentId);
    return (
      parentStatus === KNOWLEDGE_STATUS.completed ||
      (parentNode?.type === 'quest' && parentStatus !== KNOWLEDGE_STATUS.locked)
    );
  });

  if (node.attributeId) {
    const attribute = attributes[node.attributeId];
    const current = Number(attribute?.current ?? 0);
    const initial = Number(attribute?.initial ?? 0);

    if (current > initial) {
      return KNOWLEDGE_STATUS.completed;
    }
  }

  if (node.type === 'skill' && parentsReady) {
    return KNOWLEDGE_STATUS.completed;
  }

  return parentsReady ? KNOWLEDGE_STATUS.available : KNOWLEDGE_STATUS.locked;
}

export function computeNodeStatuses(nodes, context) {
  const statuses = new Map();
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const visiting = new Set();

  const visit = (node) => {
    if (!node) {
      return KNOWLEDGE_STATUS.locked;
    }

    if (statuses.has(node.id)) {
      return statuses.get(node.id);
    }

    if (visiting.has(node.id)) {
      return KNOWLEDGE_STATUS.locked;
    }

    visiting.add(node.id);

    for (const parentId of node.parents ?? []) {
      visit(byId.get(parentId));
    }

    const status = nodeStatusFor(node, { ...context, nodes: [...byId.values()], statuses });
    statuses.set(node.id, status);
    visiting.delete(node.id);
    return status;
  };

  for (const node of nodes) {
    visit(node);
  }

  return statuses;
}

