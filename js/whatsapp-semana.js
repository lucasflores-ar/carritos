import { formatHora, formatSemanaRango, showToast } from './utils.js';

const DIAS_MAYUS = {
  Lunes: 'LUNES',
  Martes: 'MARTES',
  Miércoles: 'MIÉRCOLES',
  Jueves: 'JUEVES',
  Viernes: 'VIERNES',
  Sábado: 'SÁBADO',
  Domingo: 'DOMINGO',
};

function lugarTurno(turno) {
  if (turno.referencia_exacta) {
    return `${turno.nombre_punto} (${turno.referencia_exacta})`;
  }
  return turno.nombre_punto;
}

function lineaVoluntarios(turno) {
  if (turno.estado_turno === 'Vacante') {
    const n = turno.vacantes;
    return `   ⚠️ *VACANTE — se necesitan ${n} voluntario${n === 1 ? '' : 's'}*`;
  }
  if (turno.estado_turno === 'Parcial') {
    const n = turno.vacantes;
    return `   👥 ${turno.voluntarios_label}\n   ⚠️ *Falta${n === 1 ? '' : 'n'} ${n} cupo${n === 1 ? '' : 's'}*`;
  }
  return `   👥 ${turno.voluntarios_label}`;
}

function formatTurnoBlock(turno) {
  const hora = formatHora(turno.hora_inicio);
  const lugar = lugarTurno(turno);
  const retiro = turno.direccion_retiro || 'Consultar con responsable';
  return [
    `▪️ *${hora}* · ${lugar}`,
    lineaVoluntarios(turno),
    `   🛒 ${turno.nombre_exhibidor} · Retiro/devolución: ${retiro}`,
  ].join('\n');
}

function resumenSemana(turnos) {
  const vacantes = turnos.filter((t) => t.estado_turno === 'Vacante').length;
  const parciales = turnos.filter((t) => t.estado_turno === 'Parcial').length;
  const cuposLibres = turnos.reduce((s, t) => s + t.vacantes, 0);

  if (cuposLibres === 0) {
    return 'Cobertura completa, lunes a domingo.';
  }

  const partes = [];
  if (vacantes) partes.push(`${vacantes} turno${vacantes === 1 ? '' : 's'} vacante${vacantes === 1 ? '' : 's'}`);
  if (parciales) partes.push(`${parciales} parcial${parciales === 1 ? '' : 'es'}`);
  partes.push(`${cuposLibres} cupo${cuposLibres === 1 ? '' : 's'} libre${cuposLibres === 1 ? '' : 's'}`);
  return `Programa lunes a domingo. ${partes.join(' · ')}.`;
}

/**
 * Genera mensaje WhatsApp para una semana.
 * @param {object} semana - { id, dias, fecha_inicio, ... }
 * @param {object[]} turnos - turnos filtrados de esa semana
 * @param {string} [etiqueta] - ej. "Semana en vigencia"
 */
export function formatSemanaWhatsApp(semana, turnos, etiqueta = '') {
  const delSemana = turnos
    .filter((t) => t.semana_id === semana.id)
    .sort((a, b) => a.orden_dia - b.orden_dia || a.hora_inicio.localeCompare(b.hora_inicio));

  const rango = formatSemanaRango(semana.dias);
  const lineas = [
    '📅 *TURNOS DE LA SEMANA — Exhibidores*',
    etiqueta ? `${rango} · _${etiqueta}_` : rango,
    '',
    resumenSemana(delSemana),
    '',
  ];

  for (const dia of semana.dias) {
    const delDia = delSemana.filter((t) => t.orden_dia === dia.orden);
    if (!delDia.length) continue;

    const titulo = DIAS_MAYUS[dia.nombre] || dia.nombre.toUpperCase();
    lineas.push(`*━━ ${titulo} (${delDia.length}) ━━*`);

    for (const t of delDia) {
      lineas.push(formatTurnoBlock(t));
    }
    lineas.push('');
  }

  lineas.push('_Actualizado desde Gestión de Exhibidores_');
  return lineas.join('\n').trim();
}

export async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
}

export async function copySemanaWhatsApp(semana, turnos, etiqueta) {
  const text = formatSemanaWhatsApp(semana, turnos, etiqueta);
  await copyTextToClipboard(text);
  showToast('Mensaje copiado — pegalo en WhatsApp');
  return text;
}
