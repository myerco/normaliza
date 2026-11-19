export const QUEST_STATUS = Object.freeze({
  locked: 'locked',
  available: 'available',
  inProgress: 'in_progress',
  completed: 'completed'
});

export const QUEST_STATUS_LABELS = Object.freeze({
  locked: 'Bloqueada',
  available: 'Disponível',
  in_progress: 'Em andamento',
  completed: 'Concluída'
});

export function normalizeQuestCatalog(catalog) {
  const campaigns = Array.isArray(catalog?.campaigns) ? catalog.campaigns : [];
  const quests = Array.isArray(catalog?.quests) ? catalog.quests : [];
  const dependencies = Array.isArray(catalog?.dependencies) ? catalog.dependencies : [];

  return {
    campaigns,
    quests,
    dependencies: dependencies.filter(
      (dependency) =>
        dependency &&
        typeof dependency.questId === 'string' &&
        typeof dependency.prerequisiteId === 'string' &&
        dependency.questId !== dependency.prerequisiteId &&
        quests.some((quest) => quest.id === dependency.questId) &&
        quests.some((quest) => quest.id === dependency.prerequisiteId)
    )
  };
}

export function dependenciesFor(questId, dependencies) {
  return dependencies
    .filter((dependency) => dependency.questId === questId)
    .map((dependency) => dependency.prerequisiteId);
}

export function isQuestCompleted(questId, progress = {}) {
  return progress?.[questId]?.status === QUEST_STATUS.completed;
}

export function questStatusFor(quest, progress = {}, dependencies = []) {
  if (!quest || quest.active === false) {
    return QUEST_STATUS.locked;
  }

  const saved = progress?.[quest.id]?.status;

  if (saved === QUEST_STATUS.completed) {
    return QUEST_STATUS.completed;
  }

  if (saved === QUEST_STATUS.inProgress) {
    return QUEST_STATUS.inProgress;
  }

  const prerequisites = dependenciesFor(quest.id, dependencies);
  const unlocked = prerequisites.every((questId) => isQuestCompleted(questId, progress));

  return unlocked ? QUEST_STATUS.available : QUEST_STATUS.locked;
}

export function campaignQuests(campaignId, quests) {
  return quests
    .filter((quest) => quest.campaignId === campaignId)
    .sort((first, second) => {
      if (first.order !== second.order) {
        return first.order - second.order;
      }
      return first.name.localeCompare(second.name, 'pt-BR');
    });
}

export function describePrerequisites(questId, quests, dependencies) {
  const prerequisites = dependenciesFor(questId, dependencies);

  return prerequisites
    .map((prerequisiteId) => quests.find((quest) => quest.id === prerequisiteId))
    .filter(Boolean);
}

export function validateQuestRecord(quest) {
  const errors = [];

  if (!quest || typeof quest !== 'object') {
    errors.push('Quest inválida.');
    return { valid: false, errors };
  }

  if (!String(quest.name ?? '').trim()) {
    errors.push('Informe o nome da quest.');
  }

  if (!String(quest.slug ?? '').trim()) {
    errors.push('Informe o identificador da quest.');
  }

  if (!String(quest.campaignId ?? '').trim()) {
    errors.push('Informe a campanha da quest.');
  }

  if (!Number.isInteger(Number(quest.order)) || Number(quest.order) < 1) {
    errors.push('A ordem da quest deve ser um inteiro positivo.');
  }

  return { valid: errors.length === 0, errors };
}

export function validateDependency({ questId, prerequisiteId }, quests, dependencies) {
  if (!questId || !prerequisiteId || questId === prerequisiteId) {
    return { valid: false, error: 'Dependência inválida.' };
  }

  if (!quests.some((quest) => quest.id === questId)) {
    return { valid: false, error: 'Quest de origem inexistente.' };
  }

  if (!quests.some((quest) => quest.id === prerequisiteId)) {
    return { valid: false, error: 'Pré-requisito inexistente.' };
  }

  if (
    dependencies.some(
      (dependency) =>
        dependency.questId === questId &&
        dependency.prerequisiteId === prerequisiteId
    )
  ) {
    return { valid: false, error: 'Dependência já cadastrada.' };
  }

  return { valid: true, error: null };
}

export function hasDependencyCycle(questId, prerequisiteId, dependencies) {
  const visited = new Set();
  const stack = [prerequisiteId];

  while (stack.length > 0) {
    const current = stack.pop();

    if (current === questId) {
      return true;
    }

    if (visited.has(current)) {
      continue;
    }

    visited.add(current);

    for (const dependency of dependencies) {
      if (dependency.questId === current) {
        stack.push(dependency.prerequisiteId);
      }
    }
  }

  return false;
}
