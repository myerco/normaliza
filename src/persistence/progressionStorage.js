import {
  ATTRIBUTE_MAX,
  applyAttributeRewards,
  evaluateProgressionAchievements,
  levelFromXp
} from '../core/progression.js';

export const PROGRESSION_KEY_PREFIX = 'normaliza:v3:character:';
const PROGRESSION_SUFFIX = ':progression';
const VERSION = 1;

export function loadProgression(characterId) {
  if (!characterId) {
    return emptyProgression();
  }

  const stored = readJson(progressionKey(characterId), null);

  if (!stored || typeof stored !== 'object') {
    return emptyProgression();
  }

  return {
    version: VERSION,
    xp: Math.max(0, Math.floor(Number(stored.xp) || 0)),
    level: Math.max(1, Math.floor(Number(stored.level) || 1)),
    attributes: normalizeAttributes(stored.attributes),
    xpHistory: Array.isArray(stored.xpHistory) ? stored.xpHistory : [],
    attributeHistory: Array.isArray(stored.attributeHistory)
      ? stored.attributeHistory
      : [],
    achievements: Array.isArray(stored.achievements) ? stored.achievements : [],
    updatedAt: stored.updatedAt ?? null
  };
}

export function ensureProgression(character, catalog) {
  if (!character) {
    return emptyProgression();
  }

  const stored = loadProgression(character.id);
  const initialValues = catalog?.values?.[character.archetypeId] ?? {};
  const attributes = { ...stored.attributes };
  let changed = false;

  for (const attribute of catalog?.attributes ?? []) {
    const initial = Number(initialValues[attribute.id]);
    const normalizedInitial = Number.isFinite(initial)
      ? Math.min(ATTRIBUTE_MAX, Math.max(1, Math.floor(initial)))
      : 1;

    if (!attributes[attribute.id]) {
      attributes[attribute.id] = {
        initial: normalizedInitial,
        current: normalizedInitial
      };
      changed = true;
    } else {
      const current = Number(attributes[attribute.id].current);
      const storedInitial = Number(attributes[attribute.id].initial);
      attributes[attribute.id] = {
        initial: Number.isFinite(storedInitial)
          ? Math.min(ATTRIBUTE_MAX, Math.max(1, Math.floor(storedInitial)))
          : normalizedInitial,
        current: Number.isFinite(current)
          ? Math.min(ATTRIBUTE_MAX, Math.max(1, Math.floor(current)))
          : normalizedInitial
      };
    }
  }

  const level = levelFromXp(stored.xp).level;

  if (changed || stored.version !== VERSION || stored.level !== level) {
    stored.attributes = attributes;
    stored.level = level;
    stored.version = VERSION;
    stored.updatedAt = new Date().toISOString();
    saveProgression(character.id, stored);
  }

  return {
    ...stored,
    level
  };
}

export function saveProgression(characterId, progression) {
  if (!characterId) {
    return false;
  }

  return writeJson(progressionKey(characterId), {
    version: VERSION,
    xp: progression.xp,
    level: progression.level,
    attributes: progression.attributes,
    xpHistory: progression.xpHistory,
    attributeHistory: progression.attributeHistory,
    achievements: progression.achievements,
    updatedAt: progression.updatedAt
  });
}

export function addXp(progression, amount, meta = {}) {
  const value = Math.max(0, Math.floor(Number(amount) || 0));
  const entry = {
    id: meta.id ?? `xp-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    amount: value,
    source: meta.source ?? 'quest',
    sourceId: meta.sourceId ?? null,
    reason: meta.reason ?? '',
    createdAt: meta.createdAt ?? new Date().toISOString()
  };
  const xp = Math.max(0, progression.xp + value);
  const updated = {
    ...progression,
    xp,
    level: levelFromXp(xp).level,
    xpHistory: [...progression.xpHistory, entry],
    updatedAt: entry.createdAt
  };
  return updated;
}

export function applyRewards(progression, rewards, meta = {}) {
  const { attributes, changes } = applyAttributeRewards(progression.attributes, rewards);
  const now = meta.createdAt ?? new Date().toISOString();
  const history = changes.map((change) => ({
    id: `attr-${Date.now()}-${change.attributeId}-${Math.random().toString(16).slice(2)}`,
    attributeId: change.attributeId,
    previous: change.previous,
    current: change.current,
    source: meta.source ?? 'quest',
    sourceId: meta.sourceId ?? null,
    createdAt: now
  }));

  return {
    ...progression,
    attributes,
    attributeHistory: [...progression.attributeHistory, ...history],
    updatedAt: now
  };
}

export function unlockAchievements(progression, completedQuestIds = []) {
  const earned = evaluateProgressionAchievements({
    level: progression.level,
    completedQuestIds,
    attributes: progression.attributes
  });
  const existing = new Set(progression.achievements);
  const additions = earned.filter((id) => !existing.has(id));

  if (additions.length === 0) {
    return { progression, additions: [] };
  }

  return {
    progression: {
      ...progression,
      achievements: [...progression.achievements, ...additions],
      updatedAt: new Date().toISOString()
    },
    additions
  };
}

export function clearProgression(characterId) {
  if (!characterId) {
    return false;
  }

  return removeKey(progressionKey(characterId));
}

export function progressionKey(characterId) {
  return `${PROGRESSION_KEY_PREFIX}${characterId}${PROGRESSION_SUFFIX}`;
}

function emptyProgression() {
  return {
    version: VERSION,
    xp: 0,
    level: 1,
    attributes: {},
    xpHistory: [],
    attributeHistory: [],
    achievements: [],
    updatedAt: null
  };
}

function normalizeAttributes(attributes) {
  if (!attributes || typeof attributes !== 'object') {
    return {};
  }

  return Object.fromEntries(
    Object.entries(attributes).map(([attributeId, value]) => {
      const initial = Number(value?.initial ?? value ?? 1);
      const current = Number(value?.current ?? value ?? 1);
      return [
        attributeId,
        {
          initial: Math.min(ATTRIBUTE_MAX, Math.max(1, Math.floor(initial) || 1)),
          current: Math.min(ATTRIBUTE_MAX, Math.max(1, Math.floor(current) || 1))
        }
      ];
    })
  );
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
