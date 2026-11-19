import {
  QUEST_STATUS,
  questStatusFor
} from '../src/core/quests.js';
import {
  QUEST_CATALOG_KEY,
  clearCharacterQuestProgress,
  completeQuest,
  loadQuestCatalog,
  loadQuestProgress,
  startQuest
} from '../src/persistence/questStorage.js';
import { assert, assertEqual, test } from './helpers.js';

test('jornada inicial contém campanha, quatro quests e dependências', () => {
  clearQuestTestStorage();
  const catalog = loadQuestCatalog();

  assertEqual(catalog.campaigns.length, 1);
  assertEqual(catalog.quests.length, 4);
  assertEqual(catalog.dependencies.length, 3);
  assertEqual(catalog.campaigns[0].slug, 'jornada-do-conhecimento');
  assertEqual(catalog.quests[0].slug, 'normaliza');
  clearQuestTestStorage();
});

test('quests bloqueiam e liberam conforme os pré-requisitos', () => {
  clearQuestTestStorage();
  const catalog = loadQuestCatalog();
  const normaliza = catalog.quests.find((quest) => quest.id === 'normaliza');
  const sql = catalog.quests.find((quest) => quest.id === 'sql');
  const progress = {};

  assertEqual(
    questStatusFor(normaliza, progress, catalog.dependencies),
    QUEST_STATUS.available
  );
  assertEqual(
    questStatusFor(sql, progress, catalog.dependencies),
    QUEST_STATUS.locked
  );

  startQuest('character-quest-test', normaliza.id);
  const started = loadQuestProgress('character-quest-test').quests;
  assertEqual(startQuest('character-quest-test', normaliza.id).status, QUEST_STATUS.inProgress);
  assertEqual(questStatusFor(normaliza, started, catalog.dependencies), QUEST_STATUS.inProgress);

  completeQuest('character-quest-test', normaliza.id, { score: 90, xp: 150 });
  const completed = loadQuestProgress('character-quest-test').quests;
  assertEqual(questStatusFor(normaliza, completed, catalog.dependencies), QUEST_STATUS.completed);
  assertEqual(questStatusFor(sql, completed, catalog.dependencies), QUEST_STATUS.available);
  assertEqual(completeQuest('character-quest-test', normaliza.id).status, QUEST_STATUS.completed);
  clearQuestTestStorage();
});

test('progresso de quest é individual por personagem', () => {
  clearQuestTestStorage();
  const catalog = loadQuestCatalog();
  const normaliza = catalog.quests.find((quest) => quest.id === 'normaliza');
  const sql = catalog.quests.find((quest) => quest.id === 'sql');

  completeQuest('character-a', normaliza.id);
  const a = loadQuestProgress('character-a').quests;
  const b = loadQuestProgress('character-b').quests;

  assertEqual(questStatusFor(sql, a, catalog.dependencies), QUEST_STATUS.available);
  assertEqual(questStatusFor(sql, b, catalog.dependencies), QUEST_STATUS.locked);
  clearCharacterQuestProgress('character-a');
  assertEqual(loadQuestProgress('character-a').quests[normaliza.id], undefined);
  clearQuestTestStorage();
});

function clearQuestTestStorage() {
  const keys = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (
      key === QUEST_CATALOG_KEY ||
      key?.startsWith('normaliza:v3:character:')
    ) {
      keys.push(key);
    }
  }

  for (const key of keys) {
    localStorage.removeItem(key);
  }
}
