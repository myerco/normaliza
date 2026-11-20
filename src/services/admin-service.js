import { loadAuthSession } from './providers/local.js';
import { LOCAL_API_BASE, isNetworkEnabled } from './runtime.js';

export function isAdminApiEnabled() {
  return Boolean(isNetworkEnabled() && LOCAL_API_BASE);
}

export async function loadAdminAccess() {
  if (!isAdminApiEnabled()) {
    return null;
  }

  const session = loadAuthSession();
  if (!session?.token) {
    return null;
  }

  try {
    return await requestJson('/admin/me', {}, session.token);
  } catch {
    return null;
  }
}

export async function loadAdminDashboard() {
  return requestAdmin('/admin/dashboard');
}

export async function loadAdminUsers(params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value);
    }
  }
  return requestAdmin(`/admin/users?${query.toString()}`);
}

export async function loadAdminUser(userId) {
  return requestAdmin(`/admin/users/${encodeURIComponent(userId)}`);
}

export async function blockAdminUser(userId, reason = '') {
  return requestAdmin(`/admin/users/${encodeURIComponent(userId)}/block`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  });
}

export async function unblockAdminUser(userId, reason = '') {
  return requestAdmin(`/admin/users/${encodeURIComponent(userId)}/unblock`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  });
}

export async function updateAdminUserEmail(userId, email, reason = '') {
  return requestAdmin(`/admin/users/${encodeURIComponent(userId)}/email`, {
    method: 'POST',
    body: JSON.stringify({ email, reason })
  });
}

export async function requestAdminPasswordReset(userId, reason = '') {
  return requestAdmin(`/admin/users/${encodeURIComponent(userId)}/password-reset`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  });
}

export async function updateAdminUserRoles(userId, roleIds) {
  return requestAdmin(`/admin/users/${encodeURIComponent(userId)}/roles`, {
    method: 'POST',
    body: JSON.stringify({ roleIds })
  });
}

export async function loadAdminAudit(params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value);
    }
  }
  return requestAdmin(`/admin/audit?${query.toString()}`);
}

export async function loadAdminSettings() {
  return requestAdmin('/admin/settings');
}

export async function saveAdminSettings({ settings, flags }) {
  return requestAdmin('/admin/settings', {
    method: 'PUT',
    body: JSON.stringify({ settings, flags })
  });
}

async function requestAdmin(path, options = {}) {
  if (!isAdminApiEnabled()) {
    throw new Error('API administrativa indisponível.');
  }

  const session = loadAuthSession();
  if (!session?.token) {
    throw new Error('Sessão administrativa não encontrada.');
  }

  return requestJson(path, options, session.token);
}

async function requestJson(path, options, token) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${LOCAL_API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers ?? {})
      }
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const error = new Error(payload?.error || `HTTP ${response.status}`);
      error.code = payload?.code ?? 'request-failed';
      error.status = response.status;
      throw error;
    }

    return payload;
  } finally {
    clearTimeout(timeout);
  }
}
