export function parseRoute(hash = '') {
  const raw = String(hash || '').replace(/^#/, '').trim();
  const cleaned = raw.replace(/^\/+|\/+$/g, '');

  if (!cleaned) {
    return { screen: 'splash', buildingId: null };
  }

  const parts = cleaned.split('/').map(decodePart);

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
