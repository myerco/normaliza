export function parseRoute(hash = '') {
  const raw = String(hash || '').replace(/^#/, '').trim();
  const cleaned = raw.replace(/^\/+|\/+$/g, '');

  if (!cleaned) {
    return { screen: 'splash', buildingId: null };
  }

  const parts = cleaned.split('/').map(decodePart);
  const pages = {
    perfil: 'profile',
    personagem: 'character',
    ranking: 'ranking',
    conquistas: 'achievements',
    sobre: 'about',
    desafios: 'challenges',
    admin: 'admin',
    mapa: 'worldMap',
    arvore: 'worldMap',
    habilidades: 'skills',
    especializacoes: 'specializations'
  };

  if (parts[0] === 'login') {
    return { screen: 'login', buildingId: null };
  }

  if (parts[0] === 'registro') {
    return { screen: 'register', buildingId: null };
  }

  if (parts[0] === 'recuperar-senha') {
    return { screen: 'recover', buildingId: null };
  }

  if (parts[0] === 'onboarding') {
    return { screen: 'onboarding', buildingId: null };
  }

  if (parts[0] === 'jogador') {
    const section = parts[1] ?? null;
    const privatePages = {
      perfil: 'profile',
      mundo: 'worldMap',
      mapa: 'worldMap',
      habilidades: 'skills',
      especializacoes: 'specializations',
      conquistas: 'achievements',
      ranking: 'ranking',
      desafios: 'challenges'
    };

    if (!section) {
      return { screen: 'journey', buildingId: null };
    }

    if (section === 'quest' && parts[2]) {
      return { screen: 'questDetail', questId: parts[2], buildingId: null };
    }

    if (privatePages[section]) {
      return { screen: privatePages[section], buildingId: null };
    }
  }

  if (parts[0] === 'admin' && parts[1] === 'mundo') {
    return { screen: 'adminWorld', buildingId: null };
  }

  if (parts[0] === 'territorio') {
    return parts[1]
      ? { screen: 'territory', territoryId: parts[1], buildingId: null }
      : { screen: 'worldMap', buildingId: null };
  }

  if (parts[0] === 'trilha') {
    return parts[1]
      ? { screen: 'track', trackId: parts[1], buildingId: null }
      : { screen: 'worldMap', buildingId: null };
  }

  if (parts[0] === 'quest') {
    return parts[1]
      ? { screen: 'questDetail', questId: parts[1], buildingId: null }
      : { screen: 'worldMap', buildingId: null };
  }

  if (pages[parts[0]]) {
    return { screen: pages[parts[0]], buildingId: null };
  }

  if (parts[0] === 'missao') {
    return parts[1]
      ? { screen: 'mission', missionId: parts[1], buildingId: null }
      : { screen: 'city', buildingId: null };
  }

  if (parts[0] === 'fase') {
    return parts[1]
      ? { screen: 'phase', phaseId: parts[1], buildingId: null }
      : { screen: 'city', buildingId: null };
  }

  if (parts[0] !== 'cidade') {
    return { screen: 'splash', buildingId: null };
  }

  const buildingId = parts.length > 1 && parts[1] ? parts[1] : null;
  return { screen: 'city', buildingId };
}

export function toHash(route) {
  if (!route) {
    return '#/';
  }

  if (route.screen === 'login') {
    return '#/login';
  }

  if (route.screen === 'register') {
    return '#/registro';
  }

  if (route.screen === 'recover') {
    return '#/recuperar-senha';
  }

  if (route.screen === 'onboarding') {
    return '#/onboarding';
  }

  if (route.screen === 'journey') {
    return '#/jogador';
  }

  if (route.screen === 'profile') {
    return '#/jogador/perfil';
  }

  if (route.screen === 'character') {
    return '#/personagem';
  }

  if (route.screen === 'ranking') {
    return '#/ranking';
  }

  if (route.screen === 'achievements') {
    return '#/conquistas';
  }

  if (route.screen === 'about') {
    return '#/sobre';
  }

  if (route.screen === 'challenges') {
    return '#/desafios';
  }

  if (route.screen === 'admin') {
    return '#/admin';
  }

  if (route.screen === 'adminWorld') {
    return '#/admin/mundo';
  }

  if (route.screen === 'knowledge' || route.screen === 'worldMap') {
    return '#/mapa';
  }

  if (route.screen === 'skills') {
    return '#/habilidades';
  }

  if (route.screen === 'specializations') {
    return '#/especializacoes';
  }

  if (route.screen === 'territory') {
    return route.territoryId
      ? `#/territorio/${encodeURIComponent(route.territoryId)}`
      : '#/mapa';
  }

  if (route.screen === 'track') {
    return route.trackId
      ? `#/trilha/${encodeURIComponent(route.trackId)}`
      : '#/mapa';
  }

  if (route.screen === 'questDetail') {
    return route.questId
      ? `#/quest/${encodeURIComponent(route.questId)}`
      : '#/mapa';
  }

  if (route.screen === 'mission') {
    return route.missionId
      ? `#/missao/${encodeURIComponent(route.missionId)}`
      : '#/cidade';
  }

  if (route.screen === 'phase') {
    return route.phaseId
      ? `#/fase/${encodeURIComponent(route.phaseId)}`
      : '#/cidade';
  }

  if (route.screen !== 'city') {
    return '#/';
  }

  return route.buildingId
    ? `#/cidade/${encodeURIComponent(route.buildingId)}`
    : '#/cidade';
}

function decodePart(part) {
  try {
    return decodeURIComponent(part);
  } catch {
    return part;
  }
}
