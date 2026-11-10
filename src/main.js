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
import { validateMissionData } from './data/validateMissionData.js';
import { buildGameProgress } from './core/progress.js';
import { initSplash } from './ui/splash.js';
import { renderHud, updateHudPhase, updateHudScore } from './ui/hud.js';
import {
  addCityExtension,
  playBuildAnimation,
  removeCityExtension,
  renderCity,
  setBuildingNormalized,
  setSelectedBuilding
} from './ui/cityScene.js';
import { renderPanel } from './ui/infoPanel.js';
import { openInstructions } from './ui/instructions.js';
import { createPhase1 } from './ui/phase1.js';
import { createPhase2 } from './ui/phase2.js';
import { createPhase3 } from './ui/phase3.js';
import { createAdministration } from './ui/administration.js';
import { openHelp } from './ui/help.js';
import { openConfirm } from './ui/confirm.js';
import { playCompletionCelebration } from './ui/celebration.js';
import {
  clearAllProgress,
  clearPhaseProgress,
  loadPhaseProgress,
  savePhaseProgress
} from './persistence/storage.js';

const elements = {
  app: document.getElementById('app'),
  splash: document.getElementById('splash-screen'),
  game: document.getElementById('game-screen'),
  hud: document.getElementById('hud'),
  cityMain: document.getElementById('city-main'),
  phaseScreen: document.getElementById('phase-screen'),
  missionScreen: document.getElementById('mission-screen'),
  missionHost: document.getElementById('mission-host'),
  phaseHosts: {
    'centro-de-distribuicao': document.getElementById('phase-host-fase-1'),
    'rede-de-dependencias': document.getElementById('phase-host-fase-2'),
    'cidade-organizada': document.getElementById('phase-host-fase-3')
  },
  svg: document.getElementById('city-svg'),
  panel: document.getElementById('info-panel'),
  cityStage: document.querySelector('.city-stage'),
  instructionsRoot: document.getElementById('instructions-root'),
  helpRoot: document.getElementById('help-root'),
  confirmRoot: document.getElementById('confirm-root'),
  startButton: document.getElementById('btn-start')
};

let cityData = null;
let phase1Data = null;
let phase2Data = null;
let phase3Data = null;
let missionData = null;
let missionController = null;
let glossaryData = null;
let tipsData = null;
let phaseDefinitions = [];
let phaseControllers = new Map();
let phaseScores = {};
let state = null;
let currentScreen = null;
let currentPhaseId = null;
let panelBuildingId;

boot();

async function boot() {
  try {
    const [
      cityResponse,
      phase1Response,
      phase2Response,
      phase3Response,
      missionResponse,
      glossaryResponse,
      tipsResponse
    ] = await Promise.all([
      fetch(new URL('../data/city.json', import.meta.url)),
      fetch(new URL('../data/phases/fase-1.json', import.meta.url)),
      fetch(new URL('../data/phases/fase-2.json', import.meta.url)),
      fetch(new URL('../data/phases/fase-3.json', import.meta.url)),
      fetch(new URL('../data/missions/administracao.json', import.meta.url)),
      fetch(new URL('../data/glossary.json', import.meta.url)),
      fetch(new URL('../data/tips.json', import.meta.url))
    ]);

    if (!cityResponse.ok) {
      throw new Error(`Falha ao carregar data/city.json (HTTP ${cityResponse.status}).`);
    }
    if (!phase1Response.ok) {
      throw new Error(
        `Falha ao carregar data/phases/fase-1.json (HTTP ${phase1Response.status}).`
      );
    }
    if (!phase2Response.ok) {
      throw new Error(
        `Falha ao carregar data/phases/fase-2.json (HTTP ${phase2Response.status}).`
      );
    }
    if (!phase3Response.ok) {
      throw new Error(
        `Falha ao carregar data/phases/fase-3.json (HTTP ${phase3Response.status}).`
      );
    }
    if (!missionResponse.ok) {
      throw new Error(
        `Falha ao carregar data/missions/administracao.json (HTTP ${missionResponse.status}).`
      );
    }
    if (!glossaryResponse.ok) {
      throw new Error(`Falha ao carregar data/glossary.json (HTTP ${glossaryResponse.status}).`);
    }
    if (!tipsResponse.ok) {
      throw new Error(`Falha ao carregar data/tips.json (HTTP ${tipsResponse.status}).`);
    }

    cityData = await cityResponse.json();
    phase1Data = await phase1Response.json();
    phase2Data = await phase2Response.json();
    phase3Data = await phase3Response.json();
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

  state = createInitialState(cityData);

  const { startButton } = initSplash({
    onStart: () => navigate({ screen: 'city', buildingId: null }),
    onHowToPlay: () => openInstructions()
  });

  elements.startButton = startButton || elements.startButton;

  renderCity(elements.svg, cityData, {
    onSelect: (buildingId) => navigate({ screen: 'city', buildingId })
  });

  const phase1Controller = createPhase1({
    data: phase1Data,
    snapshot: loadPhaseProgress(phase1Data.id),
    onScoreChange: (score) => updatePhaseScore(phase1Data.id, score),
    onStateChange: (snapshot) => savePhaseProgress(phase1Data.id, snapshot),
    onComplete: () => {
      playCompletionCelebration({ label: '1FN', title: 'Medalha conquistada' });
      setBuildingNormalized(elements.svg, 'pedido', true, '1FN');
    },
    onReset: () => {
      clearPhaseProgress(phase1Data.id);
      setBuildingNormalized(elements.svg, 'pedido', false, '1FN');
    },
    onExit: () => navigate({ screen: 'city', buildingId: 'pedido' })
  });

  const phase2Controller = createPhase2({
    data: phase2Data,
    snapshot: loadPhaseProgress(phase2Data.id),
    onScoreChange: (score) => updatePhaseScore(phase2Data.id, score),
    onStateChange: (snapshot) => savePhaseProgress(phase2Data.id, snapshot),
    onComplete: () => {
      playCompletionCelebration({ label: '2FN', title: 'Medalha conquistada' });
      applyPhase2CityEvolution();
    },
    onReset: () => {
      clearPhaseProgress(phase2Data.id);
      removePhase2CityEvolution();
    },
    onExit: () => navigate({ screen: 'city', buildingId: 'produto' })
  });

  const phase3Controller = createPhase3({
    data: phase3Data,
    snapshot: loadPhaseProgress(phase3Data.id),
    onScoreChange: (score) => updatePhaseScore(phase3Data.id, score),
    onStateChange: (snapshot) => savePhaseProgress(phase3Data.id, snapshot),
    onComplete: () => {
      playCompletionCelebration({ label: '3FN', title: 'Medalha conquistada' });
      applyPhase3CityEvolution();
    },
    onReset: () => {
      clearPhaseProgress(phase3Data.id);
      removePhase3CityEvolution();
    },
    onExit: () => navigate({ screen: 'city', buildingId: 'funcionario' })
  });

  phaseControllers.set(phase1Data.id, phase1Controller);
  phaseControllers.set(phase2Data.id, phase2Controller);
  phaseControllers.set(phase3Data.id, phase3Controller);

  phaseDefinitions = [
    {
      data: phase1Data,
      controller: phase1Controller,
      phaseNumber: 1,
      medalLabel: '1FN',
      buildingId: 'pedido',
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
      controller: phase2Controller,
      phaseNumber: 2,
      medalLabel: '2FN',
      buildingId: 'produto',
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
      controller: phase3Controller,
      phaseNumber: 3,
      medalLabel: '3FN',
      buildingId: 'funcionario',
      startLabel: 'Entrar em Cidade Organizada',
      revisitLabel: 'Revisitar Cidade Organizada',
      availableNote:
        'Fase 3 disponível. Identifique a dependência transitiva e construa FUNCIONÁRIO e DEPARTAMENTO.',
      completedNote:
        'Fase 3 concluída: FUNCIONÁRIO está na 3FN. Localização foi separada em DEPARTAMENTO.',
      normalizedAttributes: ['cpf', 'nome', 'departamento']
    }
  ];

  missionController = createAdministration({
    data: missionData,
    onComplete: () => playCompletionCelebration({ label: 'Missão', title: 'Missão especial concluída' }),
    onExit: () => navigate({ screen: 'city', buildingId: null })
  });

  phase1Controller.mount(elements.phaseHosts[phase1Data.id]);
  phase2Controller.mount(elements.phaseHosts[phase2Data.id]);
  phase3Controller.mount(elements.phaseHosts[phase3Data.id]);
  missionController.mount(elements.missionHost);

  if (phase1Controller.getState().completed) {
    setBuildingNormalized(elements.svg, 'pedido', true, '1FN');
  }

  if (phase2Controller.getState().completed) {
    applyPhase2CityEvolution();
  }

  if (phase3Controller.getState().completed) {
    applyPhase3CityEvolution();
  }

  phaseScores = Object.fromEntries(
    phaseDefinitions.map((definition) => [definition.data.id, definition.controller.getState().score])
  );
  state = setScore(state, totalPhaseScore());

  renderHud(elements.hud, getHud(state), {
    onMenu: () => navigate({ screen: 'splash', buildingId: null })
  });

  window.addEventListener('hashchange', handleRoute);
  document.addEventListener('keydown', handleGlobalKeydown);
  handleRoute();
  document.documentElement.dataset.appReady = 'true';
}

function applyPhase2CityEvolution() {
  if (!phase2Data?.cityEvolution) {
    return;
  }

  addCityExtension(elements.svg, cityData, phase2Data.cityEvolution, phase2Data.id);
}

function removePhase2CityEvolution() {
  removeCityExtension(elements.svg, phase2Data.id);

  for (const normalized of phase2Data?.cityEvolution?.normalizedBuildings || []) {
    setBuildingNormalized(
      elements.svg,
      normalized.id,
      false,
      normalized.badgeLabel || '2FN'
    );
  }
}

function applyPhase3CityEvolution() {
  if (!phase3Data?.cityEvolution) {
    return;
  }

  addCityExtension(elements.svg, cityData, phase3Data.cityEvolution, phase3Data.id);
}

function removePhase3CityEvolution() {
  removeCityExtension(elements.svg, phase3Data.id);

  for (const normalized of phase3Data?.cityEvolution?.normalizedBuildings || []) {
    setBuildingNormalized(
      elements.svg,
      normalized.id,
      false,
      normalized.badgeLabel || '3FN'
    );
  }
}

function updatePhaseScore(phaseId, score) {
  phaseScores[phaseId] = score;
  state = setScore(state, totalPhaseScore());
  updateHudScore(elements.hud, state.score);
}

function totalPhaseScore() {
  return Object.values(phaseScores).reduce((total, score) => total + score, 0);
}

function getPhaseDefinition(phaseId) {
  return phaseDefinitions.find((definition) => definition.data.id === phaseId) || null;
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

  if (route.screen === 'phase' && !phaseControllers.has(route.phaseId)) {
    window.history.replaceState(null, '', '#/cidade');
    route = { screen: 'city', buildingId: null };
  }

  if (route.screen === 'mission' && route.missionId !== missionData.id) {
    window.history.replaceState(null, '', '#/cidade');
    route = { screen: 'city', buildingId: null };
  }

  state = applyRoute(state, route);

  if (route.screen === 'city' && route.buildingId && !state.selectedBuildingId) {
    window.history.replaceState(null, '', '#/cidade');
  }

  render();
}

function render() {
  const isCity = state.screen === 'city';
  const isPhase = state.screen === 'phase';
  const isMission = state.screen === 'mission';
  const isGame = isCity || isPhase || isMission;
  const activePhase = isPhase ? getPhaseDefinition(state.activePhaseId) : null;
  const enteringCity = isCity && currentScreen !== 'city';
  const enteringPhase =
    isPhase && (currentScreen !== 'phase' || currentPhaseId !== state.activePhaseId);
  const enteringMission = isMission && currentScreen !== 'mission';
  const enteringSplash = !isGame && currentScreen !== 'splash';

  elements.splash.hidden = isGame;
  elements.game.hidden = !isGame;
  elements.splash.setAttribute('aria-hidden', String(isGame));
  elements.game.setAttribute('aria-hidden', String(!isGame));
  elements.cityMain.hidden = !isCity;
  elements.phaseScreen.hidden = !isPhase;
  elements.phaseScreen.setAttribute('aria-hidden', String(!isPhase));
  elements.missionScreen.hidden = !isMission;
  elements.missionScreen.setAttribute('aria-hidden', String(!isMission));

  for (const [phaseId, host] of Object.entries(elements.phaseHosts)) {
    host.hidden = !isPhase || state.activePhaseId !== phaseId;
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
    missionController.refresh();

    if (enteringMission) {
      requestAnimationFrame(() => missionController.focus());
    }
  } else if (enteringSplash) {
    requestAnimationFrame(() => elements.startButton?.focus({ preventScroll: true }));
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
        .filter((definition) => definition.buildingId === selectedBuilding.id)
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

  const progress = buildGameProgress(
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

  renderPanel(elements.panel, {
    city: cityData.city,
    selectedBuilding,
    onSelect: (buildingId) => navigate({ screen: 'city', buildingId }),
    onClose: () => navigate({ screen: 'city', buildingId: null }),
    onOpenMission: () => navigate({ screen: 'mission', missionId: missionData.id }),
    onOpenHelp: () => openHelp({ glossary: glossaryData, tips: tipsData, context: getHelpContext() }),
    onResetGame: confirmResetGame,
    progress,
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
  (previousGroup || elements.startButton)?.focus();
}

function getHelpContext() {
  if (!state) {
    return 'general';
  }

  if (state.screen === 'phase') {
    const contexts = {
      'centro-de-distribuicao': 'phase1',
      'rede-de-dependencias': 'phase2',
      'cidade-organizada': 'phase3'
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
    title: 'Reiniciar todo o jogo?',
    message:
      'Todo o progresso das fases, a pontuação acumulada, as medalhas e as evoluções da cidade serão apagados. Esta ação não pode ser desfeita.',
    confirmLabel: 'Reiniciar tudo',
    cancelLabel: 'Cancelar',
    onConfirm: resetWholeGame
  });
}

function resetWholeGame() {
  for (const definition of phaseDefinitions) {
    definition.controller.reset();
  }

  missionController?.reset?.();
  clearAllProgress();

  phaseScores = Object.fromEntries(
    phaseDefinitions.map((definition) => [definition.data.id, 0])
  );
  state = setScore(state, 0);
  updateHudScore(elements.hud, 0);
  panelBuildingId = undefined;
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
  document.title = building ? `${building.name} — NORMALIZA!` : 'NORMALIZA! — Cidade dos dados';
}

function showFatalError(error) {
  console.error(error);

  const title = document.createElement('h2');
  title.textContent = 'Não foi possível carregar o jogo';

  const message = document.createElement('p');
  message.append(
    'Verifique se os arquivos data/city.json, data/phases/fase-1.json, data/phases/fase-2.json, data/phases/fase-3.json, data/missions/administracao.json, data/glossary.json e data/tips.json estão disponíveis e se o servidor local foi iniciado. '
  );

  const detail = document.createElement('code');
  detail.textContent = error instanceof Error ? error.message : String(error);
  message.append(detail);

  const container = document.createElement('div');
  container.className = 'fatal-error';
  container.append(title, message);

  elements.app.replaceChildren(container);
}
