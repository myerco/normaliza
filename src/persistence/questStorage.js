import {
  QUEST_STATUS,
  normalizeQuestCatalog,
  questStatusFor,
  validateQuestRecord
} from '../core/quests.js';

export const QUEST_CATALOG_KEY = 'normaliza:v3:quests';
const QUEST_CATALOG_VERSION = 2;
const QUEST_PROGRESS_SUFFIX = ':quests';
const QUEST_PROGRESS_VERSION = 1;

const CAMPAIGN_ID = 'jornada-do-conhecimento';

export function loadQuestCatalog() {
  const stored = readJson(QUEST_CATALOG_KEY, null);

  if (
    !stored ||
    !Array.isArray(stored.campaigns) ||
    !Array.isArray(stored.quests) ||
    stored.quests.length === 0 ||
    stored.version !== QUEST_CATALOG_VERSION
  ) {
    return seedQuestCatalog();
  }

  return {
    version: QUEST_CATALOG_VERSION,
    ...normalizeQuestCatalog(stored)
  };
}

export function saveQuestCatalog(catalog) {
  const normalized = normalizeQuestCatalog(catalog);
  const payload = {
    version: QUEST_CATALOG_VERSION,
    ...normalized
  };
  writeJson(QUEST_CATALOG_KEY, payload);
  return payload;
}

export function resetQuestCatalog() {
  return seedQuestCatalog();
}

export function loadQuestProgress(characterId) {
  if (!characterId) {
    return { version: QUEST_PROGRESS_VERSION, quests: {} };
  }

  const stored = readJson(progressKey(characterId), null);

  if (!stored || typeof stored !== 'object' || typeof stored.quests !== 'object') {
    return { version: QUEST_PROGRESS_VERSION, quests: {} };
  }

  return {
    version: QUEST_PROGRESS_VERSION,
    quests: stored.quests
  };
}

export function saveQuestProgress(characterId, progress) {
  if (!characterId) {
    return false;
  }

  return writeJson(progressKey(characterId), {
    version: QUEST_PROGRESS_VERSION,
    quests: progress?.quests ?? {}
  });
}

export function startQuest(characterId, questId, { now = new Date().toISOString() } = {}) {
  if (!characterId || !questId) {
    return null;
  }

  const progress = loadQuestProgress(characterId);
  const current = progress.quests[questId] ?? {};

  if (current.status === QUEST_STATUS.completed) {
    return current;
  }

  const next = {
    ...current,
    status: QUEST_STATUS.inProgress,
    startedAt: current.startedAt ?? now,
    updatedAt: now,
    attempts: Number(current.attempts ?? 0) + 1
  };
  progress.quests[questId] = next;
  saveQuestProgress(characterId, progress);
  return next;
}

export function completeQuest(characterId, questId, { score = 0, xp = 0, now = new Date().toISOString() } = {}) {
  if (!characterId || !questId) {
    return null;
  }

  const progress = loadQuestProgress(characterId);
  const current = progress.quests[questId] ?? {};
  const next = {
    ...current,
    status: QUEST_STATUS.completed,
    completedAt: current.completedAt ?? now,
    updatedAt: now,
    bestScore: Math.max(Number(current.bestScore) || 0, Number(score) || 0),
    xpAwarded: Math.max(Number(current.xpAwarded) || 0, Number(xp) || 0)
  };
  progress.quests[questId] = next;
  saveQuestProgress(characterId, progress);
  return next;
}

export function setQuestStatus(characterId, questId, status) {
  if (!Object.values(QUEST_STATUS).includes(status)) {
    return null;
  }

  const progress = loadQuestProgress(characterId);
  progress.quests[questId] = {
    ...(progress.quests[questId] ?? {}),
    status,
    updatedAt: new Date().toISOString()
  };
  saveQuestProgress(characterId, progress);
  return progress.quests[questId];
}

export function clearCharacterQuestProgress(characterId) {
  if (!characterId) {
    return false;
  }

  return removeKey(progressKey(characterId));
}

export function characterQuestStatus(characterId, quest, catalog = loadQuestCatalog()) {
  const progress = loadQuestProgress(characterId);
  return questStatusFor(quest, progress.quests, catalog.dependencies);
}

export function createQuest(quest) {
  const validation = validateQuestRecord(quest);

  if (!validation.valid) {
    return { quest: null, errors: validation.errors };
  }

  const catalog = loadQuestCatalog();
  const id = quest.id ?? slugToId(quest.slug, catalog.quests);

  if (catalog.quests.some((candidate) => candidate.id === id || candidate.slug === quest.slug)) {
    return { quest: null, errors: ['Já existe uma quest com este identificador.'] };
  }

  const record = normalizeQuestRecord({
    ...quest,
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  catalog.quests.push(record);
  saveQuestCatalog(catalog);
  return { quest: record, errors: [] };
}

export function updateQuest(questId, patch) {
  const catalog = loadQuestCatalog();
  const index = catalog.quests.findIndex((quest) => quest.id === questId);

  if (index === -1) {
    return { quest: null, errors: ['Quest não encontrada.'] };
  }

  const next = normalizeQuestRecord({
    ...catalog.quests[index],
    ...patch,
    id: questId,
    updatedAt: new Date().toISOString()
  });
  const validation = validateQuestRecord(next);

  if (!validation.valid) {
    return { quest: null, errors: validation.errors };
  }

  catalog.quests[index] = next;
  saveQuestCatalog(catalog);
  return { quest: next, errors: [] };
}

export function setQuestDependencies(questId, prerequisiteIds) {
  const catalog = loadQuestCatalog();
  const quest = catalog.quests.find((candidate) => candidate.id === questId);

  if (!quest) {
    return { valid: false, errors: ['Quest não encontrada.'] };
  }

  const nextDependencies = catalog.dependencies.filter(
    (dependency) => dependency.questId !== questId
  );

  for (const prerequisiteId of new Set(prerequisiteIds)) {
    if (prerequisiteId === questId) {
      return { valid: false, errors: ['Uma quest não pode depender de si mesma.'] };
    }

    if (!catalog.quests.some((candidate) => candidate.id === prerequisiteId)) {
      return { valid: false, errors: ['Pré-requisito inexistente.'] };
    }

    nextDependencies.push({ questId, prerequisiteId });
  }

  catalog.dependencies = nextDependencies;
  saveQuestCatalog(catalog);
  return { valid: true, errors: [] };
}

export function questProgressKey(characterId) {
  return progressKey(characterId);
}

function seedQuestCatalog() {
  const now = new Date().toISOString();
  const campaigns = [
    {
      id: CAMPAIGN_ID,
      slug: CAMPAIGN_ID,
      name: 'Jornada do Conhecimento',
      description: 'Uma trilha de desafios para evoluir em dados e tecnologia.',
      imageId: null,
      order: 1,
      active: true,
      createdAt: now,
      updatedAt: now
    }
  ];
  const quests = [
    normalizeQuestRecord({
      id: 'normaliza',
      campaignId: CAMPAIGN_ID,
      slug: 'normaliza',
      name: 'NORMALIZA!',
      description: 'Organize uma cidade de dados e domine a Primeira, a Segunda e a Terceira Forma Normal.',
      category: 'Normalização',
      difficulty: 2,
      order: 1,
      xpReward: 150,
      maxScore: 400,
      moduleKey: 'normaliza',
      entryPath: '#/cidade',
      attributeRewards: { 'sql-basico': 1, 'sql-avancado': 1 },
      isOptional: false,
      active: true,
      createdAt: now,
      updatedAt: now
    }),
    normalizeQuestRecord({
      id: 'sql',
      campaignId: CAMPAIGN_ID,
      slug: 'sql',
      name: 'SQL',
      description: 'Consultas, filtros e manipulação de dados.',
      category: 'Linguagem SQL',
      difficulty: 2,
      order: 2,
      xpReward: 100,
      maxScore: 100,
      moduleKey: 'sql',
      entryPath: null,
      attributeRewards: { 'sql-avancado': 1, desenvolvedor: 1 },
      isOptional: false,
      active: true,
      createdAt: now,
      updatedAt: now
    }),
    normalizeQuestRecord({
      id: 'postgresql-admin',
      campaignId: CAMPAIGN_ID,
      slug: 'postgresql-admin',
      name: 'PostgreSQL Admin',
      description: 'Administração, desempenho e segurança de dados.',
      category: 'Administração',
      difficulty: 3,
      order: 3,
      xpReward: 120,
      maxScore: 100,
      moduleKey: 'postgresql-admin',
      entryPath: null,
      attributeRewards: { 'postgresql-admin': 2, 'sql-avancado': 1 },
      isOptional: false,
      active: true,
      createdAt: now,
      updatedAt: now
    }),
    normalizeQuestRecord({
      id: 'desenvolvimento',
      campaignId: CAMPAIGN_ID,
      slug: 'desenvolvimento',
      name: 'Desenvolvimento de aplicações',
      description: 'Aplicações conectadas a dados reais.',
      category: 'Desenvolvimento',
      difficulty: 4,
      order: 4,
      xpReward: 140,
      maxScore: 100,
      moduleKey: 'desenvolvimento',
      entryPath: null,
      attributeRewards: { desenvolvedor: 2 },
      isOptional: false,
      active: true,
      createdAt: now,
      updatedAt: now
    })
  ];
  const dependencies = [
    { questId: 'sql', prerequisiteId: 'normaliza' },
    { questId: 'postgresql-admin', prerequisiteId: 'sql' },
    { questId: 'desenvolvimento', prerequisiteId: 'postgresql-admin' }
  ];
  const catalog = { version: QUEST_CATALOG_VERSION, campaigns, quests, dependencies };
  saveQuestCatalog(catalog);
  return normalizeQuestCatalog(catalog);
}

function normalizeQuestRecord(quest) {
  const status = ['draft', 'published', 'archived'].includes(quest.status)
    ? quest.status
    : quest.active === false
      ? 'archived'
      : 'published';

  return {
    id: String(quest.id ?? ''),
    campaignId: String(quest.campaignId ?? CAMPAIGN_ID),
    slug: String(quest.slug ?? '').trim(),
    name: String(quest.name ?? '').trim(),
    description: String(quest.description ?? '').trim(),
    objective: String(quest.objective ?? '').trim(),
    category: String(quest.category ?? 'Geral').trim(),
    difficulty: clamp(Number(quest.difficulty), 1, 5, 1),
    order: Math.max(1, Math.floor(Number(quest.order) || 1)),
    xpReward: Math.max(0, Math.floor(Number(quest.xpReward) || 0)),
    maxScore: Math.max(1, Math.floor(Number(quest.maxScore) || 100)),
    moduleKey: quest.moduleKey ? String(quest.moduleKey) : null,
    entryPath: quest.entryPath ? String(quest.entryPath) : null,
    imageId: quest.imageId ? String(quest.imageId) : null,
    attributeRewards: normalizeRewards(quest.attributeRewards),
    isOptional: Boolean(quest.isOptional),
    status,
    active: status === 'published',
    createdAt: quest.createdAt ?? new Date().toISOString(),
    updatedAt: quest.updatedAt ?? new Date().toISOString()
  };
}

function slugToId(slug, quests) {
  const base = String(slug ?? 'quest')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'quest';
  let id = base;
  let counter = 2;

  while (quests.some((quest) => quest.id === id)) {
    id = `${base}-${counter}`;
    counter += 1;
  }

  return id;
}

function normalizeRewards(rewards) {
  if (!rewards || typeof rewards !== 'object') {
    return {};
  }

  return Object.fromEntries(
    Object.entries(rewards)
      .filter(([, amount]) => Number.isFinite(Number(amount)) && Number(amount) > 0)
      .map(([attributeId, amount]) => [attributeId, Math.floor(Number(amount))])
  );
}

function clamp(value, min, max, fallback) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, Math.floor(value))) : fallback;
}

function progressKey(characterId) {
  return `normaliza:v3:character:${characterId}${QUEST_PROGRESS_SUFFIX}`;
}

function readJson(key, fallback) {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function removeKey(key) {
  try {
    globalThis.localStorage?.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
