export function normalizeLeaderboardRows(rows) {
  if (!Array.isArray(rows)) {
    return [];
  }

  const normalized = [];
  const seen = new Set();

  for (const row of rows) {
    if (!row || typeof row !== 'object') {
      continue;
    }

    const id = String(row.player_id ?? row.playerId ?? row.id ?? '').trim();
    const name = String(row.name ?? '').trim();

    if (!id || !name || seen.has(id)) {
      continue;
    }

    seen.add(id);
    normalized.push({
      id,
      name,
      avatarId: String(row.avatar_id ?? row.avatarId ?? 'construtor'),
      totalScore: toNonNegativeInteger(row.total_score ?? row.totalScore),
      completedPhases: toNonNegativeInteger(row.completed_phases ?? row.completedPhases),
      scoreAchievedAt: toDateValue(row.score_achieved_at ?? row.scoreAchievedAt)
    });
  }

  return sortLeaderboard(normalized);
}

export function sortLeaderboard(rows) {
  return [...rows].sort((first, second) => {
    if (second.totalScore !== first.totalScore) {
      return second.totalScore - first.totalScore;
    }

    if (second.completedPhases !== first.completedPhases) {
      return second.completedPhases - first.completedPhases;
    }

    const firstTime = first.scoreAchievedAt
      ? new Date(first.scoreAchievedAt).getTime()
      : Number.MAX_SAFE_INTEGER;
    const secondTime = second.scoreAchievedAt
      ? new Date(second.scoreAchievedAt).getTime()
      : Number.MAX_SAFE_INTEGER;

    if (firstTime !== secondTime) {
      return firstTime - secondTime;
    }

    return first.name.localeCompare(second.name, 'pt-BR');
  });
}

export function assignRanks(rows) {
  return normalizeLeaderboardRows(rows).map((row, index) => ({
    ...row,
    rank: index + 1,
    isTopThree: index < 3
  }));
}

export function findPlayerRank(rows, playerId) {
  if (!playerId) {
    return null;
  }

  const ranked = assignRanks(rows);
  return ranked.find((row) => row.id === playerId) ?? null;
}

export function pointsToNext(rows, playerId) {
  const ranked = assignRanks(rows);
  const index = ranked.findIndex((row) => row.id === playerId);

  if (index <= 0) {
    return null;
  }

  const current = ranked[index];
  const next = ranked[index - 1];

  return {
    next: next,
    difference: Math.max(0, next.totalScore - current.totalScore)
  };
}

export function buildLeaderboard(rows, currentPlayerId = null) {
  const ranked = assignRanks(rows);
  const current = ranked.find((row) => row.id === currentPlayerId) ?? null;
  const next = current ? pointsToNext(ranked, currentPlayerId) : null;

  return {
    rows: ranked,
    current,
    next,
    topThree: ranked.slice(0, 3)
  };
}

function toNonNegativeInteger(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : 0;
}

function toDateValue(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
