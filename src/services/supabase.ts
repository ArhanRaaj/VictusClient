import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default configuration with fallbacks for Vite environment variables or localStorage overrides
const getSupabaseConfig = () => {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

  let storedUrl = typeof localStorage !== 'undefined' ? localStorage.getItem('victus_supabase_url') : null;
  let storedKey = typeof localStorage !== 'undefined' ? localStorage.getItem('victus_supabase_anon_key') : null;

  // Clear stale placeholder if found
  if (storedUrl && storedUrl.includes('supabase.co')) {
    storedUrl = null;
    localStorage.removeItem('victus_supabase_url');
  }

  const url = storedUrl || envUrl || 'https://db.victuscloud.com';
  const anonKey =
    storedKey ||
    envKey ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqdWl5d2R1amlucmtrcG9icHF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODYyNDMsImV4cCI6MjA3OTM2MjI0M30.Vghl_PKcGwqudXq-fnk-6IuX16NM-PHtngU4aL9cxcc';

  return { url, anonKey, isConfigured: true };
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
