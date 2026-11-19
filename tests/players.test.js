import {
  AVATARS,
  normalizePlayerName,
  playerInitials,
  validatePlayerName
} from '../src/core/players.js';
import { buildProfileSummary } from '../src/core/profile.js';
import {
  assignRanks,
  buildLeaderboard,
  normalizeLeaderboardRows,
  pointsToNext
} from '../src/core/ranking.js';
import {
  LEGACY_PROGRESS_KEY,
  PLAYER_REGISTRY_KEY,
  clearPlayerProgress,
  createLocalPlayer,
  loadPendingMatches,
  loadPhaseSnapshot,
  loadPlayerProgress,
  loadPlayerRegistry,
  savePhaseSnapshot
} from '../src/persistence/playerStorage.js';
import {
  createLegacyMatchId,
  queueCompletedPhaseSnapshots
} from '../src/services/score-service.js';
import { assert, assertDeepEqual, assertEqual, test } from './helpers.js';

test('nome de jogador é normalizado e validado', () => {
  assertEqual(normalizePlayerName('  Ana   Maria  '), 'Ana Maria');
  assert(validatePlayerName('Ana Maria').valid);
  assert(!validatePlayerName('').valid);
  assert(!validatePlayerName('AB').valid);
  assert(!validatePlayerName('A'.repeat(21)).valid);
  assert(!validatePlayerName('Ana@Maria').valid);
  assert(!validatePlayerName('Ana', { existingNames: ['ana'] }).valid);
  assert(validatePlayerName('Ana Maria', { existingNames: ['Ana'], currentName: 'Ana' }).valid);
});

test('avatares têm identificadores únicos e iniciais são geradas', () => {
  assertEqual(new Set(AVATARS.map((avatar) => avatar.id)).size, AVATARS.length);
  assertEqual(playerInitials('Ana Maria'), 'AM');
  assertEqual(playerInitials('Carlos'), 'CA');
});

test('ranking ordena por pontos, fases concluídas e momento', () => {
  const rows = normalizeLeaderboardRows([
    { player_id: 'a', name: 'A', total_score: 100, completed_phases: 2, score_achieved_at: '2026-01-02T00:00:00Z' },
    { player_id: 'b', name: 'B', total_score: 200, completed_phases: 2, score_achieved_at: '2026-01-03T00:00:00Z' },
    { player_id: 'c', name: 'C', total_score: 200, completed_phases: 3, score_achieved_at: '2026-01-04T00:00:00Z' },
    { player_id: 'd', name: 'D', total_score: 200, completed_phases: 3, score_achieved_at: '2026-01-01T00:00:00Z' }
  ]);
  const ranked = assignRanks(rows);

  assertDeepEqual(ranked.map((row) => row.id), ['d', 'c', 'b', 'a']);
  assertEqual(ranked[0].rank, 1);
  assertEqual(ranked[0].isTopThree, true);
  assertEqual(ranked[3].isTopThree, false);
});

test('ranking informa diferença para o próximo e posição fora do topo', () => {
  const rows = [
    { player_id: 'a', name: 'A', total_score: 300, completed_phases: 3 },
    { player_id: 'b', name: 'B', total_score: 250, completed_phases: 2 },
    { player_id: 'c', name: 'C', total_score: 100, completed_phases: 1 }
  ];
  const board = buildLeaderboard(rows, 'c');
  const next = pointsToNext(board.rows, 'c');

  assertEqual(board.current.rank, 3);
  assertEqual(next.next.id, 'b');
  assertEqual(next.difference, 150);
});

test('perfil resume pontos, medalhas e atividade', () => {
  const player = {
    id: 'p1',
    name: 'Ana Maria',
    avatarId: 'engenheiro',
    lastActivityAt: '2026-01-01T12:00:00Z'
  };
  const progress = {
    totalScore: 180,
    maxScore: 400,
    completedPhases: 2,
    totalPhases: 4,
    evolutionPercent: 50,
    phases: [
      { id: 'f1', title: 'Fase 1', phaseNumber: 1, medalLabel: '1FN', completed: true, score: 100, maxScore: 100 },
      { id: 'f2', title: 'Fase 2', phaseNumber: 2, medalLabel: '2FN', completed: false, score: 80, maxScore: 100 }
    ]
  };
  const profile = buildProfileSummary({ player, progress });

  assertEqual(profile.name, 'Ana Maria');
  assertEqual(profile.avatar.id, 'engenheiro');
  assertEqual(profile.totalScore, 180);
  assertEqual(profile.medals.length, 1);
  assertEqual(profile.medals[0].label, '1FN');
});

test('progresso é separado por jogador e migra o legado apenas uma vez', () => {
  clearPlayerTestStorage();
  globalThis.localStorage.setItem(
    LEGACY_PROGRESS_KEY,
    JSON.stringify({ 'fase-1': { phaseId: 'fase-1', completed: true, score: 90 } })
  );

  const first = createLocalPlayer({ name: 'Ana', avatarId: 'analista' });
  const second = createLocalPlayer({ name: 'Beto', avatarId: 'construtor' });

  assertEqual(loadPlayerRegistry().players.length, 2);
  assertEqual(loadPlayerRegistry().activePlayerId, second.id);
  assertEqual(loadPhaseSnapshot(first.id, 'fase-1').score, 90);
  assertEqual(loadPhaseSnapshot(second.id, 'fase-1'), null);

  savePhaseSnapshot(second.id, 'fase-2', { phaseId: 'fase-2', completed: true });
  assertEqual(loadPlayerProgress(first.id)['fase-2'], undefined);
  assertEqual(loadPhaseSnapshot(second.id, 'fase-2').completed, true);

  clearPlayerProgress(first.id);
  assertDeepEqual(loadPlayerProgress(first.id), {});
  clearPlayerTestStorage();
});

test('progresso concluído é reconciliado no ranking com partida idempotente', () => {
  clearPlayerTestStorage();
  const player = createLocalPlayer({ name: 'Reconciliada', avatarId: 'analista' });
  const phaseId = 'centro-de-distribuicao';
  const snapshot = {
    phaseId,
    items: [{ orderId: '001', product: 'Caneta' }],
    completed: true,
    score: 90
  };

  savePhaseSnapshot(player.id, phaseId, snapshot);
  savePhaseSnapshot(player.id, 'rede-de-dependencias', {
    phaseId: 'rede-de-dependencias',
    completed: false
  });

  const first = queueCompletedPhaseSnapshots(player.id, [
    phaseId,
    'rede-de-dependencias'
  ]);
  const second = queueCompletedPhaseSnapshots(player.id, [phaseId]);

  assertEqual(first.length, 1);
  assertEqual(first[0].source, 'legacy');
  assertEqual(loadPendingMatches(player.id).length, 1);
  assertEqual(second.length, 0);
  assertEqual(
    first[0].matchId,
    createLegacyMatchId(player.id, phaseId)
  );
  assert(
    /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/.test(first[0].matchId)
  );
  clearPlayerTestStorage();
});

function clearPlayerTestStorage() {
  const keys = [];

  for (let index = 0; index < globalThis.localStorage.length; index += 1) {
    const key = globalThis.localStorage.key(index);
    if (key === PLAYER_REGISTRY_KEY || key === LEGACY_PROGRESS_KEY || key?.startsWith('normaliza:v2:player:') || key === 'normaliza:v2:legacy-migrated-to') {
      keys.push(key);
    }
  }

  for (const key of keys) {
    globalThis.localStorage.removeItem(key);
  }
}
