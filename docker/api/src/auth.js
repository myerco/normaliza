import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { pool } from './db.js';

const scrypt = promisify(crypto.scrypt);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 8;

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

export function validateEmail(email) {
  const normalized = normalizeEmail(email);
  return {
    valid: normalized.length <= 254 && EMAIL_PATTERN.test(normalized),
    email: normalized,
    error: 'Informe um e-mail válido.'
  };
}

export function validatePassword(password) {
  const value = String(password ?? '');
  return {
    valid: value.length >= PASSWORD_MIN && value.length <= 256,
    error: `A senha precisa ter pelo menos ${PASSWORD_MIN} caracteres.`
  };
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = await scrypt(String(password), salt, 64);
  return `${salt.toString('hex')}$${Buffer.from(derived).toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  const [saltHex, hashHex] = String(stored ?? '').split('$');

  if (!saltHex || !hashHex) {
    return false;
  }

  const derived = await scrypt(String(password), Buffer.from(saltHex, 'hex'), 64);
  const expected = Buffer.from(hashHex, 'hex');
  const actual = Buffer.from(derived);

  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export async function createUser({ email, password, authProvider = 'local' }) {
  const normalized = normalizeEmail(email);
  const passwordHash = await hashPassword(password);
  const { rows } = await pool.query(
    `insert into public.users
      (email, email_normalized, password_hash, auth_provider, status)
     values ($1, $2, $3, $4, 'active')
     returning id, email, auth_provider, status, created_at, updated_at`,
    [normalized, normalized, passwordHash, authProvider]
  );
  return rows[0];
}

export async function findUserByEmail(email) {
  const { rows } = await pool.query(
    'select * from public.users where email_normalized = $1',
    [normalizeEmail(email)]
  );
  return rows[0] || null;
}

export async function findUserById(userId) {
  const { rows } = await pool.query(
    'select id, email, auth_provider, status, created_at, updated_at, last_login_at from public.users where id = $1',
    [userId]
  );
  return rows[0] || null;
}

export async function recordLogin(userId) {
  await pool.query(
    'update public.users set last_login_at = now(), updated_at = now() where id = $1',
    [userId]
  );
}

export async function createSession(userId = null) {
  const token = crypto.randomBytes(32).toString('base64url');
  const ownerId = userId || crypto.randomUUID();
  await pool.query(
    'insert into public.local_sessions (token_hash, owner_id, user_id) values ($1, $2, $3)',
    [hashToken(token), ownerId, userId]
  );

  return { token, ownerId, userId };
}

export async function authenticate(request) {
  const header = request.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) {
    return null;
  }

  const { rows } = await pool.query(
    'select owner_id, user_id from public.local_sessions where token_hash = $1',
    [hashToken(token)]
  );

  if (rows.length === 0) {
    return null;
  }

  await pool.query(
    'update public.local_sessions set last_seen_at = now() where token_hash = $1',
    [hashToken(token)]
  );

  return {
    ownerId: rows[0].owner_id,
    userId: rows[0].user_id,
    token
  };
}

export async function deleteSession(token) {
  if (!token) {
    return false;
  }

  const { rowCount } = await pool.query(
    'delete from public.local_sessions where token_hash = $1',
    [hashToken(token)]
  );
  return rowCount > 0;
}
