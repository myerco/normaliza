import crypto from 'node:crypto';
import { pool } from './db.js';

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createSession() {
  const token = crypto.randomBytes(32).toString('base64url');
  const ownerId = crypto.randomUUID();
  await pool.query(
    'insert into public.local_sessions (token_hash, owner_id) values ($1, $2)',
    [hashToken(token), ownerId]
  );

  return { token, ownerId };
}

export async function authenticate(request) {
  const header = request.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) {
    return null;
  }

  const { rows } = await pool.query(
    'select owner_id from public.local_sessions where token_hash = $1',
    [hashToken(token)]
  );

  if (rows.length === 0) {
    return null;
  }

  await pool.query(
    'update public.local_sessions set last_seen_at = now() where token_hash = $1',
    [hashToken(token)]
  );

  return { ownerId: rows[0].owner_id, token };
}
