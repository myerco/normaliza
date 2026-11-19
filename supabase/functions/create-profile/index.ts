import { corsHeaders, error, isUuid, json, readJson } from '../_shared/http.js';
import { isValidAvatar, validatePlayerName } from '../_shared/players.js';
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
    const playerId = body?.playerId;
    const name = body?.name;
    const avatarId = body?.avatarId;

    if (!isUuid(playerId)) {
      return error('Identificador de jogador inválido.', 400, 'invalid-player');
    }

    const nameValidation = validatePlayerName(name);
    if (!nameValidation.valid) {
      return error(nameValidation.errors[0], 400, 'invalid-name');
    }

    if (!isValidAvatar(avatarId)) {
      return error('Avatar inválido.', 400, 'invalid-avatar');
    }

    const { data: existing, error: lookupError } = await supabase
      .from('players')
      .select('id, owner_id')
      .eq('id', playerId)
      .maybeSingle();

    if (lookupError) {
      throw new Error(lookupError.message);
    }

    if (existing && existing.owner_id !== user.id) {
      return error('Este identificador pertence a outro usuário.', 403, 'forbidden');
    }

    const payload = {
      id: playerId,
      owner_id: user.id,
      name: nameValidation.name,
      name_normalized: nameValidation.nameKey,
      avatar_id: avatarId,
      updated_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString()
    };

    const query = existing
      ? supabase.from('players').update(payload).eq('id', playerId)
      : supabase.from('players').insert(payload);
    const { data, error: writeError } = await query.select().single();

    if (writeError) {
      if (writeError.code === '23505') {
        return error('Este nome já está em uso.', 409, 'duplicate-name');
      }
      throw new Error(writeError.message);
    }

    return json({ profile: data });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);

    if (message === 'missing-authorization' || message === 'invalid-session') {
      return error('Sessão inválida.', 401, 'unauthorized');
    }

    return error('Não foi possível criar o perfil.', 500, 'profile-failed');
  }
});
