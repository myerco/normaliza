import {
  addNormalizedProduct,
  attemptDenormalizedInsert,
  createMissionState,
  deleteDenormalizedOrder,
  deleteNormalizedOrder,
  getNormalizedEmployees,
  getProgress,
  resetScenario,
  selectTab,
  updateDenormalizedLocation,
  updateNormalizedLocation
} from '../src/core/administration.js';
import { assert, assertDeepEqual, assertEqual, test } from './helpers.js';

const data = {
  id: 'administracao',
  update: {
    department: 'TI',
    oldLocation: 'Porto Velho',
    newLocation: 'Ariquemes',
    employees: [
      { cpf: '111', nome: 'João', departamento: 'TI', localizacao: 'Porto Velho' },
      { cpf: '222', nome: 'Maria', departamento: 'RH', localizacao: 'Ji-Paraná' },
      { cpf: '333', nome: 'Pedro', departamento: 'TI', localizacao: 'Porto Velho' }
    ],
    explanations: {
      oneRow: 'Uma linha atualizada, outra não.',
      allRows: 'Várias linhas atualizadas.',
      normalized: 'Uma linha normalizada.'
    }
  },
  insert: {
    newProduct: { produto: '1005', descricao: 'Grampeador', categoria: 'Escritório', preco: '12,00' },
    orders: [
      { pedido: '001', produto: '1001', quantidade: 2, descricao: 'Caneta', preco: '1,50' },
      { pedido: '001', produto: '1002', quantidade: 1, descricao: 'Lápis', preco: '1,00' },
      { pedido: '002', produto: '1003', quantidade: 1, descricao: 'Borracha', preco: '2,00' },
      { pedido: '002', produto: '1004', quantidade: 3, descricao: 'Régua', preco: '3,00' }
    ],
    products: [
      { produto: '1001', descricao: 'Caneta', categoria: 'Escritório', preco: '1,50' },
      { produto: '1002', descricao: 'Lápis', categoria: 'Escritório', preco: '1,00' },
      { produto: '1003', descricao: 'Borracha', categoria: 'Escritório', preco: '2,00' },
      { produto: '1004', descricao: 'Régua', categoria: 'Escritório', preco: '3,00' }
    ],
    explanations: { blocked: 'Sem pedido.', normalized: 'Produto independente.' }
  },
  delete: {
    orderId: '002',
    orders: [
      { pedido: '001', produto: '1001', quantidade: 2, descricao: 'Caneta', preco: '1,50' },
      { pedido: '001', produto: '1002', quantidade: 1, descricao: 'Lápis', preco: '1,00' },
      { pedido: '002', produto: '1003', quantidade: 1, descricao: 'Borracha', preco: '2,00' },
      { pedido: '002', produto: '1004', quantidade: 3, descricao: 'Régua', preco: '3,00' }
    ],
    products: [
      { produto: '1001', descricao: 'Caneta', categoria: 'Escritório', preco: '1,50' },
      { produto: '1002', descricao: 'Lápis', categoria: 'Escritório', preco: '1,00' },
      { produto: '1003', descricao: 'Borracha', categoria: 'Escritório', preco: '2,00' },
      { produto: '1004', descricao: 'Régua', categoria: 'Escritório', preco: '3,00' }
    ],
    explanations: { denormalized: 'Produtos perdidos.', normalized: 'Produtos preservados.' }
  },
  completion: { title: 'Concluída', message: 'Ok', summary: ['a'] }
};

test('estado inicial da missão tem três anomalias pendentes', () => {
  const state = createMissionState(data);
  const progress = getProgress(state);

  assertEqual(state.activeTab, 'update');
  assertEqual(progress.completed, 0);
  assertEqual(progress.total, 3);
  assertEqual(state.completed, false);
});

test('selecionar aba altera apenas a aba ativa', () => {
  const state = selectTab(createMissionState(data), 'delete');

  assertEqual(state.activeTab, 'delete');
  assertEqual(state.scenarios.delete.completed, false);
});

test('atualizar uma linha gera inconsistência', () => {
  const state = updateDenormalizedLocation(createMissionState(data), data, '111');
  const scenario = state.scenarios.update;

  assertEqual(scenario.rows[0].localizacao, 'Ariquemes');
  assertEqual(scenario.rows[2].localizacao, 'Porto Velho');
  assertEqual(scenario.inconsistent, true);
  assertEqual(scenario.consistent, false);
  assertEqual(scenario.feedback.type, 'error');
  assertEqual(scenario.completed, false);
});

test('atualização normalizada completa o cenário', () => {
  let state = updateDenormalizedLocation(createMissionState(data), data, '111');
  state = updateNormalizedLocation(state, data);
  const scenario = state.scenarios.update;
  const employees = getNormalizedEmployees(state);

  assertEqual(scenario.normalizedUpdated, true);
  assertEqual(scenario.departments.find((item) => item.departamento === 'TI').localizacao, 'Ariquemes');
  assertDeepEqual(
    employees.filter((employee) => employee.departamento === 'TI').map((employee) => employee.localizacao),
    ['Ariquemes', 'Ariquemes']
  );
  assertEqual(scenario.completed, true);
  assertEqual(scenario.feedback.type, 'success');
});

test('atualizar todas as linhas é consistente, mas múltiplo', () => {
  let state = updateDenormalizedLocation(createMissionState(data), data, null);
  const scenario = state.scenarios.update;

  assertEqual(scenario.consistent, true);
  assertEqual(scenario.inconsistent, false);
  assertEqual(scenario.feedback.type, 'warning');
  assertEqual(scenario.completed, false);

  state = updateNormalizedLocation(state, data);
  assertEqual(state.scenarios.update.completed, true);
});

test('inserção desnormalizada é bloqueada', () => {
  const state = attemptDenormalizedInsert(createMissionState(data), data);
  const scenario = state.scenarios.insert;

  assertEqual(scenario.denormalizedAttempt, true);
  assertEqual(scenario.products.length, 4);
  assertEqual(scenario.feedback.type, 'error');
  assertEqual(scenario.completed, false);
});

test('produto é cadastrado no modelo normalizado', () => {
  let state = attemptDenormalizedInsert(createMissionState(data), data);
  state = addNormalizedProduct(state, data);
  const scenario = state.scenarios.insert;

  assertEqual(scenario.products.length, 5);
  assertEqual(scenario.products[4].descricao, 'Grampeador');
  assertEqual(scenario.normalizedAdded, true);
  assertEqual(scenario.feedback.type, 'success');
  assertEqual(scenario.completed, true);
});

test('exclusão desnormalizada perde produtos', () => {
  const state = deleteDenormalizedOrder(createMissionState(data), data);
  const scenario = state.scenarios.delete;

  assertEqual(scenario.denormalizedOrders.length, 2);
  assertEqual(scenario.normalizedOrders.length, 4);
  assertDeepEqual(
    scenario.lostProducts.map((product) => product.descricao),
    ['Borracha', 'Régua']
  );
  assertEqual(scenario.denormalizedDeleted, true);
  assertEqual(scenario.feedback.type, 'error');
  assertEqual(scenario.completed, false);
});

test('exclusão normalizada preserva produtos', () => {
  let state = deleteDenormalizedOrder(createMissionState(data), data);
  state = deleteNormalizedOrder(state, data);
  const scenario = state.scenarios.delete;

  assertEqual(scenario.normalizedOrders.length, 2);
  assertEqual(scenario.products.length, 4);
  assertEqual(scenario.normalizedDeleted, true);
  assertEqual(scenario.feedback.type, 'success');
  assertEqual(scenario.completed, true);
});

test('reset de cenário restaura apenas aquele cenário', () => {
  let state = createMissionState(data);
  state = updateDenormalizedLocation(state, data, '111');
  state = updateNormalizedLocation(state, data);
  state = attemptDenormalizedInsert(state, data);
  state = addNormalizedProduct(state, data);
  state = resetScenario(state, data, 'update');

  assertEqual(state.scenarios.update.completed, false);
  assertEqual(state.scenarios.update.rows[0].localizacao, 'Porto Velho');
  assertEqual(state.scenarios.insert.completed, true);
  assertEqual(state.completed, false);
});

test('missão é concluída após as três anomalias', () => {
  let state = createMissionState(data);
  state = updateDenormalizedLocation(state, data, '111');
  state = updateNormalizedLocation(state, data);
  state = attemptDenormalizedInsert(state, data);
  state = addNormalizedProduct(state, data);
  state = deleteDenormalizedOrder(state, data);
  state = deleteNormalizedOrder(state, data);

  assertEqual(state.scenarios.update.completed, true);
  assertEqual(state.scenarios.insert.completed, true);
  assertEqual(state.scenarios.delete.completed, true);
  assertDeepEqual(getProgress(state), { completed: 3, total: 3 });
  assertEqual(state.completed, true);
});
