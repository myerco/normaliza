import { validatePhase4Data } from '../src/data/validatePhase4Data.js';
import { assert, assertDeepEqual, assertEqual, test } from './helpers.js';

const cityPromise = fetch('../data/city.json').then((response) => {
  if (!response.ok) {
    throw new Error(`Falha ao carregar data/city.json (HTTP ${response.status}).`);
  }
  return response.json();
});

const phasePromise = fetch('../data/phases/fase-4.json').then((response) => {
  if (!response.ok) {
    throw new Error(`Falha ao carregar data/phases/fase-4.json (HTTP ${response.status}).`);
  }
  return response.json();
});

test('fase 4 carrega e passa na validação estrutural', async () => {
  const [city, phase] = await Promise.all([cityPromise, phasePromise]);
  const result = validatePhase4Data(phase, {
    cityBuildingIds: city.city.buildings.map((building) => building.id)
  });

  assert(result.valid, result.errors.join(' '));
  assertEqual(phase.id, 'gestao-de-funcionarios-e-pedidos');
  assertEqual(phase.normalForm, '3FN');
});

test('fase 4 declara cinco dependências e a dependência-chave', async () => {
  const phase = await phasePromise;

  assertEqual(phase.attributes.length, 6);
  assertEqual(phase.functionalDependencies.length, 5);
  assertDeepEqual(phase.candidateKey, ['pedido']);
  assertEqual(phase.keyDependencyId, 'fd-funcionario-departamento');
  assertEqual(
    phase.functionalDependencies.find((dependency) => dependency.id === phase.keyDependencyId).type,
    'transitive'
  );
});

test('fase 4 declara as três tabelas e duas FKs', async () => {
  const phase = await phasePromise;

  assertDeepEqual(
    phase.targetTables.map((table) => ({
      id: table.id,
      attributes: table.attributes,
      primaryKey: table.primaryKey
    })),
    [
      { id: 'pedido', attributes: ['pedido', 'cliente', 'funcionario'], primaryKey: ['pedido'] },
      {
        id: 'funcionario',
        attributes: ['funcionario', 'nome_funcionario', 'departamento'],
        primaryKey: ['funcionario']
      },
      { id: 'departamento', attributes: ['departamento', 'localizacao'], primaryKey: ['departamento'] }
    ]
  );
  assertDeepEqual(phase.targetTables[0].foreignKeys, [
    {
      attribute: 'funcionario',
      references: { table: 'funcionario', attribute: 'funcionario' }
    }
  ]);
  assertDeepEqual(phase.targetTables[1].foreignKeys, [
    {
      attribute: 'departamento',
      references: { table: 'departamento', attribute: 'departamento' }
    }
  ]);
});

test('fase 4 declara os dois relacionamentos', async () => {
  const phase = await phasePromise;

  assertEqual(phase.relationships.length, 2);
  assertDeepEqual(phase.relationships, [
    {
      id: 'pedido.funcionario->funcionario.funcionario',
      fromTable: 'pedido',
      fromAttribute: 'funcionario',
      toTable: 'funcionario',
      toAttribute: 'funcionario',
      label: 'N:1'
    },
    {
      id: 'funcionario.departamento->departamento.departamento',
      fromTable: 'funcionario',
      fromAttribute: 'departamento',
      toTable: 'departamento',
      toAttribute: 'departamento',
      label: 'N:1'
    }
  ]);
});

test('fase 4 evolui a cidade com os três edifícios e duas estradas', async () => {
  const [city, phase] = await Promise.all([cityPromise, phasePromise]);
  const baseIds = new Set(city.city.buildings.map((building) => building.id));

  assertEqual(phase.cityEvolution.buildings.length, 1);
  assertEqual(phase.cityEvolution.buildings[0].id, 'departamento');
  assertEqual(baseIds.has('departamento'), false);
  assertDeepEqual(phase.cityEvolution.links, [
    { from: 'pedido', to: 'funcionario', label: 'N:1' },
    { from: 'funcionario', to: 'departamento', label: 'N:1' }
  ]);
  assertDeepEqual(phase.cityEvolution.normalizedBuildings, [
    { id: 'pedido', badgeLabel: '3FN' },
    { id: 'funcionario', badgeLabel: '3FN' },
    { id: 'departamento', badgeLabel: '3FN' }
  ]);
});

test('o validador rejeita uma fase 4 incompleta', () => {
  const result = validatePhase4Data({
    id: 'invalida',
    title: 'Inválida',
    normalForm: '3FN',
    sourceTable: 'PEDIDO',
    objective: 'Teste',
    rules: [],
    hints: [],
    concepts: {},
    attributes: [],
    candidateKey: [],
    functionalDependencies: [],
    keyDependencyId: null,
    rows: [],
    targetTables: [],
    relationships: [],
    scoring: {},
    completion: {},
    cityEvolution: {}
  });

  assert(!result.valid);
  assert(result.errors.length > 0);
});
