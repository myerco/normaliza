import { validatePhase2Data } from '../src/data/validatePhase2Data.js';
import { assert, assertDeepEqual, assertEqual, test } from './helpers.js';

const cityPromise = fetch('../data/city.json').then((response) => {
  if (!response.ok) {
    throw new Error(`Falha ao carregar data/city.json (HTTP ${response.status}).`);
  }
  return response.json();
});

const phasePromise = fetch('../data/phases/fase-2.json').then((response) => {
  if (!response.ok) {
    throw new Error(`Falha ao carregar data/phases/fase-2.json (HTTP ${response.status}).`);
  }
  return response.json();
});

test('fase 2 carrega e passa na validação estrutural', async () => {
  const [city, phase] = await Promise.all([cityPromise, phasePromise]);
  const result = validatePhase2Data(phase, {
    cityBuildingIds: city.city.buildings.map((building) => building.id)
  });

  assert(result.valid, result.errors.join(' '));
  assertEqual(phase.id, 'rede-de-dependencias');
  assertEqual(phase.normalForm, '2FN');
});

test('fase 2 declara cinco atributos e três dependências', async () => {
  const phase = await phasePromise;

  assertEqual(phase.attributes.length, 5);
  assertEqual(phase.functionalDependencies.length, 3);
  assertDeepEqual(phase.candidateKey, ['pedido', 'produto']);
  assertEqual(phase.rows.length, 3);
});

test('fase 2 declara dependências totais e parciais corretas', async () => {
  const phase = await phasePromise;

  assertEqual(phase.functionalDependencies[0].type, 'total');
  assertDeepEqual(phase.functionalDependencies[0].determinant, ['pedido', 'produto']);
  assertEqual(phase.functionalDependencies[0].dependent, 'quantidade');
  assertEqual(phase.functionalDependencies[1].type, 'partial');
  assertDeepEqual(phase.functionalDependencies[1].determinant, ['produto']);
  assertEqual(phase.functionalDependencies[1].dependent, 'descricao');
  assertEqual(phase.functionalDependencies[2].type, 'partial');
  assertEqual(phase.functionalDependencies[2].dependent, 'preco');
});

test('fase 2 declara a decomposição esperada', async () => {
  const phase = await phasePromise;

  assertDeepEqual(
    phase.targetTables.map((table) => ({
      id: table.id,
      attributes: table.attributes,
      primaryKey: table.primaryKey
    })),
    [
      {
        id: 'item_pedido',
        attributes: ['pedido', 'produto', 'quantidade'],
        primaryKey: ['pedido', 'produto']
      },
      {
        id: 'produto',
        attributes: ['produto', 'descricao', 'preco'],
        primaryKey: ['produto']
      }
    ]
  );
});

test('fase 2 adiciona ITEM_PEDIDO e relacionamentos à cidade', async () => {
  const phase = await phasePromise;

  assertEqual(phase.cityEvolution.buildings.length, 1);
  assertEqual(phase.cityEvolution.buildings[0].id, 'item_pedido');
  assertEqual(phase.cityEvolution.buildings[0].badgeLabel, '2FN');
  assertEqual(phase.cityEvolution.links.length, 2);
  assertDeepEqual(
    phase.cityEvolution.normalizedBuildings,
    [{ id: 'produto', badgeLabel: '2FN' }]
  );
});

test('o validador rejeita uma fase 2 incompleta', () => {
  const result = validatePhase2Data({
    id: 'invalida',
    title: 'Inválida',
    normalForm: '2FN',
    sourceTable: 'ITEM_PEDIDO',
    objective: 'Teste',
    rules: [],
    hints: [],
    concepts: {},
    attributes: [],
    candidateKey: [],
    functionalDependencies: [],
    rows: [],
    targetTables: [],
    scoring: {},
    cityEvolution: {}
  });

  assert(!result.valid, 'A fase incompleta deveria ser inválida.');
  assert(result.errors.length > 0, 'O validador deveria listar os erros.');
});
