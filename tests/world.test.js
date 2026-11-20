import {
  professionAffinities,
  progressForTerritory,
  progressForTrack,
  suggestedProfessions,
  trackSkills,
  worldProgress
} from '../src/core/world.js';
import {
  WORLD_CATALOG_KEY,
  loadWorldCatalog,
  resetWorldCatalog
} from '../src/persistence/worldStorage.js';
import { assert, assertEqual, test } from './helpers.js';

function freshWorld() {
  globalThis.localStorage?.removeItem(WORLD_CATALOG_KEY);
  return loadWorldCatalog();
}

test('mundo contém cinco territórios e catálogo normalizado', () => {
  const world = freshWorld();
  assertEqual(world.territories.length, 5);
  assert(world.tracks.length >= 40);
  assert(world.skills.length >= 30);
  assert(world.professions.length >= 10);
  assertEqual(new Set(world.territories.map((territory) => territory.id)).size, 5);
  assertEqual(new Set(world.tracks.map((track) => track.id)).size, world.tracks.length);
  assertEqual(new Set(world.skills.map((skill) => skill.id)).size, world.skills.length);
});

test('NORMALIZA pertence à trilha de modelagem e normalização', () => {
  const world = freshWorld();
  const track = world.tracks.find((item) => item.id === 'modelagem-normalizacao');
  const territory = world.territories.find((item) => item.id === 'dados');
  const link = world.trackQuests.find(
    (item) => item.trackId === 'modelagem-normalizacao' && item.questId === 'normaliza'
  );

  assert(Boolean(track));
  assert(Boolean(territory));
  assert(Boolean(link));
  assert(world.trackTerritories.some(
    (item) => item.trackId === 'modelagem-normalizacao' && item.territoryId === 'dados'
  ));
});

test('trilhas podem compartilhar quests e habilidades sem duplicação', () => {
  const world = freshWorld();
  const normalizaTracks = world.trackQuests
    .filter((link) => link.questId === 'normaliza')
    .map((link) => link.trackId);
  const computacaoGraficaTracks = world.trackTerritories
    .filter((link) => link.trackId === 'computacao-grafica')
    .map((link) => link.territoryId);
  const skills = trackSkills('modelagem-normalizacao', world);

  assert(normalizaTracks.length >= 2);
  assertEqual(new Set(normalizaTracks).size, normalizaTracks.length);
  assert(computacaoGraficaTracks.includes('computacao'));
  assert(computacaoGraficaTracks.includes('jogos'));
  assert(skills.some((skill) => skill.skillId === 'normalizacao'));
});

test('progresso da trilha e do território usa quests concluídas', () => {
  const world = freshWorld();
  const initialTrack = progressForTrack('modelagem-normalizacao', world, {});
  const completedTrack = progressForTrack('modelagem-normalizacao', world, {
    normaliza: { status: 'completed' }
  });
  const territory = progressForTerritory('dados', world, {
    normaliza: { status: 'completed' }
  });

  assertEqual(initialTrack.status, 'available');
  assertEqual(completedTrack.status, 'completed');
  assertEqual(completedTrack.percent, 100);
  assertEqual(territory.status, 'in_progress');
  assert(territory.percent > 0 && territory.percent < 100);
  assert(territory.explored);
});

test('progresso mundial conta territórios explorados', () => {
  const world = freshWorld();
  const progress = worldProgress(world, {
    normaliza: { status: 'completed' }
  });

  assertEqual(progress.territories, 5);
  assert(progress.explored >= 1);
  assert(progress.completedQuests >= 1);
});

test('afinidade é calculada por habilidades e não restringe conteúdo', () => {
  const world = freshWorld();
  const affinities = professionAffinities(world, {
    attributes: {
      'unreal-engine': { initial: 1, current: 6 },
      cpp: { initial: 1, current: 5 },
      'computacao-grafica': { initial: 1, current: 3 },
      'game-design': { initial: 1, current: 4 },
      roteirizacao: { initial: 1, current: 3 }
    }
  });
  const games = affinities.find((item) => item.professionId === 'desenvolvedor-jogos');
  const suggestions = suggestedProfessions(world, {
    attributes: {
      'unreal-engine': { initial: 1, current: 6 },
      cpp: { initial: 1, current: 5 },
      'computacao-grafica': { initial: 1, current: 3 },
      'game-design': { initial: 1, current: 4 },
      roteirizacao: { initial: 1, current: 3 }
    }
  });

  assert(Boolean(games));
  assert(games.score >= 80);
  assert(games.suggested);
  assert(suggestions.some((item) => item.professionId === 'desenvolvedor-jogos'));
  assertEqual(world.professions.some((item) => 'unlocks' in item), false);
});

test('reset restaura o catálogo inicial', () => {
  const catalog = resetWorldCatalog();
  assertEqual(catalog.territories.length, 5);
  assert(Array.isArray(catalog.professionSkills));
  assert(catalog.professionSkills.length > 0);
});
