const STORAGE_KEY = 'normaliza:v1:progress';

export function loadProgress() {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function loadPhaseProgress(phaseId) {
  const progress = loadProgress();
  const snapshot = progress[phaseId];
  return snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot) ? snapshot : null;
}

export function savePhaseProgress(phaseId, snapshot) {
  try {
    const progress = loadProgress();
    progress[phaseId] = snapshot;
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export function clearPhaseProgress(phaseId) {
  try {
    const progress = loadProgress();
    delete progress[phaseId];
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export function clearAllProgress() {
  try {
    globalThis.localStorage?.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
