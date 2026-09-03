import { initSupabase } from './supabase-client.js';
import { initAuth } from './auth.js';
import { initRouter } from './router.js';

async function boot() {
  await initSupabase();
  await initAuth();
  initRouter();
}

boot();
