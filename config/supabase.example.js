export const SUPABASE_CONFIG = Object.freeze({
  url: 'https://YOUR_PROJECT_REF.supabase.co',
  publishableKey: 'sb_publishable_YOUR_PUBLIC_KEY',
  functionsUrl: 'https://YOUR_PROJECT_REF.supabase.co/functions/v1',
  requestTimeoutMs: 12000
});

export function isSupabaseConfigured(config = SUPABASE_CONFIG) {
  return Boolean(config?.url && config?.publishableKey && !config.url.includes('YOUR_'));
}
