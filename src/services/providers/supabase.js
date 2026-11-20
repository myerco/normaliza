import { MultiplayerError } from '../errors.js';
import { SUPABASE, isNetworkEnabled, isSupabaseConfigured } from '../runtime.js';

const AUTH_SESSION_KEY = 'normaliza:v2:auth-session';

export function isMultiplayerConfigured() {
  return isSupabaseConfigured();
}

export function loadAuthSession() {
  return readSession();
}

export function storeAuthSession(payload) {
  return storeSession(payload);
}

export function clearAuthSession() {
  try {
    globalThis.localStorage?.removeItem(AUTH_SESSION_KEY);
  } catch {
    return false;
  }

  return true;
}

export async function ensureAuthSession() {
  if (!isMultiplayerConfigured()) {
    throw new MultiplayerError('Supabase não configurado.', { code: 'not-configured' });
  }

  if (!isNetworkEnabled()) {
    throw new MultiplayerError('Ranking indisponível no modo de teste.', { code: 'offline' });
  }

  const current = readSession();

  if (current?.accessToken && current.expiresAt > Date.now() + 30000) {
    return current;
  }

  if (current?.refreshToken) {
    try {
      const refreshed = await requestJson(
        `${SUPABASE.url}/auth/v1/token?grant_type=refresh_token`,
        {
          method: 'POST',
          headers: publicHeaders(),
          body: JSON.stringify({ refresh_token: current.refreshToken })
        }
      );
      return storeSession(refreshed);
    } catch {
      clearAuthSession();
    }
  }

  const response = await requestJson(`${SUPABASE.url}/auth/v1/signup`, {
    method: 'POST',
    headers: publicHeaders(),
    body: '{}'
  });

  return storeSession(response);
}

export async function createRemoteProfile({ playerId, name, bio = '', avatarId }) {
  const session = await ensureAuthSession();
  const response = await callFunction('create-profile', session.accessToken, {
    playerId,
    name,
    avatarId
  });

  return response?.profile ?? response;
}

export async function updateRemoteProfile({ playerId, name, avatarId }) {
  const session = await ensureAuthSession();
  const response = await callFunction('update-profile', session.accessToken, {
    playerId,
    name,
    avatarId
  });

  return response?.profile ?? response;
}

export async function fetchLeaderboard() {
  if (!isMultiplayerConfigured()) {
    throw new MultiplayerError('Ranking não configurado.', { code: 'not-configured' });
  }

  if (!isNetworkEnabled()) {
    throw new MultiplayerError('Ranking indisponível no modo de teste.', { code: 'offline' });
  }

  return requestJson(
    `${SUPABASE.url}/rest/v1/leaderboard?select=player_id,name,avatar_id,total_score,completed_phases,score_achieved_at&limit=1000`,
    {
      method: 'GET',
      headers: publicHeaders()
    }
  );
}

export async function startRemoteAttempt({ playerId, phaseId }) {
  const session = await ensureAuthSession();
  return callFunction('start-attempt', session.accessToken, { playerId, phaseId });
}

export async function recordRemoteHint({ attemptId }) {
  const session = await ensureAuthSession();
  return callFunction('record-hint', session.accessToken, { attemptId });
}

export async function recordRemoteValidation({ attemptId }) {
  const session = await ensureAuthSession();
  return callFunction('record-validation', session.accessToken, { attemptId });
}

export async function submitRemoteSolution({ playerId, phaseId, snapshot, matchId, attemptId }) {
  const session = await ensureAuthSession();
  return callFunction('submit-solution', session.accessToken, {
    playerId,
    phaseId,
    snapshot,
    matchId,
    attemptId
  });
}

export async function confirmNormalizaQuest({ playerId, characterId }) {
  const session = await ensureAuthSession();
  return callFunction('complete-quest', session.accessToken, {
    playerId,
    characterId
  });
}

export async function syncRemoteProfile(player) {
  return createRemoteProfile({
    playerId: player.id,
    name: player.name,
    avatarId: player.avatarId
  });
}

async function callFunction(name, accessToken, body) {
  return requestJson(`${SUPABASE.functionsUrl}/${name}`, {
    method: 'POST',
    headers: {
      ...publicHeaders(),
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(body)
  });
}

function publicHeaders() {
  return {
    apikey: SUPABASE.publishableKey,
    'Content-Type': 'application/json'
  };
}

function storeSession(payload) {
  if (!payload?.access_token || !payload?.refresh_token) {
    throw new MultiplayerError('Sessão anônima inválida.', { code: 'invalid-session' });
  }

  const session = {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: Date.now() + Number(payload.expires_in || 3600) * 1000,
    userId: payload.user?.id ?? payload.user_id ?? null
  };

  try {
    globalThis.localStorage?.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  } catch {
    return session;
  }

  return session;
}

function readSession() {
  try {
    const raw = globalThis.localStorage?.getItem(AUTH_SESSION_KEY);
    if (!raw) {
      return null;
    }

    const session = JSON.parse(raw);
    return session && typeof session === 'object' ? session : null;
  } catch {
    return null;
  }
}

async function requestJson(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    SUPABASE.requestTimeoutMs || 12000
  );

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    const payload = text ? parseJson(text) : null;

    if (!response.ok) {
      throw new MultiplayerError(
        payload?.message || payload?.error_description || payload?.msg || `HTTP ${response.status}`,
        {
          code: payload?.code ?? payload?.error_code ?? 'request-failed',
          status: response.status,
          payload
        }
      );
    }

    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
