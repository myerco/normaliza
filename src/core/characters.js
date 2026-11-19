import {
  createPlayerId,
  isValidAvatar,
  normalizePlayerName,
  validatePlayerName
} from './players.js';
import {
  archetypeForAvatar,
  getArchetype,
  isValidArchetype
} from './archetypes.js';

export function createCharacterRecord({
  playerId,
  name,
  imageId = 'construtor',
  archetypeId = 'engenheiro',
  now = new Date().toISOString()
}) {
  const normalizedName = normalizePlayerName(name);

  return {
    id: createPlayerId(),
    playerId,
    name: normalizedName,
    imageId: isValidAvatar(imageId) ? imageId : 'construtor',
    archetypeId: isValidArchetype(archetypeId) ? archetypeId : 'engenheiro',
    level: 1,
    xp: 0,
    isPrimary: true,
    createdAt: now,
    updatedAt: now
  };
}

export function createDefaultCharacter(player) {
  return createCharacterRecord({
    playerId: player.id,
    name: player.name,
    imageId: player.avatarId,
    archetypeId: archetypeForAvatar(player.avatarId)
  });
}

export function updateCharacterRecord(character, patch = {}, now = new Date().toISOString()) {
  const next = {
    ...character,
    ...patch,
    id: character.id,
    playerId: character.playerId,
    createdAt: character.createdAt,
    updatedAt: now
  };

  if (patch.name !== undefined) {
    next.name = normalizePlayerName(patch.name);
  }

  if (patch.archetypeId !== undefined) {
    next.archetypeId = isValidArchetype(patch.archetypeId)
      ? patch.archetypeId
      : character.archetypeId;
  }

  if (patch.imageId !== undefined) {
    next.imageId = isValidAvatar(patch.imageId) ? patch.imageId : character.imageId;
  }

  return next;
}

export function validateCharacterName(value, { existingNames = [], currentName = null } = {}) {
  return validatePlayerName(value, { existingNames, currentName });
}

export function characterArchetype(character) {
  return getArchetype(character?.archetypeId);
}
