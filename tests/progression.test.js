import {
  applyAttributeRewards,
  levelFromXp,
  levelProgress,
  xpForQuest
} from '../src/core/progression.js';
import { createLocalPlayer } from '../src/persistence/playerStorage.js';
import { ensurePrimaryCharacter } from '../src/persistence/characterStorage.js';
import { loadCatalog } from '../src/persistence/catalogStorage.js';
import { loadWorldCatalog } from '../src/persistence/worldStorage.js';
import {
  QUEST_CATALOG_KEY,
  loadQuestCatalog,
  loadQuestProgress
} from '../src/persistence/questStorage.js';
import {
  PROGRESSION_KEY_PREFIX,
  ensureProgression,
  loadProgression
} from '../src/persistence/progressionStorage.js';
import { awardQuestCompletion } from '../src/services/progression-service.js';
import { assert, assertEqual, test } from './helpers.js';

test('XP determina nível e progresso para o próximo nível', () => {
  assertEqual(levelFromXp(0).level, 1);
  assertEqual(levelFromXp(149).level, 1);
  assertEqual(levelFromXp(150).level, 2);
  assertEqual(levelFromXp(350).level, 3);
  assertEqual(levelFromXp(999999).level, 10);

  const progress = levelProgress(150);
  assertEqual(progress.level, 2);
  assertEqual(progress.currentXp, 0);
  assertEqual(progress.neededXp, 200);
  assertEqual(progress.percent, 0);
  assertEqual(levelProgress(3150).percent, 100);
});

test('XP de quest recompensa resultado de qualidade sem velocidade', () => {
  const quest = { xpReward: 100, maxScore: 100 };
  assertEqual(xpForQuest(quest, 0), 100);
  assertEqual(xpForQuest(quest, 100), 125);
  assertEqual(xpForQuest(quest, 200), 125);
  assertEqual(xpForQuest({ xpReward: 0 }, 100), 0);
});

test('atributos recebem recompensa e respeitam o limite 10', () => {
  const result = applyAttributeRewards(
    {
      sql: { initial: 8, current: 9 },
      dev: { initial: 2, current: 2 }
    },
    {
      sql: 5,
      dev: 1
    }
  );

  assertEqual(result.attributes.sql.current, 10);
  assertEqual(result.attributes.sql.initial, 8);
  assertEqual(result.attributes.dev.current, 3);
  assertEqual(result.changes.length, 2);
});

test('conclusão de quest concede XP, sobe nível e evolui atributos uma única vez', () => {
  clearProgressionTestStorage();
  const player = createLocalPlayer({ name: 'Progresso', avatarId: 'engenheiro' });
  const character = ensurePrimaryCharacter(player);
  const catalog = loadCatalog();
  const world = loadWorldCatalog();
  const questCatalog = loadQuestCatalog();
  const quest = questCatalog.quests.find((item) => item.id === 'normaliza');
  const initial = ensureProgression(character, catalog);

  assertEqual(initial.attributes['sql-basico'].current, 5);

  const first = awardQuestCompletion({
    character,
    quest,
    score: 360,
    catalog,
    world
  });
  const progression = loadProgression(character.id);
  const questProgress = loadQuestProgress(character.id).quests;

  assertEqual(first.awarded, true);
  assertEqual(questProgress.normaliza.status, 'completed');
  assert(progression.xp > 150);
  assertEqual(progression.level, 2);
  assertEqual(progression.attributes['sql-basico'].current, 6);
  assertEqual(progression.attributes['sql-avancado'].current, 7);
  assertEqual(progression.skills['normalizacao'].current, 1);
  assertEqual(progression.skills['modelagem-dados'].current, 1);
  assert(progression.skillHistory.length >= 2);
  assert(progression.achievements.includes('primeiro-nivel'));
  assert(progression.achievements.includes('normaliza-concluida'));
  assertEqual(progression.xpHistory.length, 1);

  const second = awardQuestCompletion({
    character: first.character ?? character,
    quest,
    score: 360,
    catalog,
    world
  });
  const after = loadProgression(character.id);

  assertEqual(second.awarded, false);
  assertEqual(after.xp, progression.xp);
  assertEqual(after.xpHistory.length, 1);
  clearProgressionTestStorage();
});

function clearProgressionTestStorage() {
  const keys = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (
      key === QUEST_CATALOG_KEY ||
      key?.startsWith('normaliza:v2:player:') ||
      key?.startsWith(PROGRESSION_KEY_PREFIX)
    ) {
      keys.push(key);
    }
  }

  for (const key of keys) {
    localStorage.removeItem(key);
  }
}
