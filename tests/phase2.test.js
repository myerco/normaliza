import {
  addDependency,
  applyValidation,
  calculateScore,
  canAddDependency,
  countCorrectDependencies,
  countCorrectMemberships,
  countCorrectPrimaryKeys,
  createPhaseState,
  hydratePhaseState,
  isDependencyPreserved,
  isLosslessJoin,
  removeDependency,
  resetPhaseState,
  toSnapshot,
  toggleMembership,
  togglePrimaryKey,
  useHint,
  validatePhase
} from '../src/core/fase2.js';
import { assert, assertDeepEqual, assertEqual, test } from './helpers.js';

const data = {
  id: 'rede-de-dependencias',
  hints: ['Dica 1', 'Dica 2', 'Dica 3'],
  attributes: [
    { id: 'pedido', label: 'Pedido', role: 'key' },
    { id: 'produto', label: 'Produto', role: 'key' },
    { id: 'quantidade', label: 'Quantidade', role: 'dependent' },
    { id: 'descricao', label: 'Descrição', role: 'dependent' },
    { id: 'preco', label: 'Preço', role: 'dependent' }
  ],
  candidateKey: ['pedido', 'produto'],
  functionalDependencies: [
    {
      id: 'fd-quantidade',
      determinant: ['pedido', 'produto'],
      dependent: 'quantidade',
      type: 'total',
      label: '(Pedido, Produto) → Quantidade'
    },
    {
      id: 'fd-descricao',
      determinant: ['produto'],
      dependent: 'descricao',
      type: 'partial',
      label: 'Produto → Descrição'
    },
    {
      id: 'fd-preco',
      determinant: ['produto'],
      dependent: 'preco',
      type: 'partial',
      label: 'Produto → Preço'
    }
  ],
  targetTables: [
    {
      id: 'item_pedido',
      name: 'ITEM_PEDIDO',
      attributes: ['pedido', 'produto', 'quantidade'],
      primaryKey: ['pedido', 'produto']
    },
    {
      id: 'produto',
      name: 'PRODUTO',
      attributes: ['produto', 'descricao', 'preco'],
      primaryKey: ['produto']
    }
  ],
  scoring: {
    pointsPerDependency: 10,
    pointsPerMembership: 5,
    pointsPerPrimaryKey: 10,
    completionBonus: 10,
    wrongValidationPenalty: 10,
    hintPenalty: 5,
    max: 100
  }
};

test('estado inicial da fase 2 está vazio', () => {
  const state = createPhaseState(data);

  assertEqual(state.dependencies.length, 0);
  assertEqual(state.tables.item_pedido.attributes.length, 0);
  assertEqual(state.tables.produto.attributes.length, 0);
  assertEqual(state.score, 0);
  assertEqual(state.completed, false);
});

test('canAddDependency valida determinante, dependente e tipo', () => {
  const state = createPhaseState(data);

  assertEqual(canAddDependency(state, data, [], 'quantidade', 'total').valid, false);
  assertEqual(canAddDependency(state, data, ['pedido'], 'pedido', 'total').valid, false);
  assertEqual(canAddDependency(state, data, ['pedido'], 'quantidade', null).valid, false);
  assertEqual(canAddDependency(state, data, ['pedido', 'produto'], 'quantidade', 'total').valid, true);
});

test('addDependency normaliza o determinante e pontua', () => {
  const state = addDependency(createPhaseState(data), data, ['produto', 'pedido'], 'quantidade', 'total');

  assertEqual(state.dependencies.length, 1);
  assertDeepEqual(state.dependencies[0].determinant, ['pedido', 'produto']);
  assertEqual(state.dependencies[0].dependent, 'quantidade');
  assertEqual(state.dependencies[0].type, 'total');
  assertEqual(state.score, 10);
});

test('conexão duplicada é recusada', () => {
  const first = addDependency(createPhaseState(data), data, ['produto'], 'descricao', 'partial');
  const second = addDependency(first, data, ['produto'], 'descricao', 'partial');

  assertEqual(second.dependencies.length, 1);
});

test('removeDependency remove a conexão', () => {
  const first = addDependency(createPhaseState(data), data, ['produto'], 'preco', 'partial');
  const removed = removeDependency(first, data, first.dependencies[0].id);

  assertEqual(removed.dependencies.length, 0);
});

test('o mesmo atributo pode ser incluído nas duas tabelas', () => {
  let state = createPhaseState(data);
  state = toggleMembership(state, data, 'item_pedido', 'produto');
  state = toggleMembership(state, data, 'produto', 'produto');

  assert(state.tables.item_pedido.attributes.includes('produto'), 'Produto deveria estar em ITEM_PEDIDO.');
  assert(state.tables.produto.attributes.includes('produto'), 'Produto deveria estar em PRODUTO.');
});

test('toggleMembership remove o atributo e a PK', () => {
  let state = createPhaseState(data);
  state = toggleMembership(state, data, 'item_pedido', 'pedido');
  state = togglePrimaryKey(state, data, 'item_pedido', 'pedido');
  state = toggleMembership(state, data, 'item_pedido', 'pedido');

  assertEqual(state.tables.item_pedido.attributes.length, 0);
  assertEqual(state.tables.item_pedido.primaryKey.length, 0);
});

test('PK só pode ser marcada em atributo da tabela', () => {
  let state = createPhaseState(data);
  state = togglePrimaryKey(state, data, 'item_pedido', 'pedido');
  assertEqual(state.tables.item_pedido.primaryKey.length, 0);

  state = toggleMembership(state, data, 'item_pedido', 'pedido');
  state = togglePrimaryKey(state, data, 'item_pedido', 'pedido');
  assertEqual(state.tables.item_pedido.primaryKey.length, 1);
});

test('estado esperado é válido e alcança 2FN', () => {
  const state = buildExpectedState();
  const result = validatePhase(state, data);

  assert(result.valid, result.errors.map((error) => error.message).join(' '));
  assertEqual(result.lossless, true);
  assertEqual(result.preserved, true);
  assertEqual(result.errors.length, 0);
  assertEqual(isLosslessJoin(state, data), true);
  assertEqual(isDependencyPreserved(state, data), true);
});

test('agrupamento correto sem dependências declaradas é inválido', () => {
  const state = buildExpectedTables();
  const result = validatePhase(state, data);

  assertEqual(result.valid, false);
  assert(result.errors.some((error) => error.code === 'missing-dependency'), 'Faltam dependências.');
});

test('dependências corretas sem agrupamento são inválidas', () => {
  const state = buildExpectedDependencies();
  const result = validatePhase(state, data);

  assertEqual(result.valid, false);
  assert(result.errors.some((error) => error.code === 'table-missing'), 'Faltam atributos nas tabelas.');
});

test('classificação parcial incorreta é rejeitada', () => {
  let state = createPhaseState(data);
  state = addDependency(state, data, ['produto'], 'descricao', 'total');
  const result = validatePhase(state, data);

  assertEqual(result.valid, false);
  assert(result.errors.some((error) => error.code === 'wrong-type'), 'Tipo incorreto não detectado.');
});

test('dependência não declarada é rejeitada', () => {
  const state = addDependency(createPhaseState(data), data, ['pedido'], 'descricao', 'total');
  const result = validatePhase(state, data);

  assertEqual(result.valid, false);
  assert(result.errors.some((error) => error.code === 'extra-dependency'), 'Dependência extra não detectada.');
});

test('Descrição ou Preço em ITEM_PEDIDO é rejeitado com explicação', () => {
  let state = buildExpectedState();
  state = toggleMembership(state, data, 'item_pedido', 'descricao');
  const result = validatePhase(state, data);

  assertEqual(result.valid, false);
  assert(
    result.errors.some((error) => error.code === 'partial-in-item'),
    'Erro de dependência parcial em ITEM_PEDIDO não detectado.'
  );
});

test('PK ausente é rejeitada', () => {
  let state = buildExpectedState();
  state = togglePrimaryKey(state, data, 'produto', 'produto');
  const result = validatePhase(state, data);

  assertEqual(result.valid, false);
  assert(result.errors.some((error) => error.code === 'pk-missing'), 'PK ausente não detectada.');
});

test('pontuação cresce com dependências, atributos e PKs', () => {
  const dependencies = buildExpectedDependencies();
  assertEqual(countCorrectDependencies(dependencies, data), 3);
  assertEqual(dependencies.score, 30);

  const tables = buildExpectedTables();
  assertEqual(countCorrectMemberships(tables, data), 6);
  assertEqual(tables.score, 30);

  const full = buildExpectedState();
  assertEqual(countCorrectPrimaryKeys(full, data), 3);
  assertEqual(full.score, 90);
  assertEqual(calculateScore(full, data), 90);
});

test('conclusão adiciona bônus e validação incorreta penaliza', () => {
  let state = buildExpectedState();
  state = applyValidation(state, data, validatePhase(state, data));

  assertEqual(state.completed, true);
  assertEqual(state.score, 100);

  let penalized = buildExpectedState();
  penalized = applyValidation(penalized, data, validatePhase(createPhaseState(data), data));
  penalized = applyValidation(penalized, data, validatePhase(penalized, data));

  assertEqual(penalized.completed, true);
  assertEqual(penalized.failedValidations, 1);
  assertEqual(penalized.score, 90);
});
test('penalidade de validação incorreta persiste no placar', () => {
  let state = buildExpectedState();
  state = applyValidation(state, data, validatePhase(createPhaseState(data), data));

  assertEqual(state.failedValidations, 1);
  assertEqual(state.score, 80);
});

test('dica é registrada e reduz a pontuação', () => {
  const state = useHint(buildExpectedState(), data);

  assertEqual(state.hintsUsed, 1);
  assertEqual(state.revealedHints, 1);
  assertEqual(state.score, 85);
});

test('snapshot e hidratação preservam a fase concluída', () => {
  let state = buildExpectedState();
  state = applyValidation(state, data, validatePhase(state, data));
  const snapshot = toSnapshot(state);
  const hydrated = hydratePhaseState(data, snapshot);

  assertDeepEqual(hydrated.dependencies, state.dependencies);
  assertDeepEqual(hydrated.tables, state.tables);
  assertEqual(hydrated.completed, true);
  assertEqual(hydrated.score, 100);
});

test('hidratação descarta dados inválidos', () => {
  const state = hydratePhaseState(data, {
    phaseId: data.id,
    dependencies: [
      { determinant: ['produto'], dependent: 'inexistente', type: 'partial' },
      { determinant: ['produto'], dependent: 'descricao', type: 'partial' },
      { determinant: ['produto'], dependent: 'descricao', type: 'partial' }
    ],
    tables: {
      item_pedido: { attributes: ['pedido', 'inexistente'], primaryKey: ['inexistente'] },
      produto: { attributes: ['produto'], primaryKey: ['produto', 'descricao'] }
    },
    failedValidations: 0,
    hintsUsed: 0,
    revealedHints: 0,
    completed: true
  });

  assertEqual(state.dependencies.length, 1);
  assertDeepEqual(state.tables.item_pedido.attributes, ['pedido']);
  assertEqual(state.tables.item_pedido.primaryKey.length, 0);
  assertDeepEqual(state.tables.produto.primaryKey, ['produto']);
  assertEqual(state.completed, false);
});

test('reset limpa dependências, tabelas e pontuação', () => {
  let state = buildExpectedState();
  state = applyValidation(state, data, validatePhase(state, data));
  state = resetPhaseState(data);

  assertEqual(state.dependencies.length, 0);
  assertEqual(state.tables.item_pedido.attributes.length, 0);
  assertEqual(state.tables.produto.attributes.length, 0);
  assertEqual(state.completed, false);
  assertEqual(state.score, 0);
});

function buildExpectedDependencies() {
  let state = createPhaseState(data);

  for (const dependency of data.functionalDependencies) {
    state = addDependency(
      state,
      data,
      dependency.determinant,
      dependency.dependent,
      dependency.type
    );
  }

  return state;
}

function buildExpectedTables(state = createPhaseState(data)) {
  let next = state;

  for (const target of data.targetTables) {
    for (const attributeId of target.attributes) {
      next = toggleMembership(next, data, target.id, attributeId);
    }
  }

  return next;
}

function buildExpectedState() {
  let state = buildExpectedDependencies();
  state = buildExpectedTables(state);

  for (const target of data.targetTables) {
    for (const attributeId of target.primaryKey) {
      state = togglePrimaryKey(state, data, target.id, attributeId);
    }
  }

  return state;
}
