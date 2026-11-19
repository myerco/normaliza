(function () {
  const playerId = 'test-player';
  const registryKey = 'normaliza:v2:players';
  const progressPrefix = 'normaliza:v2:player:';

  function seedActivePlayer({ name = 'Jogador Teste', avatarId = 'analista' } = {}) {
    clearPlayerData();
    const now = new Date().toISOString();
    const player = {
      id: playerId,
      name,
      avatarId,
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
      remoteId: null,
      remoteOwnerId: null,
      syncStatus: 'local'
    };

    localStorage.setItem(
      registryKey,
      JSON.stringify({ version: 2, activePlayerId: playerId, players: [player] })
    );
    return playerId;
  }

  function seedProgress(progress) {
    localStorage.setItem(
      `${progressPrefix}${playerId}:progress`,
      JSON.stringify(progress)
    );
  }

  function loadProgress() {
    try {
      return JSON.parse(localStorage.getItem(`${progressPrefix}${playerId}:progress`) || '{}');
    } catch {
      return {};
    }
  }

  function clearPlayerData() {
    const keys = [];

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (
        key === registryKey ||
        key === 'normaliza:v1:progress' ||
        key === 'normaliza:v2:legacy-migrated-to' ||
        key?.startsWith(progressPrefix)
      ) {
        keys.push(key);
      }
    }

    for (const key of keys) {
      localStorage.removeItem(key);
    }
  }

  window.NormalizaTestFixture = {
    playerId,
    seedActivePlayer,
    seedProgress,
    loadProgress,
    clearPlayerData,
    progressKey: `${progressPrefix}${playerId}:progress`
  };
})();
