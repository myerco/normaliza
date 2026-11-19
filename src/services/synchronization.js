import {
  loadPendingMatches,
  removePendingMatch,
  touchPlayer,
  updateLocalPlayer
} from '../persistence/playerStorage.js';
import { isNetworkEnabled, MultiplayerError } from './multiplayer.js';
import { submitMatch } from './score-service.js';

const runningPlayers = new Set();

export function isOnline() {
  return globalThis.navigator?.onLine !== false && isNetworkEnabled();
}

export function pendingCount(playerId) {
  return loadPendingMatches(playerId).length;
}

export async function synchronizePlayer(playerId) {
  if (!playerId) {
    return { status: 'offline', synced: 0, pending: 0, errors: [] };
  }

  if (runningPlayers.has(playerId)) {
    return { status: 'running', synced: 0, pending: pendingCount(playerId), errors: [] };
  }

  if (!isOnline()) {
    const pending = pendingCount(playerId);
    updateLocalPlayer(playerId, { syncStatus: pending > 0 ? 'pending' : 'local' });
    return { status: 'offline', synced: 0, pending, errors: [] };
  }

  runningPlayers.add(playerId);
  let synced = 0;
  const errors = [];

  try {
    const matches = loadPendingMatches(playerId);

    for (const match of matches) {
      try {
        await submitMatch(match);
        removePendingMatch(playerId, match.matchId);
        synced += 1;
      } catch (error) {
        errors.push({
          matchId: match.matchId,
          code: error instanceof MultiplayerError ? error.code : 'sync-failed',
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }

    const pending = pendingCount(playerId);
    updateLocalPlayer(playerId, {
      syncStatus: errors.length > 0 ? 'pending' : pending > 0 ? 'pending' : 'synced'
    });
    touchPlayer(playerId);

    return {
      status: errors.length > 0 ? 'partial' : 'synced',
      synced,
      pending,
      errors
    };
  } finally {
    runningPlayers.delete(playerId);
  }
}

export function attachSynchronization(playerId, onStatus) {
  if (!playerId || typeof globalThis.addEventListener !== 'function') {
    return () => {};
  }

  const handleOnline = async () => {
    const result = await synchronizePlayer(playerId);
    onStatus?.(result);
  };

  globalThis.addEventListener('online', handleOnline);

  return () => {
    globalThis.removeEventListener('online', handleOnline);
  };
}
