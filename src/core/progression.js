export const ATTRIBUTE_MAX = 10;

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

export const PROGRESSION_ACHIEVEMENTS = Object.freeze([
  {
    id: 'primeiro-nivel',
    title: 'Primeiro passo',
    description: 'Alcance o nível 2.'
  },
  {
    id: 'normaliza-concluida',
    title: 'Cidade organizada',
    description: 'Conclua a Quest 01 — NORMALIZA!.'
  },
  {
    id: 'atributo-maximo',
    title: 'Habilidade dominada',
    description: 'Leve um atributo ao valor máximo.'
  },
  {
    id: 'duas-quests',
    title: 'Jornada em movimento',
    description: 'Conclua duas quests.'
  }
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

export function levelProgress(xp) {
  const total = Math.max(0, Math.floor(Number(xp) || 0));
  const current = levelFromXp(total);
  const next = LEVEL_THRESHOLDS.find((threshold) => threshold.level === current.level + 1) ?? null;
  const baseXp = current.xp;
  const nextXp = next?.xp ?? current.xp;
  const span = Math.max(1, nextXp - baseXp);
  const within = Math.min(span, Math.max(0, total - baseXp));

  return {
    xp: total,
    level: current.level,
    title: current.title,
    nextLevel: next?.level ?? null,
    nextTitle: next?.title ?? null,
    currentXp: within,
    neededXp: next ? span : 0,
    percent: next ? Math.round((within / span) * 100) : 100,
    totalToNext: next ? Math.max(0, next.xp - total) : 0
  };
}

export function xpForQuest(quest, score = 0) {
  const base = Math.max(0, Math.floor(Number(quest?.xpReward) || 0));
  const maxScore = Math.max(1, Number(quest?.maxScore) || 100);
  const normalized = Math.min(1, Math.max(0, Number(score) || 0) / maxScore);
  const qualityBonus = Math.round(base * 0.25 * normalized);
  return base + qualityBonus;
}

export function applyAttributeRewards(attributes = {}, rewards = {}) {
  const next = { ...attributes };
  const changes = [];

  for (const [attributeId, amount] of Object.entries(rewards)) {
    const current = Number(next[attributeId]?.current ?? next[attributeId] ?? 0);
    const increment = Math.max(0, Math.floor(Number(amount) || 0));
    const updated = Math.min(ATTRIBUTE_MAX, current + increment);

    if (updated !== current) {
      changes.push({
        attributeId,
        previous: current,
        current: updated
      });
    }

    next[attributeId] = {
      ...(typeof next[attributeId] === 'object' ? next[attributeId] : {}),
      initial: Number(next[attributeId]?.initial ?? current),
      current: updated
    };
  }

  return { attributes: next, changes };
}

export function evaluateProgressionAchievements({
  level = 1,
  completedQuestIds = [],
  attributes = {}
}) {
  const earned = [];

  if (level >= 2) {
    earned.push('primeiro-nivel');
  }

  if (completedQuestIds.includes('normaliza')) {
    earned.push('normaliza-concluida');
  }

  if (
    Object.values(attributes).some((attribute) => Number(attribute?.current) >= ATTRIBUTE_MAX)
  ) {
    earned.push('atributo-maximo');
  }

  if (completedQuestIds.length >= 2) {
    earned.push('duas-quests');
  }

  return earned;
}

export function achievementDefinition(id) {
  return PROGRESSION_ACHIEVEMENTS.find((achievement) => achievement.id === id) ?? null;
}
