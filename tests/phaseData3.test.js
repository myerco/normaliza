import { validatePhase3Data } from '../src/data/validatePhase3Data.js';
import { assert, assertDeepEqual, assertEqual, test } from './helpers.js';

const cityPromise = fetch('../data/city.json').then((response) => {
  if (!response.ok) {
    throw new Error(`Falha ao carregar data/city.json (HTTP ${response.status}).`);
  }
  return response.json();
});

const phasePromise = fetch('../data/phases/fase-3.json').then((response) => {
  if (!response.ok) {
    throw new Error(`Falha ao carregar data/phases/fase-3.json (HTTP ${response.status}).`);
  }
  return response.json();
});

test('fase 3 carrega e passa na validação estrutural', async () => {
  const [city, phase] = await Promise.all([cityPromise, phasePromise]);
  const result = validatePhase3Data(phase, {
    cityBuildingIds: city.city.buildings.map((building) => building.id)
  });

  assert(result.valid, result.errors.join(' '));
  assertEqual(phase.id, 'cidade-organizada');
  assertEqual(phase.normalForm, '3FN');
});

test('fase 3 declara atributos, dependências e a transitiva', async () => {
  const phase = await phasePromise;

  assertEqual(phase.attributes.length, 4);
  assertEqual(phase.functionalDependencies.length, 3);
  assertDeepEqual(phase.candidateKey, ['cpf']);
  assertEqual(phase.transitiveDependencyId, 'fd-localizacao');
  assertEqual(
    phase.functionalDependencies.find((dependency) => dependency.id === 'fd-localizacao').type,
    'transitive'
  );
});

test('fase 3 declara a decomposição esperada', async () => {
  const phase = await phasePromise;

  assertDeepEqual(
    phase.targetTables.map((table) => ({
      id: table.id,
      attributes: table.attributes,
      primaryKey: table.primaryKey
    })),
    [
      {
        id: 'funcionario',
        attributes: ['cpf', 'nome', 'departamento'],
        primaryKey: ['cpf']
      },
      {
        id: 'departamento',
        attributes: ['departamento', 'localizacao'],
        primaryKey: ['departamento']
      }
    ]
  );

  assertDeepEqual(phase.targetTables[0].foreignKeys, [
    {
      attribute: 'departamento',
      references: { table: 'departamento', attribute: 'departamento' }
    }
  ]);
});

test('fase 3 declara o relacionamento FUNCIONÁRIO → DEPARTAMENTO', async () => {
  const phase = await phasePromise;

  assertEqual(phase.relationships.length, 1);
  assertDeepEqual(phase.relationships[0], {
    id: 'funcionario.departamento->departamento.departamento',
    fromTable: 'funcionario',
    fromAttribute: 'departamento',
    toTable: 'departamento',
    toAttribute: 'departamento',
    label: 'N:1'
  });
});

test('fase 3 evolui a cidade com DEPARTAMENTO e FUNCIONÁRIO em 3FN', async () => {
  const phase = await phasePromise;

  assertEqual(phase.cityEvolution.buildings.length, 1);
  assertEqual(phase.cityEvolution.buildings[0].id, 'departamento');
  assertEqual(phase.cityEvolution.buildings[0].badgeLabel, '3FN');
  assertDeepEqual(phase.cityEvolution.links, [
    { from: 'funcionario', to: 'departamento', label: 'N:1' }
  ]);
  assertDeepEqual(phase.cityEvolution.normalizedBuildings, [
    { id: 'funcionario', badgeLabel: '3FN' }
  ]);
});

test('o validador rejeita uma fase 3 incompleta', () => {
  const result = validatePhase3Data({
    id: 'invalida',
    title: 'Inválida',
    normalForm: '3FN',
    sourceTable: 'FUNCIONÁRIO',
    objective: 'Teste',
    rules: [],
    hints: [],
    concepts: {},
    attributes: [],
    candidateKey: [],
    functionalDependencies: [],
    transitiveDependencyId: null,
    rows: [],
    targetTables: [],
    relationships: [],
    scoring: {},
    cityEvolution: {}
  });

  assert(!result.valid, 'A fase incompleta deveria ser inválida.');
  assert(result.errors.length > 0, 'O validador deveria listar os erros.');
});
