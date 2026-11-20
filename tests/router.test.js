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

test('rotas do mapa de conhecimento', () => {
  assertDeepEqual(parseRoute('#/mapa'), { screen: 'worldMap', buildingId: null });
  assertDeepEqual(parseRoute('#/arvore'), { screen: 'worldMap', buildingId: null });
  assertDeepEqual(parseRoute('#/territorio/dados'), {
    screen: 'territory',
    territoryId: 'dados',
    buildingId: null
  });
  assertDeepEqual(parseRoute('#/trilha/modelagem-normalizacao'), {
    screen: 'track',
    trackId: 'modelagem-normalizacao',
    buildingId: null
  });
  assertDeepEqual(parseRoute('#/quest/normaliza'), {
    screen: 'questDetail',
    questId: 'normaliza',
    buildingId: null
  });
  assertEqual(toHash({ screen: 'worldMap' }), '#/mapa');
  assertEqual(
    toHash({ screen: 'territory', territoryId: 'dados' }),
    '#/territorio/dados'
  );
  assertEqual(
    toHash({ screen: 'track', trackId: 'modelagem-normalizacao' }),
    '#/trilha/modelagem-normalizacao'
  );
  assertEqual(
    toHash({ screen: 'questDetail', questId: 'normaliza' }),
    '#/quest/normaliza'
  );
  assertDeepEqual(parseRoute('#/habilidades'), { screen: 'skills', buildingId: null });
  assertDeepEqual(parseRoute('#/especializacoes'), {
    screen: 'specializations',
    buildingId: null
  });
  assertEqual(toHash({ screen: 'skills' }), '#/habilidades');
  assertEqual(toHash({ screen: 'specializations' }), '#/especializacoes');
  assertDeepEqual(parseRoute('#/admin/mapas'), { screen: 'adminWorld', buildingId: null });
  assertDeepEqual(parseRoute('#/admin/mundo'), { screen: 'adminWorld', buildingId: null });
  assertEqual(toHash({ screen: 'adminWorld' }), '#/admin/mapas');
  assertEqual(toHash({ screen: 'adminUsers' }), '#/admin/usuarios');
  assertEqual(
    toHash({ screen: 'adminUser', userId: 'user-1' }),
    '#/admin/usuarios/user-1'
  );
  assertEqual(toHash({ screen: 'adminPlayers' }), '#/admin/jogadores');
  assertEqual(toHash({ screen: 'adminContent' }), '#/admin/cadastros');
  assertEqual(toHash({ screen: 'adminSettings' }), '#/admin/configuracoes');
  assertEqual(toHash({ screen: 'adminAudit' }), '#/admin/auditoria');
});

test('rotas públicas, autenticação e área do jogador', () => {
  assertDeepEqual(parseRoute('#/login'), { screen: 'login', buildingId: null });
  assertDeepEqual(parseRoute('#/registro'), { screen: 'register', buildingId: null });
  assertDeepEqual(parseRoute('#/recuperar-senha'), { screen: 'recover', buildingId: null });
  assertDeepEqual(parseRoute('#/onboarding'), { screen: 'onboarding', buildingId: null });
  assertDeepEqual(parseRoute('#/jogador'), { screen: 'journey', buildingId: null });
  assertDeepEqual(parseRoute('#/missoes'), { screen: 'challenges', buildingId: null });
  assertDeepEqual(parseRoute('#/jogador/mundo'), { screen: 'worldMap', buildingId: null });
  assertDeepEqual(parseRoute('#/jogador/habilidades'), { screen: 'skills', buildingId: null });
  assertDeepEqual(parseRoute('#/jogador/quest/normaliza'), {
    screen: 'questDetail',
    questId: 'normaliza',
    buildingId: null
  });
  assertEqual(toHash({ screen: 'login' }), '#/login');
  assertEqual(toHash({ screen: 'register' }), '#/registro');
  assertEqual(toHash({ screen: 'recover' }), '#/recuperar-senha');
  assertEqual(toHash({ screen: 'onboarding' }), '#/onboarding');
  assertEqual(toHash({ screen: 'journey' }), '#/jogador');
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
