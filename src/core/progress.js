export function buildGameProgress(phases) {
  const normalizedPhases = phases.map((phase) => ({
    id: phase.id,
    title: phase.title,
    phaseNumber: phase.phaseNumber,
    medalLabel: phase.medalLabel,
    completed: Boolean(phase.completed),
    score: Number.isFinite(phase.score) ? Math.max(0, phase.score) : 0,
    maxScore: Number.isFinite(phase.maxScore) ? phase.maxScore : 100
  }));
  const totalScore = normalizedPhases.reduce((total, phase) => total + phase.score, 0);
  const maxScore = normalizedPhases.reduce((total, phase) => total + phase.maxScore, 0);
  const completedPhases = normalizedPhases.filter((phase) => phase.completed).length;
  const totalPhases = normalizedPhases.length;

  return {
    totalScore,
    maxScore,
    completedPhases,
    totalPhases,
    evolutionPercent: totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0,
    phases: normalizedPhases
  };
}
