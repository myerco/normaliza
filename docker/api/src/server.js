import http from 'node:http';
import { URL } from 'node:url';
import { closePool, migrate, pool } from './db.js';
import { authenticate, createSession } from './auth.js';
import { PHASE_DATA } from '../shared/phase-data.js';
import { isValidAvatar, validatePlayerName } from '../shared/players.js';
import { scoreSolution } from '../shared/score.js';
import { levelFromXp, xpForQuest } from '../shared/progression.js';

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
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
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

  if (request.method === 'POST' && path === '/api/session') {
    const session = await createSession();
    send(request, response, 201, session);
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

  if (request.method === 'POST' && path === '/api/profiles') {
    const body = await readJson(request);
    const playerId = body?.playerId;
    const name = body?.name;
    const avatarId = body?.avatarId;

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
             (id, owner_id, name, name_normalized, avatar_id)
             values ($1, $2, $3, $4, $5)
             returning id, name, avatar_id, created_at, updated_at, last_activity_at`,
            [playerId, session.ownerId, validation.name, validation.nameKey, avatarId]
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
