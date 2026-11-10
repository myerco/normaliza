import { validateMissionData } from '../src/data/validateMissionData.js';
import { assert, assertEqual, test } from './helpers.js';

const missionPromise = fetch('../data/missions/administracao.json').then((response) => {
  if (!response.ok) {
    throw new Error(
      `Falha ao carregar data/missions/administracao.json (HTTP ${response.status}).`
    );
  }
  return response.json();
});

test('missão Administração carrega e é válida', async () => {
  const mission = await missionPromise;
  const result = validateMissionData(mission);

  assert(result.valid, result.errors.join(' '));
  assertEqual(mission.id, 'administracao');
});

test('missão contém as três anomalias', async () => {
  const mission = await missionPromise;

  assertEqual(mission.update.employees.length, 3);
  assertEqual(mission.insert.newProduct.descricao, 'Grampeador');
  assertEqual(mission.delete.orderId, '002');
  assert(mission.completion.summary.length >= 3, 'A missão deve resumir as três anomalias.');
});

test('exclusão do pedido 002 contém produtos que serão perdidos', async () => {
  const mission = await missionPromise;
  const deletedRows = mission.delete.orders.filter(
    (order) => order.pedido === mission.delete.orderId
  );

  assertEqual(
    deletedRows.map((order) => order.descricao).sort().join(','),
    'Borracha,Régua'
  );
});

test('o validador rejeita uma missão incompleta', () => {
  const result = validateMissionData({
    id: 'invalida',
    title: 'Inválida',
    subtitle: 'Teste',
    intro: 'Teste',
    update: {},
    insert: {},
    delete: {},
    completion: {}
  });

  assert(!result.valid, 'A missão incompleta deveria ser inválida.');
  assert(result.errors.length > 0, 'O validador deveria listar os erros.');
});
