import { validatePhaseData } from '../src/data/validatePhaseData.js';
import { assert, assertDeepEqual, assertEqual, test } from './helpers.js';

const phasePromise = fetch('../data/phases/fase-1.json').then((response) => {
  if (!response.ok) {
    throw new Error(`Falha ao carregar data/phases/fase-1.json (HTTP ${response.status}).`);
  }

  return response.json();
});

test('fase 1 carrega e passa na validação estrutural', async () => {
  const data = await phasePromise;
  const result = validatePhaseData(data);

  assert(result.valid, result.errors.join(' '));
  assertEqual(data.id, 'centro-de-distribuicao');
  assertEqual(data.normalForm, '1FN');
});

test('fase 1 tem três pedidos e cinco produtos', async () => {
  const data = await phasePromise;

  assertEqual(data.orders.length, 3);
  assertEqual(
    data.orders.reduce((total, order) => total + order.products.length, 0),
    5
  );
});

test('pedidos e produtos da fase correspondem ao enunciado', async () => {
  const data = await phasePromise;

  assertDeepEqual(
    data.orders.map((order) => ({
      id: order.id,
      customer: order.customer,
      products: order.products
    })),
    [
      { id: '001', customer: 'João', products: ['Caneta', 'Lápis'] },
      { id: '002', customer: 'Maria', products: ['Borracha', 'Régua'] },
      { id: '003', customer: 'Pedro', products: ['Caneta'] }
    ]
  );
});

test('fase 1 declara regras, conceitos e dicas', async () => {
  const data = await phasePromise;

  assert(data.rules.length > 0, 'A fase deve declarar regras.');
  assert(data.hints.length > 0, 'A fase deve declarar dicas.');
  assert(data.concepts.atomicity.length > 0, 'A fase deve explicar atomicidade.');
  assert(data.concepts.repeatingGroups.length > 0, 'A fase deve explicar grupos repetitivos.');
});

test('o validador rejeita uma fase incompleta', () => {
  const result = validatePhaseData({
    id: 'invalida',
    title: 'Inválida',
    normalForm: '1FN',
    sourceTable: 'PEDIDO',
    targetTable: 'ITEM_PEDIDO',
    objective: 'Teste',
    rules: [],
    concepts: {},
    orders: [],
    hints: [],
    scoring: {}
  });

  assert(!result.valid, 'A fase incompleta deveria ser inválida.');
  assert(result.errors.length > 0, 'O validador deveria listar os erros.');
});
