import { assert, assertEqual, test } from './helpers.js';

const glossaryPromise = fetch('../data/glossary.json').then((response) => {
  if (!response.ok) {
    throw new Error(`Falha ao carregar data/glossary.json (HTTP ${response.status}).`);
  }
  return response.json();
});

const tipsPromise = fetch('../data/tips.json').then((response) => {
  if (!response.ok) {
    throw new Error(`Falha ao carregar data/tips.json (HTTP ${response.status}).`);
  }
  return response.json();
});

test('glossário contém conceitos completos', async () => {
  const glossary = await glossaryPromise;

  assert(Array.isArray(glossary.concepts), 'O glossário deve conter uma lista de conceitos.');
  assert(glossary.concepts.length >= 10, 'O glossário deve ter pelo menos dez conceitos.');

  for (const concept of glossary.concepts) {
    assert(concept.id, 'Conceito sem id.');
    assert(concept.title, 'Conceito sem título.');
    assert(concept.category, 'Conceito sem categoria.');
    assert(concept.definition, 'Conceito sem definição.');
    assert(concept.example, 'Conceito sem exemplo.');
  }
});

test('dicas cobrem o jogo e as três fases e a missão', async () => {
  const tips = await tipsPromise;

  for (const context of ['general', 'phase1', 'phase2', 'phase3', 'mission']) {
    assert(Array.isArray(tips[context]), `Dicas ausentes para ${context}.`);
    assert(tips[context].length > 0, `Dicas vazias para ${context}.`);
  }

  assertEqual(tips.phase1.length >= 3, true);
});
