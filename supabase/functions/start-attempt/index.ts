import { corsHeaders, error, isUuid, json, readJson } from '../_shared/http.js';
import { PHASE_DATA } from '../_shared/phase-data.js';
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

    if (!isUuid(playerId) || !PHASE_DATA[phaseId]) {
      return error('Jogador ou fase inválida.', 400, 'invalid-attempt');
    }

    const player = await findOwnedPlayer(supabase, playerId, user.id);
    if (!player) {
      return error('Perfil não encontrado.', 404, 'not-found');
    }

    const { data, error: insertError } = await supabase
      .from('phase_attempts')
      .insert({ player_id: playerId, phase_id: phaseId })
      .select('id, phase_id, started_at')
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    return json({ attempt: data });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);

    if (message === 'missing-authorization' || message === 'invalid-session') {
      return error('Sessão inválida.', 401, 'unauthorized');
    }

    return error('Não foi possível iniciar a tentativa.', 500, 'attempt-failed');
  }
});
