import { buildLeaderboard, normalizeLeaderboardRows } from '../core/ranking.js';
import { loadRankingCache, saveRankingCache } from '../persistence/playerStorage.js';
import { fetchLeaderboard } from './multiplayer.js';

export async function loadSharedLeaderboard(playerId) {
  try {
    const response = await fetchLeaderboard();
    const rows = normalizeLeaderboardRows(Array.isArray(response) ? response : []);
    const cache = {
      rows,
      updatedAt: new Date().toISOString()
    };

    saveRankingCache(playerId, cache);
    return {
      ...buildLeaderboard(rows, playerId),
      offline: false,
      updatedAt: cache.updatedAt,
      error: null
    };
  } catch (error) {
    const cache = loadRankingCache(playerId);
    const rows = normalizeLeaderboardRows(cache?.rows ?? []);

    return {
      ...buildLeaderboard(rows, playerId),
      offline: true,
      updatedAt: cache?.updatedAt ?? null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
