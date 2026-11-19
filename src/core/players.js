export const PLAYER_NAME_MIN = 3;
export const PLAYER_NAME_MAX = 20;
export const PLAYER_NAME_PATTERN = /^[\p{L}\p{N} _-]+$/u;
export const PLAYER_BIO_MAX = 280;

export const AVATARS = Object.freeze([
  {
    id: 'construtor',
    label: 'Construtor',
    description: 'Gosta de erguer estruturas sólidas.',
    color: '#e9c46a'
  },
  {
    id: 'arquiteto',
    label: 'Arquiteto',
    description: 'Planeja a cidade antes de construir.',
    color: '#e76f51'
  },
  {
    id: 'engenheiro',
    label: 'Engenheiro',
    description: 'Conecta tabelas com chaves precisas.',
    color: '#2a9d8f'
  },
  {
    id: 'analista',
    label: 'Analista',
    description: 'Investiga dependências e anomalias.',
    color: '#457b9d'
  },
  {
    id: 'cientista',
    label: 'Cientista de Dados',
    description: 'Testa hipóteses e preserva informação.',
    color: '#9b5de5'
  }
]);

const AVATARS_BY_ID = new Map(AVATARS.map((avatar) => [avatar.id, avatar]));

export function normalizePlayerName(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ');
}

export function normalizeNameKey(value) {
  return normalizePlayerName(value).toLocaleLowerCase('pt-BR');
}

export function normalizeBio(value) {
  return String(value ?? '').trim().slice(0, PLAYER_BIO_MAX);
}

export function validateBio(value) {
  const bio = normalizeBio(value);
  return {
    valid: bio.length <= PLAYER_BIO_MAX,
    errors: bio.length > PLAYER_BIO_MAX ? ['A biografia é muito longa.'] : [],
    bio
  };
}

export function getAvatar(avatarId) {
  return AVATARS_BY_ID.get(avatarId) ?? AVATARS[0];
}

export function isValidAvatar(avatarId) {
  return AVATARS_BY_ID.has(avatarId);
}

export function validatePlayerName(value, { existingNames = [], currentName = null } = {}) {
  const name = normalizePlayerName(value);
  const errors = [];

  if (!name) {
    errors.push('Informe um nome ou apelido.');
  }

  if (name.length < PLAYER_NAME_MIN) {
    errors.push(`O nome precisa ter pelo menos ${PLAYER_NAME_MIN} caracteres.`);
  }

  if (name.length > PLAYER_NAME_MAX) {
    errors.push(`O nome pode ter no máximo ${PLAYER_NAME_MAX} caracteres.`);
  }

  if (name && !PLAYER_NAME_PATTERN.test(name)) {
    errors.push('Use apenas letras, números, espaços, hífen e sublinhado.');
  }

  if (/\s{2,}/.test(String(value ?? '').trim())) {
    errors.push('Evite espaços repetidos no nome.');
  }

  const currentKey = currentName ? normalizeNameKey(currentName) : null;
  const nameKey = normalizeNameKey(name);

  if (
    nameKey &&
    nameKey !== currentKey &&
    existingNames.some((existingName) => normalizeNameKey(existingName) === nameKey)
  ) {
    errors.push('Este nome já está em uso neste navegador. Escolha outro.');
  }

  return { valid: errors.length === 0, errors, name, nameKey };
}

export function validateAvatarId(avatarId) {
  return isValidAvatar(avatarId)
    ? { valid: true, errors: [] }
    : { valid: false, errors: ['Escolha um avatar disponível.'] };
}

export function createPlayerRecord({
  name,
  avatarId = AVATARS[0].id,
  bio = '',
  now = new Date().toISOString()
}) {
  const normalizedName = normalizePlayerName(name);
  const player = {
    id: createPlayerId(),
    name: normalizedName,
    bio: normalizeBio(bio),
    avatarId: isValidAvatar(avatarId) ? avatarId : AVATARS[0].id,
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
    remoteId: null,
    remoteOwnerId: null,
    syncStatus: 'local'
  };

  return player;
}

export function updatePlayerRecord(player, patch = {}, now = new Date().toISOString()) {
  const next = {
    ...player,
    ...patch,
    id: player.id,
    createdAt: player.createdAt,
    updatedAt: now
  };

  if (patch.name !== undefined) {
    next.name = normalizePlayerName(patch.name);
  }

  if (patch.bio !== undefined) {
    next.bio = normalizeBio(patch.bio);
  }

  if (patch.avatarId !== undefined) {
    next.avatarId = isValidAvatar(patch.avatarId) ? patch.avatarId : player.avatarId;
  }

  return next;
}

export function playerInitials(name) {
  const parts = normalizePlayerName(name).split(' ').filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toLocaleUpperCase('pt-BR');
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toLocaleUpperCase('pt-BR');
}

export function formatPlayerName(name) {
  return normalizePlayerName(name) || 'Jogador';
}

export function createPlayerId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
