import { fetchTurnos } from '../api.js';
import { renderAppHeader, renderTurnoCard, bindCardNavigation } from '../components.js';
import {
  escapeHtml,
  formatHora,
  getSemanaVigente,
  formatSemanaRango,
  nombresCortos,
  calleCorta,
  badgeClass,
} from '../utils.js';

const turnosCache = new Map();

function renderCalEntry(t) {
  const cls = badgeClass(t.estado_turno);
  return `
    <button type="button" class="cal-entry cal-entry--${cls}" data-turno-id="${escapeHtml(t.id)}" aria-label="${escapeHtml(t.dia_semana)} ${formatHora(t.hora_inicio)} ${escapeHtml(t.nombre_punto)}">
      <span class="cal-entry__time">${formatHora(t.hora_inicio)}</span>
      <span class="cal-entry__street">${escapeHtml(calleCorta(t.nombre_punto))}</span>
      <span class="cal-entry__names">${escapeHtml(nombresCortos(t.voluntarios_label))}</span>
    </button>`;
}

function showTurnoPopup(turno) {
  const backdrop = document.createElement('div');
  backdrop.className = 'dialog-backdrop turno-popup-backdrop';
  backdrop.innerHTML = `
    <div class="turno-popup" role="dialog" aria-modal="true" aria-labelledby="turno-popup-title">
      <button type="button" class="login-modal__close" data-action="close" aria-label="Cerrar">×</button>
      <p class="turno-popup__eyebrow" id="turno-popup-title">${escapeHtml(turno.id)} · ${escapeHtml(turno.dia_semana)} ${formatHora(turno.hora_inicio)}</p>
      <div class="turno-popup__card">${renderTurnoCard(turno)}</div>
      <a class="btn btn--primary btn--sm turno-popup__cta" href="#/turno/${escapeHtml(turno.id)}">Ver detalle y gestionar</a>
    </div>`;

  const close = () => backdrop.remove();
  backdrop.querySelector('[data-action="close"]')?.addEventListener('click', close);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  backdrop.querySelector('.turno-popup__cta')?.addEventListener('click', close);
  bindCardNavigation(backdrop);
  document.body.appendChild(backdrop);
}

export async function renderCalendario(ctx) {
  const turnos = await fetchTurnos();
  turnosCache.clear();
  turnos.forEach((t) => turnosCache.set(t.id, t));

  const semana = getSemanaVigente();
  const rango = formatSemanaRango(semana);

  const columnas = semana
    .map((dia) => {
      const delDia = turnos
        .filter((t) => t.orden_dia === dia.orden)
        .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
      const hoy =
        dia.fecha.toDateString() === new Date().toDateString() ? ' cal-col--hoy' : '';
      return `
        <div class="cal-col${hoy}">
          <div class="cal-col__head">
            <span class="cal-col__day">${escapeHtml(dia.corto)}</span>
            <span class="cal-col__date">${dia.diaNum}</span>
          </div>
          <div class="cal-col__body">
            ${delDia.length ? delDia.map((t) => renderCalEntry(t)).join('') : '<span class="cal-col__empty">—</span>'}
          </div>
        </div>`;
    })
    .join('');

  ctx.main.innerHTML = `
    ${renderAppHeader(ctx)}
    <section class="hero hero--compact">
      <h2 class="hero__title hero__title--sm">Semana ${escapeHtml(rango)}</h2>
      <p class="hero__text hero__text--sm">Tocá un turno para ver el detalle completo.</p>
    </section>
    <div class="calendario-wrap">
      <div class="calendario-grid" role="grid" aria-label="Calendario semanal de turnos">${columnas}</div>
    </div>`;

  ctx.main.querySelectorAll('[data-turno-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const turno = turnosCache.get(btn.dataset.turnoId);
      if (turno) showTurnoPopup(turno);
    });
  });

  ctx.main.classList.add('main-content--calendario');
}

export function cleanupCalendario(ctx) {
  ctx?.main?.classList.remove('main-content--calendario');
}
