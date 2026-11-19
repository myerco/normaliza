import { createPlayerId } from '../core/players.js';
import {
  enqueuePendingMatch,
  loadPendingMatches,
  loadPhaseSnapshot,
  loadPlayerRegistry,
  updateLocalPlayer
} from '../persistence/playerStorage.js';
import { createRemoteProfile, submitRemoteSolution } from './multiplayer.js';

export function createMatch({ playerId, phaseId, snapshot, attemptId = null }) {
  return {
    matchId: createPlayerId(),
    playerId,
    phaseId,
    snapshot,
    attemptId,
    createdAt: new Date().toISOString(),
    source: globalThis.navigator?.onLine === false ? 'offline' : 'online'
  };
}

export function queuePhaseCompletion({ playerId, phaseId, snapshot, attemptId = null }) {
  const match = createMatch({ playerId, phaseId, snapshot, attemptId });
  enqueuePendingMatch(playerId, match);
  return match;
}

export function queueCompletedPhaseSnapshots(playerId, phaseIds) {
  if (!playerId || !Array.isArray(phaseIds)) {
    return [];
  }

  const pending = loadPendingMatches(playerId);
  const pendingPhases = new Set(pending.map((match) => match.phaseId));
  const queued = [];

  for (const phaseId of phaseIds) {
    if (pendingPhases.has(phaseId)) {
      continue;
    }

    const snapshot = loadPhaseSnapshot(playerId, phaseId);
    if (!snapshot || snapshot.completed !== true) {
      continue;
    }

    const match = {
      matchId: createLegacyMatchId(playerId, phaseId),
      playerId,
      phaseId,
      snapshot,
      attemptId: null,
      createdAt: new Date().toISOString(),
      source: 'legacy'
    };

    enqueuePendingMatch(playerId, match);
    pendingPhases.add(phaseId);
    queued.push(match);
  }

  return queued;
}

export function createLegacyMatchId(playerId, phaseId) {
  const seed = `normaliza:legacy:${playerId}:${phaseId}`;
  const hex = [0, 1, 2, 3]
    .map((salt) => hashString(seed, salt))
    .join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function pendingMatches(playerId) {
  return loadPendingMatches(playerId);
}

export async function ensureRemotePlayer(playerId) {
  const player = loadPlayerRegistry().players.find((candidate) => candidate.id === playerId);

  if (!player) {
    return null;
  }

  const remote = await createRemoteProfile({
    playerId: player.id,
    name: player.name,
    avatarId: player.avatarId
  });
  const remoteId = remote?.id ?? remote?.playerId ?? player.id;

  updateLocalPlayer(playerId, {
    remoteId,
    syncStatus: 'synced'
  });

  return remote;
}

export async function submitMatch(match) {
  await ensureRemotePlayer(match.playerId);
  return submitRemoteSolution({
    playerId: match.playerId,
    phaseId: match.phaseId,
    snapshot: match.snapshot,
    matchId: match.matchId,
    attemptId: match.attemptId
  });
}

function hashString(value, salt) {
  let hash = (2166136261 ^ salt) >>> 0;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}
