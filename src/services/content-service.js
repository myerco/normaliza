import { normalizeQuestCatalog } from '../core/quests.js';
import { normalizeWorldCatalog } from '../persistence/worldStorage.js';
import { ensureAuthSession } from './providers/local.js';
import { BACKEND_MODE, LOCAL_API_BASE, isNetworkEnabled } from './runtime.js';

const REQUEST_TIMEOUT_MS = 15000;

export function isDatabaseContentEnabled() {
  return BACKEND_MODE === 'local' && Boolean(LOCAL_API_BASE) && isNetworkEnabled();
}

export async function loadDatabaseContent() {
  if (!isDatabaseContentEnabled()) {
    return null;
  }

  try {
    const payload = await requestJson(`${LOCAL_API_BASE}/content`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!payload?.world || !payload?.questCatalog) {
      return null;
    }

    return {
      source: 'postgresql',
      world: normalizeWorldCatalog(payload.world),
      questCatalog: normalizeQuestCatalog(payload.questCatalog)
    };
  } catch {
    return null;
  }
}

export async function saveDatabaseContent({ world, questCatalog }) {
  if (!isDatabaseContentEnabled()) {
    return { saved: false, reason: 'offline' };
  }

  const session = await ensureAuthSession();
  const payload = await requestJson(`${LOCAL_API_BASE}/content`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`
    },
    body: JSON.stringify({ world, questCatalog })
  });

  return {
    saved: true,
    source: 'postgresql',
    world: normalizeWorldCatalog(payload.world),
    questCatalog: normalizeQuestCatalog(payload.questCatalog)
  };
}

async function requestJson(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;

    if (!response.ok) {
      throw new Error(payload?.error || `HTTP ${response.status}`);
    }

    return payload;
  } finally {
    clearTimeout(timeout);
  }
}
