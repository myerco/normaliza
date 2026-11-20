import { PLAYER_NAV_ITEMS, playerSectionFor } from '../src/ui/playerLayout.js';
import { assertDeepEqual, assertEqual, test } from './helpers.js';

test('menu do jogador mantém a ordem da jornada', () => {
  assertDeepEqual(
    PLAYER_NAV_ITEMS.map((item) => item.label),
    ['Personagens', 'Mapa do Mundo', 'Desafios', 'Missões', 'Talentos', 'Configurações']
  );
});

test('menu do jogador aponta para as rotas existentes', () => {
  assertEqual(
    PLAYER_NAV_ITEMS.map((item) => item.href).join(','),
    '#/jogador,#/mapa,#/desafios,#/missoes,#/habilidades,#/perfil'
  );
});

test('seção ativa do menu acompanha a tela e a rota', () => {
  assertEqual(playerSectionFor('journey'), 'characters');
  assertEqual(playerSectionFor('character'), 'characters');
  assertEqual(playerSectionFor('worldMap'), 'world');
  assertEqual(playerSectionFor('track'), 'world');
  assertEqual(playerSectionFor('challenges', '#/desafios'), 'challenges');
  assertEqual(playerSectionFor('challenges', '#/missoes'), 'missions');
  assertEqual(playerSectionFor('skills'), 'talents');
  assertEqual(playerSectionFor('profile'), 'settings');
});
