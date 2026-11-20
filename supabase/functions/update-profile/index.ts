import { corsHeaders, error, isUuid, json, readJson } from '../_shared/http.js';
import { isValidAvatar, validatePlayerName } from '../_shared/players.js';
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
    let playerId = body?.playerId;
    const name = body?.name;
    const avatarId = body?.avatarId;
    const bio = String(body?.bio ?? '').trim().slice(0, 280);

    if (!playerId) {
      const { data: current } = await supabase
        .from('players')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();
      playerId = current?.id;
    }

    if (!isUuid(playerId)) {
      return error('Identificador de jogador inválido.', 400, 'invalid-player');
    }

    const player = await findOwnedPlayer(supabase, playerId, user.id);
    if (!player) {
      return error('Perfil não encontrado.', 404, 'not-found');
    }

    const nameValidation = validatePlayerName(name, { currentName: player.name });
    if (!nameValidation.valid) {
      return error(nameValidation.errors[0], 400, 'invalid-name');
    }

    if (!isValidAvatar(avatarId)) {
      return error('Avatar inválido.', 400, 'invalid-avatar');
    }

    const { data, error: writeError } = await supabase
      .from('players')
      .update({
        name: nameValidation.name,
        name_normalized: nameValidation.nameKey,
        avatar_id: avatarId,
        bio,
        updated_at: new Date().toISOString()
      })
      .eq('id', playerId)
      .select()
      .single();

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

    return error('Não foi possível atualizar o perfil.', 500, 'profile-failed');
  }
});
