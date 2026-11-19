import { corsHeaders, error, isUuid, json, readJson } from '../_shared/http.js';
import { requireUser, serviceClient } from '../_shared/supabase.js';

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
    const attemptId = body?.attemptId;

    if (!isUuid(attemptId)) {
      return error('Tentativa inválida.', 400, 'invalid-attempt');
    }

    const { data: attempt, error: findError } = await supabase
      .from('phase_attempts')
      .select('id, player_id, hint_count, players!inner(owner_id)')
      .eq('id', attemptId)
      .maybeSingle();

    if (findError) {
      throw new Error(findError.message);
    }

    if (!attempt || attempt.players.owner_id !== user.id) {
      return error('Tentativa não encontrada.', 404, 'not-found');
    }

    const { error: updateError } = await supabase
      .from('phase_attempts')
      .update({ hint_count: (attempt.hint_count || 0) + 1 })
      .eq('id', attemptId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return json({ ok: true });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);

    if (message === 'missing-authorization' || message === 'invalid-session') {
      return error('Sessão inválida.', 401, 'unauthorized');
    }

    return error('Não foi possível registrar a dica.', 500, 'hint-failed');
  }
});
