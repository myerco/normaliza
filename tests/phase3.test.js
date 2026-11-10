import {
  addRelationship,
  applyValidation,
  buildTable,
  calculateScore,
  canAddRelationship,
  countCorrectForeignKeys,
  countCorrectMemberships,
  countCorrectPrimaryKeys,
  countCorrectRelationships,
  createPhaseState,
  hydratePhaseState,
  isDependencyPreserved,
  isLosslessJoin,
  removeRelationship,
  resetPhaseState,
  selectTransitiveDependency,
  toSnapshot,
  toggleForeignKey,
  toggleMembership,
  togglePrimaryKey,
  useHint,
  validatePhase
} from '../src/core/fase3.js';
import { assert, assertDeepEqual, assertEqual, test } from './helpers.js';

const data = {
  id: 'cidade-organizada',
  hints: ['Dica 1', 'Dica 2', 'Dica 3', 'Dica 4'],
  attributes: [
    { id: 'cpf', label: 'CPF', role: 'key' },
    { id: 'nome', label: 'Nome', role: 'dependent' },
    { id: 'departamento', label: 'Departamento', role: 'determinant' },
    { id: 'localizacao', label: 'Localização', role: 'transitive' }
  ],
  candidateKey: ['cpf'],
  functionalDependencies: [
    { id: 'fd-nome', determinant: ['cpf'], dependent: 'nome', type: 'direct', label: 'CPF → Nome' },
    {
      id: 'fd-departamento',
      determinant: ['cpf'],
      dependent: 'departamento',
      type: 'direct',
      label: 'CPF → Departamento'
    },
    {
      id: 'fd-localizacao',
      determinant: ['departamento'],
      dependent: 'localizacao',
      type: 'transitive',
      label: 'Departamento → Localização'
    }
  ],
  transitiveDependencyId: 'fd-localizacao',
  targetTables: [
    {
      id: 'funcionario',
      name: 'FUNCIONÁRIO',
      attributes: ['cpf', 'nome', 'departamento'],
      primaryKey: ['cpf'],
      foreignKeys: [
        {
          attribute: 'departamento',
          references: { table: 'departamento', attribute: 'departamento' }
        }
      ]
    },
    {
      id: 'departamento',
      name: 'DEPARTAMENTO',
      attributes: ['departamento', 'localizacao'],
      primaryKey: ['departamento'],
      foreignKeys: []
    }
  ],
  relationships: [
    {
      id: 'funcionario.departamento->departamento.departamento',
      fromTable: 'funcionario',
      fromAttribute: 'departamento',
      toTable: 'departamento',
      toAttribute: 'departamento',
      label: 'N:1'
    }
  ],
  scoring: {
    pointsPerTransitive: 20,
    pointsPerTable: 10,
    pointsPerMembership: 5,
    pointsPerPrimaryKey: 5,
    pointsPerForeignKey: 5,
    pointsPerRelationship: 10,
    completionBonus: 10,
    wrongValidationPenalty: 10,
    hintPenalty: 5,
    max: 100
  }
};

test('estado inicial da fase 3 está vazio', () => {
  const state = createPhaseState(data);

  assertEqual(state.transitiveDependencyId, null);
  assertEqual(state.builtTables.length, 0);
  assertEqual(state.relationships.length, 0);
  assertEqual(state.score, 0);
  assertEqual(state.completed, false);
});

test('identificar a dependência transitiva pontua', () => {
  const state = selectTransitiveDependency(createPhaseState(data), data, 'fd-localizacao');

  assertEqual(state.transitiveDependencyId, 'fd-localizacao');
  assertEqual(state.score, 20);
});

test('construir os edifícios libera as tabelas', () => {
  let state = createPhaseState(data);
  state = buildTable(state, data, 'funcionario');
  state = buildTable(state, data, 'departamento');

  assertDeepEqual(state.builtTables, ['funcionario', 'departamento']);
  assertEqual(state.score, 20);
});

test('Departamento pode aparecer nas duas tabelas', () => {
  let state = buildBothTables();
  state = toggleMembership(state, data, 'funcionario', 'departamento');
  state = toggleMembership(state, data, 'departamento', 'departamento');

  assert(state.tables.funcionario.attributes.includes('departamento'), 'Departamento deveria estar em FUNCIONÁRIO.');
  assert(state.tables.departamento.attributes.includes('departamento'), 'Departamento deveria estar em DEPARTAMENTO.');
});

test('PK e FK só podem ser marcadas em atributos da tabela', () => {
  let state = buildBothTables();
  state = togglePrimaryKey(state, data, 'funcionario', 'cpf');
  assertEqual(state.tables.funcionario.primaryKey.length, 0);

  state = toggleMembership(state, data, 'funcionario', 'cpf');
  state = togglePrimaryKey(state, data, 'funcionario', 'cpf');
  assertEqual(state.tables.funcionario.primaryKey.length, 1);

  state = toggleMembership(state, data, 'funcionario', 'departamento');
  state = toggleForeignKey(state, data, 'funcionario', 'departamento');
  assertEqual(state.tables.funcionario.foreignKeys.length, 1);
});

test('relacionamento exige FK na origem e PK no destino', () => {
  let state = buildExpectedTables();
  const beforeKeys = canAddRelationship(
    state,
    data,
    'funcionario',
    'departamento',
    'departamento',
    'departamento'
  );
  assertEqual(beforeKeys.valid, false);

  state = togglePrimaryKey(state, data, 'departamento', 'departamento');
  state = toggleForeignKey(state, data, 'funcionario', 'departamento');
  const ready = canAddRelationship(
    state,
    data,
    'funcionario',
    'departamento',
    'departamento',
    'departamento'
  );
  assertEqual(ready.valid, true);

  state = addRelationship(
    state,
    data,
    'funcionario',
    'departamento',
    'departamento',
    'departamento'
  );
  assertEqual(state.relationships.length, 1);
});

test('estado esperado é válido e alcança 3FN', () => {
  const state = buildExpectedState();
  const result = validatePhase(state, data);

  assert(result.valid, result.errors.map((error) => error.message).join(' '));
  assertEqual(result.transitive, true);
  assertEqual(result.lossless, true);
  assertEqual(result.preserved, true);
  assertEqual(result.errors.length, 0);
  assertEqual(isLosslessJoin(state, data), true);
  assertEqual(isDependencyPreserved(state, data), true);
});

test('não identificar a transitiva é inválido', () => {
  let state = buildExpectedState();
  state = { ...state, transitiveDependencyId: 'fd-nome' };
  const result = validatePhase(state, data);

  assertEqual(result.valid, false);
  assert(result.errors.some((error) => error.code === 'transitive'), 'Erro de transitiva ausente.');
});

test('não construir os edifícios é inválido', () => {
  const state = selectTransitiveDependency(createPhaseState(data), data, 'fd-localizacao');
  const result = validatePhase(state, data);

  assertEqual(result.valid, false);
  assert(result.errors.some((error) => error.code === 'tables-missing'), 'Erro de edifícios ausentes.');
});

test('Localização em FUNCIONÁRIO é rejeitada', () => {
  let state = buildExpectedState();
  state = toggleMembership(state, data, 'funcionario', 'localizacao');
  const result = validatePhase(state, data);

  assertEqual(result.valid, false);
  assert(result.errors.some((error) => error.code === 'table-extra'), 'Erro de atributo indevido ausente.');
});

test('PK ausente é rejeitada', () => {
  let state = buildExpectedState();
  state = togglePrimaryKey(state, data, 'departamento', 'departamento');
  const result = validatePhase(state, data);

  assertEqual(result.valid, false);
  assert(result.errors.some((error) => error.code === 'pk-missing'), 'Erro de PK ausente.');
});

test('FK ausente é rejeitada', () => {
  let state = buildExpectedState();
  state = toggleForeignKey(state, data, 'funcionario', 'departamento');
  const result = validatePhase(state, data);

  assertEqual(result.valid, false);
  assert(result.errors.some((error) => error.code === 'fk-missing'), 'Erro de FK ausente.');
  assert(result.errors.some((error) => error.code === 'relationship-missing'), 'Relacionamento deveria ser removido.');
});

test('relacionamento ausente é rejeitado', () => {
  let state = buildExpectedState();
  state = removeRelationship(state, data, state.relationships[0].id);
  const result = validatePhase(state, data);

  assertEqual(result.valid, false);
  assert(result.errors.some((error) => error.code === 'relationship-missing'), 'Erro de relacionamento ausente.');
});

test('pontuação cresce com progresso e conclusão', () => {
  let state = buildExpectedState();

  assertEqual(countCorrectMemberships(state, data), 5);
  assertEqual(countCorrectPrimaryKeys(state, data), 2);
  assertEqual(countCorrectForeignKeys(state, data), 1);
  assertEqual(countCorrectRelationships(state, data), 1);
  assertEqual(state.score, 90);

  state = applyValidation(state, data, validatePhase(state, data));
  assertEqual(state.completed, true);
  assertEqual(state.score, 100);
});

test('validação incorreta e dica penalizam', () => {
  let state = buildExpectedState();
  state = applyValidation(state, data, validatePhase(createPhaseState(data), data));
  assertEqual(state.failedValidations, 1);
  assertEqual(state.score, 80);

  state = applyValidation(state, data, validatePhase(state, data));
  assertEqual(state.completed, true);
  assertEqual(state.score, 90);

  const hinted = useHint(buildExpectedState(), data);
  assertEqual(hinted.hintsUsed, 1);
  assertEqual(hinted.score, 85);
});

test('snapshot e hidratação preservam a fase concluída', () => {
  let state = buildExpectedState();
  state = applyValidation(state, data, validatePhase(state, data));
  const snapshot = toSnapshot(state);
  const hydrated = hydratePhaseState(data, snapshot);

  assertDeepEqual(hydrated.builtTables, state.builtTables);
  assertDeepEqual(hydrated.tables, state.tables);
  assertDeepEqual(hydrated.relationships, state.relationships);
  assertEqual(hydrated.completed, true);
  assertEqual(hydrated.score, 100);
});

test('hidratação descarta dados inválidos', () => {
  const state = hydratePhaseState(data, {
    phaseId: data.id,
    transitiveDependencyId: 'inexistente',
    builtTables: ['funcionario', 'departamento', 'inexistente'],
    tables: {
      funcionario: {
        attributes: ['cpf', 'inexistente'],
        primaryKey: ['cpf', 'inexistente'],
        foreignKeys: ['inexistente']
      },
      departamento: {
        attributes: ['departamento'],
        primaryKey: ['departamento'],
        foreignKeys: []
      }
    },
    relationships: [
      {
        fromTable: 'funcionario',
        fromAttribute: 'inexistente',
        toTable: 'departamento',
        toAttribute: 'departamento'
      }
    ],
    completed: true
  });

  assertEqual(state.transitiveDependencyId, null);
  assertDeepEqual(state.builtTables, ['funcionario', 'departamento']);
  assertDeepEqual(state.tables.funcionario.attributes, ['cpf']);
  assertDeepEqual(state.tables.funcionario.primaryKey, ['cpf']);
  assertEqual(state.relationships.length, 0);
  assertEqual(state.completed, false);
});

test('reset limpa construções, chaves e pontuação', () => {
  let state = buildExpectedState();
  state = applyValidation(state, data, validatePhase(state, data));
  state = resetPhaseState(data);

  assertEqual(state.transitiveDependencyId, null);
  assertEqual(state.builtTables.length, 0);
  assertEqual(state.relationships.length, 0);
  assertEqual(state.completed, false);
  assertEqual(state.score, 0);
});

function buildBothTables() {
  let state = createPhaseState(data);
  state = buildTable(state, data, 'funcionario');
  state = buildTable(state, data, 'departamento');
  return state;
}

function buildExpectedTables(state = buildBothTables()) {
  let next = state;

  for (const attributeId of ['cpf', 'nome', 'departamento']) {
    next = toggleMembership(next, data, 'funcionario', attributeId);
  }
  for (const attributeId of ['departamento', 'localizacao']) {
    next = toggleMembership(next, data, 'departamento', attributeId);
  }

  return next;
}

function buildExpectedState() {
  let state = selectTransitiveDependency(createPhaseState(data), data, 'fd-localizacao');
  state = buildTable(state, data, 'funcionario');
  state = buildTable(state, data, 'departamento');
  state = buildExpectedTables(state);
  state = togglePrimaryKey(state, data, 'funcionario', 'cpf');
  state = togglePrimaryKey(state, data, 'departamento', 'departamento');
  state = toggleForeignKey(state, data, 'funcionario', 'departamento');
  state = addRelationship(
    state,
    data,
    'funcionario',
    'departamento',
    'departamento',
    'departamento'
  );
  return state;
}
