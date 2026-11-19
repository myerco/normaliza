import { corsHeaders, error, isUuid, json, readJson } from '../_shared/http.js';
import { scoreSolution } from '../_shared/score.js';
import { findOwnedPlayer, requireUser, serviceClient } from '../_shared/supabase.js';

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
    const phaseId = body?.phaseId;
    const matchId = body?.matchId;
    const snapshot = body?.snapshot;
    const attemptId = body?.attemptId || null;

    if (!isUuid(playerId) || !isUuid(matchId) || !snapshot || typeof snapshot !== 'object') {
      return error('Resultado inválido.', 400, 'invalid-result');
    }

    const player = await findOwnedPlayer(supabase, playerId, user.id);
    if (!player) {
      return error('Perfil não encontrado.', 404, 'not-found');
    }

    let attempt = null;

    if (attemptId && isUuid(attemptId)) {
      const { data, error: attemptError } = await supabase
        .from('phase_attempts')
        .select('*')
        .eq('id', attemptId)
        .eq('player_id', playerId)
        .eq('phase_id', phaseId)
        .maybeSingle();

      if (attemptError) {
        throw new Error(attemptError.message);
      }

      attempt = data;
    }

    const source = attempt ? 'online' : 'offline';
    const result = scoreSolution({
      phaseId,
      snapshot,
      attempt,
      source
    });

    if (!result.valid) {
      return json(
        { accepted: false, error: 'Solução inválida.', errors: result.errors },
        422
      );
    }

    const { data, error: recordError } = await supabase.rpc('record_phase_result', {
      p_player_id: playerId,
      p_phase_id: phaseId,
      p_match_id: matchId,
      p_score: result.score,
      p_snapshot: snapshot,
      p_source: source,
      p_attempt_id: attempt?.id ?? null
    });

    if (recordError) {
      throw new Error(recordError.message);
    }

    const row = Array.isArray(data) ? data[0] : data;

    return json({
      accepted: true,
      score: result.score,
      bestScore: row?.best_score ?? result.score,
      source
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);

    if (message === 'missing-authorization' || message === 'invalid-session') {
      return error('Sessão inválida.', 401, 'unauthorized');
    }

    return error('Não foi possível registrar o resultado.', 500, 'result-failed');
  }
});
