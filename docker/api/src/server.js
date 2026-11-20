import crypto from 'node:crypto';
import http from 'node:http';
import { URL } from 'node:url';
import { closePool, migrate, pool } from './db.js';
import { authenticate, createSession, createUser, deleteSession, findUserByEmail, findUserById, recordLogin, normalizeEmail, validateEmail, validatePassword, verifyPassword } from './auth.js';
import { PHASE_DATA } from '../shared/phase-data.js';
import { isValidAvatar, validatePlayerName } from '../shared/players.js';
import { scoreSolution } from '../shared/score.js';
import { levelFromXp, xpForQuest } from '../shared/progression.js';
import { readContent, saveContent, seedContent } from './content.js';
import { bootstrapAdmin, getAdminDashboard, getAdminSettings, getUserAccess, getUserDetail, hasPermission, listAudit, listUsers, replaceUserRoles, updateAdminSettings, updateUserStatus, writeAudit } from './admin.js';

const PORT = Number(process.env.PORT || 3000);
const allowedOrigins = (process.env.APP_ORIGIN || 'http://localhost:8080')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NORMALIZA_PHASES = [
  'centro-de-distribuicao',
  'rede-de-dependencias',
  'cidade-organizada',
  'gestao-de-funcionarios-e-pedidos'
];

function corsHeaders(request) {
  const origin = request.headers.origin;
  const headers = {
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, OPTIONS',
    Vary: 'Origin'
  };

  if (origin && allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

function send(request, response, status, body) {
  response.writeHead(status, {
    ...corsHeaders(request),
    'Content-Type': 'application/json; charset=utf-8'
  });
  response.end(JSON.stringify(body));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;

    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > 2 * 1024 * 1024) {
        reject(new Error('payload-too-large'));
        request.destroy();
        return;
      }
      body += chunk;
    });
    request.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('invalid-json'));
      }
    });
    request.on('error', reject);
  });
}

async function findOwnedPlayer(playerId, ownerId) {
  const { rows } = await pool.query(
    'select * from public.players where id = $1 and owner_id = $2',
    [playerId, ownerId]
  );
  return rows[0] || null;
}

async function findUserPlayer(userId) {
  const { rows } = await pool.query(
    'select * from public.players where user_id = $1 limit 1',
    [userId]
  );
  return rows[0] || null;
}

function publicUser(row) {
  return row
    ? {
        id: row.id,
        email: row.email,
        authProvider: row.auth_provider,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastLoginAt: row.last_login_at
      }
    : null;
}

function publicPlayer(row) {
  return row
    ? {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        bio: row.bio ?? '',
        avatarId: row.avatar_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastActivityAt: row.last_activity_at
      }
    : null;
}

function normalizeBio(value) {
  return String(value ?? '').trim().slice(0, 280);
}

async function requirePermission(request, response, session, permission) {
  if (!session?.userId) {
    send(request, response, 401, { error: 'Usuário não autenticado.', code: 'unauthorized' });
    return null;
  }

  const access = await getUserAccess(session.userId);
  if (!hasPermission(access, permission)) {
    send(request, response, 403, { error: 'Permissão administrativa insuficiente.', code: 'forbidden' });
    return null;
  }

  return access;
}

async function findOwnedAttempt(attemptId, ownerId) {
  const { rows } = await pool.query(
    `select a.* from public.phase_attempts a
     join public.players p on p.id = a.player_id
     where a.id = $1 and p.owner_id = $2`,
    [attemptId, ownerId]
  );
  return rows[0] || null;
}

async function handle(request, response) {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, corsHeaders(request));
    response.end();
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  const path = url.pathname;
  const parts = path.split('/').filter(Boolean);

  if (request.method === 'GET' && path === '/api/health') {
    send(request, response, 200, { ok: true });
    return;
  }

  if (request.method === 'GET' && path === '/api/content') {
    send(request, response, 200, await readContent());
    return;
  }

  if (request.method === 'POST' && path === '/api/session') {
    const session = await createSession();
    send(request, response, 201, session);
    return;
  }

  if (request.method === 'POST' && path === '/api/auth/register') {
    const body = await readJson(request);
    const emailValidation = validateEmail(body?.email);
    const passwordValidation = validatePassword(body?.password);

    if (!emailValidation.valid || !passwordValidation.valid) {
      send(request, response, 400, {
        error: emailValidation.error || passwordValidation.error,
        code: 'invalid-credentials'
      });
      return;
    }

    try {
      const user = await createUser({
        email: emailValidation.email,
        password: body.password
      });
      const session = await createSession(user.id);
      send(request, response, 201, {
        user: publicUser(user),
        token: session.token,
        ownerId: session.ownerId
      });
    } catch (error) {
      if (error.code === '23505') {
        send(request, response, 409, {
          error: 'Este e-mail já está cadastrado.',
          code: 'email-in-use'
        });
        return;
      }
      throw error;
    }
    return;
  }

  if (request.method === 'POST' && path === '/api/auth/login') {
    const body = await readJson(request);
    const user = await findUserByEmail(body?.email);
    const passwordOk = user ? await verifyPassword(body?.password, user.password_hash) : false;

    if (!user || user.status !== 'active' || !passwordOk) {
      send(request, response, 401, {
        error: 'E-mail ou senha inválidos.',
        code: 'invalid-login'
      });
      return;
    }

    await recordLogin(user.id);
    const session = await createSession(user.id);
    send(request, response, 200, {
      user: publicUser(user),
      token: session.token,
      ownerId: session.ownerId
    });
    return;
  }

  if (request.method === 'POST' && path === '/api/auth/recover') {
    send(request, response, 501, {
      error: 'Recuperação de senha não está disponível no modo local.',
      code: 'recovery-unavailable'
    });
    return;
  }

  if (request.method === 'GET' && path === '/api/leaderboard') {
    const { rows } = await pool.query(
      `select player_id, name, avatar_id, total_score, completed_phases, score_achieved_at, rank
       from public.leaderboard
       order by rank asc`
    );
    send(request, response, 200, rows);
    return;
  }

  const session = await authenticate(request);

  if (!session) {
    send(request, response, 401, { error: 'Sessão inválida.', code: 'unauthorized' });
    return;
  }

  if (request.method === 'GET' && path === '/api/auth/me') {
    if (!session.userId) {
      send(request, response, 401, { error: 'Usuário não autenticado.', code: 'unauthorized' });
      return;
    }

    const user = await findUserById(session.userId);
    if (!user) {
      send(request, response, 401, { error: 'Usuário não encontrado.', code: 'unauthorized' });
      return;
    }

    send(request, response, 200, { user: publicUser(user) });
    return;
  }

  if (request.method === 'POST' && path === '/api/auth/logout') {
    await deleteSession(session.token);
    send(request, response, 200, { ok: true });
    return;
  }

  if (request.method === 'GET' && path === '/api/admin/me') {
    if (!session.userId) {
      send(request, response, 401, { error: 'Usuário não autenticado.', code: 'unauthorized' });
      return;
    }

    const access = await getUserAccess(session.userId);
    if (access.permissions.length === 0) {
      send(request, response, 403, { error: 'Acesso administrativo não autorizado.', code: 'forbidden' });
      return;
    }

    send(request, response, 200, access);
    return;
  }

  if (request.method === 'GET' && path === '/api/admin/dashboard') {
    if (!(await requirePermission(request, response, session, 'admin.dashboard'))) {
      return;
    }
    send(request, response, 200, await getAdminDashboard());
    return;
  }

  if (request.method === 'GET' && path === '/api/admin/users') {
    if (!(await requirePermission(request, response, session, 'admin.users.read'))) {
      return;
    }
    send(request, response, 200, await listUsers({
      search: url.searchParams.get('search') ?? '',
      status: url.searchParams.get('status') ?? '',
      role: url.searchParams.get('role') ?? '',
      page: url.searchParams.get('page') ?? 1,
      limit: url.searchParams.get('limit') ?? 20
    }));
    return;
  }

  if (request.method === 'GET' && parts[1] === 'admin' && parts[2] === 'users' && parts[3] && parts.length === 4) {
    if (!(await requirePermission(request, response, session, 'admin.users.read'))) {
      return;
    }
    const detail = await getUserDetail(parts[3]);
    if (!detail) {
      send(request, response, 404, { error: 'Usuário não encontrado.', code: 'not-found' });
      return;
    }
    send(request, response, 200, detail);
    return;
  }

  if (request.method === 'POST' && parts[1] === 'admin' && parts[2] === 'users' && parts[3] && parts[4] === 'email') {
    if (!(await requirePermission(request, response, session, 'admin.users.write'))) {
      return;
    }
    const body = await readJson(request);
    const emailValidation = validateEmail(body?.email);
    if (!emailValidation.valid) {
      send(request, response, 400, { error: emailValidation.error, code: 'invalid-email' });
      return;
    }
    try {
      const before = await pool.query('select id, email from public.users where id = ', [parts[3]]);
      if (!before.rows[0]) {
        send(request, response, 404, { error: 'Usuário não encontrado.', code: 'not-found' });
        return;
      }
      const updated = await pool.query(
        'update public.users set email = , email_normalized = , updated_at = now() where id =  returning id, email',
        [normalizeEmail(body.email), normalizeEmail(body.email), parts[3]]
      );
      await writeAudit({
        actorUserId: session.userId,
        action: 'user.email.update',
        entityType: 'user',
        entityId: parts[3],
        beforeData: before.rows[0],
        afterData: updated.rows[0],
        reason: normalizeBio(body?.reason)
      });
      send(request, response, 200, { user: updated.rows[0] });
    } catch (error) {
      if (error.code === '23505') {
        send(request, response, 409, { error: 'Este e-mail já está cadastrado.', code: 'email-in-use' });
        return;
      }
      throw error;
    }
    return;
  }

  if (
    request.method === 'POST' &&
    parts[1] === 'admin' &&
    parts[2] === 'users' &&
    parts[3] &&
    ['block', 'unblock'].includes(parts[4])
  ) {
    if (!(await requirePermission(request, response, session, 'admin.users.block'))) {
      return;
    }
    const body = await readJson(request);
    const result = await updateUserStatus({
      actorUserId: session.userId,
      userId: parts[3],
      status: parts[4] === 'block' ? 'disabled' : 'active',
      reason: normalizeBio(body?.reason)
    });
    if (!result.updated) {
      const status = result.error === 'last-admin' ? 409 : 404;
      send(request, response, status, {
        error: result.error === 'last-admin'
          ? 'O último administrador ativo não pode ser bloqueado.'
          : 'Usuário não encontrado.',
        code: result.error
      });
      return;
    }
    send(request, response, 200, { user: result.user });
    return;
  }

  if (request.method === 'POST' && parts[1] === 'admin' && parts[2] === 'users' && parts[3] && parts[4] === 'password-reset') {
    if (!(await requirePermission(request, response, session, 'admin.users.password'))) {
      return;
    }
    await writeAudit({
      actorUserId: session.userId,
      action: 'user.password.reset-requested',
      entityType: 'user',
      entityId: parts[3],
      reason: normalizeBio((await readJson(request))?.reason),
      result: 'failure'
    });
    send(request, response, 501, {
      error: 'A recuperação de senha local exige serviço de e-mail. Use o Supabase Auth no cloud.',
      code: 'recovery-unavailable'
    });
    return;
  }

  if (request.method === 'POST' && parts[1] === 'admin' && parts[2] === 'users' && parts[3] && parts[4] === 'roles') {
    if (!(await requirePermission(request, response, session, 'admin.users.roles'))) {
      return;
    }
    const body = await readJson(request);
    const result = await replaceUserRoles({
      actorUserId: session.userId,
      userId: parts[3],
      roleIds: body?.roleIds
    });
    if (!result.updated) {
      send(request, response, result.error === 'last-admin' ? 409 : 404, {
        error: result.error === 'last-admin'
          ? 'O último administrador ativo não pode perder o papel.'
          : 'Usuário não encontrado.',
        code: result.error
      });
      return;
    }
    send(request, response, 200, { roles: result.roles });
    return;
  }

  if (request.method === 'GET' && path === '/api/admin/audit') {
    if (!(await requirePermission(request, response, session, 'admin.audit.read'))) {
      return;
    }
    send(request, response, 200, await listAudit({
      page: url.searchParams.get('page') ?? 1,
      limit: url.searchParams.get('limit') ?? 30,
      action: url.searchParams.get('action') ?? '',
      entityType: url.searchParams.get('entityType') ?? '',
      actor: url.searchParams.get('actor') ?? ''
    }));
    return;
  }

  if (request.method === 'GET' && path === '/api/admin/settings') {
    if (!(await requirePermission(request, response, session, 'admin.settings.read'))) {
      return;
    }
    send(request, response, 200, await getAdminSettings());
    return;
  }

  if (request.method === 'PUT' && path === '/api/admin/settings') {
    if (!(await requirePermission(request, response, session, 'admin.settings.write'))) {
      return;
    }
    const body = await readJson(request);
    send(request, response, 200, await updateAdminSettings({
      actorUserId: session.userId,
      settings: body?.settings ?? {},
      flags: body?.flags ?? {}
    }));
    return;
  }

  if (request.method === 'GET' && path === '/api/players/me') {
    if (!session.userId) {
      send(request, response, 401, { error: 'Usuário não autenticado.', code: 'unauthorized' });
      return;
    }

    const player = await findUserPlayer(session.userId);
    if (!player) {
      send(request, response, 404, { error: 'Jogador ainda não criado.', code: 'player-missing' });
      return;
    }

    send(request, response, 200, { player: publicPlayer(player) });
    return;
  }

  if (request.method === 'POST' && path === '/api/players/me') {
    if (!session.userId) {
      send(request, response, 401, { error: 'Usuário não autenticado.', code: 'unauthorized' });
      return;
    }

    const existing = await findUserPlayer(session.userId);
    if (existing) {
      send(request, response, 200, { player: publicPlayer(existing), created: false });
      return;
    }

    const body = await readJson(request);
    const nameValidation = validatePlayerName(body?.name);
    const playerId = UUID.test(String(body?.playerId || ''))
      ? body.playerId
      : crypto.randomUUID();

    if (!nameValidation.valid || !isValidAvatar(body?.avatarId)) {
      send(request, response, 400, {
        error: nameValidation.errors[0] || 'Avatar inválido.',
        code: 'invalid-player'
      });
      return;
    }

    const collision = await pool.query('select owner_id, user_id from public.players where id = $1', [
      playerId
    ]);
    if (collision.rows[0] && collision.rows[0].user_id !== session.userId) {
      send(request, response, 403, {
        error: 'Este identificador de jogador pertence a outra conta.',
        code: 'forbidden'
      });
      return;
    }

    try {
      const { rows } = await pool.query(
        `insert into public.players
          (id, owner_id, user_id, name, name_normalized, avatar_id, bio)
         values ($1, $2, $3, $4, $5, $6, $7)
         returning *`,
        [
          playerId,
          session.userId,
          session.userId,
          nameValidation.name,
          nameValidation.nameKey,
          body.avatarId,
          normalizeBio(body.bio)
        ]
      );
      send(request, response, 201, { player: publicPlayer(rows[0]), created: true });
    } catch (error) {
      if (error.code === '23505') {
        const player = await findUserPlayer(session.userId);
        if (player) {
          send(request, response, 200, { player: publicPlayer(player), created: false });
          return;
        }
        send(request, response, 409, {
          error: 'Este nome já está em uso.',
          code: 'duplicate-name'
        });
        return;
      }
      throw error;
    }
    return;
  }

  if (request.method === 'PATCH' && path === '/api/players/me') {
    if (!session.userId) {
      send(request, response, 401, { error: 'Usuário não autenticado.', code: 'unauthorized' });
      return;
    }

    const player = await findUserPlayer(session.userId);
    if (!player) {
      send(request, response, 404, { error: 'Jogador ainda não criado.', code: 'player-missing' });
      return;
    }

    const body = await readJson(request);
    const nameValidation = validatePlayerName(body?.name, { currentName: player.name });

    if (!nameValidation.valid || !isValidAvatar(body?.avatarId)) {
      send(request, response, 400, {
        error: nameValidation.errors[0] || 'Avatar inválido.',
        code: 'invalid-player'
      });
      return;
    }

    try {
      const { rows } = await pool.query(
        `update public.players
         set name = $1, name_normalized = $2, avatar_id = $3, bio = $4, updated_at = now()
         where id = $5
         returning *`,
        [
          nameValidation.name,
          nameValidation.nameKey,
          body.avatarId,
          normalizeBio(body.bio),
          player.id
        ]
      );
      send(request, response, 200, { player: publicPlayer(rows[0]) });
    } catch (error) {
      if (error.code === '23505') {
        send(request, response, 409, {
          error: 'Este nome já está em uso.',
          code: 'duplicate-name'
        });
        return;
      }
      throw error;
    }
    return;
  }

  if (request.method === 'PUT' && path === '/api/content') {
    const body = await readJson(request);

    if (!body?.world || !body?.questCatalog) {
      send(request, response, 400, { error: 'Conteúdo inválido.', code: 'invalid-content' });
      return;
    }

    try {
      const content = await saveContent(body);
      send(request, response, 200, content);
    } catch (error) {
      console.error(error);
      send(request, response, 409, {
        error: 'Não foi possível salvar o conteúdo. Verifique referências e conteúdo em uso.',
        code: 'content-conflict'
      });
    }
    return;
  }

  if (request.method === 'POST' && path === '/api/profiles') {
    const body = await readJson(request);
    const playerId = body?.playerId;
    const name = body?.name;
    const avatarId = body?.avatarId;
    const bio = normalizeBio(body?.bio);

    if (!UUID.test(String(playerId || ''))) {
      send(request, response, 400, { error: 'Identificador de jogador inválido.', code: 'invalid-player' });
      return;
    }

    const validation = validatePlayerName(name);
    if (!validation.valid || !isValidAvatar(avatarId)) {
      send(request, response, 400, {
        error: validation.errors[0] || 'Avatar inválido.',
        code: 'invalid-profile'
      });
      return;
    }

    const existing = await findOwnedPlayer(playerId, session.ownerId);
    const other = await pool.query('select id, owner_id from public.players where id = $1', [playerId]);

    if (other.rows[0] && other.rows[0].owner_id !== session.ownerId) {
      send(request, response, 403, { error: 'Perfil pertence a outro usuário.', code: 'forbidden' });
      return;
    }

    try {
      const result = existing
        ? await pool.query(
            `update public.players
             set name = $1, name_normalized = $2, avatar_id = $3,
                 updated_at = now(), last_activity_at = now()
             where id = $4
             returning id, name, avatar_id, created_at, updated_at, last_activity_at`,
            [validation.name, validation.nameKey, avatarId, playerId]
          )
        : await pool.query(
            `insert into public.players
             (id, owner_id, user_id, name, name_normalized, avatar_id)
             values ($1, $2, $3, $4, $5, $6)
             returning id, name, avatar_id, created_at, updated_at, last_activity_at`,
            [playerId, session.ownerId, session.userId, validation.name, validation.nameKey, avatarId]
          );

      send(request, response, 200, { profile: result.rows[0] });
    } catch (error) {
      if (error.code === '23505') {
        send(request, response, 409, { error: 'Este nome já está em uso.', code: 'duplicate-name' });
        return;
      }
      throw error;
    }
    return;
  }

  if (request.method === 'PATCH' && parts[0] === 'api' && parts[1] === 'profiles' && parts[2]) {
    const playerId = parts[2];
    const player = await findOwnedPlayer(playerId, session.ownerId);

    if (!player) {
      send(request, response, 404, { error: 'Perfil não encontrado.', code: 'not-found' });
      return;
    }

    const body = await readJson(request);
    const validation = validatePlayerName(body?.name, { currentName: player.name });
    if (!validation.valid || !isValidAvatar(body?.avatarId)) {
      send(request, response, 400, {
        error: validation.errors[0] || 'Avatar inválido.',
        code: 'invalid-profile'
      });
      return;
    }

    try {
      const result = await pool.query(
        `update public.players
         set name = $1, name_normalized = $2, avatar_id = $3, updated_at = now()
         where id = $4
         returning id, name, avatar_id, created_at, updated_at, last_activity_at`,
        [validation.name, validation.nameKey, body.avatarId, playerId]
      );
      send(request, response, 200, { profile: result.rows[0] });
    } catch (error) {
      if (error.code === '23505') {
        send(request, response, 409, { error: 'Este nome já está em uso.', code: 'duplicate-name' });
        return;
      }
      throw error;
    }
    return;
  }

  if (request.method === 'POST' && path === '/api/attempts') {
    const body = await readJson(request);
    const playerId = body?.playerId;
    const phaseId = body?.phaseId;

    if (!UUID.test(String(playerId || '')) || !PHASE_DATA[phaseId]) {
      send(request, response, 400, { error: 'Jogador ou fase inválida.', code: 'invalid-attempt' });
      return;
    }

    const player = await findOwnedPlayer(playerId, session.ownerId);
    if (!player) {
      send(request, response, 404, { error: 'Perfil não encontrado.', code: 'not-found' });
      return;
    }

    const result = await pool.query(
      `insert into public.phase_attempts (player_id, phase_id)
       values ($1, $2)
       returning id, phase_id, started_at`,
      [playerId, phaseId]
    );
    send(request, response, 201, { attempt: result.rows[0] });
    return;
  }

  if (
    request.method === 'POST' &&
    parts[0] === 'api' &&
    parts[1] === 'attempts' &&
    parts[3] === 'hints' &&
    parts[2]
  ) {
    const attempt = await findOwnedAttempt(parts[2], session.ownerId);
    if (!attempt) {
      send(request, response, 404, { error: 'Tentativa não encontrada.', code: 'not-found' });
      return;
    }

    await pool.query(
      'update public.phase_attempts set hint_count = hint_count + 1 where id = $1',
      [parts[2]]
    );
    send(request, response, 200, { ok: true });
    return;
  }

  if (
    request.method === 'POST' &&
    parts[0] === 'api' &&
    parts[1] === 'attempts' &&
    parts[3] === 'validations' &&
    parts[2]
  ) {
    const attempt = await findOwnedAttempt(parts[2], session.ownerId);
    if (!attempt) {
      send(request, response, 404, { error: 'Tentativa não encontrada.', code: 'not-found' });
      return;
    }

    await pool.query(
      'update public.phase_attempts set validation_count = validation_count + 1 where id = $1',
      [parts[2]]
    );
    send(request, response, 200, { ok: true });
    return;
  }

  if (request.method === 'POST' && path === '/api/results') {
    const body = await readJson(request);
    const playerId = body?.playerId;
    const phaseId = body?.phaseId;
    const matchId = body?.matchId;
    const snapshot = body?.snapshot;
    const attemptId = body?.attemptId || null;

    if (
      !UUID.test(String(playerId || '')) ||
      !UUID.test(String(matchId || '')) ||
      !snapshot ||
      typeof snapshot !== 'object'
    ) {
      send(request, response, 400, { error: 'Resultado inválido.', code: 'invalid-result' });
      return;
    }

    const player = await findOwnedPlayer(playerId, session.ownerId);
    if (!player) {
      send(request, response, 404, { error: 'Perfil não encontrado.', code: 'not-found' });
      return;
    }

    const attempt = attemptId ? await findOwnedAttempt(attemptId, session.ownerId) : null;
    if (attempt && (attempt.player_id !== playerId || attempt.phase_id !== phaseId)) {
      send(request, response, 400, { error: 'Tentativa não pertence ao resultado.', code: 'invalid-attempt' });
      return;
    }

    const source = attempt ? 'online' : 'offline';
    const result = scoreSolution({ phaseId, snapshot, attempt, source });

    if (!result.valid) {
      send(request, response, 422, {
        error: 'Solução inválida.',
        code: 'invalid-solution',
        errors: result.errors
      });
      return;
    }

    const recorded = await pool.query(
      `select best_score, accepted
       from public.record_phase_result($1, $2, $3, $4, $5, $6, $7)`,
      [playerId, phaseId, matchId, result.score, snapshot, source, attempt?.id ?? null]
    );
    const row = recorded.rows[0] || {};

    send(request, response, 200, {
      accepted: true,
      score: result.score,
      bestScore: row.best_score ?? result.score,
      source
    });
    return;
  }

  if (request.method === 'POST' && path === '/api/quests/normaliza/complete') {
    const body = await readJson(request);
    const playerId = body?.playerId;
    const characterId = body?.characterId;

    if (!UUID.test(String(playerId || '')) || !UUID.test(String(characterId || ''))) {
      send(request, response, 400, { error: 'Jogador ou personagem inválido.', code: 'invalid-character' });
      return;
    }

    const player = await findOwnedPlayer(playerId, session.ownerId);
    if (!player) {
      send(request, response, 404, { error: 'Perfil não encontrado.', code: 'not-found' });
      return;
    }

    const phases = await pool.query(
      `select phase_id, best_score
       from public.phase_results
       where player_id = $1 and phase_id = any($2::text[])`,
      [playerId, NORMALIZA_PHASES]
    );

    if (phases.rows.length < NORMALIZA_PHASES.length) {
      send(request, response, 409, {
        error: 'A quest ainda não foi concluída no servidor.',
        code: 'quest-incomplete'
      });
      return;
    }

    const score = phases.rows.reduce((total, row) => total + Number(row.best_score || 0), 0);
    const xp = xpForQuest({ xpReward: 150, maxScore: 400 }, score);
    const level = levelFromXp(xp).level;
    const recorded = await pool.query(
      `select xp_awarded, level, accepted
       from public.record_quest_completion($1, $2, $3, $4, $5, $6)`,
      [playerId, characterId, 'normaliza', score, xp, level]
    );
    const row = recorded.rows[0] || {};

    send(request, response, 200, {
      accepted: true,
      completed: true,
      questId: 'normaliza',
      characterId,
      score,
      xp: row.xp_awarded ?? xp,
      level: row.level ?? level
    });
    return;
  }

  send(request, response, 404, { error: 'Rota não encontrada.', code: 'not-found' });
}

const server = http.createServer((request, response) => {
  handle(request, response).catch((error) => {
    console.error(error);
    send(request, response, 500, { error: 'Erro interno.', code: 'internal-error' });
  });
});

async function start() {
  await migrate();
  const seed = await seedContent();
  console.log(`Conteúdo inicial: ${seed.seeded ? 'populado' : 'já existente'}`);
  const admin = await bootstrapAdmin();
  if (admin.user) {
    console.log(`Administrador inicial: ${admin.user.email}${admin.created ? ' (criado)' : ' (papel garantido)'}`);
  }
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`normaliza-api ouvindo na porta ${PORT}`);
  });
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    server.close();
    await closePool();
    process.exit(0);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
