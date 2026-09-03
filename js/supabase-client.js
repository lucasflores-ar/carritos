import { CONFIG } from './config.js';

let client = null;
let demoMode = false;

export function isDemoMode() {
  return demoMode;
}

export async function initSupabase() {
  const url = CONFIG.SUPABASE_URL?.trim();
  const key = CONFIG.SUPABASE_ANON_KEY?.trim();
  if (!url || !key || url.includes('TU-PROYECTO')) {
    demoMode = true;
    return null;
  }
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  client = createClient(url, key);
  demoMode = false;
  return client;
}

export function getClient() {
  return client;
}
