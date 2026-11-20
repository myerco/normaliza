import {
  clearAuthSession as clearLocalSession,
  loadAuthSession as loadLocalSession,
  setAuthSession as setLocalSession
} from './providers/local.js';
import {
  clearAuthSession as clearSupabaseSession,
  loadAuthSession as loadSupabaseSession,
  storeAuthSession as storeSupabaseSession
} from './providers/supabase.js';
import { BACKEND_MODE, LOCAL_API_BASE, SUPABASE, isNetworkEnabled } from './runtime.js';

const REQUEST_TIMEOUT_MS = 15000;

export function isAuthenticated() {
  return BACKEND_MODE === 'local'
    ? Boolean(loadLocalSession()?.token)
    : Boolean(loadSupabaseSession()?.accessToken);
}

export async function register({ email, password }) {
  if (BACKEND_MODE !== 'local') {
    return registerSupabase(email, password);
  }

  const response = await requestJson(`${LOCAL_API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  setLocalSession(response.token, response.ownerId);
  return { user: response.user, needsConfirmation: false };
}

export async function login({ email, password }) {
  if (BACKEND_MODE !== 'local') {
    return loginSupabase(email, password);
  }

  const response = await requestJson(`${LOCAL_API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  setLocalSession(response.token, response.ownerId);
  return { user: response.user };
}

export async function logout() {
  if (BACKEND_MODE === 'local') {
    const session = loadLocalSession();
    if (session?.token) {
      await requestJson(`${LOCAL_API_BASE}/auth/logout`, {
        method: 'POST',
        headers: authHeaders(session.token)
      }).catch(() => {});
    }
    clearLocalSession();
    return;
  }

  const session = loadSupabaseSession();
  if (session?.accessToken) {
    await requestJson(`${SUPABASE.url}/auth/v1/logout`, {
      method: 'POST',
      headers: supabaseHeaders(session.accessToken)
    }).catch(() => {});
  }
  clearSupabaseSession();
}

export async function recover(email) {
  if (BACKEND_MODE === 'local') {
    const error = new Error('Recuperação de senha não está disponível no modo local.');
    error.code = 'recovery-unavailable';
    throw error;
  }

  await requestJson(`${SUPABASE.url}/auth/v1/recover`, {
    method: 'POST',
    headers: supabasePublicHeaders(),
    body: JSON.stringify({ email: String(email ?? '').trim() })
  });
  return { ok: true };
}

export async function getCurrentUser() {
  if (!isNetworkEnabled()) {
    return null;
  }

  if (BACKEND_MODE === 'local') {
    const session = loadLocalSession();
    if (!session?.token) {
      return null;
    }

    try {
      const response = await requestJson(`${LOCAL_API_BASE}/auth/me`, {
        method: 'GET',
        headers: authHeaders(session.token)
      });
      return response.user;
    } catch {
      clearLocalSession();
      return null;
    }
  }

  const session = await getSupabaseSession();
  if (!session?.accessToken) {
    return null;
  }

  try {
    const response = await requestJson(`${SUPABASE.url}/auth/v1/user`, {
      method: 'GET',
      headers: supabaseHeaders(session.accessToken)
    });
    return response;
  } catch {
    clearSupabaseSession();
    return null;
  }
}

export async function getPlayer() {
  if (BACKEND_MODE === 'local') {
    const session = loadLocalSession();
    if (!session?.token) {
      return null;
    }

    try {
      const response = await requestJson(`${LOCAL_API_BASE}/players/me`, {
        method: 'GET',
        headers: authHeaders(session.token)
      });
      return response.player;
    } catch {
      return null;
    }
  }

  const user = await getCurrentUser();
  const session = await getSupabaseSession();
  if (!user?.id || !session?.accessToken) {
    return null;
  }

  const rows = await requestJson(
    `${SUPABASE.url}/rest/v1/players?select=*&owner_id=eq.${encodeURIComponent(user.id)}&limit=1`,
    {
      method: 'GET',
      headers: supabaseHeaders(session.accessToken)
    }
  );
  return Array.isArray(rows) && rows[0] ? mapSupabasePlayer(rows[0]) : null;
}

export async function createPlayer({ playerId, name, bio = '', avatarId }) {
  if (BACKEND_MODE === 'local') {
    const session = loadLocalSession();
    if (!session?.token) {
      throw new Error('Sessão não encontrada.');
    }

    const response = await requestJson(`${LOCAL_API_BASE}/players/me`, {
      method: 'POST',
      headers: authHeaders(session.token),
      body: JSON.stringify({ playerId, name, bio, avatarId })
    });
    return response.player;
  }

  const user = await getCurrentUser();
  const session = await getSupabaseSession();
  if (!user?.id || !session?.accessToken) {
    throw new Error('Sessão não encontrada.');
  }

  const response = await requestJson(`${SUPABASE.functionsUrl}/create-profile`, {
    method: 'POST',
    headers: supabaseHeaders(session.accessToken),
    body: JSON.stringify({ playerId, name, bio, avatarId })
  });
  return mapSupabasePlayer(response.profile ?? response.player);
}

export async function updatePlayer({ name, bio = '', avatarId }) {
  if (BACKEND_MODE === 'local') {
    const session = loadLocalSession();
    if (!session?.token) {
      throw new Error('Sessão não encontrada.');
    }

    const response = await requestJson(`${LOCAL_API_BASE}/players/me`, {
      method: 'PATCH',
      headers: authHeaders(session.token),
      body: JSON.stringify({ name, bio, avatarId })
    });
    return response.player;
  }

  const session = await getSupabaseSession();
  if (!session?.accessToken) {
    throw new Error('Sessão não encontrada.');
  }

  const response = await requestJson(`${SUPABASE.functionsUrl}/update-profile`, {
    method: 'POST',
    headers: supabaseHeaders(session.accessToken),
    body: JSON.stringify({ name, bio, avatarId })
  });
  return mapSupabasePlayer(response.profile ?? response.player);
}

async function registerSupabase(email, password) {
  const response = await requestJson(`${SUPABASE.url}/auth/v1/signup`, {
    method: 'POST',
    headers: supabasePublicHeaders(),
    body: JSON.stringify({ email: String(email ?? '').trim(), password })
  });

  if (response.access_token && response.refresh_token) {
    storeSupabaseSession(response);
    return { user: response.user, needsConfirmation: false };
  }

  return { user: response.user ?? response, needsConfirmation: true };
}

async function loginSupabase(email, password) {
  const response = await requestJson(
    `${SUPABASE.url}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: supabasePublicHeaders(),
      body: JSON.stringify({ email: String(email ?? '').trim(), password })
    }
  );
  storeSupabaseSession(response);
  return { user: response.user, needsConfirmation: false };
}

async function getSupabaseSession() {
  const session = loadSupabaseSession();

  if (!session?.accessToken) {
    return null;
  }

  if (session.expiresAt > Date.now() + 30000) {
    return session;
  }

  if (!session.refreshToken) {
    return session;
  }

  try {
    const refreshed = await requestJson(
      `${SUPABASE.url}/auth/v1/token?grant_type=refresh_token`,
      {
        method: 'POST',
        headers: supabasePublicHeaders(),
        body: JSON.stringify({ refresh_token: session.refreshToken })
      }
    );
    return storeSupabaseSession(refreshed);
  } catch {
    clearSupabaseSession();
    return null;
  }
}

function mapSupabasePlayer(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.owner_id,
    name: row.name,
    bio: row.bio ?? '',
    avatarId: row.avatar_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastActivityAt: row.last_activity_at
  };
}

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };
}

function supabasePublicHeaders() {
  return {
    apikey: SUPABASE.publishableKey,
    'Content-Type': 'application/json'
  };
}

function supabaseHeaders(accessToken) {
  return {
    ...supabasePublicHeaders(),
    Authorization: `Bearer ${accessToken}`
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
      const error = new Error(
        payload?.error_description || payload?.error || payload?.message || `HTTP ${response.status}`
      );
      error.code = payload?.code ?? 'request-failed';
      error.status = response.status;
      throw error;
    }

    return payload;
  } finally {
    clearTimeout(timeout);
  }
}
