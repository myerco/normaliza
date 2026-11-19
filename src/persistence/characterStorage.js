import {
  createDefaultCharacter,
  createCharacterRecord,
  updateCharacterRecord
} from '../core/characters.js';

const CHARACTERS_SUFFIX = ':characters';
const VERSION = 1;

export function loadCharacters(playerId) {
  const stored = readJson(charactersKey(playerId), null);

  if (!stored || !Array.isArray(stored.characters)) {
    return [];
  }

  return stored.characters.filter(isCharacterRecord);
}

export function saveCharacters(playerId, characters) {
  if (!playerId) {
    return false;
  }

  const normalized = Array.isArray(characters)
    ? characters.filter(isCharacterRecord).map((character, index) => ({
        ...character,
        isPrimary: index === 0
      }))
    : [];

  return writeJson(charactersKey(playerId), {
    version: VERSION,
    characters: normalized
  });
}

export function getPrimaryCharacter(playerId) {
  return loadCharacters(playerId).find((character) => character.isPrimary) ?? null;
}

export function ensurePrimaryCharacter(player) {
  if (!player) {
    return null;
  }

  const characters = loadCharacters(player.id);
  const current = characters.find((character) => character.isPrimary);

  if (current) {
    return current;
  }

  if (characters.length > 0) {
    const primary = { ...characters[0], isPrimary: true };
    saveCharacters(player.id, [primary, ...characters.slice(1)]);
    return primary;
  }

  const created = createDefaultCharacter(player);
  saveCharacters(player.id, [created]);
  return created;
}

export function createCharacterForPlayer(player, { name, imageId, archetypeId }) {
  if (!player) {
    return null;
  }

  const character = createCharacterRecord({
    playerId: player.id,
    name: name ?? player.name,
    imageId: imageId ?? player.avatarId,
    archetypeId
  });
  saveCharacters(player.id, [character]);
  return character;
}

export function updateCharacter(playerId, characterId, patch) {
  const characters = loadCharacters(playerId);
  const index = characters.findIndex((character) => character.id === characterId);

  if (index === -1) {
    return null;
  }

  characters[index] = updateCharacterRecord(characters[index], patch);
  saveCharacters(playerId, characters);
  return characters[index];
}

export function charactersKey(playerId) {
  return `normaliza:v2:player:${playerId}${CHARACTERS_SUFFIX}`;
}

function isCharacterRecord(character) {
  return Boolean(
    character &&
      typeof character.id === 'string' &&
      typeof character.playerId === 'string' &&
      typeof character.name === 'string' &&
      typeof character.archetypeId === 'string' &&
      typeof character.imageId === 'string'
  );
}

function readJson(key, fallback) {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
