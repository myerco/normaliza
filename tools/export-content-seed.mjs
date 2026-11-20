import { writeFileSync } from 'node:fs';
import { loadWorldCatalog } from '../src/persistence/worldStorage.js';
import { loadQuestCatalog } from '../src/persistence/questStorage.js';

const payload = {
  generatedAt: new Date().toISOString(),
  world: loadWorldCatalog(),
  questCatalog: loadQuestCatalog()
};

writeFileSync(
  new URL('../data/content.seed.json', import.meta.url),
  JSON.stringify(payload, null, 2),
  'utf8'
);
