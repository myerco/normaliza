import { pool } from './db.js';
import { createUser, findUserByEmail } from './auth.js';

export async function getUserAccess(userId) {
  if (!userId) {
    return { roles: [], permissions: [] };
  }

  const roles = await pool.query(
    `select r.id, r.name, r.rank
     from public.user_roles ur
     join public.roles r on r.id = ur.role_id
     join public.users u on u.id = ur.user_id
     where ur.user_id = $1 and r.active and u.status = 'active'
     order by r.rank desc`,
    [userId]
  );
  const permissions = await pool.query(
    `select distinct rp.permission_id
     from public.user_roles ur
     join public.role_permissions rp on rp.role_id = ur.role_id
     join public.roles r on r.id = ur.role_id
     join public.users u on u.id = ur.user_id
     where ur.user_id = $1 and r.active and u.status = 'active'`,
    [userId]
  );

  return {
    roles: roles.rows,
    permissions: permissions.rows.map((row) => row.permission_id)
  };
}

export function hasPermission(access, permission) {
  return Boolean(access?.permissions?.includes(permission));
}

export async function writeAudit({
  actorUserId,
  action,
  entityType,
  entityId = null,
  beforeData = null,
  afterData = null,
  reason = '',
  result = 'success'
}) {
  await pool.query(
    `insert into public.admin_audit_logs
      (actor_user_id, action, entity_type, entity_id, before_data, after_data, reason, result)
     values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      actorUserId,
      action,
      entityType,
      entityId,
      beforeData ? JSON.stringify(beforeData) : null,
      afterData ? JSON.stringify(afterData) : null,
      reason,
      result
    ]
  );
}

export async function bootstrapAdmin() {
  const email = String(process.env.ADMIN_EMAIL || '').trim();
  const password = String(process.env.ADMIN_PASSWORD || '');

  if (!email || !password) {
    return { created: false, user: null };
  }

  let user = await findUserByEmail(email);
  let created = false;

  if (!user) {
    user = await createUser({ email, password });
    created = true;
  }

  await pool.query(
    `insert into public.user_roles (user_id, role_id)
     values ($1, 'administrator')
     on conflict do nothing`,
    [user.id]
  );

  return { created, user: { id: user.id, email: user.email } };
}

export async function countActiveAdministrators() {
  const { rows } = await pool.query(
    `select count(distinct u.id)::int as count
     from public.users u
     join public.user_roles ur on ur.user_id = u.id
     where ur.role_id = 'administrator' and u.status = 'active'`
  );
  return rows[0]?.count ?? 0;
}

export async function listUsers({ search = '', status = '', role = '', page = 1, limit = 20 }) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const offset = (safePage - 1) * safeLimit;
  const params = [
    String(search).trim(),
    String(status).trim(),
    String(role).trim(),
    safeLimit,
    offset
  ];
  const where = `where ($1 = '' or u.email_normalized ilike '%' || lower($1) || '%' or p.name ilike '%' || $1 || '%')
    and ($2 = '' or u.status = $2)
    and ($3 = '' or exists (
      select 1 from public.user_roles ur where ur.user_id = u.id and ur.role_id = $3
    ))`;
  const [rows, total] = await Promise.all([
    pool.query(
      `select u.id, u.email, u.auth_provider, u.status, u.created_at, u.last_login_at,
              p.id as player_id, p.name as player_name, p.avatar_id, p.bio
       from public.users u
       left join public.players p on p.user_id = u.id
       ${where}
       order by u.created_at desc
       limit $4 offset $5`,
      params
    ),
    pool.query(
      `select count(*)::int as count
       from public.users u
       left join public.players p on p.user_id = u.id
       ${where}`,
      params.slice(0, 3)
    )
  ]);

  return {
    users: rows.rows.map(mapUserRow),
    total: total.rows[0]?.count ?? 0,
    page: safePage,
    limit: safeLimit
  };
}

export async function getUserDetail(userId) {
  const userResult = await pool.query(
    `select u.id, u.email, u.auth_provider, u.status, u.created_at, u.updated_at, u.last_login_at,
            p.id as player_id, p.name as player_name, p.avatar_id, p.bio, p.created_at as player_created_at,
            c.xp_total
     from public.users u
     left join public.players p on p.user_id = u.id
     left join public.characters c on c.player_id = p.id and c.is_primary = true and c.active = true
     where u.id = $1`,
    [userId]
  );
  const user = userResult.rows[0];

  if (!user) {
    return null;
  }

  const access = await pool.query(
    `select ur.role_id, r.name, r.rank, ur.created_at
     from public.user_roles ur
     join public.roles r on r.id = ur.role_id
     where ur.user_id = $1
     order by r.rank desc`,
    [userId]
  );

  return {
    ...mapUserRow(user),
    updatedAt: user.updated_at,
    player: user.player_id
      ? {
          id: user.player_id,
          name: user.player_name,
          avatarId: user.avatar_id,
          bio: user.bio ?? '',
          xpTotal: user.xp_total ?? 0,
          createdAt: user.player_created_at
        }
      : null,
    roles: access.rows,
    permissions: (await getUserAccess(userId)).permissions
  };
}

export async function updateUserStatus({ actorUserId, userId, status, reason }) {
  const before = await pool.query('select id, email, status from public.users where id = $1', [userId]);

  if (!before.rows[0]) {
    return { updated: false, error: 'not-found' };
  }

  if (status !== 'active') {
    const adminCount = await pool.query(
      `select count(distinct u.id)::int as count
       from public.users u
       join public.user_roles ur on ur.user_id = u.id
       where ur.role_id = 'administrator' and u.status = 'active'`
    );

    if (
      adminCount.rows[0]?.count <= 1 &&
      (await pool.query(
        `select 1 from public.user_roles where user_id = $1 and role_id = 'administrator'`,
        [userId]
      )).rows.length > 0
    ) {
      return { updated: false, error: 'last-admin' };
    }
  }

  const { rows } = await pool.query(
    'update public.users set status = $1, updated_at = now() where id = $2 returning id, email, status',
    [status, userId]
  );
  await writeAudit({
    actorUserId,
    action: status === 'active' ? 'user.unblock' : 'user.block',
    entityType: 'user',
    entityId: userId,
    beforeData: before.rows[0],
    afterData: rows[0],
    reason
  });
  return { updated: true, user: rows[0] };
}

export async function replaceUserRoles({ actorUserId, userId, roleIds }) {
  const unique = [...new Set((Array.isArray(roleIds) ? roleIds : []).filter(Boolean))];
  const before = await pool.query(
    'select role_id from public.user_roles where user_id = $1 order by role_id',
    [userId]
  );

  if (
    !unique.includes('administrator') &&
    (await pool.query(
      `select 1 from public.user_roles where user_id = $1 and role_id = 'administrator'`,
      [userId]
    )).rows.length > 0
  ) {
    const count = await countActiveAdministrators();
    if (count <= 1) {
      return { updated: false, error: 'last-admin' };
    }
  }

  const client = await pool.connect();

  try {
    await client.query('begin');
    await client.query('delete from public.user_roles where user_id = $1', [userId]);
    for (const roleId of unique) {
      await client.query(
        'insert into public.user_roles (user_id, role_id, granted_by) values ($1, $2, $3)',
        [userId, roleId, actorUserId]
      );
    }
    await client.query('commit');

    const after = await pool.query(
      'select role_id from public.user_roles where user_id = $1 order by role_id',
      [userId]
    );
    await writeAudit({
      actorUserId,
      action: 'user.roles.update',
      entityType: 'user',
      entityId: userId,
      beforeData: before.rows.map((row) => row.role_id),
      afterData: after.rows.map((row) => row.role_id)
    });
    return { updated: true, roles: after.rows.map((row) => row.role_id) };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export async function getAdminDashboard() {
  const [counts, recentUsers, recentAudit] = await Promise.all([
    pool.query(`
      select
        (select count(*)::int from public.users) as users,
        (select count(*)::int from public.players) as players,
        (select count(*)::int from public.users where status = 'active') as active_users,
        (select count(*)::int from public.users where status <> 'active') as blocked_users,
        (select count(*)::int from public.knowledge_territories where status = 'published') as territories,
        (select count(*)::int from public.knowledge_tracks where status = 'published') as tracks,
        (select count(*)::int from public.quests where status = 'published') as quests,
        (select count(*)::int from public.knowledge_skills where status = 'published') as skills,
        (select count(*)::int from public.knowledge_professions where status = 'published') as professions
    `),
    pool.query(
      `select id, email, status, created_at from public.users order by created_at desc limit 5`
    ),
    pool.query(
      `select id, actor_user_id, action, entity_type, entity_id, reason, result, created_at
       from public.admin_audit_logs order by created_at desc limit 8`
    )
  ]);

  return {
    counts: counts.rows[0],
    recentUsers: recentUsers.rows,
    recentAudit: recentAudit.rows,
    maps: counts.rows[0].territories
  };
}

export async function listAudit({ page = 1, limit = 30, action = '', entityType = '', actor = '' }) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 30));
  const offset = (safePage - 1) * safeLimit;
  const params = [String(action).trim(), String(entityType).trim(), String(actor).trim(), safeLimit, offset];
  const where = `where ($1 = '' or action = $1)
    and ($2 = '' or entity_type = $2)
    and ($3 = '' or actor_user_id::text = $3)`;
  const [rows, total] = await Promise.all([
    pool.query(
      `select id, actor_user_id, action, entity_type, entity_id, before_data, after_data,
              reason, result, created_at
       from public.admin_audit_logs
       ${where}
       order by created_at desc
       limit $4 offset $5`,
      params
    ),
    pool.query(
      `select count(*)::int as count from public.admin_audit_logs ${where}`,
      params.slice(0, 3)
    )
  ]);
  return { logs: rows.rows, total: total.rows[0]?.count ?? 0, page: safePage, limit: safeLimit };
}

export async function getAdminSettings() {
  const [settings, flags] = await Promise.all([
    pool.query('select key, category, value, description, updated_at from public.system_settings order by category, key'),
    pool.query('select key, description, enabled, updated_at from public.feature_flags order by key')
  ]);
  return { settings: settings.rows, flags: flags.rows };
}

export async function updateAdminSettings({ actorUserId, settings = {}, flags = {} }) {
  const beforeSettings = await pool.query('select key, value from public.system_settings');
  const beforeFlags = await pool.query('select key, enabled from public.feature_flags');
  const client = await pool.connect();

  try {
    await client.query('begin');
    for (const [key, value] of Object.entries(settings)) {
      await client.query(
        `update public.system_settings set value = $2::jsonb, updated_by = $3, updated_at = now() where key = $1`,
        [key, JSON.stringify(value), actorUserId]
      );
    }
    for (const [key, enabled] of Object.entries(flags)) {
      await client.query(
        `update public.feature_flags set enabled = $2, updated_by = $3, updated_at = now() where key = $1`,
        [key, Boolean(enabled), actorUserId]
      );
    }
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }

  await writeAudit({
    actorUserId,
    action: 'settings.update',
    entityType: 'system',
    beforeData: { settings: beforeSettings.rows, flags: beforeFlags.rows },
    afterData: { settings, flags }
  });
  return getAdminSettings();
}

function mapUserRow(row) {
  return {
    id: row.id,
    email: row.email,
    authProvider: row.auth_provider,
    status: row.status,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
    playerId: row.player_id,
    playerName: row.player_name,
    avatarId: row.avatar_id,
    bio: row.bio ?? ''
  };
}
