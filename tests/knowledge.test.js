import {
  KNOWLEDGE_STATUS,
  computeNodeStatuses
} from '../src/core/knowledge.js';
import { loadKnowledgeCatalog } from '../src/persistence/knowledgeStorage.js';
import { assert, assertEqual, test } from './helpers.js';

test('árvore de conhecimento contém áreas e nós separados', () => {
  const catalog = loadKnowledgeCatalog();
  assertEqual(catalog.areas.length, 3);
  assert(catalog.nodes.length >= 12);
  assertEqual(new Set(catalog.nodes.map((node) => node.id)).size, catalog.nodes.length);
  assert(catalog.nodes.some((node) => node.id === 'normaliza'));
  assert(catalog.nodes.some((node) => node.areaId === 'dados'));
  assert(catalog.nodes.some((node) => node.areaId === 'programacao'));
  assert(catalog.nodes.some((node) => node.areaId === 'unreal'));
});

test('nós da árvore refletem quests, atributos e pré-requisitos', () => {
  const catalog = loadKnowledgeCatalog();
  const statuses = computeNodeStatuses(catalog.nodes, {
    quests: [
      { id: 'normaliza', name: 'NORMALIZA!', active: true, order: 1 }
    ],
    questProgress: {},
    questDependencies: [],
    attributes: {
      'sql-basico': { initial: 5, current: 5 },
      'sql-avancado': { initial: 6, current: 6 }
    }
  });

  assertEqual(statuses.get('normaliza'), KNOWLEDGE_STATUS.available);
  assertEqual(statuses.get('sql-basico'), KNOWLEDGE_STATUS.available);
  assertEqual(statuses.get('sql-avancado'), KNOWLEDGE_STATUS.locked);
  assertEqual(statuses.get('postgresql-admin'), KNOWLEDGE_STATUS.locked);

  const completedStatuses = computeNodeStatuses(catalog.nodes, {
    quests: [
      { id: 'normaliza', name: 'NORMALIZA!', active: true, order: 1 }
    ],
    questProgress: {
      normaliza: { status: 'completed' }
    },
    questDependencies: [],
    attributes: {
      'sql-basico': { initial: 5, current: 6 },
      'sql-avancado': { initial: 6, current: 7 },
      'postgresql-admin': { initial: 4, current: 5 }
    }
  });

  assertEqual(completedStatuses.get('normaliza'), KNOWLEDGE_STATUS.completed);
  assertEqual(completedStatuses.get('sql-basico'), KNOWLEDGE_STATUS.completed);
  assertEqual(completedStatuses.get('sql-avancado'), KNOWLEDGE_STATUS.completed);
  assertEqual(completedStatuses.get('postgresql-admin'), KNOWLEDGE_STATUS.completed);
});
