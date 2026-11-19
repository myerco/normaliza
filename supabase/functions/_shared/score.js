import { PHASE_DATA } from './phase-data.js';
import * as fase1 from './fase1.js';
import * as fase2 from './fase2.js';
import * as fase3 from './fase3.js';
import * as fase4 from './fase4.js';

const CORE = {
  'centro-de-distribuicao': fase1,
  'rede-de-dependencias': fase2,
  'cidade-organizada': fase3,
  'gestao-de-funcionarios-e-pedidos': fase4
};

export function scoreSolution({ phaseId, snapshot, attempt = null, source = 'online' }) {
  const data = PHASE_DATA[phaseId];
  const core = CORE[phaseId];

  if (!data || !core) {
    return { valid: false, errors: ['Fase desconhecida.'] };
  }

  const hydrated = core.hydratePhaseState(data, snapshot);
  const validation = core.validatePhase(hydrated, data);

  if (!validation.valid) {
    return {
      valid: false,
      errors: validation.errors.map((item) => item.message)
    };
  }

  const validationCount = Math.max(Number(attempt?.validation_count) || 0, 0);
  const failedValidations =
    source === 'offline'
      ? 1
      : Math.max(0, validationCount - 1);
  const hintsUsed = Math.max(Number(attempt?.hint_count) || 0, 0);
  const finalState = {
    ...hydrated,
    completed: true,
    failedValidations,
    hintsUsed,
    revealedHints: hintsUsed
  };

  return {
    valid: true,
    score: core.calculateScore(finalState, data),
    phaseId,
    source
  };
}
