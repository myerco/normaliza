import { parseRoute, toHash } from '../src/router/router.js';
import { assert, assertDeepEqual, assertEqual, test } from './helpers.js';

test('hash vazio representa a tela inicial', () => {
  assertDeepEqual(parseRoute(''), { screen: 'splash', buildingId: null });
  assertDeepEqual(parseRoute('#/'), { screen: 'splash', buildingId: null });
});

test('hash da cidade sem edifício', () => {
  assertDeepEqual(parseRoute('#/cidade'), { screen: 'city', buildingId: null });
  assertDeepEqual(parseRoute('/cidade/'), { screen: 'city', buildingId: null });
});

test('hash da cidade com edifício', () => {
  assertDeepEqual(parseRoute('#/cidade/pedido'), { screen: 'city', buildingId: 'pedido' });
});

test('hash desconhecido volta para a tela inicial', () => {
  assertDeepEqual(parseRoute('#/desconhecido'), { screen: 'splash', buildingId: null });
});

test('hash da fase', () => {
  assertDeepEqual(parseRoute('#/fase/centro-de-distribuicao'), {
    screen: 'phase',
    phaseId: 'centro-de-distribuicao',
    buildingId: null
  });
  assertDeepEqual(parseRoute('#/fase/rede-de-dependencias'), {
    screen: 'phase',
    phaseId: 'rede-de-dependencias',
    buildingId: null
  });
});

test('hash de fase sem identificador volta para a cidade', () => {
  assertDeepEqual(parseRoute('#/fase'), { screen: 'city', buildingId: null });
});

test('hash da missão especial', () => {
  assertDeepEqual(parseRoute('#/missao/administracao'), {
    screen: 'mission',
    missionId: 'administracao',
    buildingId: null
  });
});

test('toHash gera as rotas esperadas', () => {
  assertEqual(toHash({ screen: 'splash' }), '#/');
  assertEqual(toHash({ screen: 'city', buildingId: null }), '#/cidade');
  assertEqual(toHash({ screen: 'city', buildingId: 'pedido' }), '#/cidade/pedido');
  assertEqual(
    toHash({ screen: 'phase', phaseId: 'centro-de-distribuicao' }),
    '#/fase/centro-de-distribuicao'
  );
  assertEqual(
    toHash({ screen: 'mission', missionId: 'administracao' }),
    '#/missao/administracao'
  );
});

test('rota com edifício faz round-trip', () => {
  const route = { screen: 'city', buildingId: 'produto' };
  assertDeepEqual(parseRoute(toHash(route)), route);
});

test('IDs são codificados e decodificados', () => {
  const route = { screen: 'city', buildingId: 'produto especial' };
  const hash = toHash(route);

  assert(hash.includes('%20'), 'O hash deveria codificar o espaço.');
  assertDeepEqual(parseRoute(hash), route);
});
