import {
  applyRoute,
  createInitialState,
  getHud,
  getSelectedBuilding,
  setScore
} from './state/gameState.js';
import { parseRoute, toHash } from './router/router.js';
import { validateCityData } from './data/validateCityData.js';
import { validatePhaseData } from './data/validatePhaseData.js';
import { validatePhase2Data } from './data/validatePhase2Data.js';
import { validatePhase3Data } from './data/validatePhase3Data.js';
import { validatePhase4Data } from './data/validatePhase4Data.js';
import { validateMissionData } from './data/validateMissionData.js';
import { buildGameProgress } from './core/progress.js';
import { buildAchievements, buildProfileSummary } from './core/profile.js';
import { buildLeaderboard } from './core/ranking.js';
import { toSnapshot as snapshotPhase1 } from './core/fase1.js';
import { toSnapshot as snapshotPhase2 } from './core/fase2.js';
import { toSnapshot as snapshotPhase3 } from './core/fase3.js';
import { toSnapshot as snapshotPhase4 } from './core/fase4.js';
import {
  clearPhaseSnapshot,
  clearPlayerProgress,
  createLocalPlayer,
  getActivePlayer,
  getPlayerSyncState,
  hasLegacyProgress,
  listLocalPlayers,
  loadPendingMatches,
  loadPhaseSnapshot,
  loadRankingCache,
  savePendingMatches,
  savePhaseSnapshot,
  setActivePlayer,
  updateLocalPlayer,
  upsertPlayerFromServer
} from './persistence/playerStorage.js';
import {
  createCharacterForPlayer,
  ensurePrimaryCharacter,
  getPrimaryCharacter,
  updateCharacter
} from './persistence/characterStorage.js';
import {
  createArchetype,
  createAttribute,
  loadCatalog,
  setArchetypeValues,
  updateArchetype,
  updateAttribute
} from './persistence/catalogStorage.js';
import {
  loadQuestCatalog,
  loadQuestProgress,
  saveQuestCatalog,
  startQuest
} from './persistence/questStorage.js';
import { ensureProgression } from './persistence/progressionStorage.js';
import { loadKnowledgeCatalog } from './persistence/knowledgeStorage.js';
import { loadWorldCatalog, saveWorldCatalog } from './persistence/worldStorage.js';
import { loadImageAssets, updateImageAsset } from './persistence/imageStorage.js';
import { awardQuestCompletion } from './services/progression-service.js';
import {
  isDatabaseContentEnabled,
  loadDatabaseContent,
  saveDatabaseContent
} from './services/content-service.js';
import {
  createPlayer as createAuthenticatedPlayer,
  getCurrentUser,
  getPlayer as getAuthenticatedPlayer,
  login as loginAccount,
  logout as logoutAccount,
  recover as recoverAccount,
  register as registerAccount,
  updatePlayer as updateAuthenticatedPlayer
} from './services/auth-service.js';
import { questStatusFor } from './core/quests.js';
import { loadSharedLeaderboard } from './services/leaderboard-service.js';
import { isOnline, synchronizePlayer, attachSynchronization } from './services/synchronization.js';
import {
  ensureRemotePlayer,
  queueCompletedPhaseSnapshots,
  queuePhaseCompletion
} from './services/score-service.js';
import {
  confirmNormalizaQuest,
  recordRemoteHint,
  recordRemoteValidation,
  startRemoteAttempt
} from './services/multiplayer.js';
import { playCompletionCelebration } from './ui/celebration.js';
import {
  addCityExtension,
  playBuildAnimation,
  removeCityExtension,
  renderCity,
  setBuildingNormalized,
  setSelectedBuilding
} from './ui/cityScene.js';
import { renderHud, updateHudPhase, updateHudScore } from './ui/hud.js';
import { renderPanel } from './ui/infoPanel.js';
import { renderHome } from './ui/home.js';
import { renderPlayerHome } from './ui/playerHome.js';
import {
  isPrivatePlayerScreen,
  mountPlayerPageFrame,
  playerSectionFor,
  resetPlayerPageFrame
} from './ui/playerLayout.js';
import { renderPublicHome } from './ui/publicHome.js';
import { renderAuthPage, renderOnboardingPage } from './ui/auth.js';
import { renderChallengesPage } from './ui/challenges.js';
import { renderKnowledgePage } from './ui/knowledge.js';
import {
  renderQuestDetailPage,
  renderTerritoryPage,
  renderTrackPage,
  renderWorldMapPage
} from './ui/worldMap.js';
import { renderProfilePage } from './ui/profile.js';
import { renderSkillsPage } from './ui/skills.js';
import { renderSpecializationsPage } from './ui/specializations.js';
import { renderAdminPage } from './ui/admin.js';
import { renderWorldAdminPage } from './ui/worldAdmin.js';
import {
  renderAdminAudit,
  renderAdminDashboard,
  renderAdminForbidden,
  renderAdminPlayers,
  renderAdminSettings,
  renderAdminUserDetail,
  renderAdminUsers
} from './ui/adminPanel.js';
import {
  blockAdminUser,
  loadAdminAccess,
  loadAdminAudit,
  loadAdminDashboard,
  loadAdminSettings,
  loadAdminUser,
  loadAdminUsers,
  requestAdminPasswordReset,
  saveAdminSettings,
  unblockAdminUser,
  updateAdminUserEmail,
  updateAdminUserRoles
} from './services/admin-service.js';
import { renderCharacterPage } from './ui/character.js';
import { renderLeaderboardPage } from './ui/leaderboard.js';
import { renderAchievementsPage } from './ui/achievements.js';
import { renderAboutPage } from './ui/about.js';
import { openInstructions } from './ui/instructions.js';
import { createPhase1 } from './ui/phase1.js';
import { createPhase2 } from './ui/phase2.js';
import { createPhase3 } from './ui/phase3.js';
import { createPhase4 } from './ui/phase4.js';
import { createAdministration } from './ui/administration.js';
import { openHelp } from './ui/help.js';
import { openConfirm } from './ui/confirm.js';

const elements = {
  app: document.getElementById('app'),
  splash: document.getElementById('splash-screen'),
  home: document.getElementById('home-content'),
  game: document.getElementById('game-screen'),
  hud: document.getElementById('hud'),
  cityMain: document.getElementById('city-main'),
  phaseScreen: document.getElementById('phase-screen'),
  missionScreen: document.getElementById('mission-screen'),
  missionHost: document.getElementById('mission-host'),
  phaseHosts: {
    'centro-de-distribuicao': document.getElementById('phase-host-fase-1'),
    'rede-de-dependencias': document.getElementById('phase-host-fase-2'),
    'cidade-organizada': document.getElementById('phase-host-fase-3'),
    'gestao-de-funcionarios-e-pedidos': document.getElementById('phase-host-fase-4')
  },
  svg: document.getElementById('city-svg'),
  panel: document.getElementById('info-panel'),
  cityStage: document.querySelector('.city-stage'),
  pageScreen: document.getElementById('page-screen'),
  pageHost: document.getElementById('page-host'),
  instructionsRoot: document.getElementById('instructions-root'),
  helpRoot: document.getElementById('help-root'),
  confirmRoot: document.getElementById('confirm-root')
};

let cityData = null;
let phase1Data = null;
let phase2Data = null;
let phase3Data = null;
let phase4Data = null;
let missionData = null;
let missionController = null;
let glossaryData = null;
let tipsData = null;
let phaseDefinitions = [];
let phaseControllers = new Map();
let phaseScores = {};
let activePlayer = null;
let activeAuthUser = null;
let activeCharacter = null;
let activeCatalog = null;
let activeQuestCatalog = null;
let activeKnowledge = null;
let activeWorld = null;
let activeProgression = null;
let characterNotice = '';
let characterError = '';
let adminNotice = '';
let adminAccess = null;
let adminDashboardData = null;
let adminUsersData = null;
let adminUserDetail = null;
let adminAuditData = null;
let adminSettingsData = null;
let adminQuery = {};
let adminAuditQuery = {};
let adminError = '';
let adminLoading = false;
let authNotice = '';
let authError = '';
let state = null;
let currentScreen = null;
let currentPhaseId = null;
let panelBuildingId;
let showIdentity = false;
let profileNotice = '';
let profileSaveError = '';
let rankingState = createEmptyRankingState();
let syncCleanup = null;
const phaseAttempts = new Map();

boot();

async function boot() {
  try {
    const [
      cityResponse,
      phase1Response,
      phase2Response,
      phase3Response,
      phase4Response,
      missionResponse,
      glossaryResponse,
      tipsResponse
    ] = await Promise.all([
      fetch(new URL('../data/city.json', import.meta.url)),
      fetch(new URL('../data/phases/fase-1.json', import.meta.url)),
      fetch(new URL('../data/phases/fase-2.json', import.meta.url)),
      fetch(new URL('../data/phases/fase-3.json', import.meta.url)),
      fetch(new URL('../data/phases/fase-4.json', import.meta.url)),
      fetch(new URL('../data/missions/administracao.json', import.meta.url)),
      fetch(new URL('../data/glossary.json', import.meta.url)),
      fetch(new URL('../data/tips.json', import.meta.url))
    ]);

    for (const [name, response] of [
      ['data/city.json', cityResponse],
      ['data/phases/fase-1.json', phase1Response],
      ['data/phases/fase-2.json', phase2Response],
      ['data/phases/fase-3.json', phase3Response],
      ['data/phases/fase-4.json', phase4Response],
      ['data/missions/administracao.json', missionResponse],
      ['data/glossary.json', glossaryResponse],
      ['data/tips.json', tipsResponse]
    ]) {
      if (!response.ok) {
        throw new Error(`Falha ao carregar ${name} (HTTP ${response.status}).`);
      }
    }

    cityData = await cityResponse.json();
    phase1Data = await phase1Response.json();
    phase2Data = await phase2Response.json();
    phase3Data = await phase3Response.json();
    phase4Data = await phase4Response.json();
    missionData = await missionResponse.json();
    glossaryData = await glossaryResponse.json();
    tipsData = await tipsResponse.json();

    const cityValidation = validateCityData(cityData);
    if (!cityValidation.valid) {
      throw new Error(`Dados da cidade inválidos: ${cityValidation.errors.join(' ')}`);
    }

    const phase1Validation = validatePhaseData(phase1Data);
    if (!phase1Validation.valid) {
      throw new Error(`Dados da fase 1 inválidos: ${phase1Validation.errors.join(' ')}`);
    }

    const phase2Validation = validatePhase2Data(phase2Data, {
      cityBuildingIds: cityData.city.buildings.map((building) => building.id)
    });
    if (!phase2Validation.valid) {
      throw new Error(`Dados da fase 2 inválidos: ${phase2Validation.errors.join(' ')}`);
    }

    const phase3Validation = validatePhase3Data(phase3Data, {
      cityBuildingIds: cityData.city.buildings.map((building) => building.id)
    });
    if (!phase3Validation.valid) {
      throw new Error(`Dados da fase 3 inválidos: ${phase3Validation.errors.join(' ')}`);
    }

    const phase4Validation = validatePhase4Data(phase4Data, {
      cityBuildingIds: cityData.city.buildings.map((building) => building.id)
    });
    if (!phase4Validation.valid) {
      throw new Error(`Dados da fase 4 inválidos: ${phase4Validation.errors.join(' ')}`);
    }

    const missionValidation = validateMissionData(missionData);
    if (!missionValidation.valid) {
      throw new Error(`Dados da missão inválidos: ${missionValidation.errors.join(' ')}`);
    }

    if (!Array.isArray(glossaryData?.concepts) || glossaryData.concepts.length === 0) {
      throw new Error('Dados do glossário inválidos.');
    }

    if (!tipsData || typeof tipsData !== 'object' || Array.isArray(tipsData)) {
      throw new Error('Dados das dicas inválidos.');
    }
  } catch (error) {
    showFatalError(error);
    return;
  }

  activeCatalog = loadCatalog();
  const databaseContent = await loadDatabaseContent();

  if (databaseContent) {
    activeWorld = saveWorldCatalog(databaseContent.world);
    activeQuestCatalog = saveQuestCatalog(databaseContent.questCatalog);
  } else {
    activeQuestCatalog = loadQuestCatalog();
    activeWorld = loadWorldCatalog();
  }

  activeKnowledge = loadKnowledgeCatalog();
  state = createInitialState(cityData);
  renderCity(elements.svg, cityData, {
    onSelect: (buildingId) => navigate({ screen: 'city', buildingId })
  });

  if (isTestMode()) {
    activePlayer = getActivePlayer();
  } else {
    activeAuthUser = await getCurrentUser();

    if (activeAuthUser) {
      adminAccess = await loadAdminAccess();
      const serverPlayer = await getAuthenticatedPlayer();
      activePlayer = serverPlayer ? upsertPlayerFromServer(serverPlayer) : null;
    }
  }

  if (activePlayer) {
    activeCharacter = activePlayer.needsCharacterSetup
      ? getPrimaryCharacter(activePlayer.id)
      : ensurePrimaryCharacter(activePlayer);

    if (!activePlayer.needsCharacterSetup) {
      activePlayer = getActivePlayer();
    }

    activeProgression = activeCharacter
      ? ensureProgression(activeCharacter, activeCatalog)
      : null;

    initializePlayerSession();
  }

  window.addEventListener('hashchange', handleRoute);
  document.addEventListener('keydown', handleGlobalKeydown);
  handleRoute();
  document.documentElement.dataset.appReady = 'true';
}

function isTestMode() {
  try {
    return new URLSearchParams(globalThis.location?.search ?? '').get('test') === '1';
  } catch {
    return false;
  }
}

function initializePlayerSession() {
  const definitions = buildPhaseDefinitions();
  const controllers = [];

  for (const definition of definitions) {
    const controller = definition.create({
      data: definition.data,
      snapshot: loadPhaseSnapshot(activePlayer.id, definition.data.id),
      onScoreChange: (score) => updatePhaseScore(definition.data.id, score),
      onStateChange: (snapshot) => {
        savePhaseSnapshot(activePlayer.id, definition.data.id, snapshot);
        activePlayer = getActivePlayer();
      },
      onHint: () => trackPhaseHint(definition.data.id),
      onValidation: () => trackPhaseValidation(definition.data.id),
      onComplete: (nextState) => {
        playCompletionCelebration({
          label: definition.medalLabel,
          title: 'Medalha conquistada'
        });
        queueCompletedPhase(definition, nextState);
        refreshCityEvolution();
        syncNormalizaQuest();
      },
      onReset: () => {
        clearPhaseSnapshot(activePlayer.id, definition.data.id);
        removePendingPhase(definition.data.id);
        phaseAttempts.delete(definition.data.id);
        refreshCityEvolution();
        ensurePhaseAttempt(definition.data.id);
      },
      onExit: () => navigate({ screen: 'city', buildingId: definition.buildingId })
    });

    controllers.push({ ...definition, controller });
  }

  phaseDefinitions = controllers.map(({ create, toSnapshot, ...definition }) => definition);
  phaseControllers = new Map(
    phaseDefinitions.map((definition) => [definition.data.id, definition.controller])
  );

  for (const definition of phaseDefinitions) {
    definition.controller.mount(elements.phaseHosts[definition.data.id]);
  }

  missionController = createAdministration({
    data: missionData,
    onComplete: () =>
      playCompletionCelebration({ label: 'Missão', title: 'Missão especial concluída' }),
    onExit: () => navigate({ screen: 'city', buildingId: null })
  });
  missionController.mount(elements.missionHost);

  refreshCityEvolution();

  phaseScores = Object.fromEntries(
    phaseDefinitions.map((definition) => [
      definition.data.id,
      definition.controller.getState().score
    ])
  );
  state = setScore(state, totalPhaseScore());

  renderHudForPlayer();
  syncCleanup = attachSynchronization(activePlayer.id, () => {
    confirmNormalizaQuestWithServer();

    if (state?.screen === 'splash' || state?.screen === 'profile' || state?.screen === 'ranking') {
      rankingState = createEmptyRankingState();
      render();
    }
  });

  queueCompletedPhaseSnapshots(
    activePlayer.id,
    phaseDefinitions.map((definition) => definition.data.id)
  );

  syncNormalizaQuest();

  if (isOnline()) {
    ensureRemotePlayer(activePlayer.id).catch(() => {});
    window.setTimeout(synchronizeInBackground, 500);

    if (currentProgress().completedPhases >= currentProgress().totalPhases) {
      window.setTimeout(confirmNormalizaQuestWithServer, 1800);
    }
  }
}

function buildPhaseDefinitions() {
  return [
    {
      data: phase1Data,
      create: createPhase1,
      toSnapshot: snapshotPhase1,
      phaseNumber: 1,
      medalLabel: '1FN',
      buildingId: 'pedido',
      buildingIds: ['pedido'],
      startLabel: 'Entrar no Centro de Distribuição',
      revisitLabel: 'Revisitar Centro de Distribuição',
      availableNote:
        'Fase 1 disponível. Organize os produtos agrupados no Centro de Distribuição sem perder o id_pedido.',
      completedNote:
        'Fase 1 concluída: PEDIDO está na 1FN, com valores atômicos. Os produtos agora ficam em ITEM_PEDIDO.',
      normalizedAttributes: ['id_pedido', 'cliente']
    },
    {
      data: phase2Data,
      create: createPhase2,
      toSnapshot: snapshotPhase2,
      phaseNumber: 2,
      medalLabel: '2FN',
      buildingId: 'produto',
      buildingIds: ['produto'],
      startLabel: 'Entrar na Rede de Dependências',
      revisitLabel: 'Revisitar Rede de Dependências',
      availableNote:
        'Fase 2 disponível. Identifique dependências totais e parciais e decomponha ITEM_PEDIDO.',
      completedNote:
        'Fase 2 concluída: PRODUTO está na 2FN. Descrição e Preço agora ficam em PRODUTO.',
      normalizedAttributes: ['produto', 'descricao', 'preco']
    },
    {
      data: phase3Data,
      create: createPhase3,
      toSnapshot: snapshotPhase3,
      phaseNumber: 3,
      medalLabel: '3FN',
      buildingId: 'funcionario',
      buildingIds: ['funcionario'],
      startLabel: 'Entrar em Cidade Organizada',
      revisitLabel: 'Revisitar Cidade Organizada',
      availableNote:
        'Fase 3 disponível. Identifique a dependência transitiva e construa FUNCIONÁRIO e DEPARTAMENTO.',
      completedNote:
        'Fase 3 concluída: FUNCIONÁRIO está na 3FN. Localização foi separada em DEPARTAMENTO.',
      normalizedAttributes: ['cpf', 'nome', 'departamento']
    },
    {
      data: phase4Data,
      create: createPhase4,
      toSnapshot: snapshotPhase4,
      phaseNumber: 4,
      medalLabel: '3FN',
      buildingId: 'pedido',
      buildingIds: ['pedido', 'funcionario'],
      startLabel: 'Entrar em Gestão de Funcionários e Pedidos',
      revisitLabel: 'Revisitar Gestão de Funcionários e Pedidos',
      availableNote:
        'Fase 4 disponível. Exercício complementar de 3FN com PEDIDO, FUNCIONÁRIO e DEPARTAMENTO.',
      completedNote:
        'Fase 4 concluída: PEDIDO, FUNCIONÁRIO e DEPARTAMENTO formam uma decomposição em 3FN.',
      normalizedAttributes: ['pedido', 'cliente', 'funcionario']
    }
  ];
}

function queueCompletedPhase(definition, nextState) {
  if (!activePlayer) {
    return;
  }

  queuePhaseCompletion({
    playerId: activePlayer.id,
    phaseId: definition.data.id,
    snapshot: definition.toSnapshot(nextState),
    attemptId: phaseAttempts.get(definition.data.id) ?? null
  });
  activePlayer = getActivePlayer();
  window.setTimeout(synchronizeInBackground, 1200);
}

function ensurePhaseAttempt(phaseId) {
  if (
    !activePlayer ||
    phaseAttempts.has(phaseId) ||
    !phaseControllers.has(phaseId) ||
    !isOnline()
  ) {
    return;
  }

  const playerId = activePlayer.id;
  phaseAttempts.set(phaseId, null);

  ensureRemotePlayer(playerId)
    .then(() => startRemoteAttempt({ playerId, phaseId }))
    .then((response) => {
      if (activePlayer?.id !== playerId) {
        return;
      }

      const attemptId = response?.attempt?.id;
      if (attemptId) {
        phaseAttempts.set(phaseId, attemptId);
      }
    })
    .catch(() => {
      phaseAttempts.delete(phaseId);
    });
}

function trackPhaseHint(phaseId) {
  const attemptId = phaseAttempts.get(phaseId);

  if (!attemptId) {
    return;
  }

  recordRemoteHint({ attemptId }).catch(() => {});
}

function trackPhaseValidation(phaseId) {
  const attemptId = phaseAttempts.get(phaseId);

  if (!attemptId) {
    return;
  }

  recordRemoteValidation({ attemptId }).catch(() => {});
}

function removePendingPhase(phaseId) {
  if (!activePlayer) {
    return;
  }

  const pending = loadPendingMatches(activePlayer.id).filter(
    (match) => match.phaseId !== phaseId
  );
  savePendingMatches(activePlayer.id, pending);
}

function synchronizeInBackground() {
  if (!activePlayer || !isOnline()) {
    return;
  }

  const playerId = activePlayer.id;
  queueCompletedPhaseSnapshots(
    playerId,
    phaseDefinitions.map((definition) => definition.data.id)
  );

  synchronizePlayer(playerId).then((result) => {
    if (!activePlayer || activePlayer.id !== playerId) {
      return;
    }

    if (result.synced > 0) {
      rankingState = createEmptyRankingState();
      activePlayer = getActivePlayer();
      if (
        state?.screen === 'splash' ||
        state?.screen === 'profile' ||
        state?.screen === 'ranking'
      ) {
        render();
      }
    }

    confirmNormalizaQuestWithServer();
  });
}

function confirmNormalizaQuestWithServer() {
  if (!activePlayer || !activeCharacter || !isOnline()) {
    return;
  }

  const progress = currentProgress();
  if (progress.completedPhases < progress.totalPhases) {
    return;
  }

  confirmNormalizaQuest({
    playerId: activePlayer.id,
    characterId: activeCharacter.id
  }).catch(() => {});
}

function refreshCityEvolution() {
  if (!activePlayer || phaseDefinitions.length === 0) {
    return;
  }

  for (const definition of phaseDefinitions) {
    removeCityExtension(elements.svg, definition.data.id);
  }

  setBuildingNormalized(elements.svg, 'pedido', false, '1FN');
  setBuildingNormalized(elements.svg, 'produto', false, '2FN');
  setBuildingNormalized(elements.svg, 'funcionario', false, '3FN');

  const ordered = [...phaseDefinitions].sort(
    (first, second) => first.phaseNumber - second.phaseNumber
  );

  for (const definition of ordered) {
    if (!definition.controller.getState().completed) {
      continue;
    }

    if (definition.phaseNumber === 1) {
      setBuildingNormalized(elements.svg, 'pedido', true, '1FN');
    } else if (definition.data.cityEvolution) {
      addCityExtension(
        elements.svg,
        cityData,
        definition.data.cityEvolution,
        definition.data.id
      );
    }
  }
}

function renderHudForPlayer() {
  const rank = getCachedRankInfo(activePlayer?.id)?.rank ?? null;
  renderHud(elements.hud, getHud(state), {
    onMenu: () => navigate({ screen: 'splash', buildingId: null }),
    player: activePlayer,
    rank
  });
}

function updatePhaseScore(phaseId, score) {
  phaseScores[phaseId] = score;
  state = setScore(state, totalPhaseScore());
  updateHudScore(elements.hud, state.score);
}

function totalPhaseScore() {
  return Object.values(phaseScores).reduce((total, score) => total + score, 0);
}

function currentProgress() {
  if (phaseDefinitions.length === 0) {
    return buildGameProgress([]);
  }

  return buildGameProgress(
    phaseDefinitions.map((definition) => ({
      id: definition.data.id,
      title: definition.data.title,
      phaseNumber: definition.phaseNumber,
      medalLabel: definition.medalLabel,
      completed: definition.controller.getState().completed,
      score: definition.controller.getState().score,
      maxScore: Number.isFinite(definition.data.scoring?.max)
        ? definition.data.scoring.max
        : 100
    }))
  );
}

function getCachedRankInfo(playerId) {
  if (!playerId) {
    return null;
  }

  const cache = loadRankingCache(playerId);
  const rows = Array.isArray(cache?.rows) ? cache.rows : [];

  if (rows.length === 0) {
    return null;
  }

  const board = buildLeaderboard(rows, playerId);

  if (!board.current) {
    return null;
  }

  return {
    rank: board.current.rank,
    pointsToNext: board.next?.difference ?? null
  };
}

function getProfileSummary() {
  if (!activePlayer) {
    return null;
  }

  const sync = getPlayerSyncState(activePlayer.id);

  return buildProfileSummary({
    player: activePlayer,
    progress: currentProgress(),
    rankInfo: getCachedRankInfo(activePlayer.id),
    pendingCount: sync.pendingCount,
    syncStatus: sync.syncStatus
  });
}

function getAchievements() {
  return buildAchievements(currentProgress(), {
    missionCompleted: false
  });
}

function renderPublicScreen() {
  renderPublicHome(elements.home, {
    world: activeWorld,
    onLogin: () => navigate({ screen: 'login' }),
    onRegister: () => navigate({ screen: 'register' }),
    onAbout: () => navigate({ screen: 'about' })
  });
}

async function handleAuthSubmit({ mode, email, password }) {
  authError = '';
  authNotice = '';

  try {
    if (mode === 'recover') {
      await recoverAccount(email);
      authNotice = 'Se o e-mail estiver cadastrado, as instruções serão enviadas.';
      render();
      return;
    }

    if (mode === 'register') {
      const result = await registerAccount({ email, password });
      if (result.needsConfirmation) {
        authNotice = 'Confirme seu e-mail para concluir o cadastro.';
        render();
        return;
      }
      activeAuthUser = result.user;
      window.location.hash = '#/onboarding';
      window.location.reload();
      return;
    }

    const result = await loginAccount({ email, password });
    activeAuthUser = result.user;
    const player = await getAuthenticatedPlayer();

    if (player) {
      upsertPlayerFromServer(player);
      window.location.hash = consumeReturnTo() ?? '#/jogador';
    } else {
      const access = await loadAdminAccess();
      adminAccess = access;
      window.location.hash = access?.permissions?.length ? '#/admin' : '#/onboarding';
    }

    window.location.reload();
  } catch (error) {
    authError = error?.message || 'Não foi possível concluir a operação.';
    render();
  }
}

async function handleOnboarding({ name, bio, avatarId }) {
  authError = '';

  if (!activeAuthUser) {
    navigate({ screen: 'login' });
    return;
  }

  try {
    const playerId = globalThis.crypto?.randomUUID?.() ?? `player-${Date.now()}`;
    const player = await createAuthenticatedPlayer({ playerId, name, bio, avatarId });
    upsertPlayerFromServer(player);
    window.location.hash = '#/jogador';
    window.location.reload();
  } catch (error) {
    authError = error?.message || 'Não foi possível criar seu jogador.';
    render();
  }
}

async function handleLogout() {
  await logoutAccount().catch(() => {});
  activeAuthUser = null;
  activePlayer = null;
  activeCharacter = null;
  activeProgression = null;
  window.location.hash = '#/';
  window.location.reload();
}

function renderHomeScreen() {
  const summary = getProfileSummary();
  const profiles = listLocalPlayers();
  const rankingMessage = summary?.rank ? `#${summary.rank}` : 'Ainda nǜo ranqueado';
  const questProgress = activeCharacter
    ? loadQuestProgress(activeCharacter.id).quests
    : {};

  if (!isTestMode() && activePlayer) {
    renderPlayerHome(elements.home, {
      player: activePlayer,
      character: activeCharacter,
      catalog: activeCatalog,
      progression: activeProgression,
      summary,
      world: activeWorld,
      questCatalog: activeQuestCatalog,
      questProgress,
      rankingMessage,
      onEditCharacter: () => navigate({ screen: 'character' }),
      onOpenWorld: () => navigate({ screen: 'worldMap' }),
      onOpenMissions: () => { window.location.hash = '#/missoes'; },
      onOpenTalents: () => navigate({ screen: 'skills' }),
      onOpenProfile: () => navigate({ screen: 'profile' }),
      onOpenRanking: () => navigate({ screen: 'ranking' }),
      onOpenAchievements: () => navigate({ screen: 'achievements' }),
      onStartQuest: startCharacterQuest,
      onOpenQuest: (quest) => navigate({ screen: 'questDetail', questId: quest?.id }),
      onLogout: handleLogout
    });
    return;
  }

  renderHome(elements.home, {
    player: activePlayer,
    character: activeCharacter,
    catalog: activeCatalog,
    progression: activeProgression,
    profiles,
    summary,
    showIdentity,
    hasLegacy: hasLegacyProgress(),
    rankingMessage,
    world: activeWorld,
    questCatalog: activeQuestCatalog,
    questProgress: activeCharacter
      ? loadQuestProgress(activeCharacter.id).quests
      : {},
    isAuthenticatedAccount: Boolean(activeAuthUser),
    onLogout: handleLogout,
    onSelectProfile: switchPlayer,
    onCreateProfile: createPlayer,
    onShowIdentity: () => {
      showIdentity = true;
      render();
      requestAnimationFrame(() => elements.home.querySelector('#player-name')?.focus());
    },
    onStart: () => {
      if (!activePlayer) {
        showIdentity = true;
        render();
        return;
      }

      if (!activeCharacter) {
        navigate({ screen: 'character' });
        return;
      }

      navigate({ screen: 'city', buildingId: null });
    },
    onOpenProfile: () => navigate({ screen: 'profile' }),
    onOpenCharacter: () => navigate({ screen: 'character' }),
    onOpenRanking: () => navigate({ screen: 'ranking' }),
    onOpenAchievements: () => navigate({ screen: 'achievements' }),
    onOpenChallenges: () => navigate({ screen: 'challenges' }),
    onOpenKnowledge: () => navigate({ screen: 'worldMap' }),
    onOpenTerritory: (territoryId) => navigate({ screen: 'territory', territoryId }),
    onOpenTrack: (trackId) => navigate({ screen: 'track', trackId }),
    onOpenQuest: (questId) => navigate({ screen: 'questDetail', questId }),
    onOpenHelp: () => openHelp({ glossary: glossaryData, tips: tipsData, context: 'general' }),
    onOpenAbout: () => navigate({ screen: 'about' })
  });
}

function createPlayer({ name, avatarId, bio = '' }) {
  const player = createLocalPlayer({ name, avatarId, bio });
  activePlayer = player;
  activeCharacter = null;
  characterNotice = '';
  characterError = '';
  showIdentity = false;
  reloadToHome();
}

function switchPlayer(playerId) {
  const player = setActivePlayer(playerId);

  if (!player) {
    return;
  }

  activePlayer = player;
  showIdentity = false;
  reloadToHome();
}

function reloadToHome() {
  if (window.location.hash !== '#/') {
    window.location.hash = '#/';
  }

  window.location.reload();
}

function hasAdminPermission(permission) {
  return Boolean(adminAccess?.permissions?.includes(permission));
}

function navigateAdmin(screen) {
  navigate({ screen });
}

function renderLegacyAdminPage(fallback = 'admin') {
  renderAdminPage(elements.pageHost, {
    player: activePlayer,
    profiles: listLocalPlayers(),
    images: loadImageAssets(),
    catalog: activeCatalog,
    notice: adminNotice,
    onBack: () => navigate({ screen: fallback }),
    onSavePlayer: saveAdminPlayer,
    onSaveImage: saveAdminImage,
    onSaveArchetype: saveAdminArchetype,
    onCreateArchetype: createAdminArchetype,
    onSaveAttribute: saveAdminAttribute,
    onCreateAttribute: createAdminAttribute,
    onSaveValues: saveAdminValues,
    onOpenWorldAdmin: () => navigate({ screen: 'adminWorld' })
  });
}

function ensureAdminDashboard() {
  if (adminDashboardData || adminLoading) {
    return;
  }
  adminLoading = true;
  loadAdminDashboard()
    .then((data) => { adminDashboardData = data; adminError = ''; })
    .catch((error) => { adminError = error.message; })
    .finally(() => { adminLoading = false; if (state?.screen === 'admin') render(); });
}

function ensureAdminUsers() {
  if (adminUsersData || adminLoading) {
    return;
  }
  adminLoading = true;
  loadAdminUsers(adminQuery)
    .then((data) => { adminUsersData = data; adminError = ''; })
    .catch((error) => { adminError = error.message; })
    .finally(() => { adminLoading = false; if (state?.screen === 'adminUsers' || state?.screen === 'adminPlayers') render(); });
}

function updateAdminUsersQuery(query) {
  adminQuery = query;
  adminUsersData = null;
  render();
}

function ensureAdminUser(userId) {
  if (!userId || adminUserDetail?.id === userId || adminLoading) {
    return;
  }
  adminLoading = true;
  loadAdminUser(userId)
    .then((data) => { adminUserDetail = data; adminError = ''; })
    .catch((error) => { adminUserDetail = null; adminError = error.message; })
    .finally(() => { adminLoading = false; if (state?.screen === 'adminUser') render(); });
}

function ensureAdminAudit() {
  if (adminAuditData || adminLoading) {
    return;
  }
  adminLoading = true;
  loadAdminAudit(adminAuditQuery)
    .then((data) => { adminAuditData = data; adminError = ''; })
    .catch((error) => { adminError = error.message; })
    .finally(() => { adminLoading = false; if (state?.screen === 'adminAudit') render(); });
}

function updateAdminAuditQuery(query) {
  adminAuditQuery = query;
  adminAuditData = null;
  render();
}

function ensureAdminSettings() {
  if (adminSettingsData || adminLoading) {
    return;
  }
  adminLoading = true;
  loadAdminSettings()
    .then((data) => { adminSettingsData = data; adminError = ''; })
    .catch((error) => { adminError = error.message; })
    .finally(() => { adminLoading = false; if (state?.screen === 'adminSettings') render(); });
}

async function handleAdminBlock(userId, reason) {
  await runAdminAction(() => blockAdminUser(userId, reason), 'Conta bloqueada.');
}

async function handleAdminUnblock(userId, reason) {
  await runAdminAction(() => unblockAdminUser(userId, reason), 'Conta reativada.');
}

async function handleAdminEmail(userId, email, reason) {
  await runAdminAction(() => updateAdminUserEmail(userId, email, reason), 'Solicitação de alteração de e-mail registrada.');
}

async function handleAdminPasswordReset(userId, reason) {
  try {
    await requestAdminPasswordReset(userId, reason);
    adminNotice = 'Solicitação de recuperação registrada.';
  } catch (error) {
    adminError = error.message;
  }
  render();
}

async function handleAdminRoles(userId, roleIds) {
  await runAdminAction(() => updateAdminUserRoles(userId, roleIds), 'Papéis atualizados.');
}

async function handleAdminSettings({ settings, flags }) {
  try {
    adminSettingsData = await saveAdminSettings({ settings, flags });
    adminNotice = 'Configurações salvas.';
    adminError = '';
  } catch (error) {
    adminError = error.message;
  }
  render();
}

async function runAdminAction(action, successMessage) {
  adminNotice = '';
  adminError = '';
  try {
    await action();
    adminNotice = successMessage;
    adminUsersData = null;
    adminUserDetail = null;
  } catch (error) {
    adminError = error.message;
  }
  render();
}

function renderPageScreen() {
  if (!activePlayer && !['login', 'register', 'recover', 'onboarding', 'about', 'admin', 'adminUsers', 'adminUser', 'adminPlayers', 'adminContent', 'adminWorld', 'adminSettings', 'adminAudit'].includes(state.screen)) {
    window.history.replaceState(null, '', '#/login');
    state = applyRoute(state, { screen: 'login', buildingId: null });
    renderPageScreen();
    return;
  }

  const summary = getProfileSummary();
  const achievements = getAchievements();
  const usePlayerFrame = !isTestMode() && activePlayer && isPrivatePlayerScreen(state.screen);

  if (!usePlayerFrame) {
    resetPlayerPageFrame(elements.pageHost);
  }

  const pageHost = usePlayerFrame
    ? mountPlayerPageFrame(elements.pageHost, {
        active: playerSectionFor(state.screen, window.location.hash),
        player: activePlayer,
        character: activeCharacter,
        onLogout: handleLogout
      })
    : elements.pageHost;

  switch (state.screen) {
    case 'login':
    case 'register':
    case 'recover':
      renderAuthPage(pageHost, {
        mode: state.screen === 'register' ? 'register' : state.screen === 'recover' ? 'recover' : 'login',
        notice: authNotice,
        error: authError,
        onBack: () => navigate({ screen: 'splash' }),
        onSubmit: handleAuthSubmit,
        onOpenLogin: () => navigate({ screen: 'login' }),
        onOpenRegister: () => navigate({ screen: 'register' }),
        onOpenRecover: () => navigate({ screen: 'recover' })
      });
      break;

    case 'onboarding':
      renderOnboardingPage(pageHost, {
        user: activeAuthUser,
        error: authError,
        onBack: () => navigate({ screen: 'splash' }),
        onLogout: handleLogout,
        onSubmit: handleOnboarding
      });
      break;

    case 'admin':
      if (isTestMode()) {
        renderLegacyAdminPage('splash');
      } else if (!hasAdminPermission('admin.dashboard')) {
        renderAdminForbidden(pageHost, { player: activePlayer, onLogout: handleLogout });
      } else {
        ensureAdminDashboard();
        renderAdminDashboard(pageHost, {
          player: activePlayer,
          access: adminAccess,
          data: adminDashboardData,
          notice: adminNotice,
          error: adminError,
          onNavigate: navigateAdmin,
          onLogout: handleLogout
        });
      }
      break;

    case 'adminWorld':
      if (!isTestMode() && !hasAdminPermission('admin.content.write') && !hasAdminPermission('admin.maps.write')) {
        renderAdminForbidden(pageHost, { player: activePlayer, onLogout: handleLogout });
        break;
      }
      renderWorldAdminPage(pageHost, {
        player: activePlayer,
        world: activeWorld,
        questCatalog: activeQuestCatalog,
        notice: adminNotice,
        onBack: () => navigate({ screen: 'admin' }),
        onSaveContent: saveAdminWorldContent
      });
      break;

    case 'adminUsers':
      if (!hasAdminPermission('admin.users.read')) {
        renderAdminForbidden(pageHost, { player: activePlayer, onLogout: handleLogout });
        break;
      }
      ensureAdminUsers();
      renderAdminUsers(pageHost, {
        player: activePlayer,
        access: adminAccess,
        data: adminUsersData,
        query: adminQuery,
        notice: adminNotice,
        error: adminError,
        onNavigate: navigateAdmin,
        onLogout: handleLogout,
        onSearch: updateAdminUsersQuery,
        onOpenUser: (userId) => navigate({ screen: 'adminUser', userId })
      });
      break;

    case 'adminUser':
      if (!hasAdminPermission('admin.users.read')) {
        renderAdminForbidden(pageHost, { player: activePlayer, onLogout: handleLogout });
        break;
      }
      ensureAdminUser(state.activeAdminUserId);
      renderAdminUserDetail(pageHost, {
        player: activePlayer,
        access: adminAccess,
        detail: adminUserDetail,
        notice: adminNotice,
        error: adminError,
        onNavigate: navigateAdmin,
        onLogout: handleLogout,
        onBack: () => navigate({ screen: 'adminUsers' }),
        onBlock: handleAdminBlock,
        onUnblock: handleAdminUnblock,
        onEmail: handleAdminEmail,
        onResetPassword: handleAdminPasswordReset,
        onRoles: handleAdminRoles
      });
      break;

    case 'adminPlayers':
      if (!hasAdminPermission('admin.players.read')) {
        renderAdminForbidden(pageHost, { player: activePlayer, onLogout: handleLogout });
        break;
      }
      ensureAdminUsers();
      renderAdminPlayers(pageHost, {
        player: activePlayer,
        access: adminAccess,
        data: adminUsersData,
        notice: adminNotice,
        error: adminError,
        onNavigate: navigateAdmin,
        onLogout: handleLogout,
        onOpenUser: (userId) => navigate({ screen: 'adminUser', userId })
      });
      break;

    case 'adminAudit':
      if (!hasAdminPermission('admin.audit.read')) {
        renderAdminForbidden(pageHost, { player: activePlayer, onLogout: handleLogout });
        break;
      }
      ensureAdminAudit();
      renderAdminAudit(pageHost, {
        player: activePlayer,
        access: adminAccess,
        data: adminAuditData,
        query: adminAuditQuery,
        notice: adminNotice,
        error: adminError,
        onNavigate: navigateAdmin,
        onLogout: handleLogout,
        onSearch: updateAdminAuditQuery
      });
      break;

    case 'adminSettings':
      if (!hasAdminPermission('admin.settings.read')) {
        renderAdminForbidden(pageHost, { player: activePlayer, onLogout: handleLogout });
        break;
      }
      ensureAdminSettings();
      renderAdminSettings(pageHost, {
        player: activePlayer,
        access: adminAccess,
        data: adminSettingsData,
        notice: adminNotice,
        error: adminError,
        onNavigate: navigateAdmin,
        onLogout: handleLogout,
        onSave: handleAdminSettings
      });
      break;

    case 'adminContent':
      if (!isTestMode() && !hasAdminPermission('admin.content.read')) {
        renderAdminForbidden(pageHost, { player: activePlayer, onLogout: handleLogout });
        break;
      }
      renderLegacyAdminPage('admin');
      break;

    case 'character':
      renderCharacterPage(pageHost, {
        player: activePlayer,
        character: activeCharacter,
        catalog: activeCatalog,
        progression: activeProgression,
        notice: characterNotice,
        error: characterError,
        onBack: () => navigate({ screen: 'splash' }),
        onSave: saveCharacterProfile
      });
      break;

    case 'profile':
      renderProfilePage(pageHost, {
        player: activePlayer,
        character: activeCharacter,
        catalog: activeCatalog,
        world: activeWorld,
        progression: activeProgression,
        summary,
        achievements,
        history: currentProgress().phases,
        profiles: listLocalPlayers(),
        notice: profileNotice,
        error: profileSaveError,
        onBack: () => navigate({ screen: 'splash' }),
        onSave: savePlayerProfile,
        onOpenCharacter: () => navigate({ screen: 'character' }),
        onOpenAdmin: () => navigate({ screen: 'admin' }),
        onOpenSkills: () => navigate({ screen: 'skills' }),
        onOpenSpecializations: () => navigate({ screen: 'specializations' }),
        onSwitch: () => {
          showIdentity = true;
          navigate({ screen: 'splash' });
        },
        onOpenRanking: () => navigate({ screen: 'ranking' })
      });
      break;

    case 'worldMap':
      renderWorldMapPage(pageHost, {
        player: activePlayer,
        world: activeWorld,
        questCatalog: activeQuestCatalog,
        questProgress: activeCharacter
          ? loadQuestProgress(activeCharacter.id).quests
          : {},
        progression: activeProgression,
        onBack: () => navigate({ screen: 'splash' }),
        onOpenTerritory: (territoryId) => navigate({ screen: 'territory', territoryId }),
        onOpenTrack: (trackId) => navigate({ screen: 'track', trackId })
      });
      break;

    case 'territory':
      renderTerritoryPage(pageHost, {
        player: activePlayer,
        world: activeWorld,
        territory: activeWorld?.territories?.find(
          (item) => item.id === state.activeTerritoryId
        ) ?? null,
        questCatalog: activeQuestCatalog,
        questProgress: activeCharacter
          ? loadQuestProgress(activeCharacter.id).quests
          : {},
        progression: activeProgression,
        onBack: () => navigate({ screen: 'worldMap' }),
        onOpenTrack: (trackId) => navigate({ screen: 'track', trackId })
      });
      break;

    case 'track':
      renderTrackPage(pageHost, {
        player: activePlayer,
        world: activeWorld,
        track: activeWorld?.tracks?.find((item) => item.id === state.activeTrackId) ?? null,
        questCatalog: activeQuestCatalog,
        questProgress: activeCharacter
          ? loadQuestProgress(activeCharacter.id).quests
          : {},
        progression: activeProgression,
        onBack: () => navigateTrackBack(state.activeTrackId),
        onOpenQuest: (questId) => navigate({ screen: 'questDetail', questId })
      });
      break;

    case 'questDetail':
      renderQuestDetailPage(pageHost, {
        player: activePlayer,
        character: activeCharacter,
        world: activeWorld,
        quest: activeQuestCatalog?.quests?.find(
          (item) => item.id === state.activeQuestId
        ) ?? null,
        questCatalog: activeQuestCatalog,
        questProgress: activeCharacter
          ? loadQuestProgress(activeCharacter.id).quests
          : {},
        progression: activeProgression,
        onBack: () => navigateQuestBack(state.activeQuestId),
        onStartQuest: startCharacterQuest
      });
      break;

    case 'skills':
      renderSkillsPage(pageHost, {
        player: activePlayer,
        character: activeCharacter,
        world: activeWorld,
        progression: activeProgression,
        questCatalog: activeQuestCatalog,
        onBack: () => navigate({ screen: 'profile' }),
        onOpenSpecializations: () => navigate({ screen: 'specializations' })
      });
      break;

    case 'specializations':
      renderSpecializationsPage(pageHost, {
        player: activePlayer,
        character: activeCharacter,
        world: activeWorld,
        progression: activeProgression,
        onBack: () => navigate({ screen: 'profile' }),
        onOpenSkills: () => navigate({ screen: 'skills' })
      });
      break;

    case 'knowledge':
      renderKnowledgePage(pageHost, {
        player: activePlayer,
        character: activeCharacter,
        knowledgeCatalog: activeKnowledge,
        characterCatalog: activeCatalog,
        questCatalog: activeQuestCatalog,
        progression: activeProgression,
        questProgress: activeCharacter
          ? loadQuestProgress(activeCharacter.id).quests
          : {},
        onBack: () => navigate({ screen: 'splash' }),
        onOpenJourney: () => navigate({ screen: 'challenges' }),
        onStartQuest: startCharacterQuest
      });
      break;

    case 'ranking':
      ensureRankingLoaded();
      renderLeaderboardPage(pageHost, {
        player: activePlayer,
        board: rankingState.board,
        loading: rankingState.loading,
        offline: rankingState.offline,
        updatedAt: rankingState.updatedAt,
        onBack: () => navigate({ screen: 'splash' }),
        onRefresh: refreshRanking
      });
      break;

    case 'challenges':
      renderChallengesPage(pageHost, {
        player: activePlayer,
        character: activeCharacter,
        catalog: activeQuestCatalog,
        progress: activeCharacter
          ? loadQuestProgress(activeCharacter.id).quests
          : {},
        onBack: () => navigate({ screen: 'splash' }),
        onStartQuest: startCharacterQuest
      });
      break;

    case 'achievements':
      renderAchievementsPage(pageHost, {
        player: activePlayer,
        achievements,
        summary,
        onBack: () => navigate({ screen: 'splash' })
      });
      break;

    case 'about':
      renderAboutPage(pageHost, {
        player: activePlayer,
        onBack: () => navigate({ screen: 'splash' }),
        onHowToPlay: () => openInstructions()
      });
      break;

    default:
      navigate({ screen: 'splash' });
  }
}

function savePlayerProfile(patch) {
  const updated = updateLocalPlayer(activePlayer.id, patch);

  if (!updated) {
    profileSaveError = 'Não foi possível atualizar o perfil.';
    render();
    return;
  }

  activePlayer = updated;
  profileNotice = 'Perfil atualizado.';
  profileSaveError = '';
  renderHudForPlayer();
  render();

  if (isOnline()) {
    ensureRemotePlayer(activePlayer.id).catch(() => {});
  }
}

function syncNormalizaQuest() {
  if (!activeCharacter || !activeQuestCatalog) {
    return;
  }

  const quest = activeQuestCatalog.quests.find((item) => item.id === 'normaliza');
  const progress = currentProgress();

  if (!quest || progress.completedPhases < progress.totalPhases) {
    return;
  }

  const result = awardQuestCompletion({
    character: activeCharacter,
    quest,
    score: progress.totalScore,
    catalog: activeCatalog,
    world: activeWorld
  });

  if (result.progression) {
    activeProgression = result.progression;
  }

  if (result.character) {
    activeCharacter = result.character;
  }
}

function startCharacterQuest(quest) {
  if (!activeCharacter) {
    navigate({ screen: 'character' });
    return;
  }

  const progress = loadQuestProgress(activeCharacter.id).quests;
  const status = questStatusFor(quest, progress, activeQuestCatalog.dependencies);

  if (status === 'locked') {
    return;
  }

  if (status !== 'completed') {
    startQuest(activeCharacter.id, quest.id);
  }

  syncNormalizaQuest();

  if (quest.moduleKey === 'normaliza') {
    navigate({ screen: 'city', buildingId: null });
  }
}

function saveAdminPlayer(playerId, patch) {
  const updated = updateLocalPlayer(playerId, patch);

  if (!updated) {
    adminNotice = 'Não foi possível atualizar o perfil.';
    render();
    return;
  }

  if (activePlayer?.id === playerId) {
    activePlayer = updated;
  }

  adminNotice = 'Perfil atualizado.';
  render();
}

function saveAdminImage(imageId, patch) {
  const updated = updateImageAsset(imageId, patch);

  if (!updated) {
    adminNotice = 'Não foi possível atualizar a imagem.';
    render();
    return;
  }

  adminNotice = 'Imagem atualizada.';
  render();
}

function saveAdminArchetype(archetypeId, patch) {
  const saved = updateArchetype(archetypeId, patch);

  if (!saved) {
    adminNotice = 'Não foi possível salvar o arquétipo.';
    render();
    return;
  }

  activeCatalog = loadCatalog();
  adminNotice = 'Arquétipo atualizado.';
  render();
}

function createAdminArchetype(patch) {
  createArchetype(patch);
  activeCatalog = loadCatalog();
  adminNotice = 'Arquétipo criado.';
  render();
}

function saveAdminAttribute(attributeId, patch) {
  const saved = updateAttribute(attributeId, patch);

  if (!saved) {
    adminNotice = 'Não foi possível salvar o atributo.';
    render();
    return;
  }

  activeCatalog = loadCatalog();
  adminNotice = 'Atributo atualizado.';
  render();
}

function createAdminAttribute(patch) {
  createAttribute(patch);
  activeCatalog = loadCatalog();
  adminNotice = 'Atributo criado.';
  render();
}

async function saveAdminWorldContent({ world, questCatalog }) {
  if (world) {
    activeWorld = saveWorldCatalog(world);
  }

  if (questCatalog) {
    activeQuestCatalog = saveQuestCatalog(questCatalog);
  }

  adminNotice = isDatabaseContentEnabled()
    ? 'Conteúdo salvo localmente; sincronizando com o PostgreSQL...'
    : 'Conteúdo do mapa atualizado localmente.';
  render();

  if (!isDatabaseContentEnabled()) {
    return;
  }

  try {
    const saved = await saveDatabaseContent({
      world: activeWorld,
      questCatalog: activeQuestCatalog
    });

    if (saved.saved) {
      activeWorld = saveWorldCatalog(saved.world);
      activeQuestCatalog = saveQuestCatalog(saved.questCatalog);
      adminNotice = 'Conteúdo do mapa salvo no PostgreSQL.';
      render();
    }
  } catch {
    adminNotice = 'Conteúdo salvo localmente; falha ao salvar no PostgreSQL.';
    render();
  }
}

function saveAdminValues(values) {
  let saved = true;

  for (const [archetypeId, archetypeValues] of Object.entries(values)) {
    if (!setArchetypeValues(archetypeId, archetypeValues)) {
      saved = false;
      break;
    }
  }

  activeCatalog = loadCatalog();
  adminNotice = saved
    ? 'Valores iniciais atualizados.'
    : 'Não foi possível salvar todos os valores.';
  render();
}

function saveCharacterProfile(patch) {
  if (!activePlayer) {
    return;
  }

  const saved = activeCharacter
    ? updateCharacter(activePlayer.id, activeCharacter.id, patch)
    : createCharacterForPlayer(activePlayer, patch);

  if (!saved) {
    characterError = 'Não foi possível salvar o personagem.';
    render();
    return;
  }

  activeCharacter = saved;
  activeProgression = ensureProgression(saved, activeCatalog);
  updateLocalPlayer(activePlayer.id, { needsCharacterSetup: false });
  activePlayer = getActivePlayer();
  characterNotice = 'Personagem salvo.';
  characterError = '';
  render();
}

function ensureRankingLoaded() {
  if (!activePlayer || rankingState.loading) {
    return;
  }

  if (rankingState.loaded && rankingState.playerId === activePlayer.id) {
    return;
  }

  const playerId = activePlayer.id;
  rankingState = {
    ...rankingState,
    playerId,
    loading: true,
    loaded: false,
    offline: false
  };

  loadSharedLeaderboard(playerId).then((result) => {
    if (!activePlayer || activePlayer.id !== playerId || state?.screen !== 'ranking') {
      return;
    }

    rankingState = {
      playerId,
      loading: false,
      loaded: true,
      board: result,
      offline: result.offline,
      updatedAt: result.updatedAt,
      error: result.error
    };
    render();
  });
}

function refreshRanking() {
  if (!activePlayer) {
    return;
  }

  const playerId = activePlayer.id;
  const reload = () => {
    if (!activePlayer || activePlayer.id !== playerId || state?.screen !== 'ranking') {
      return;
    }

    rankingState = createEmptyRankingState();
    render();
  };

  if (!isOnline()) {
    reload();
    return;
  }

  rankingState = {
    ...createEmptyRankingState(),
    playerId,
    loading: true
  };
  render();

  queueCompletedPhaseSnapshots(
    playerId,
    phaseDefinitions.map((definition) => definition.data.id)
  );

  synchronizePlayer(playerId).catch(() => {}).then(reload);
}

function createEmptyRankingState() {
  return {
    playerId: null,
    loading: false,
    loaded: false,
    board: null,
    offline: false,
    updatedAt: null,
    error: null
  };
}

function getPhaseDefinition(phaseId) {
  return phaseDefinitions.find((definition) => definition.data.id === phaseId) || null;
}

function navigateTrackBack(trackId) {
  const link = activeWorld?.trackTerritories?.find((item) => item.trackId === trackId);
  navigate(
    link
      ? { screen: 'territory', territoryId: link.territoryId }
      : { screen: 'worldMap' }
  );
}

function navigateQuestBack(questId) {
  const link = activeWorld?.trackQuests?.find((item) => item.questId === questId);
  navigate(
    link
      ? { screen: 'track', trackId: link.trackId }
      : { screen: 'worldMap' }
  );
}

const RETURN_TO_KEY = 'normaliza:returnTo';

function saveReturnTo(hash) {
  try {
    if (hash && hash !== '#/' && hash !== '#/login') {
      globalThis.sessionStorage?.setItem(RETURN_TO_KEY, hash);
    }
  } catch {
    return false;
  }
  return true;
}

function consumeReturnTo() {
  try {
    const value = globalThis.sessionStorage?.getItem(RETURN_TO_KEY);
    globalThis.sessionStorage?.removeItem(RETURN_TO_KEY);
    return value || null;
  } catch {
    return null;
  }
}

function navigate(route) {
  const hash = toHash(route);

  if (window.location.hash === hash) {
    handleRoute();
    return;
  }

  window.location.hash = hash;
}

function handleRoute() {
  if (!state) {
    return;
  }

  let route = parseRoute(window.location.hash);
  const publicScreens = ['splash', 'login', 'register', 'recover', 'about'];
  const authScreens = ['login', 'register', 'recover'];
  const adminScreens = [
    'admin',
    'adminWorld',
    'adminUsers',
    'adminUser',
    'adminPlayers',
    'adminContent',
    'adminSettings',
    'adminAudit'
  ];
  const canAdmin = Boolean(adminAccess?.permissions?.length);

  if (!isTestMode()) {
    if (!activeAuthUser && !publicScreens.includes(route.screen)) {
      saveReturnTo(toHash(route));
      window.history.replaceState(null, '', '#/login');
      route = { screen: 'login', buildingId: null };
    } else if (activeAuthUser && !activePlayer) {
      const allowed = ['onboarding', ...authScreens, ...(canAdmin ? adminScreens : [])];
      if (!allowed.includes(route.screen)) {
        window.history.replaceState(null, '', '#/onboarding');
        route = { screen: 'onboarding', buildingId: null };
      }
    } else if (activeAuthUser && activePlayer) {
      const blocked = ['splash', 'onboarding', ...authScreens, ...(canAdmin ? [] : adminScreens)];
      if (blocked.includes(route.screen)) {
        window.history.replaceState(null, '', '#/jogador');
        route = { screen: 'journey', buildingId: null };
      }
    }
  } else if (!activePlayer && route.screen !== 'splash') {
    window.history.replaceState(null, '', '#/');
    route = { screen: 'splash', buildingId: null };
  }

  if (route.screen === 'phase' && !phaseControllers.has(route.phaseId)) {
    window.history.replaceState(null, '', '#/cidade');
    route = { screen: 'city', buildingId: null };
  }

  if (
    route.screen === 'territory' &&
    !activeWorld?.territories?.some((item) => item.id === route.territoryId && (item.status ?? 'published') === 'published')
  ) {
    window.history.replaceState(null, '', '#/mapa');
    route = { screen: 'worldMap', buildingId: null };
  }

  if (
    route.screen === 'track' &&
    !activeWorld?.tracks?.some((item) => item.id === route.trackId && (item.status ?? 'published') === 'published')
  ) {
    window.history.replaceState(null, '', '#/mapa');
    route = { screen: 'worldMap', buildingId: null };
  }

  if (
    route.screen === 'questDetail' &&
    !activeQuestCatalog?.quests?.some((item) => item.id === route.questId)
  ) {
    window.history.replaceState(null, '', '#/mapa');
    route = { screen: 'worldMap', buildingId: null };
  }

  if (route.screen === 'mission' && route.missionId !== missionData.id) {
    window.history.replaceState(null, '', '#/cidade');
    route = { screen: 'city', buildingId: null };
  }

  if (route.screen === 'city' && route.buildingId && !activePlayer) {
    window.history.replaceState(null, '', '#/');
    route = { screen: 'splash', buildingId: null };
  }

  if (
    activePlayer &&
    !activeCharacter &&
    ['city', 'phase', 'mission'].includes(route.screen)
  ) {
    window.history.replaceState(null, '', '#/personagem');
    route = { screen: 'character', buildingId: null };
  }

  if (route.screen === 'ranking' && currentScreen !== 'ranking') {
    rankingState = createEmptyRankingState();
  }

  if (route.screen !== 'profile') {
    profileNotice = '';
    profileSaveError = '';
  }

  state = applyRoute(state, route);

  if (route.screen === 'city' && route.buildingId && !state.selectedBuildingId) {
    window.history.replaceState(null, '', '#/cidade');
  }

  if (route.screen === 'phase') {
    ensurePhaseAttempt(route.phaseId);
  }

  render();
}

function render() {
  const isSplash = state.screen === 'splash' || state.screen === 'journey';
  const isPublicHome = state.screen === 'splash' && !activeAuthUser && !isTestMode();
  const isCity = state.screen === 'city';
  const isPhase = state.screen === 'phase';
  const isMission = state.screen === 'mission';
  const isPage = ['profile', 'character', 'knowledge', 'worldMap', 'territory', 'track', 'questDetail', 'skills', 'specializations', 'ranking', 'achievements', 'about', 'challenges', 'admin', 'adminWorld', 'adminUsers', 'adminUser', 'adminPlayers', 'adminContent', 'adminSettings', 'adminAudit', 'login', 'register', 'recover', 'onboarding'].includes(state.screen);
  const isGame = isCity || isPhase || isMission;
  const activePhase = isPhase ? getPhaseDefinition(state.activePhaseId) : null;
  const enteringCity = isCity && currentScreen !== 'city';
  const enteringPhase =
    isPhase && (currentScreen !== 'phase' || currentPhaseId !== state.activePhaseId);
  const enteringMission = isMission && currentScreen !== 'mission';
  const enteringSplash = isSplash && currentScreen !== 'splash';
  const enteringPage = isPage && currentScreen !== state.screen;

  elements.splash.hidden = !isSplash;
  elements.game.hidden = !isGame;
  elements.pageScreen.hidden = !isPage;
  elements.splash.setAttribute('aria-hidden', String(!isSplash));
  elements.game.setAttribute('aria-hidden', String(!isGame));
  elements.pageScreen.setAttribute('aria-hidden', String(!isPage));
  elements.cityMain.hidden = !isCity;
  elements.phaseScreen.hidden = !isPhase;
  elements.phaseScreen.setAttribute('aria-hidden', String(!isPhase));
  elements.missionScreen.hidden = !isMission;
  elements.missionScreen.setAttribute('aria-hidden', String(!isMission));

  for (const [phaseId, host] of Object.entries(elements.phaseHosts)) {
    host.hidden = !isPhase || state.activePhaseId !== phaseId;
  }

  if (isSplash) {
    if (isPublicHome) {
      renderPublicScreen();
    } else {
      renderHomeScreen();
    }
  } else if (isPage) {
    renderPageScreen();
  } else if (isGame) {
    renderHudForPlayer();
  }

  if (isMission) {
    updateHudPhase(elements.hud, {
      eyebrow: 'Missão',
      label: missionData.title
    });
  } else if (isPhase && activePhase) {
    updateHudPhase(elements.hud, {
      eyebrow: 'Fase',
      label: `Fase ${activePhase.phaseNumber} — ${activePhase.data.title}`
    });
  } else if (isCity) {
    updateHudPhase(elements.hud, {
      eyebrow: 'Mapa',
      label: 'Cidade dos dados'
    });
  }

  if (isCity) {
    setSelectedBuilding(elements.svg, state.selectedBuildingId);

    if (enteringCity && currentScreen !== 'phase' && currentScreen !== 'mission') {
      playBuildAnimation(elements.svg);
    }

    if (enteringCity) {
      panelBuildingId = undefined;
    }

    if (panelBuildingId !== state.selectedBuildingId) {
      updatePanel();
    }

    if (enteringCity) {
      requestAnimationFrame(() => elements.cityStage?.focus({ preventScroll: true }));
    }
  } else if (isPhase && activePhase) {
    activePhase.controller.refresh();

    if (enteringPhase) {
      requestAnimationFrame(() => activePhase.controller.focus());
    }
  } else if (isMission) {
    missionController?.refresh();

    if (enteringMission) {
      requestAnimationFrame(() => missionController.focus());
    }
  } else if (isSplash && enteringSplash) {
    requestAnimationFrame(() => {
      const target = elements.home.querySelector(
        '#player-name, .home-menu__btn.is-primary, .profile-pick'
      );
      target?.focus({ preventScroll: true });
    });
  } else if (isPage && enteringPage) {
    requestAnimationFrame(() =>
      elements.pageHost.querySelector('.page-header .btn')?.focus({ preventScroll: true })
    );
  }

  updateDocumentTitle();
  currentScreen = state.screen;
  currentPhaseId = state.activePhaseId;
}

function updatePanel() {
  const focusedInPanel = elements.panel.contains(document.activeElement);
  const previousSelected = elements.panel.dataset.selectedId || '';
  const selectedBuilding = getSelectedBuilding(state);
  const phaseActions = selectedBuilding
    ? phaseDefinitions
        .filter((definition) => definition.buildingIds.includes(selectedBuilding.id))
        .map((definition) => ({
          id: definition.data.id,
          label: `Fase ${definition.phaseNumber} · ${definition.data.title}`,
          completed: definition.controller.getState().completed,
          startLabel: definition.startLabel,
          revisitLabel: definition.revisitLabel,
          availableNote: definition.availableNote,
          completedNote: definition.completedNote,
          normalizedAttributes: definition.normalizedAttributes,
          onStart: () => navigate({ screen: 'phase', phaseId: definition.data.id })
        }))
    : [];

  const progress = currentProgress();

  renderPanel(elements.panel, {
    city: cityData.city,
    selectedBuilding,
    onSelect: (buildingId) => navigate({ screen: 'city', buildingId }),
    onClose: () => navigate({ screen: 'city', buildingId: null }),
    onOpenMission: () => navigate({ screen: 'mission', missionId: missionData.id }),
    onOpenHelp: () => openHelp({ glossary: glossaryData, tips: tipsData, context: 'general' }),
    onResetGame: confirmResetGame,
    progress: activePlayer ? progress : null,
    phaseActions
  });

  elements.panel.dataset.selectedId = state.selectedBuildingId || '';
  panelBuildingId = state.selectedBuildingId;

  if (!focusedInPanel) {
    return;
  }

  if (state.selectedBuildingId) {
    elements.panel.querySelector('.city-switcher__btn.is-active')?.focus();
    return;
  }

  const previousGroup = findBuildingGroup(previousSelected);
  (previousGroup || elements.panel.querySelector('.btn--help'))?.focus();
}

function getHelpContext() {
  if (!state) {
    return 'general';
  }

  if (state.screen === 'phase') {
    const contexts = {
      'centro-de-distribuicao': 'phase1',
      'rede-de-dependencias': 'phase2',
      'cidade-organizada': 'phase3',
      'gestao-de-funcionarios-e-pedidos': 'phase4'
    };
    return contexts[state.activePhaseId] || 'general';
  }

  if (state.screen === 'mission') {
    return 'mission';
  }

  return 'general';
}

function confirmResetGame() {
  openConfirm({
    title: 'Reiniciar meu progresso?',
    message:
      'O progresso das quatro fases deste jogador, a pontuação local, as medalhas e as evoluções da cidade serão apagados. O perfil e os resultados já confirmados no ranking não serão removidos.',
    confirmLabel: 'Reiniciar progresso',
    cancelLabel: 'Cancelar',
    onConfirm: resetPlayerProgress
  });
}

function resetPlayerProgress() {
  for (const definition of phaseDefinitions) {
    definition.controller.reset();
  }

  missionController?.reset?.();

  if (activePlayer) {
    clearPlayerProgress(activePlayer.id);
    savePendingMatches(activePlayer.id, []);
  }

  phaseAttempts.clear();

  phaseScores = Object.fromEntries(
    phaseDefinitions.map((definition) => [definition.data.id, 0])
  );
  state = setScore(state, 0);
  updateHudScore(elements.hud, 0);
  showIdentity = false;
  rankingState = createEmptyRankingState();
  refreshCityEvolution();
  navigate({ screen: 'splash', buildingId: null });
}

function findBuildingGroup(buildingId) {
  if (!buildingId) {
    return null;
  }

  return (
    [...elements.svg.querySelectorAll('.building')].find(
      (group) => group.dataset.buildingId === buildingId
    ) || null
  );
}

function handleGlobalKeydown(event) {
  if (event.key !== 'Escape' || !state) {
    return;
  }

  if (
    elements.instructionsRoot.childElementCount > 0 ||
    elements.helpRoot?.childElementCount > 0 ||
    elements.confirmRoot?.childElementCount > 0
  ) {
    return;
  }

  if (['skills', 'specializations'].includes(state.screen)) {
    event.preventDefault();
    navigate({ screen: 'profile' });
    return;
  }

  if (['profile', 'character', 'knowledge', 'worldMap', 'ranking', 'achievements', 'about', 'challenges', 'admin', 'adminWorld', 'adminUsers', 'adminUser', 'adminPlayers', 'adminContent', 'adminSettings', 'adminAudit'].includes(state.screen)) {
    event.preventDefault();
    navigate({ screen: 'splash', buildingId: null });
    return;
  }

  if (state.screen === 'territory') {
    event.preventDefault();
    navigate({ screen: 'worldMap' });
    return;
  }

  if (state.screen === 'track') {
    event.preventDefault();
    navigateTrackBack(state.activeTrackId);
    return;
  }

  if (state.screen === 'questDetail') {
    event.preventDefault();
    navigateQuestBack(state.activeQuestId);
    return;
  }

  if (state.screen === 'phase') {
    event.preventDefault();
    const definition = getPhaseDefinition(state.activePhaseId);
    navigate({ screen: 'city', buildingId: definition?.buildingId || null });
    return;
  }

  if (state.screen === 'mission') {
    event.preventDefault();
    navigate({ screen: 'city', buildingId: null });
    return;
  }

  if (state.screen === 'city' && state.selectedBuildingId) {
    event.preventDefault();
    navigate({ screen: 'city', buildingId: null });
  }
}

function updateDocumentTitle() {
  const pageTitles = {
    profile: 'Meu Perfil',
    ranking: 'Ranking',
    achievements: 'Conquistas',
    about: 'Sobre o jogo',
    challenges: 'Desafios',
    knowledge: 'Árvore de Conhecimento',
    worldMap: 'Mapa do Mundo',
    territory: 'Território',
    track: 'Trilha de Conhecimento',
    questDetail: 'Quest',
    skills: 'Habilidades',
    specializations: 'Minha Especialização',
    character: 'Meu personagem',
    admin: 'Administração',
    adminWorld: 'Administração de Mapas',
    adminUsers: 'Usuários',
    adminUser: 'Detalhe do usuário',
    adminPlayers: 'Jogadores',
    adminContent: 'Cadastros',
    adminSettings: 'Configurações',
    adminAudit: 'Auditoria'
  };

  if (state.screen === 'splash') {
    document.title = 'Cafegeek — Jornada do Conhecimento';
    return;
  }

  if (pageTitles[state.screen]) {
    document.title = `${pageTitles[state.screen]} - Cafegeek`;
    return;
  }

  if (state.screen === 'mission') {
    document.title = `${missionData.title} — NORMALIZA!`;
    return;
  }

  if (state.screen === 'phase') {
    const definition = getPhaseDefinition(state.activePhaseId);
    document.title = definition
      ? `${definition.data.title} — NORMALIZA!`
      : 'NORMALIZA! — Cidade dos dados';
    return;
  }

  const building = getSelectedBuilding(state);
  document.title = building
    ? `${building.name} — NORMALIZA!`
    : activePlayer
      ? `${activePlayer.name} — NORMALIZA!`
      : 'NORMALIZA! — Cidade dos dados';
}

function showFatalError(error) {
  console.error(error);

  const title = document.createElement('h2');
  title.textContent = 'Não foi possível carregar o jogo';

  const message = document.createElement('p');
  message.append(
    'Verifique se os arquivos data/city.json, data/phases/fase-1.json, data/phases/fase-2.json, data/phases/fase-3.json, data/phases/fase-4.json, data/missions/administracao.json, data/glossary.json e data/tips.json estão disponíveis e se o servidor local foi iniciado. '
  );

  const detail = document.createElement('code');
  detail.textContent = error instanceof Error ? error.message : String(error);
  message.append(detail);

  const container = document.createElement('div');
  container.className = 'fatal-error';
  container.append(title, message);

  elements.app.replaceChildren(container);
}

window.addEventListener('beforeunload', () => {
  syncCleanup?.();
});
