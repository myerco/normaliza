export const PHASE = Object.freeze({
  id: 'fase-1',
  label: 'Fase 1 — Centro de Distribuição'
});

export function createInitialState(city = null) {
  return {
    city,
    phase: PHASE,
    score: 0,
    screen: 'splash',
    selectedBuildingId: null,
    activePhaseId: null,
    activeMissionId: null
  };
}

export function startGame(state) {
  return {
    ...state,
    screen: 'city',
    selectedBuildingId: null,
    activePhaseId: null,
    activeMissionId: null
  };
}

export function goToMenu(state) {
  return {
    ...state,
    screen: 'splash',
    selectedBuildingId: null,
    activePhaseId: null,
    activeMissionId: null
  };
}

export function startPhase(state, phaseId) {
  return {
    ...state,
    screen: 'phase',
    selectedBuildingId: null,
    activePhaseId: phaseId,
    activeMissionId: null
  };
}

export function startMission(state, missionId) {
  return {
    ...state,
    screen: 'mission',
    selectedBuildingId: null,
    activePhaseId: null,
    activeMissionId: missionId
  };
}

export function selectBuilding(state, buildingId) {
  if (!hasBuilding(state, buildingId)) {
    return state;
  }

  return {
    ...state,
    screen: 'city',
    selectedBuildingId: buildingId,
    activePhaseId: null,
    activeMissionId: null
  };
}

export function clearSelection(state) {
  return {
    ...state,
    selectedBuildingId: null
  };
}

export function setScore(state, score) {
  const numeric = Number(score);

  return {
    ...state,
    score: Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : 0
  };
}

export function getSelectedBuilding(state) {
  if (!state || !state.selectedBuildingId) {
    return null;
  }

  return getBuildings(state).find((building) => building.id === state.selectedBuildingId) || null;
}

export function getHud(state) {
  return {
    phaseLabel: state.phase.label,
    score: state.score
  };
}

export function applyRoute(state, route) {
  if (!route) {
    return goToMenu(state);
  }

  if (route.screen === 'mission' && route.missionId) {
    return startMission(state, route.missionId);
  }

  if (route.screen === 'phase' && route.phaseId) {
    return startPhase(state, route.phaseId);
  }

  if (route.screen !== 'city') {
    return goToMenu(state);
  }

  const inCity = startGame(state);
  return route.buildingId ? selectBuilding(inCity, route.buildingId) : clearSelection(inCity);
}

function hasBuilding(state, buildingId) {
  return getBuildings(state).some((building) => building.id === buildingId);
}

function getBuildings(state) {
  return state && state.city && state.city.city && Array.isArray(state.city.city.buildings)
    ? state.city.city.buildings
    : [];
}
