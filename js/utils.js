export const DIAS = [
  { key: 'todos', label: 'Todos' },
  { key: 'Lunes', label: 'Lun', orden: 1 },
  { key: 'Martes', label: 'Mar', orden: 2 },
  { key: 'Miércoles', label: 'Mié', orden: 3 },
  { key: 'Jueves', label: 'Jue', orden: 4 },
  { key: 'Viernes', label: 'Vie', orden: 5 },
  { key: 'Sábado', label: 'Sáb', orden: 6 },
  { key: 'Domingo', label: 'Dom', orden: 7 },
];

export const DIAS_ORDEN = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function formatHora(hora) {
  if (!hora) return '';
  return hora.slice(0, 5);
}

export function badgeClass(estado) {
  const map = { Vacante: 'vacante', Parcial: 'parcial', Cubierto: 'cubierto' };
  return map[estado] || 'cubierto';
}

export function mapsUrl(turno) {
  if (turno.link_maps) return turno.link_maps;
  const q = encodeURIComponent(`${turno.nombre_punto}, Buenos Aires`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export function truncate(str, max = 42) {
  if (!str || str.length <= max) return str;
  return `${str.slice(0, max)}…`;
}

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function groupByDay(turnos, filtro = 'todos') {
  const filtered =
    filtro === 'todos' ? turnos : turnos.filter((t) => t.dia_semana === filtro);
  const sorted = [...filtered].sort(
    (a, b) => a.orden_dia - b.orden_dia || a.hora_inicio.localeCompare(b.hora_inicio),
  );
  const groups = [];
  let current = null;
  for (const t of sorted) {
    if (!current || current.dia !== t.dia_semana) {
      current = { dia: t.dia_semana, turnos: [] };
      groups.push(current);
    }
    current.turnos.push(t);
  }
  return groups;
}

export function contadoresGlobales(turnos) {
  const conCupo = turnos.filter((t) => t.vacantes > 0);
  const cuposLibres = conCupo.reduce((s, t) => s + t.vacantes, 0);
  const cubiertos = turnos.filter((t) => t.estado_turno === 'Cubierto').length;
  return {
    turnosConCupo: conCupo.length,
    cuposLibres,
    total: turnos.length,
    cubiertos,
  };
}

export function whatsappUrl(telefono, nombre) {
  if (!telefono) return null;
  const num = telefono.replace(/\D/g, '');
  return `https://wa.me/${num}?text=${encodeURIComponent(`Hola ${nombre}`)}`;
}

export function showToast(message, duration = 3200) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

export function confirmDialog({ title, text, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar' }) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';
    backdrop.innerHTML = `
      <div class="dialog" role="dialog" aria-modal="true">
        <h2 class="dialog__title">${escapeHtml(title)}</h2>
        <p class="dialog__text">${escapeHtml(text)}</p>
        <div class="dialog__actions">
          <button type="button" class="btn btn--secondary" data-action="cancel">${escapeHtml(cancelLabel)}</button>
          <button type="button" class="btn btn--danger" data-action="confirm">${escapeHtml(confirmLabel)}</button>
        </div>
      </div>`;
    const close = (val) => {
      backdrop.remove();
      resolve(val);
    };
    backdrop.querySelector('[data-action="cancel"]').addEventListener('click', () => close(false));
    backdrop.querySelector('[data-action="confirm"]').addEventListener('click', () => close(true));
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close(false);
    });
    document.body.appendChild(backdrop);
  });
}

export function isDesktop() {
  return window.matchMedia('(min-width: 900px)').matches;
}
