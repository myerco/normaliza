export const LEVEL_THRESHOLDS = Object.freeze([
  { level: 1, xp: 0, title: 'Aprendiz' },
  { level: 2, xp: 150, title: 'Explorador' },
  { level: 3, xp: 350, title: 'Praticante' },
  { level: 4, xp: 600, title: 'Analista' },
  { level: 5, xp: 900, title: 'Especialista' },
  { level: 6, xp: 1250, title: 'Arquiteto de Dados' },
  { level: 7, xp: 1650, title: 'Mentor' },
  { level: 8, xp: 2100, title: 'Guardião dos Dados' },
  { level: 9, xp: 2600, title: 'Mestre' },
  { level: 10, xp: 3150, title: 'Lenda do Conhecimento' }
]);

export function levelFromXp(xp) {
  const total = Math.max(0, Math.floor(Number(xp) || 0));
  let current = LEVEL_THRESHOLDS[0];

  for (const threshold of LEVEL_THRESHOLDS) {
    if (total >= threshold.xp) {
      current = threshold;
    } else {
      break;
    }
  }

  return current;
}

export function xpForQuest(quest, score = 0) {
  const base = Math.max(0, Math.floor(Number(quest?.xpReward) || 0));
  const maxScore = Math.max(1, Number(quest?.maxScore) || 100);
  const normalized = Math.min(1, Math.max(0, Number(score) || 0) / maxScore);
  return base + Math.round(base * 0.25 * normalized);
}
