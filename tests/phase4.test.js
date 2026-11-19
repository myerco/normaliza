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
  selectKeyDependency,
  toSnapshot,
  toggleForeignKey,
  toggleMembership,
  togglePrimaryKey,
  useHint,
  validatePhase
} from '../src/core/fase4.js';
import { assert, assertDeepEqual, assertEqual, test } from './helpers.js';

const phasePromise = fetch('../data/phases/fase-4.json').then((response) => {
  if (!response.ok) {
    throw new Error(`Falha ao carregar data/phases/fase-4.json (HTTP ${response.status}).`);
  }
  return response.json();
});

test('estado inicial da fase 4 está vazio', async () => {
  const data = await phasePromise;
  const state = createPhaseState(data);

  assertEqual(state.keyDependencyId, null);
  assertEqual(state.builtTables.length, 0);
  assertEqual(state.relationships.length, 0);
  assertEqual(state.completed, false);
  assertEqual(state.score, 0);
});

test('identificar a dependência entre funcionário e departamento pontua', async () => {
  const data = await phasePromise;
  let state = createPhaseState(data);
  state = selectKeyDependency(state, data, 'fd-funcionario-departamento');

  assertEqual(state.keyDependencyId, 'fd-funcionario-departamento');
  assert(state.score >= 20);
});

test('a fase 4 constrói as três tabelas', async () => {
  const data = await phasePromise;
  let state = createPhaseState(data);

  for (const tableId of ['pedido', 'funcionario', 'departamento']) {
    state = buildTable(state, data, tableId);
  }

  assertDeepEqual(state.builtTables, ['pedido', 'funcionario', 'departamento']);
});

test('atributos compartilhados podem aparecer nas tabelas de origem e destino', async () => {
  const data = await phasePromise;
  let state = buildAllTables(data);
  state = toggleMembership(state, data, 'pedido', 'funcionario');
  state = toggleMembership(state, data, 'funcionario', 'funcionario');
  state = toggleMembership(state, data, 'funcionario', 'departamento');
  state = toggleMembership(state, data, 'departamento', 'departamento');

  assert(state.tables.pedido.attributes.includes('funcionario'));
  assert(state.tables.funcionario.attributes.includes('funcionario'));
  assert(state.tables.funcionario.attributes.includes('departamento'));
  assert(state.tables.departamento.attributes.includes('departamento'));
});

test('PK e FK só podem ser marcadas em atributos da tabela', async () => {
  const data = await phasePromise;
  let state = buildAllTables(data);

  state = togglePrimaryKey(state, data, 'pedido', 'pedido');
  state = toggleForeignKey(state, data, 'pedido', 'funcionario');
  assertDeepEqual(state.tables.pedido.primaryKey, []);
  assertDeepEqual(state.tables.pedido.foreignKeys, []);

  state = toggleMembership(state, data, 'pedido', 'pedido');
  state = toggleMembership(state, data, 'pedido', 'funcionario');
  state = togglePrimaryKey(state, data, 'pedido', 'pedido');
  state = toggleForeignKey(state, data, 'pedido', 'funcionario');
  assertDeepEqual(state.tables.pedido.primaryKey, ['pedido']);
  assertDeepEqual(state.tables.pedido.foreignKeys, ['funcionario']);
});

test('relacionamento exige FK na origem e PK no destino', async () => {
  const data = await phasePromise;
  let state = buildExpectedTables(data);
  state = togglePrimaryKey(state, data, 'pedido', 'pedido');
  state = togglePrimaryKey(state, data, 'funcionario', 'funcionario');
  state = togglePrimaryKey(state, data, 'departamento', 'departamento');
  state = toggleForeignKey(state, data, 'pedido', 'funcionario');
  state = toggleForeignKey(state, data, 'funcionario', 'departamento');

  const ready = canAddRelationship(
    state,
    data,
    'pedido',
    'funcionario',
    'funcionario',
    'funcionario'
  );
  assertEqual(ready.valid, true);

  const missingTargetKey = canAddRelationship(
    state,
    data,
    'pedido',
    'cliente',
    'funcionario',
    'funcionario'
  );
  assertEqual(missingTargetKey.valid, false);
});

test('o estado esperado é válido, sem perda de junção e preserva dependências', async () => {
  const data = await phasePromise;
  let state = buildExpectedState(data);
  const result = validatePhase(state, data);

  assert(result.valid, result.errors.map((error) => error.message).join(' '));
  assertEqual(result.lossless, true);
  assertEqual(result.preserved, true);
  assertEqual(state.score, 100);
});

test('separar FUNCIONÁRIO e DEPARTAMENTO sem a dependência perde a junção', async () => {
  const data = await phasePromise;
  let state = buildExpectedState(data);
  state = {
    ...state,
    tables: {
      ...state.tables,
      funcionario: {
        attributes: ['funcionario', 'nome_funcionario'],
        primaryKey: ['funcionario'],
        foreignKeys: []
      },
      departamento: {
        attributes: ['departamento', 'localizacao'],
        primaryKey: ['departamento'],
        foreignKeys: []
      }
    }
  };

  assertEqual(isLosslessJoin(state, data), false);
  assertEqual(isDependencyPreserved(state, data), false);
  assertEqual(validatePhase(state, data).valid, false);
});

test('pontuação considera dependência, tabelas, atributos, chaves e relações', async () => {
  const data = await phasePromise;
  const state = buildExpectedState(data);

  assertEqual(countCorrectMemberships(state, data), 8);
  assertEqual(countCorrectPrimaryKeys(state, data), 3);
  assertEqual(countCorrectForeignKeys(state, data), 2);
  assertEqual(countCorrectRelationships(state, data), 2);
  assertEqual(calculateScore(state, data), 100);
});

test('snapshot e hidratação preservam a fase concluída', async () => {
  const data = await phasePromise;
  let state = buildExpectedState(data);
  state = applyValidation(state, data, validatePhase(state, data));
  const snapshot = toSnapshot(state);
  const hydrated = hydratePhaseState(data, snapshot);

  assertEqual(hydrated.completed, true);
  assertEqual(hydrated.score, 100);
  assertEqual(hydrated.keyDependencyId, state.keyDependencyId);
  assertDeepEqual(hydrated.relationships, state.relationships);
});

test('hidratação descarta dados inválidos', async () => {
  const data = await phasePromise;
  const hydrated = hydratePhaseState(data, {
    phaseId: data.id,
    keyDependencyId: 'inexistente',
    builtTables: ['pedido', 'inventada'],
    tables: {
      pedido: {
        attributes: ['pedido', 'inexistente'],
        primaryKey: ['pedido', 'inexistente'],
        foreignKeys: ['inexistente']
      }
    },
    relationships: [
      {
        fromTable: 'pedido',
        fromAttribute: 'inexistente',
        toTable: 'funcionario',
        toAttribute: 'funcionario'
      }
    ],
    completed: true
  });

  assertEqual(hydrated.keyDependencyId, null);
  assertDeepEqual(hydrated.builtTables, ['pedido']);
  assertDeepEqual(hydrated.tables.pedido.attributes, ['pedido']);
  assertEqual(hydrated.relationships.length, 0);
  assertEqual(hydrated.completed, false);
});

test('reset limpa construções, dependência, relações e pontuação', async () => {
  const data = await phasePromise;
  let state = buildExpectedState(data);
  state = applyValidation(state, data, validatePhase(state, data));
  state = resetPhaseState(data);

  assertEqual(state.keyDependencyId, null);
  assertEqual(state.builtTables.length, 0);
  assertEqual(state.relationships.length, 0);
  assertEqual(state.completed, false);
  assertEqual(state.score, 0);
});

test('dica é registrada e reduz a pontuação', async () => {
  const data = await phasePromise;
  let state = selectKeyDependency(createPhaseState(data), data, 'fd-funcionario-departamento');
  const before = state.score;
  state = useHint(state, data);

  assertEqual(state.hintsUsed, 1);
  assert(state.score < before);
});

function buildAllTables(data) {
  let state = createPhaseState(data);

  for (const tableId of ['pedido', 'funcionario', 'departamento']) {
    state = buildTable(state, data, tableId);
  }

  return state;
}

function buildExpectedTables(data, baseState = null) {
  let state = baseState ?? createPhaseState(data);

  for (const tableId of ['pedido', 'funcionario', 'departamento']) {
    if (!state.builtTables.includes(tableId)) {
      state = buildTable(state, data, tableId);
    }
  }

  for (const attributeId of ['pedido', 'cliente', 'funcionario']) {
    state = toggleMembership(state, data, 'pedido', attributeId);
  }
  for (const attributeId of ['funcionario', 'nome_funcionario', 'departamento']) {
    state = toggleMembership(state, data, 'funcionario', attributeId);
  }
  for (const attributeId of ['departamento', 'localizacao']) {
    state = toggleMembership(state, data, 'departamento', attributeId);
  }

  return state;
}

function buildExpectedState(data) {
  let state = selectKeyDependency(
    createPhaseState(data),
    data,
    'fd-funcionario-departamento'
  );
  state = buildExpectedTables(data, state);
  state = togglePrimaryKey(state, data, 'pedido', 'pedido');
  state = togglePrimaryKey(state, data, 'funcionario', 'funcionario');
  state = togglePrimaryKey(state, data, 'departamento', 'departamento');
  state = toggleForeignKey(state, data, 'pedido', 'funcionario');
  state = toggleForeignKey(state, data, 'funcionario', 'departamento');
  state = addRelationship(
    state,
    data,
    'pedido',
    'funcionario',
    'funcionario',
    'funcionario'
  );
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
