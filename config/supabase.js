export const SUPABASE_CONFIG = Object.freeze({
  url: 'https://lzyxweqgoatqbwdkubid.supabase.co',
  publishableKey: 'sb_publishable_aDf5qUGZDjpo3yoGtujl1g_F9p7V6iq',
  functionsUrl: 'https://lzyxweqgoatqbwdkubid.supabase.co/functions/v1',
  requestTimeoutMs: 12000
});

export function isSupabaseConfigured(config = SUPABASE_CONFIG) {
  return Boolean(config?.url && config?.publishableKey && !config.url.includes('YOUR_'));
}
