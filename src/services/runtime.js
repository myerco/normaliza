import { SUPABASE_CONFIG } from '../../config/supabase.js';

const runtime =
  (typeof globalThis !== 'undefined' && globalThis.__NORMALIZA_RUNTIME__) || {};

export const BACKEND_MODE = runtime.backend === 'local' ? 'local' : 'supabase';
export const LOCAL_API_BASE = String(runtime.local?.apiBaseUrl || '/api').replace(/\/+$/, '');
export const SUPABASE = runtime.supabase || SUPABASE_CONFIG;

export function isNetworkEnabled() {
  if (globalThis.__NORMALIZA_DISABLE_NETWORK__) {
    return false;
  }

  try {
    const params = new URLSearchParams(globalThis.location?.search ?? '');
    return params.get('test') !== '1';
  } catch {
    return true;
  }
}

export function isSupabaseConfigured() {
  return Boolean(
    SUPABASE?.url &&
      SUPABASE?.publishableKey &&
      !SUPABASE.url.includes('YOUR_')
  );
}
