import { buildGameProgress } from '../src/core/progress.js';
import { assertDeepEqual, assertEqual, test } from './helpers.js';

test('progresso inicial tem zero pontos e nenhuma fase concluída', () => {
  const progress = buildGameProgress([
    { id: 'fase-1', title: 'Fase 1', phaseNumber: 1, medalLabel: '1FN', completed: false, score: 0, maxScore: 100 },
    { id: 'fase-2', title: 'Fase 2', phaseNumber: 2, medalLabel: '2FN', completed: false, score: 0, maxScore: 100 },
    { id: 'fase-3', title: 'Fase 3', phaseNumber: 3, medalLabel: '3FN', completed: false, score: 0, maxScore: 100 }
  ]);

  assertEqual(progress.totalScore, 0);
  assertEqual(progress.completedPhases, 0);
  assertEqual(progress.evolutionPercent, 0);
  assertEqual(progress.maxScore, 300);
});

test('progresso acumula pontuação e conta medalhas', () => {
  const progress = buildGameProgress([
    { id: 'fase-1', title: 'Fase 1', phaseNumber: 1, medalLabel: '1FN', completed: true, score: 90, maxScore: 100 },
    { id: 'fase-2', title: 'Fase 2', phaseNumber: 2, medalLabel: '2FN', completed: true, score: 80, maxScore: 100 },
    { id: 'fase-3', title: 'Fase 3', phaseNumber: 3, medalLabel: '3FN', completed: false, score: 50, maxScore: 100 }
  ]);

  assertEqual(progress.totalScore, 220);
  assertEqual(progress.completedPhases, 2);
  assertEqual(progress.evolutionPercent, 67);
  assertDeepEqual(
    progress.phases.map((phase) => ({ medal: phase.medalLabel, completed: phase.completed })),
    [
      { medal: '1FN', completed: true },
      { medal: '2FN', completed: true },
      { medal: '3FN', completed: false }
    ]
  );
});

test('missão de três fases concluídas atinge 100% de evolução', () => {
  const progress = buildGameProgress([
    { id: 'fase-1', title: 'Fase 1', phaseNumber: 1, medalLabel: '1FN', completed: true, score: 100, maxScore: 100 },
    { id: 'fase-2', title: 'Fase 2', phaseNumber: 2, medalLabel: '2FN', completed: true, score: 100, maxScore: 100 },
    { id: 'fase-3', title: 'Fase 3', phaseNumber: 3, medalLabel: '3FN', completed: true, score: 100, maxScore: 100 }
  ]);

  assertEqual(progress.completedPhases, 3);
  assertEqual(progress.evolutionPercent, 100);
  assertEqual(progress.totalScore, 300);
});
