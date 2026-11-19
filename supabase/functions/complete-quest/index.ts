import { corsHeaders, error, isUuid, json, readJson } from '../_shared/http.js';
import { findOwnedPlayer, requireUser, serviceClient } from '../_shared/supabase.js';
import { levelFromXp, xpForQuest } from '../_shared/progression.js';

const NORMALIZA_PHASES = [
  'centro-de-distribuicao',
  'rede-de-dependencias',
  'cidade-organizada',
  'gestao-de-funcionarios-e-pedidos'
];

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return error('Método não permitido.', 405, 'method-not-allowed');
  }

  const supabase = serviceClient();

  try {
    const user = await requireUser(request, supabase);
    const body = await readJson(request);
    const playerId = body?.playerId;
    const characterId = body?.characterId;

    if (!isUuid(playerId) || !isUuid(characterId)) {
      return error('Jogador ou personagem inválido.', 400, 'invalid-character');
    }

    const player = await findOwnedPlayer(supabase, playerId, user.id);
    if (!player) {
      return error('Perfil não encontrado.', 404, 'not-found');
    }

    const { data: phases, error: phasesError } = await supabase
      .from('phase_results')
      .select('phase_id, best_score')
      .eq('player_id', playerId)
      .in('phase_id', NORMALIZA_PHASES);

    if (phasesError) {
      throw new Error(phasesError.message);
    }

    if (!Array.isArray(phases) || phases.length < NORMALIZA_PHASES.length) {
      return error('A quest ainda não foi concluída no servidor.', 409, 'quest-incomplete');
    }

    const score = phases.reduce((total, phase) => total + Number(phase.best_score || 0), 0);
    const xp = xpForQuest({ xpReward: 150, maxScore: 400 }, score);
    const level = levelFromXp(xp).level;

    const { data, error: recordError } = await supabase.rpc(
      'record_quest_completion',
      {
        p_player_id: playerId,
        p_character_id: characterId,
        p_quest_id: 'normaliza',
        p_best_score: score,
        p_xp: xp,
        p_level: level
      }
    );

    if (recordError) {
      throw new Error(recordError.message);
    }

    const row = Array.isArray(data) ? data[0] : data;

    return json({
      accepted: true,
      completed: true,
      questId: 'normaliza',
      characterId,
      score,
      xp: row?.xp_awarded ?? xp,
      level: row?.level ?? level
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);

    if (message === 'missing-authorization' || message === 'invalid-session') {
      return error('Sessão inválida.', 401, 'unauthorized');
    }

    return error('Não foi possível confirmar a quest.', 500, 'quest-confirmation-failed');
  }
});
