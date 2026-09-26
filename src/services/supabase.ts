import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default configuration with fallbacks for Vite environment variables or localStorage overrides
const getSupabaseConfig = () => {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

  const storedUrl = typeof localStorage !== 'undefined' ? localStorage.getItem('victus_supabase_url') : null;
  const storedKey = typeof localStorage !== 'undefined' ? localStorage.getItem('victus_supabase_anon_key') : null;

  const url = storedUrl || envUrl || 'https://victuscloud.supabase.co';
  const anonKey = storedKey || envKey || 'public-anon-key-placeholder';

  return { url, anonKey, isConfigured: !!(storedUrl || envUrl) };
};

let clientInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient => {
  if (!clientInstance) {
    const config = getSupabaseConfig();
    clientInstance = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return clientInstance;
};

export const setSupabaseCredentials = (url: string, anonKey: string) => {
  localStorage.setItem('victus_supabase_url', url.trim());
  localStorage.setItem('victus_supabase_anon_key', anonKey.trim());
  clientInstance = createClient(url.trim(), anonKey.trim(), {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
};

export const isSupabaseConfigured = (): boolean => {
  return getSupabaseConfig().isConfigured;
};
