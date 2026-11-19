import { getAvatar, playerInitials } from './players.js';

export function buildProfileSummary({
  player,
  progress,
  rankInfo = null,
  pendingCount = 0,
  syncStatus = 'local'
}) {
  const medals = (progress?.phases ?? [])
    .filter((phase) => phase.completed)
    .map((phase) => ({
      id: phase.id,
      label: phase.medalLabel,
      title: phase.title,
      score: phase.score,
      maxScore: phase.maxScore
    }));

  return {
    id: player?.id ?? null,
    name: player?.name ?? 'Jogador',
    avatarId: player?.avatarId ?? 'construtor',
    avatar: getAvatar(player?.avatarId),
    initials: playerInitials(player?.name),
    totalScore: progress?.totalScore ?? 0,
    maxScore: progress?.maxScore ?? 0,
    completedPhases: progress?.completedPhases ?? 0,
    totalPhases: progress?.totalPhases ?? 0,
    evolutionPercent: progress?.evolutionPercent ?? 0,
    medals,
    lastActivityAt: player?.lastActivityAt ?? null,
    rank: rankInfo?.rank ?? null,
    pointsToNext: rankInfo?.pointsToNext ?? null,
    pendingCount,
    syncStatus
  };
}

export function buildAchievements(progress, { missionCompleted = false } = {}) {
  const achievements = (progress?.phases ?? []).map((phase) => ({
    id: phase.id,
    title: phase.title,
    label: phase.medalLabel,
    description: phase.completed
      ? `Fase ${phase.phaseNumber} concluída com ${phase.score} pontos.`
      : `Conclua a Fase ${phase.phaseNumber} para conquistar esta medalha.`,
    earned: phase.completed,
    score: phase.score,
    maxScore: phase.maxScore
  }));

  achievements.push({
    id: 'missao-administracao',
    title: 'Administração da Cidade',
    label: 'Missão',
    description: missionCompleted
      ? 'Os três cenários de anomalia foram concluídos.'
      : 'Conclua os três cenários de anomalia da missão especial.',
    earned: missionCompleted,
    score: 0,
    maxScore: 0
  });

  return achievements;
}

export function formatLastActivity(value) {
  if (!value) {
    return 'Sem atividade registrada';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Sem atividade registrada';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}

export function profileToLeaderboardRow(profile, rank = null) {
  return {
    id: profile.id,
    name: profile.name,
    avatarId: profile.avatarId,
    totalScore: profile.totalScore,
    completedPhases: profile.completedPhases,
    scoreAchievedAt: profile.lastActivityAt,
    rank: rank ?? profile.rank
  };
}
