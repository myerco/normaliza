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
    arvore: 'knowledge'
  };

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

  if (route.screen === 'profile') {
    return '#/perfil';
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

  if (route.screen === 'knowledge') {
    return '#/arvore';
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
