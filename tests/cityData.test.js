import { validateCityData } from '../src/data/validateCityData.js';
import { assert, assertDeepEqual, assertEqual, test } from './helpers.js';

const cityPromise = fetch('../data/city.json').then((response) => {
  if (!response.ok) {
    throw new Error(`Falha ao carregar data/city.json (HTTP ${response.status}).`);
  }

  return response.json();
});

test('city.json carrega e passa na validação estrutural', async () => {
  const data = await cityPromise;
  const result = validateCityData(data);

  assert(result.valid, result.errors.join(' '));
  assertEqual(data.city.buildings.length, 4);
  assertDeepEqual(
    data.city.buildings.map((building) => building.id).sort(),
    ['cliente', 'funcionario', 'pedido', 'produto']
  );
});

test('todos os edifícios têm atributos e registros', async () => {
  const data = await cityPromise;

  for (const building of data.city.buildings) {
    assert(Array.isArray(building.attributes), `${building.id} deve ter atributos.`);
    assert(building.attributes.length > 0, `${building.id} deve ter pelo menos um atributo.`);
    assert(
      Number.isInteger(building.recordCount) && building.recordCount >= 0,
      `${building.id} deve ter recordCount válido.`
    );
  }
});

test('todas as ruas referenciam edifícios existentes', async () => {
  const data = await cityPromise;
  const ids = new Set(data.city.buildings.map((building) => building.id));

  assert(data.city.roads.length >= 2, 'A cidade deve ter pelo menos duas ruas.');

  for (const road of data.city.roads) {
    assert(ids.has(road.from), `Rua com origem inválida: ${road.from}.`);
    assert(ids.has(road.to), `Rua com destino inválido: ${road.to}.`);
    assert(road.from !== road.to, 'Uma rua não pode ligar um edifício a ele mesmo.');
  }
});

test('o validador rejeita uma cidade incompleta', () => {
  const result = validateCityData({
    city: {
      name: 'Inválida',
      viewport: { width: 100, height: 100 },
      buildings: [],
      roads: []
    }
  });

  assert(!result.valid, 'A cidade incompleta deveria ser inválida.');
  assert(result.errors.length > 0, 'O validador deveria listar os erros.');
});
