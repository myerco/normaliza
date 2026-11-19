import { xpForQuest } from '../core/progression.js';
import {
  completeQuest,
  loadQuestProgress
} from '../persistence/questStorage.js';
import {
  addXp,
  applyRewards,
  ensureProgression,
  saveProgression,
  unlockAchievements
} from '../persistence/progressionStorage.js';
import { updateCharacter } from '../persistence/characterStorage.js';

export function awardQuestCompletion({
  character,
  quest,
  score = 0,
  catalog = null,
  now = new Date().toISOString()
}) {
  if (!character || !quest) {
    return { awarded: false, progression: null, character: null };
  }

  const progression = ensureProgression(character, catalog);
  const alreadyAwarded = progression.xpHistory.some(
    (entry) => entry.source === 'quest' && entry.sourceId === quest.id
  );

  const completed = completeQuest(character.id, quest.id, {
    score,
    xp: alreadyAwarded ? 0 : xpForQuest(quest, score),
    now
  });

  if (alreadyAwarded) {
    const completedIds = completedQuestIds(character.id);
    const unlocked = unlockAchievements(progression, completedIds);
    saveProgression(character.id, unlocked.progression);
    return {
      awarded: false,
      progression: unlocked.progression,
      completed,
      unlocked: unlocked.additions,
      character: null
    };
  }

  const gained = xpForQuest(quest, score);
  let updated = addXp(progression, gained, {
    source: 'quest',
    sourceId: quest.id,
    reason: `Conclusão da quest ${quest.name}`,
    createdAt: now
  });
  updated = applyRewards(updated, quest.attributeRewards ?? {}, {
    source: 'quest',
    sourceId: quest.id,
    createdAt: now
  });
  const ids = completedQuestIds(character.id);
  const unlocked = unlockAchievements(updated, ids);
  updated = unlocked.progression;
  saveProgression(character.id, updated);
  const nextCharacter = updateCharacter(character.playerId, character.id, {
    level: updated.level,
    xp: updated.xp
  });

  return {
    awarded: true,
    xpGained: gained,
    progression: updated,
    completed,
    unlocked: unlocked.additions,
    character: nextCharacter
  };
}

export function completedQuestIds(characterId) {
  const progress = loadQuestProgress(characterId).quests;

  return Object.entries(progress)
    .filter(([, value]) => value?.status === 'completed')
    .map(([questId]) => questId);
}
