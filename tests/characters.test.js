import {
  ARCHETYPES,
  archetypeForAvatar,
  getArchetype,
  isValidArchetype
} from '../src/core/archetypes.js';
import {
  createCharacterRecord,
  createDefaultCharacter,
  validateCharacterName
} from '../src/core/characters.js';
import {
  createLocalPlayer,
  loadPlayerRegistry,
  PLAYER_REGISTRY_KEY
} from '../src/persistence/playerStorage.js';
import {
  charactersKey,
  createCharacterForPlayer,
  ensurePrimaryCharacter,
  getPrimaryCharacter,
  loadCharacters,
  updateCharacter
} from '../src/persistence/characterStorage.js';
import { assert, assertDeepEqual, assertEqual, test } from './helpers.js';

test('arquétipos iniciais estão disponíveis e mapeiam avatares legados', () => {
  assertDeepEqual(
    ARCHETYPES.map((archetype) => archetype.id),
    ['engenheiro', 'arquiteto', 'analista']
  );
  assert(isValidArchetype('engenheiro'));
  assert(!isValidArchetype('inexistente'));
  assertEqual(getArchetype('analista').label, 'Analista');
  assertEqual(archetypeForAvatar('construtor'), 'engenheiro');
  assertEqual(archetypeForAvatar('arquiteto'), 'arquiteto');
  assertEqual(archetypeForAvatar('cientista'), 'analista');
});

test('personagem é criado com nome, imagem, arquétipo e nível inicial', () => {
  const character = createCharacterRecord({
    playerId: 'player-1',
    name: 'Ana Arquiteta',
    imageId: 'analista',
    archetypeId: 'arquiteto'
  });

  assertEqual(character.name, 'Ana Arquiteta');
  assertEqual(character.imageId, 'analista');
  assertEqual(character.archetypeId, 'arquiteto');
  assertEqual(character.level, 1);
  assertEqual(character.xp, 0);
  assertEqual(character.isPrimary, true);
  assert(character.id.length > 0);
});

test('personagem legado é migrado para o personagem principal', () => {
  clearCharacterTestStorage();
  const player = createLocalPlayer({ name: 'Legado', avatarId: 'analista' });
  const primary = ensurePrimaryCharacter(player);
  const again = ensurePrimaryCharacter(player);

  assertEqual(primary.playerId, player.id);
  assertEqual(primary.name, 'Legado');
  assertEqual(primary.imageId, 'analista');
  assertEqual(primary.archetypeId, 'analista');
  assertEqual(again.id, primary.id);
  assertEqual(loadCharacters(player.id).length, 1);
  assertEqual(getPrimaryCharacter(player.id).id, primary.id);
  clearCharacterTestStorage();
});

test('personagem pode ser criado e editado sem perder vínculo com jogador', () => {
  clearCharacterTestStorage();
  const player = createLocalPlayer({ name: 'Editor', avatarId: 'construtor' });
  const character = createCharacterForPlayer(player, {
    name: 'Editor Arquiteto',
    imageId: 'engenheiro',
    archetypeId: 'arquiteto'
  });
  const updated = updateCharacter(player.id, character.id, {
    name: 'Editor Analista',
    archetypeId: 'analista',
    imageId: 'cientista'
  });

  assertEqual(updated.id, character.id);
  assertEqual(updated.playerId, player.id);
  assertEqual(updated.name, 'Editor Analista');
  assertEqual(updated.archetypeId, 'analista');
  assertEqual(updated.imageId, 'cientista');
  assertEqual(loadCharacters(player.id)[0].name, 'Editor Analista');
  clearCharacterTestStorage();
});

test('nome de personagem usa as mesmas regras de identidade', () => {
  assert(validateCharacterName('Ana Arquiteta').valid);
  assert(!validateCharacterName('AB').valid);
  assert(!validateCharacterName('Ana@Arquiteta').valid);
});

function clearCharacterTestStorage() {
  const keys = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (
      key === PLAYER_REGISTRY_KEY ||
      key?.startsWith('normaliza:v2:player:')
    ) {
      keys.push(key);
    }
  }

  for (const key of keys) {
    localStorage.removeItem(key);
  }

  assertEqual(loadPlayerRegistry().players.length, 0);
  assertEqual(loadCharacters('inexistente').length, 0);
  assertEqual(charactersKey('inexistente'), 'normaliza:v2:player:inexistente:characters');
}
