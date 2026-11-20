import { MultiplayerError } from '../errors.js';
import { LOCAL_API_BASE, isNetworkEnabled } from '../runtime.js';

const LOCAL_SESSION_KEY = 'normaliza:v3:local-session';
const REQUEST_TIMEOUT_MS = 15000;

export function isMultiplayerConfigured() {
  return Boolean(LOCAL_API_BASE);
}

export function loadAuthSession() {
  return readSession();
}

export function setAuthSession(token, ownerId) {
  return writeSession({ token, ownerId });
}

export function clearAuthSession() {
  try {
    globalThis.localStorage?.removeItem(LOCAL_SESSION_KEY);
  } catch {
    return false;
  }

  return true;
}

export async function ensureAuthSession() {
  if (!isNetworkEnabled()) {
    throw new MultiplayerError('API local indisponível no modo de teste.', { code: 'offline' });
  }

  const current = readSession();

  if (current?.token) {
    return {
      accessToken: current.token,
      userId: current.ownerId
    };
  }

  const response = await requestJson(apiUrl('/session'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  });

  if (!response?.token || !response?.ownerId) {
    throw new MultiplayerError('Sessão local inválida.', { code: 'invalid-session' });
  }

  const session = {
    token: response.token,
    ownerId: response.ownerId
  };
  writeSession(session);

  return {
    accessToken: session.token,
    userId: session.ownerId
  };
}

export async function createRemoteProfile({ playerId, name, bio = '', avatarId }) {
  const session = await ensureAuthSession();
  const response = await requestJson(apiUrl('/profiles'), {
    method: 'POST',
    headers: authHeaders(session.accessToken),
    body: JSON.stringify({ playerId, name, bio, avatarId })
  });

  return response?.profile ?? response;
}

export async function updateRemoteProfile({ playerId, name, avatarId }) {
  const session = await ensureAuthSession();
  const response = await requestJson(apiUrl(`/profiles/${encodeURIComponent(playerId)}`), {
    method: 'PATCH',
    headers: authHeaders(session.accessToken),
    body: JSON.stringify({ name, avatarId })
  });

  return response?.profile ?? response;
}

export async function fetchLeaderboard() {
  if (!isNetworkEnabled()) {
    throw new MultiplayerError('API local indisponível no modo de teste.', { code: 'offline' });
  }

  return requestJson(apiUrl('/leaderboard'), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function startRemoteAttempt({ playerId, phaseId }) {
  const session = await ensureAuthSession();
  return requestJson(apiUrl('/attempts'), {
    method: 'POST',
    headers: authHeaders(session.accessToken),
    body: JSON.stringify({ playerId, phaseId })
  });
}

export async function recordRemoteHint({ attemptId }) {
  const session = await ensureAuthSession();
  return requestJson(apiUrl(`/attempts/${encodeURIComponent(attemptId)}/hints`), {
    method: 'POST',
    headers: authHeaders(session.accessToken),
    body: '{}'
  });
}

export async function recordRemoteValidation({ attemptId }) {
  const session = await ensureAuthSession();
  return requestJson(apiUrl(`/attempts/${encodeURIComponent(attemptId)}/validations`), {
    method: 'POST',
    headers: authHeaders(session.accessToken),
    body: '{}'
  });
}

export async function submitRemoteSolution({ playerId, phaseId, snapshot, matchId, attemptId }) {
  const session = await ensureAuthSession();
  return requestJson(apiUrl('/results'), {
    method: 'POST',
    headers: authHeaders(session.accessToken),
    body: JSON.stringify({
      playerId,
      phaseId,
      snapshot,
      matchId,
      attemptId
    })
  });
}

export async function confirmNormalizaQuest({ playerId, characterId }) {
  const session = await ensureAuthSession();
  return requestJson(apiUrl('/quests/normaliza/complete'), {
    method: 'POST',
    headers: authHeaders(session.accessToken),
    body: JSON.stringify({ playerId, characterId })
  });
}

export async function syncRemoteProfile(player) {
  return createRemoteProfile({
    playerId: player.id,
    name: player.name,
    avatarId: player.avatarId
  });
}

function apiUrl(path) {
  return `${LOCAL_API_BASE}${path}`;
}

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };
}

function writeSession(session) {
  try {
    globalThis.localStorage?.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));
  } catch {
    return false;
  }

  return true;
}

function readSession() {
  try {
    const raw = globalThis.localStorage?.getItem(LOCAL_SESSION_KEY);
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
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    const payload = text ? parseJson(text) : null;

    if (!response.ok) {
      throw new MultiplayerError(
        payload?.error || payload?.message || `HTTP ${response.status}`,
        {
          code: payload?.code ?? 'request-failed',
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
