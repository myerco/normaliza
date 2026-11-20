import { QUEST_STATUS } from './quests.js';

export const TRACK_STATUS = Object.freeze({
  locked: 'locked',
  available: 'available',
  inProgress: 'in_progress',
  completed: 'completed'
});

export const TRACK_STATUS_LABELS = Object.freeze({
  locked: 'Bloqueada',
  available: 'Disponível',
  in_progress: 'Em andamento',
  completed: 'Concluída'
});

export const TERRITORY_STATUS_LABELS = Object.freeze({
  locked: 'Inexplorado',
  available: 'Disponível',
  in_progress: 'Explorando',
  completed: 'Concluído'
});

export function territoryTracks(territoryId, world) {
  const trackIds = new Set(
    (world?.trackTerritories ?? [])
      .filter((link) => link.territoryId === territoryId)
      .map((link) => link.trackId)
  );

  return (world?.tracks ?? [])
    .filter((track) => trackIds.has(track.id) && (track.status ?? 'published') === 'published')
    .sort((first, second) => {
      const firstLink = (world?.trackTerritories ?? []).find(
        (link) => link.territoryId === territoryId && link.trackId === first.id
      );
      const secondLink = (world?.trackTerritories ?? []).find(
        (link) => link.territoryId === territoryId && link.trackId === second.id
      );
      return (firstLink?.order ?? first.order ?? 0) - (secondLink?.order ?? second.order ?? 0);
    });
}

export function trackQuestLinks(trackId, world) {
  return (world?.trackQuests ?? [])
    .filter((link) => link.trackId === trackId)
    .sort((first, second) => (first.order ?? 0) - (second.order ?? 0));
}

export function questIdsForTrack(trackId, world) {
  return trackQuestLinks(trackId, world).map((link) => link.questId);
}

export function requiredQuestIdsForTrack(trackId, world) {
  return trackQuestLinks(trackId, world)
    .filter((link) => link.required !== false)
    .map((link) => link.questId);
}

export function trackSkills(trackId, world) {
  const links = (world?.trackSkills ?? []).filter((link) => link.trackId === trackId);
  const questIds = new Set(questIdsForTrack(trackId, world));
  const derived = (world?.questSkills ?? []).filter((link) => questIds.has(link.questId));
  const skills = new Map();

  for (const link of links) {
    skills.set(link.skillId, {
      skillId: link.skillId,
      targetLevel: Number(link.targetLevel ?? 1),
      weight: Number(link.weight ?? 1),
      source: 'track'
    });
  }

  for (const link of derived) {
    if (!skills.has(link.skillId)) {
      skills.set(link.skillId, {
        skillId: link.skillId,
        targetLevel: Math.max(1, Number(link.levelDelta ?? 1)),
        weight: 1,
        source: 'quest'
      });
    }
  }

  return [...skills.values()];
}

export function trackProgressMap(world, questProgress = {}) {
  const completedQuests = new Set(
    Object.entries(questProgress ?? {})
      .filter(([, value]) => value?.status === QUEST_STATUS.completed)
      .map(([questId]) => questId)
  );
  const tracksById = new Map((world?.tracks ?? []).map((track) => [track.id, track]));
  const progress = new Map();
  const visiting = new Set();

  const resolve = (track) => {
    if (!track) {
      return null;
    }

    if (progress.has(track.id)) {
      return progress.get(track.id);
    }

    if (visiting.has(track.id)) {
      return {
        trackId: track.id,
        completed: 0,
        total: 0,
        percent: 0,
        status: TRACK_STATUS.locked,
        prerequisitesReady: false
      };
    }

    visiting.add(track.id);
    const prerequisiteIds = (world?.trackPrerequisites ?? [])
      .filter((link) => link.trackId === track.id)
      .map((link) => link.prerequisiteTrackId);
    const prerequisitesReady = prerequisiteIds.every((prerequisiteId) => {
      const prerequisiteProgress = resolve(tracksById.get(prerequisiteId));
      return prerequisiteProgress?.status === TRACK_STATUS.completed;
    });
    const requiredQuestIds = requiredQuestIdsForTrack(track.id, world);
    const completed = requiredQuestIds.filter((questId) => completedQuests.has(questId)).length;
    const total = requiredQuestIds.length;
    let status = TRACK_STATUS.locked;

    if (prerequisitesReady) {
      if (total > 0 && completed >= total) {
        status = TRACK_STATUS.completed;
      } else if (completed > 0) {
        status = TRACK_STATUS.inProgress;
      } else {
        status = TRACK_STATUS.available;
      }
    }

    const result = {
      trackId: track.id,
      completed,
      total,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
      status,
      prerequisitesReady
    };
    progress.set(track.id, result);
    visiting.delete(track.id);
    return result;
  };

  for (const track of world?.tracks ?? []) {
    resolve(track);
  }

  return progress;
}

export function progressForTrack(trackId, world, questProgress = {}) {
  return (
    trackProgressMap(world, questProgress).get(trackId) ?? {
      trackId,
      completed: 0,
      total: 0,
      percent: 0,
      status: TRACK_STATUS.locked,
      prerequisitesReady: false
    }
  );
}

export function progressForTerritory(territoryId, world, questProgress = {}) {
  const tracks = territoryTracks(territoryId, world);
  const trackProgress = trackProgressMap(world, questProgress);
  const requiredQuestIds = new Set();

  for (const track of tracks) {
    for (const questId of requiredQuestIdsForTrack(track.id, world)) {
      requiredQuestIds.add(questId);
    }
  }

  const completedQuests = new Set(
    Object.entries(questProgress ?? {})
      .filter(([, value]) => value?.status === QUEST_STATUS.completed)
      .map(([questId]) => questId)
  );
  const completed = [...requiredQuestIds].filter((questId) => completedQuests.has(questId)).length;
  const total = requiredQuestIds.size;
  const completedTracks = tracks.filter(
    (track) => trackProgress.get(track.id)?.status === TRACK_STATUS.completed
  ).length;
  const anyAvailable = tracks.some((track) => {
    const status = trackProgress.get(track.id)?.status;
    return status === TRACK_STATUS.available || status === TRACK_STATUS.inProgress;
  });
  let status = TRACK_STATUS.locked;

  if (total > 0 && completed >= total) {
    status = TRACK_STATUS.completed;
  } else if (completed > 0) {
    status = TRACK_STATUS.inProgress;
  } else if (anyAvailable || total === 0) {
    status = TRACK_STATUS.available;
  }

  return {
    territoryId,
    completed,
    total,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    completedTracks,
    totalTracks: tracks.length,
    status,
    explored: completed > 0
  };
}

export function worldProgress(world, questProgress = {}) {
  const territories = world?.territories ?? [];
  const progress = territories.map((territory) =>
    progressForTerritory(territory.id, world, questProgress)
  );
  const explored = progress.filter((item) => item.explored).length;
  const completed = progress.filter((item) => item.status === TRACK_STATUS.completed).length;
  const totalQuests = progress.reduce((sum, item) => sum + item.total, 0);
  const completedQuests = progress.reduce((sum, item) => sum + item.completed, 0);

  return {
    territories: progress.length,
    explored,
    completed,
    totalQuests,
    completedQuests,
    percent: totalQuests > 0 ? Math.round((completedQuests / totalQuests) * 100) : 0
  };
}

export function skillLevelsFromProgression(progression = {}) {
  const levels = {};

  for (const [skillId, value] of Object.entries(progression?.attributes ?? {})) {
    levels[skillId] = Math.max(0, Number(value?.current ?? value ?? 0));
  }

  for (const [skillId, value] of Object.entries(progression?.skills ?? {})) {
    levels[skillId] = Math.max(0, Number(value?.current ?? value?.level ?? value ?? 0));
  }

  return levels;
}

export function professionAffinity(profession, world, levels = {}) {
  const links = (world?.professionSkills ?? []).filter(
    (link) => link.professionId === profession?.id
  );
  const totalWeight = links.reduce((sum, link) => sum + Math.max(0, Number(link.weight ?? 1)), 0);
  const minimumSkills = Math.max(1, Number(profession?.minimumSkills ?? 2));
  let weighted = 0;
  let activeSkills = 0;
  const skills = links.map((link) => {
    const skill = (world?.skills ?? []).find((item) => item.id === link.skillId);
    const level = Math.max(0, Number(levels[link.skillId] ?? 0));
    const targetLevel = Math.max(1, Number(link.targetLevel ?? 1));
    const weight = Math.max(0, Number(link.weight ?? 1));
    const normalized = Math.min(1, level / targetLevel);

    weighted += normalized * weight;

    if (level > 0) {
      activeSkills += 1;
    }

    return {
      skillId: link.skillId,
      name: skill?.name ?? link.skillId,
      level,
      targetLevel,
      weight,
      percent: Math.round(normalized * 100)
    };
  });
  const score = totalWeight > 0 ? Math.round((weighted / totalWeight) * 100) : 0;
  const threshold = Math.max(0, Number(profession?.suggestionThreshold ?? 60));

  return {
    professionId: profession?.id ?? null,
    name: profession?.name ?? '',
    description: profession?.description ?? '',
    score,
    suggested: totalWeight > 0 && score >= threshold && activeSkills >= minimumSkills,
    threshold,
    activeSkills,
    skills
  };
}

export function professionAffinities(world, progression = {}) {
  const levels = skillLevelsFromProgression(progression);

  return (world?.professions ?? [])
    .filter((profession) => (profession.status ?? 'published') === 'published')
    .map((profession) => professionAffinity(profession, world, levels))
    .sort((first, second) => second.score - first.score || first.name.localeCompare(second.name, 'pt-BR'));
}

export function suggestedProfessions(world, progression = {}) {
  return professionAffinities(world, progression).filter((item) => item.suggested);
}

export function trackById(world, trackId) {
  return (world?.tracks ?? []).find((track) => track.id === trackId) ?? null;
}

export function territoryById(world, territoryId) {
  return (world?.territories ?? []).find((territory) => territory.id === territoryId) ?? null;
}

export function skillById(world, skillId) {
  return (world?.skills ?? []).find((skill) => skill.id === skillId) ?? null;
}

export function professionById(world, professionId) {
  return (world?.professions ?? []).find((profession) => profession.id === professionId) ?? null;
}
