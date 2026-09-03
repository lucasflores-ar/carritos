import { getClient, isDemoMode } from './supabase-client.js';
import {
  demoStore,
  demoGetAsignacionesPorTurno,
  demoTomarTurno,
  demoDarseDeBaja,
  demoUpdateExhibidor,
} from './demo-data.js';
import { getVoluntarioId } from './auth.js';

let realtimeChannel = null;

const cache = {
  turnos: null,
  ubicaciones: null,
  exhibidores: null,
};

export function invalidateCache(...keys) {
  if (!keys.length) {
    cache.turnos = null;
    cache.ubicaciones = null;
    cache.exhibidores = null;
    return;
  }
  keys.forEach((k) => {
    cache[k] = null;
  });
}

export async function fetchTurnos() {
  if (isDemoMode()) return [...demoStore.turnos];
  if (cache.turnos) return cache.turnos;
  const { data, error } = await getClient()
    .from('v_turnos_enriquecidos')
    .select('*')
    .order('orden_dia')
    .order('hora_inicio');
  if (error) throw error;
  cache.turnos = data;
  return data;
}

export async function fetchTurno(id) {
  const turnos = await fetchTurnos();
  return turnos.find((t) => t.id === id) ?? null;
}

export async function fetchUbicaciones() {
  if (isDemoMode()) return [...demoStore.ubicaciones];
  if (cache.ubicaciones) return cache.ubicaciones;
  const { data, error } = await getClient().from('v_ubicaciones_resumen').select('*').order('nombre_punto');
  if (error) throw error;
  cache.ubicaciones = data;
  return data;
}

export async function fetchUbicacion(id) {
  const all = await fetchUbicaciones();
  return all.find((u) => u.id === id) ?? null;
}

export async function fetchExhibidores() {
  if (isDemoMode()) return [...demoStore.exhibidores];
  if (cache.exhibidores) return cache.exhibidores;
  const { data, error } = await getClient().from('v_exhibidores_resumen').select('*').order('nombre_exhibidor');
  if (error) throw error;
  cache.exhibidores = data;
  return data;
}

export async function fetchExhibidor(id) {
  const all = await fetchExhibidores();
  return all.find((e) => e.id === id) ?? null;
}

export async function fetchAsignacionesTurno(turnoId) {
  if (isDemoMode()) return demoGetAsignacionesPorTurno(turnoId);
  const { data, error } = await getClient()
    .from('asignaciones')
    .select('id, turno_id, voluntario_id, estado, created_at, voluntarios(id, nombre, telefono)')
    .eq('turno_id', turnoId)
    .eq('estado', 'confirmada')
    .order('created_at');
  if (error) throw error;
  return data.map((a) => ({
    ...a,
    voluntario: a.voluntarios,
  }));
}

export async function fetchMisTurnos(voluntarioId) {
  const turnos = await fetchTurnos();
  if (isDemoMode()) {
    const ids = demoStore.asignaciones
      .filter((a) => a.voluntario_id === voluntarioId && a.estado === 'confirmada')
      .map((a) => a.turno_id);
    return turnos.filter((t) => ids.includes(t.id));
  }
  const { data, error } = await getClient()
    .from('asignaciones')
    .select('turno_id')
    .eq('voluntario_id', voluntarioId)
    .eq('estado', 'confirmada');
  if (error) throw error;
  const ids = data.map((a) => a.turno_id);
  return turnos.filter((t) => ids.includes(t.id));
}

export async function tomarTurno(turnoId) {
  const volId = getVoluntarioId();
  if (!volId) throw new Error('SIN_VOLUNTARIO');
  if (isDemoMode()) {
    try {
      demoTomarTurno(turnoId, volId);
    } catch (e) {
      if (e.message === 'CUPO_LLENO') throw new Error('CUPO_LLENO');
      throw e;
    }
    return;
  }
  const { error } = await getClient().from('asignaciones').insert({
    turno_id: turnoId,
    voluntario_id: volId,
    estado: 'confirmada',
  });
  if (error) {
    if (error.message?.includes('completo') || error.code === 'P0001') throw new Error('CUPO_LLENO');
    throw error;
  }
  invalidateCache('turnos', 'ubicaciones', 'exhibidores');
}

export async function darseDeBaja(turnoId) {
  const volId = getVoluntarioId();
  if (!volId) throw new Error('SIN_VOLUNTARIO');
  if (isDemoMode()) {
    demoDarseDeBaja(turnoId, volId);
    return;
  }
  const { error } = await getClient()
    .from('asignaciones')
    .delete()
    .eq('turno_id', turnoId)
    .eq('voluntario_id', volId)
    .eq('estado', 'confirmada');
  if (error) throw error;
  invalidateCache('turnos', 'ubicaciones', 'exhibidores');
}

export async function updateExhibidor(id, payload) {
  if (isDemoMode()) {
    demoUpdateExhibidor(id, payload);
    return;
  }
  const { error } = await getClient()
    .from('exhibidores')
    .update(payload)
    .eq('id', id);
  if (error) throw error;
  invalidateCache('turnos', 'ubicaciones', 'exhibidores');
}

export function subscribeAsignaciones(onChange) {
  if (isDemoMode()) {
    return () => {};
  }
  const supabase = getClient();
  if (realtimeChannel) supabase.removeChannel(realtimeChannel);
  realtimeChannel = supabase
    .channel('asignaciones-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'asignaciones' }, () => {
      invalidateCache('turnos', 'ubicaciones', 'exhibidores');
      onChange();
    })
    .subscribe();
  return () => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
  };
}

export async function estoyAnotado(turnoId) {
  const volId = getVoluntarioId();
  if (!volId) return false;
  const asigs = await fetchAsignacionesTurno(turnoId);
  return asigs.some((a) => a.voluntario_id === volId);
}
