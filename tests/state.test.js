import {
  PHASE,
  applyRoute,
  clearSelection,
  createInitialState,
  getHud,
  getSelectedBuilding,
  goToMenu,
  selectBuilding,
  setScore,
  startGame,
  startMission,
  startPhase
} from '../src/state/gameState.js';
import { assert, assertEqual, test } from './helpers.js';

const city = {
  city: {
    buildings: [
      {
        id: 'pedido',
        name: 'PEDIDO',
        description: 'Pedidos',
        attributes: ['id_pedido', 'valor_total'],
        recordCount: 128
      },
      {
        id: 'produto',
        name: 'PRODUTO',
        description: 'Produtos',
        attributes: ['id_produto', 'nome_produto'],
        recordCount: 24
      },
      {
        id: 'cliente',
        name: 'CLIENTE',
        description: 'Clientes',
        attributes: ['id_cliente', 'nome_cliente'],
        recordCount: 57
      }
    ]
  }
};

test('estado inicial começa na tela inicial', () => {
  const state = createInitialState(city);

  assertEqual(state.screen, 'splash');
  assertEqual(state.selectedBuildingId, null);
  assertEqual(state.activePhaseId, null);
  assertEqual(state.activeMissionId, null);
  assertEqual(state.score, 0);
  assert(state.phase === PHASE, 'O estado deve usar a fase declarada.');
});

test('startGame abre a cidade sem seleção', () => {
  const state = startGame(createInitialState(city));

  assertEqual(state.screen, 'city');
  assertEqual(state.selectedBuildingId, null);
  assertEqual(state.activePhaseId, null);
});

test('startPhase abre a fase ativa', () => {
  const state = startPhase(createInitialState(city), 'centro-de-distribuicao');

  assertEqual(state.screen, 'phase');
  assertEqual(state.activePhaseId, 'centro-de-distribuicao');
  assertEqual(state.selectedBuildingId, null);
});

test('startMission abre a missão especial', () => {
  const state = startMission(createInitialState(city), 'administracao');

  assertEqual(state.screen, 'mission');
  assertEqual(state.activeMissionId, 'administracao');
  assertEqual(state.activePhaseId, null);
  assertEqual(state.selectedBuildingId, null);
});

test('setScore atualiza a pontuação com valor válido', () => {
  const state = setScore(createInitialState(city), 85);

  assertEqual(state.score, 85);
});

test('setScore normaliza valores inválidos', () => {
  assertEqual(setScore(createInitialState(city), -10).score, 0);
  assertEqual(setScore(createInitialState(city), Number.NaN).score, 0);
  assertEqual(setScore(createInitialState(city), 12.6).score, 13);
});

test('selectBuilding seleciona um edifício existente', () => {
  const state = selectBuilding(createInitialState(city), 'pedido');

  assertEqual(state.screen, 'city');
  assertEqual(state.selectedBuildingId, 'pedido');
});

test('selectBuilding ignora um edifício inexistente', () => {
  const initial = createInitialState(city);
  const state = selectBuilding(initial, 'inexistente');

  assert(state === initial, 'O estado original deve ser preservado.');
  assertEqual(state.selectedBuildingId, null);
});

test('clearSelection remove a seleção atual', () => {
  const selected = selectBuilding(createInitialState(city), 'produto');
  const state = clearSelection(selected);

  assertEqual(state.selectedBuildingId, null);
});

test('goToMenu volta à tela inicial e limpa a seleção', () => {
  const selected = selectBuilding(createInitialState(city), 'cliente');
  const state = goToMenu(selected);

  assertEqual(state.screen, 'splash');
  assertEqual(state.selectedBuildingId, null);
});

test('getSelectedBuilding retorna os dados do edifício', () => {
  const state = selectBuilding(createInitialState(city), 'produto');
  const building = getSelectedBuilding(state);

  assert(building, 'O edifício deveria existir.');
  assertEqual(building.name, 'PRODUTO');
  assertEqual(building.recordCount, 24);
  assertEqual(building.attributes.length, 2);
});

test('getSelectedBuilding retorna null sem seleção', () => {
  assertEqual(getSelectedBuilding(createInitialState(city)), null);
});

test('getHud retorna fase e pontuação', () => {
  const hud = getHud(createInitialState(city));

  assertEqual(hud.phaseLabel, 'Fase 1 — Centro de Distribuição');
  assertEqual(hud.score, 0);
});

test('applyRoute leva rota inicial para a tela inicial', () => {
  const state = applyRoute(createInitialState(city), { screen: 'splash', buildingId: null });

  assertEqual(state.screen, 'splash');
  assertEqual(state.selectedBuildingId, null);
});

test('applyRoute abre a cidade sem edifício', () => {
  const state = applyRoute(createInitialState(city), { screen: 'city', buildingId: null });

  assertEqual(state.screen, 'city');
  assertEqual(state.selectedBuildingId, null);
});

test('applyRoute seleciona edifício válido', () => {
  const state = applyRoute(createInitialState(city), { screen: 'city', buildingId: 'cliente' });

  assertEqual(state.screen, 'city');
  assertEqual(state.selectedBuildingId, 'cliente');
});

test('applyRoute ignora edifício inválido e mantém a cidade', () => {
  const state = applyRoute(createInitialState(city), { screen: 'city', buildingId: 'inexistente' });

  assertEqual(state.screen, 'city');
  assertEqual(state.selectedBuildingId, null);
});

test('applyRoute abre a fase', () => {
  const state = applyRoute(createInitialState(city), {
    screen: 'phase',
    phaseId: 'centro-de-distribuicao'
  });

  assertEqual(state.screen, 'phase');
  assertEqual(state.activePhaseId, 'centro-de-distribuicao');
});

test('applyRoute sem fase volta ao menu', () => {
  const state = applyRoute(createInitialState(city), { screen: 'phase', phaseId: null });

  assertEqual(state.screen, 'splash');
  assertEqual(state.activePhaseId, null);
});

test('applyRoute abre a missão especial', () => {
  const state = applyRoute(createInitialState(city), {
    screen: 'mission',
    missionId: 'administracao'
  });

  assertEqual(state.screen, 'mission');
  assertEqual(state.activeMissionId, 'administracao');
});
