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
    activeMissionId: null,
    activeTerritoryId: null,
    activeTrackId: null,
    activeQuestId: null,
    activeAdminUserId: null
  };
}

export function startGame(state) {
  return {
    ...state,
    screen: 'city',
    selectedBuildingId: null,
    activePhaseId: null,
    activeMissionId: null,
    activeTerritoryId: null,
    activeTrackId: null,
    activeQuestId: null
  };
}

export function goToMenu(state) {
  return {
    ...state,
    screen: 'splash',
    selectedBuildingId: null,
    activePhaseId: null,
    activeMissionId: null,
    activeTerritoryId: null,
    activeTrackId: null,
    activeQuestId: null
  };
}

export function startPhase(state, phaseId) {
  return {
    ...state,
    screen: 'phase',
    selectedBuildingId: null,
    activePhaseId: phaseId,
    activeMissionId: null,
    activeTerritoryId: null,
    activeTrackId: null,
    activeQuestId: null
  };
}

export function goToPage(state, screen) {
  if (!['profile', 'character', 'ranking', 'achievements', 'about', 'challenges', 'admin', 'adminWorld', 'adminUsers', 'adminPlayers', 'adminContent', 'adminSettings', 'adminAudit', 'knowledge', 'worldMap', 'skills', 'specializations', 'login', 'register', 'recover', 'onboarding', 'journey'].includes(screen)) {
    return state;
  }

  return {
    ...state,
    screen,
    selectedBuildingId: null,
    activePhaseId: null,
    activeMissionId: null,
    activeTerritoryId: null,
    activeTrackId: null,
    activeQuestId: null,
    activeAdminUserId: null
  };
}

export function openTerritory(state, territoryId) {
  return {
    ...state,
    screen: 'territory',
    selectedBuildingId: null,
    activePhaseId: null,
    activeMissionId: null,
    activeTerritoryId: territoryId,
    activeTrackId: null,
    activeQuestId: null
  };
}

export function openTrack(state, trackId) {
  return {
    ...state,
    screen: 'track',
    selectedBuildingId: null,
    activePhaseId: null,
    activeMissionId: null,
    activeTrackId: trackId,
    activeQuestId: null
  };
}

export function openAdminUser(state, userId) {
  return {
    ...state,
    screen: 'adminUser',
    selectedBuildingId: null,
    activePhaseId: null,
    activeMissionId: null,
    activeAdminUserId: userId
  };
}

export function openQuestDetail(state, questId) {
  return {
    ...state,
    screen: 'questDetail',
    selectedBuildingId: null,
    activePhaseId: null,
    activeMissionId: null,
    activeQuestId: questId
  };
}

export function startMission(state, missionId) {
  return {
    ...state,
    screen: 'mission',
    selectedBuildingId: null,
    activePhaseId: null,
    activeMissionId: missionId,
    activeTerritoryId: null,
    activeTrackId: null,
    activeQuestId: null
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
    activeMissionId: null,
    activeTerritoryId: null,
    activeTrackId: null,
    activeQuestId: null
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

  if (['profile', 'character', 'ranking', 'achievements', 'about', 'challenges', 'admin', 'adminWorld', 'adminUsers', 'adminPlayers', 'adminContent', 'adminSettings', 'adminAudit', 'knowledge', 'worldMap', 'skills', 'specializations', 'login', 'register', 'recover', 'onboarding', 'journey'].includes(route.screen)) {
    return goToPage(state, route.screen);
  }

  if (route.screen === 'adminUser' && route.userId) {
    return openAdminUser(state, route.userId);
  }

  if (route.screen === 'territory' && route.territoryId) {
    return openTerritory(state, route.territoryId);
  }

  if (route.screen === 'track' && route.trackId) {
    return openTrack(state, route.trackId);
  }

  if (route.screen === 'questDetail' && route.questId) {
    return openQuestDetail(state, route.questId);
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
