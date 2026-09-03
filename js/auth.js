import { getClient, isDemoMode } from './supabase-client.js';
import { DEMO_USER } from './demo-data.js';

let session = null;
let profile = null;

export function getSession() {
  return session;
}

export function getProfile() {
  return profile;
}

export function getDisplayName() {
  if (isDemoMode()) return session?.nombre || 'Lucas';
  if (profile?.nombre) return profile.nombre;
  return session?.user?.user_metadata?.nombre || session?.user?.email?.split('@')[0] || 'Usuario';
}

export function isAdmin() {
  return profile?.rol === 'admin';
}

export function getVoluntarioId() {
  if (isDemoMode()) return session?.voluntarioId || DEMO_USER.voluntarioId;
  return profile?.voluntarioId ?? null;
}

export async function initAuth() {
  if (isDemoMode()) {
    const stored = localStorage.getItem('demo_session');
    session = stored ? JSON.parse(stored) : null;
    profile = session ? { rol: session.rol, voluntarioId: session.voluntarioId } : null;
    return session;
  }

  const supabase = getClient();
  const { data } = await supabase.auth.getSession();
  session = data.session;
  if (session) await loadProfile();
  supabase.auth.onAuthStateChange(async (_event, s) => {
    session = s;
    if (s) await loadProfile();
    else profile = null;
  });
  return session;
}

async function loadProfile() {
  const supabase = getClient();
  const uid = session.user.id;
  const [{ data: perfil }, { data: vol }] = await Promise.all([
    supabase.from('perfiles').select('rol').eq('user_id', uid).maybeSingle(),
    supabase.from('voluntarios').select('id, nombre').eq('user_id', uid).maybeSingle(),
  ]);
  profile = {
    rol: perfil?.rol || 'voluntario',
    voluntarioId: vol?.id ?? null,
    nombre: vol?.nombre,
  };
}

export async function login(email, password) {
  if (isDemoMode()) {
    session = { ...DEMO_USER, email };
    profile = { rol: DEMO_USER.rol, voluntarioId: DEMO_USER.voluntarioId };
    localStorage.setItem('demo_session', JSON.stringify(session));
    return session;
  }
  const supabase = getClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  session = data.session;
  await loadProfile();
  return session;
}

export async function logout() {
  if (isDemoMode()) {
    session = null;
    profile = null;
    localStorage.removeItem('demo_session');
    return;
  }
  const supabase = getClient();
  await supabase.auth.signOut();
  session = null;
  profile = null;
}

export function loginDemo() {
  session = { ...DEMO_USER };
  profile = { rol: DEMO_USER.rol, voluntarioId: DEMO_USER.voluntarioId };
  localStorage.setItem('demo_session', JSON.stringify(session));
}

export function loginDemoAdmin() {
  session = { ...DEMO_USER, nombre: 'Admin Demo', rol: 'admin' };
  profile = { rol: 'admin', voluntarioId: DEMO_USER.voluntarioId };
  localStorage.setItem('demo_session', JSON.stringify(session));
}
