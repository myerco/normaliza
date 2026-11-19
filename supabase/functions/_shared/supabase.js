import { createClient } from 'npm:@supabase/supabase-js@2';

export function serviceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
}

export async function requireUser(request, supabase) {
  const header = request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) {
    throw new Error('missing-authorization');
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    throw new Error('invalid-session');
  }

  return data.user;
}

export async function findOwnedPlayer(supabase, playerId, ownerId) {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.owner_id !== ownerId) {
    return null;
  }

  return data;
}
