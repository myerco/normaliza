import {
  applyValidation,
  calculateScore,
  createPhaseState,
  getExpectedCounts,
  getItemRows,
  getOrderProgress,
  getPedidoRows,
  getPendingProducts,
  hydratePhaseState,
  isProductMoved,
  moveProduct,
  moveSelectedProducts,
  resetPhaseState,
  selectAllPending,
  toSnapshot,
  toggleProductSelection,
  useHint,
  validatePhase
} from '../src/core/fase1.js';
import { assert, assertDeepEqual, assertEqual, test } from './helpers.js';

const data = {
  id: 'centro-de-distribuicao',
  hints: ['Dica 1', 'Dica 2', 'Dica 3'],
  scoring: {
    pointsPerItem: 10,
    completionBonus: 50,
    wrongValidationPenalty: 10,
    hintPenalty: 5,
    max: 100
  },
  orders: [
    { id: '001', customer: 'João', products: ['Caneta', 'Lápis'] },
    { id: '002', customer: 'Maria', products: ['Borracha', 'Régua'] },
    { id: '003', customer: 'Pedro', products: ['Caneta'] }
  ]
};

test('estado inicial da fase tem cinco produtos pendentes', () => {
  const state = createPhaseState(data);

  assertEqual(state.score, 0);
  assertEqual(state.completed, false);
  assertEqual(state.items.length, 0);
  assertEqual(getPendingProducts(state, data).length, 5);
  assertDeepEqual(getExpectedCounts(data), { orders: 3, items: 5 });
});

test('seleção e movimentação preservam o id_pedido', () => {
  let state = createPhaseState(data);
  state = toggleProductSelection(state, data, '001', 'Caneta');
  state = toggleProductSelection(state, data, '001', 'Lápis');
  state = moveSelectedProducts(state, data);

  assertEqual(state.items.length, 2);
  assertEqual(state.selected.length, 0);
  assert(isProductMoved(state, '001', 'Caneta'), 'Caneta deveria estar movida.');
  assert(isProductMoved(state, '001', 'Lápis'), 'Lápis deveria estar movida.');
  assertDeepEqual(getItemRows(state, data), [
    { id_pedido: '001', produto: 'Caneta' },
    { id_pedido: '001', produto: 'Lápis' }
  ]);
  assertDeepEqual(getPedidoRows(state, data), [{ id_pedido: '001', cliente: 'João' }]);
});

test('moveProduct move um único produto e mantém a associação', () => {
  const state = moveProduct(createPhaseState(data), data, '003', 'Caneta');

  assertEqual(state.items.length, 1);
  assertDeepEqual(state.items[0], { orderId: '003', product: 'Caneta' });
});

test('produto inválido ou repetido não é movido', () => {
  const initial = createPhaseState(data);
  const invalid = moveProduct(initial, data, '001', 'Régua');
  assert(invalid === initial, 'Produto de outro pedido não deveria ser movido.');

  const moved = moveProduct(initial, data, '001', 'Caneta');
  const repeated = moveProduct(moved, data, '001', 'Caneta');
  assert(repeated === moved, 'O mesmo produto não deveria ser movido duas vezes.');
});

test('selectAllPending seleciona todos os produtos restantes', () => {
  const state = selectAllPending(createPhaseState(data), data);

  assertEqual(state.selected.length, 5);
});

test('progresso por pedido reflete os produtos separados', () => {
  let state = createPhaseState(data);
  state = moveProduct(state, data, '001', 'Caneta');

  assertDeepEqual(getOrderProgress(state, data, '001'), {
    total: 2,
    moved: 1,
    pending: 1,
    complete: false
  });

  state = moveProduct(state, data, '001', 'Lápis');

  assertDeepEqual(getOrderProgress(state, data, '001'), {
    total: 2,
    moved: 2,
    pending: 0,
    complete: true
  });
});

test('validação parcial identifica produtos esquecidos', () => {
  let state = createPhaseState(data);
  state = moveProduct(state, data, '001', 'Caneta');
  const result = validatePhase(state, data);

  assertEqual(result.valid, false);
  assert(result.pending.some((item) => item.product === 'Lápis'), 'Lápis deveria estar pendente.');
  assert(result.pending.some((item) => item.product === 'Borracha'), 'Borracha deveria estar pendente.');
  assert(result.errors.some((error) => error.code === 'pending'), 'Erro de pendência ausente.');
  assert(result.errors.some((error) => error.code === 'incomplete-orders'), 'Erro de pedido incompleto ausente.');
});

test('validação completa produz as tabelas esperadas', () => {
  const state = completeAll(createPhaseState(data), data);
  const result = validatePhase(state, data);

  assertEqual(result.valid, true);
  assertEqual(result.pending.length, 0);
  assertEqual(result.itemRows.length, 5);
  assertEqual(result.pedidoRows.length, 3);
  assertDeepEqual(result.pedidoRows, [
    { id_pedido: '001', cliente: 'João' },
    { id_pedido: '002', cliente: 'Maria' },
    { id_pedido: '003', cliente: 'Pedro' }
  ]);
  assertDeepEqual(result.itemRows, [
    { id_pedido: '001', produto: 'Caneta' },
    { id_pedido: '001', produto: 'Lápis' },
    { id_pedido: '002', produto: 'Borracha' },
    { id_pedido: '002', produto: 'Régua' },
    { id_pedido: '003', produto: 'Caneta' }
  ]);
});

test('a associação errada com o pedido é rejeitada', () => {
  const tampered = {
    ...createPhaseState(data),
    items: [{ orderId: '001', product: 'Régua' }]
  };
  const result = validatePhase(tampered, data);

  assertEqual(result.valid, false);
  assert(result.errors.some((error) => error.code === 'association'), 'Erro de associação ausente.');
  assert(result.pending.some((item) => item.product === 'Régua'), 'Régua deveria estar pendente no pedido 002.');
});

test('itens duplicados são rejeitados', () => {
  const base = completeAll(createPhaseState(data), data);
  const tampered = {
    ...base,
    items: [...base.items, { orderId: '001', product: 'Caneta' }]
  };
  const result = validatePhase(tampered, data);

  assertEqual(result.valid, false);
  assert(result.errors.some((error) => error.code === 'duplicate'), 'Erro de duplicidade ausente.');
});

test('pontuação considera itens, conclusão e penalidades', () => {
  const partial = moveProduct(createPhaseState(data), data, '001', 'Caneta');
  assertEqual(calculateScore(partial, data), 10);

  const completed = completeAll(createPhaseState(data), data);
  assertEqual(calculateScore(completed, data), 50);

  let validated = applyValidation(completed, data, validatePhase(completed, data));
  assertEqual(validated.completed, true);
  assertEqual(validated.score, 100);

  validated = applyValidation(createPhaseState(data), data, validatePhase(createPhaseState(data), data));
  assertEqual(validated.failedValidations, 1);
  assertEqual(validated.score, 0);

  const hinted = useHint(completed, data);
  assertEqual(hinted.hintsUsed, 1);
  assertEqual(hinted.score, 45);
});

test('a validação incorreta reduz a pontuação final', () => {
  let state = createPhaseState(data);
  state = applyValidation(state, data, validatePhase(state, data));
  state = completeAll(state, data);
  state = applyValidation(state, data, validatePhase(state, data));

  assertEqual(state.completed, true);
  assertEqual(state.failedValidations, 1);
  assertEqual(state.score, 90);
});

test('dica é registrada e reduz a pontuação', () => {
  const state = useHint(createPhaseState(data), data);

  assertEqual(state.hintsUsed, 1);
  assertEqual(state.revealedHints, 1);
  assertEqual(state.feedback.type, 'hint');
  assertEqual(state.score, 0);
});

test('snapshot e hidratação preservam o progresso', () => {
  let state = completeAll(createPhaseState(data), data);
  state = applyValidation(state, data, validatePhase(state, data));
  const snapshot = toSnapshot(state);
  const hydrated = hydratePhaseState(data, snapshot);

  assertDeepEqual(hydrated.items, state.items);
  assertEqual(hydrated.completed, true);
  assertEqual(hydrated.score, 100);
  assertDeepEqual(toSnapshot(hydrated).items, snapshot.items);
});

test('hidratação descarta itens inválidos e duplicados', () => {
  const snapshot = {
    phaseId: data.id,
    items: [
      { orderId: '001', product: 'Caneta' },
      { orderId: '001', product: 'Caneta' },
      { orderId: '001', product: 'Régua' },
      { orderId: '999', product: 'Inexistente' }
    ],
    failedValidations: 0,
    hintsUsed: 0,
    revealedHints: 0,
    completed: true
  };
  const state = hydratePhaseState(data, snapshot);

  assertEqual(state.items.length, 1);
  assertDeepEqual(state.items[0], { orderId: '001', product: 'Caneta' });
  assertEqual(state.completed, false);
});

test('hidratação de fase diferente retorna estado inicial', () => {
  const state = hydratePhaseState(data, { phaseId: 'outra-fase', items: [] });

  assertEqual(state.items.length, 0);
  assertEqual(state.score, 0);
});

test('reset limpa itens e pontuação', () => {
  let state = completeAll(createPhaseState(data), data);
  state = applyValidation(state, data, validatePhase(state, data));
  state = resetPhaseState(data);

  assertEqual(state.items.length, 0);
  assertEqual(state.completed, false);
  assertEqual(state.score, 0);
  assertEqual(state.failedValidations, 0);
  assertEqual(state.hintsUsed, 0);
});

function completeAll(state, phaseData) {
  return moveSelectedProducts(selectAllPending(state, phaseData), phaseData);
}
