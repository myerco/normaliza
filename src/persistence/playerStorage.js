import { createPlayerRecord, updatePlayerRecord } from '../core/players.js';

export const PLAYER_REGISTRY_KEY = 'normaliza:v2:players';
export const PLAYER_KEY_PREFIX = 'normaliza:v2:player:';
export const LEGACY_PROGRESS_KEY = 'normaliza:v1:progress';
export const LEGACY_MIGRATION_KEY = 'normaliza:v2:legacy-migrated-to';

const REGISTRY_VERSION = 2;

export function loadPlayerRegistry() {
  const stored = readJson(PLAYER_REGISTRY_KEY, null);

  if (!stored || typeof stored !== 'object' || !Array.isArray(stored.players)) {
    return {
      version: REGISTRY_VERSION,
      activePlayerId: null,
      players: []
    };
  }

  const players = stored.players
    .filter((player) => player && typeof player.id === 'string' && typeof player.name === 'string')
    .map((player) => ({
      ...createPlayerRecord({ name: player.name, avatarId: player.avatarId }),
      ...player
    }));
  const activePlayerId = players.some((player) => player.id === stored.activePlayerId)
    ? stored.activePlayerId
    : players[0]?.id ?? null;

  return {
    version: REGISTRY_VERSION,
    activePlayerId,
    players
  };
}

export function savePlayerRegistry(registry) {
  return writeJson(PLAYER_REGISTRY_KEY, {
    version: REGISTRY_VERSION,
    activePlayerId: registry.activePlayerId ?? null,
    players: Array.isArray(registry.players) ? registry.players : []
  });
}

export function listLocalPlayers() {
  const registry = loadPlayerRegistry();
  return [...registry.players].sort((first, second) =>
    String(second.lastActivityAt || second.updatedAt || '').localeCompare(
      String(first.lastActivityAt || first.updatedAt || '')
    )
  );
}

export function getActivePlayer() {
  const registry = loadPlayerRegistry();
  return registry.players.find((player) => player.id === registry.activePlayerId) ?? null;
}

export function setActivePlayer(playerId) {
  const registry = loadPlayerRegistry();
  const player = registry.players.find((candidate) => candidate.id === playerId);

  if (!player) {
    return null;
  }

  registry.activePlayerId = playerId;
  savePlayerRegistry(registry);
  return player;
}

export function createLocalPlayer({ name, avatarId, bio = '' }) {
  const registry = loadPlayerRegistry();
  const player = {
    ...createPlayerRecord({ name, avatarId, bio }),
    needsCharacterSetup: true
  };
  registry.players = [...registry.players, player];
  registry.activePlayerId = player.id;
  savePlayerRegistry(registry);

  if (registry.players.length === 1 && hasLegacyProgress()) {
    migrateLegacyProgress(player.id);
  }

  return player;
}

export function updateLocalPlayer(playerId, patch) {
  const registry = loadPlayerRegistry();
  const index = registry.players.findIndex((player) => player.id === playerId);

  if (index === -1) {
    return null;
  }

  const updated = updatePlayerRecord(registry.players[index], patch);
  registry.players[index] = updated;
  savePlayerRegistry(registry);
  return updated;
}

export function touchPlayer(playerId, now = new Date().toISOString()) {
  const registry = loadPlayerRegistry();
  const index = registry.players.findIndex((player) => player.id === playerId);

  if (index === -1) {
    return null;
  }

  registry.players[index] = {
    ...registry.players[index],
    lastActivityAt: now,
    updatedAt: now
  };
  savePlayerRegistry(registry);
  return registry.players[index];
}

export function loadPlayerProgress(playerId) {
  if (!playerId) {
    return {};
  }

  const stored = readJson(progressKey(playerId), {});
  return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
}

export function loadPhaseSnapshot(playerId, phaseId) {
  const progress = loadPlayerProgress(playerId);
  const snapshot = progress[phaseId];
  return snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot) ? snapshot : null;
}

export function savePhaseSnapshot(playerId, phaseId, snapshot) {
  if (!playerId || !phaseId) {
    return false;
  }

  const progress = loadPlayerProgress(playerId);
  progress[phaseId] = snapshot;
  const saved = writeJson(progressKey(playerId), progress);

  if (saved) {
    touchPlayer(playerId);
  }

  return saved;
}

export function clearPhaseSnapshot(playerId, phaseId) {
  if (!playerId || !phaseId) {
    return false;
  }

  const progress = loadPlayerProgress(playerId);
  delete progress[phaseId];
  return writeJson(progressKey(playerId), progress);
}

export function clearPlayerProgress(playerId) {
  if (!playerId) {
    return false;
  }

  return removeKey(progressKey(playerId));
}

export function loadPendingMatches(playerId) {
  const stored = readJson(pendingKey(playerId), []);
  return Array.isArray(stored) ? stored.filter(isPendingMatch) : [];
}

export function savePendingMatches(playerId, matches) {
  return writeJson(
    pendingKey(playerId),
    Array.isArray(matches) ? matches.filter(isPendingMatch) : []
  );
}

export function enqueuePendingMatch(playerId, match) {
  if (!isPendingMatch(match)) {
    return loadPendingMatches(playerId);
  }

  const pending = loadPendingMatches(playerId);

  if (pending.some((item) => item.matchId === match.matchId)) {
    return pending;
  }

  const next = [...pending, match];
  savePendingMatches(playerId, next);
  return next;
}

export function removePendingMatch(playerId, matchId) {
  const next = loadPendingMatches(playerId).filter((match) => match.matchId !== matchId);
  savePendingMatches(playerId, next);
  return next;
}

export function loadRankingCache(playerId) {
  const stored = readJson(rankingCacheKey(playerId), null);
  return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : null;
}

export function saveRankingCache(playerId, payload) {
  return writeJson(rankingCacheKey(playerId), payload);
}

export function hasLegacyProgress() {
  const legacy = readJson(LEGACY_PROGRESS_KEY, null);
  return Boolean(legacy && typeof legacy === 'object' && !Array.isArray(legacy) && Object.keys(legacy).length > 0);
}

export function loadLegacyProgress() {
  const legacy = readJson(LEGACY_PROGRESS_KEY, {});
  return legacy && typeof legacy === 'object' && !Array.isArray(legacy) ? legacy : {};
}

export function migrateLegacyProgress(playerId) {
  if (!playerId) {
    return { migrated: false, phases: [] };
  }

  const legacy = loadLegacyProgress();
  const phaseIds = Object.keys(legacy).filter((phaseId) => {
    const snapshot = legacy[phaseId];
    return snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot);
  });

  if (phaseIds.length === 0) {
    return { migrated: false, phases: [] };
  }

  const progress = loadPlayerProgress(playerId);

  for (const phaseId of phaseIds) {
    if (!progress[phaseId]) {
      progress[phaseId] = legacy[phaseId];
    }
  }

  writeJson(progressKey(playerId), progress);
  writeJson(LEGACY_MIGRATION_KEY, {
    playerId,
    migratedAt: new Date().toISOString(),
    phases: phaseIds
  });

  return { migrated: true, phases: phaseIds };
}

export function getPlayerSyncState(playerId) {
  const pending = loadPendingMatches(playerId);
  const player = loadPlayerRegistry().players.find((candidate) => candidate.id === playerId);

  if (!player) {
    return { syncStatus: 'local', pendingCount: pending.length };
  }

  if (pending.length > 0) {
    return { syncStatus: 'pending', pendingCount: pending.length };
  }

  return { syncStatus: player.syncStatus || 'local', pendingCount: 0 };
}

function progressKey(playerId) {
  return `${PLAYER_KEY_PREFIX}${playerId}:progress`;
}

function pendingKey(playerId) {
  return `${PLAYER_KEY_PREFIX}${playerId}:pending`;
}

function rankingCacheKey(playerId) {
  return `${PLAYER_KEY_PREFIX}${playerId}:ranking`;
}

function isPendingMatch(match) {
  return Boolean(
    match &&
      typeof match.matchId === 'string' &&
      typeof match.playerId === 'string' &&
      typeof match.phaseId === 'string' &&
      match.snapshot &&
      typeof match.snapshot === 'object'
  );
}

function readJson(key, fallback) {
  try {
    const raw = globalThis.localStorage?.getItem(key);

    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw);
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
