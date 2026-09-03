import { fetchTurnosCalendario } from '../api.js';
import { renderAppHeader, renderTurnoCard, bindCardNavigation } from '../components.js';
import { copySemanaWhatsApp } from '../whatsapp-semana.js';
import {
  escapeHtml,
  formatHora,
  formatSemanaRango,
  nombresCortos,
  calleCorta,
  badgeClass,
  showToast,
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

function renderSemanaGrid(semana, turnos, label) {
  const rango = formatSemanaRango(semana.dias);
  const columnas = semana.dias
    .map((dia) => {
      const delDia = turnos
        .filter((t) => t.semana_id === semana.id && t.orden_dia === dia.orden)
        .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
      const hoy = dia.fecha.toDateString() === new Date().toDateString() ? ' cal-col--hoy' : '';
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

  return `
    <section class="cal-semana" aria-label="${escapeHtml(label)}" data-semana-id="${escapeHtml(semana.id)}">
      <header class="cal-semana__head">
        <div class="cal-semana__head-main">
          <h3 class="cal-semana__title">${escapeHtml(label)}</h3>
          <span class="cal-semana__range">${escapeHtml(rango)}</span>
        </div>
        <button type="button" class="cal-semana__copy" data-copy-wa="${escapeHtml(semana.id)}" title="Copiar mensaje para WhatsApp" aria-label="Copiar semana para WhatsApp">
          📋 WA
        </button>
      </header>
      <div class="calendario-grid" role="grid">${columnas}</div>
    </section>`;
}

function showTurnoPopup(turno, semanaLabel) {
  const backdrop = document.createElement('div');
  backdrop.className = 'dialog-backdrop turno-popup-backdrop';
  backdrop.innerHTML = `
    <div class="turno-popup" role="dialog" aria-modal="true" aria-labelledby="turno-popup-title">
      <button type="button" class="login-modal__close" data-action="close" aria-label="Cerrar">×</button>
      <p class="turno-popup__eyebrow" id="turno-popup-title">${escapeHtml(semanaLabel)} · ${escapeHtml(turno.dia_semana)} ${formatHora(turno.hora_inicio)}</p>
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
  const { vigente, siguiente, turnos } = await fetchTurnosCalendario();
  turnosCache.clear();
  turnos.forEach((t) => turnosCache.set(t.id, t));

  const semanaLabels = new Map([
    [vigente.id, 'Semana en vigencia'],
    [siguiente.id, 'Semana siguiente'],
  ]);
  const semanaById = new Map([
    [vigente.id, vigente],
    [siguiente.id, siguiente],
  ]);

  ctx.main.innerHTML = `
    ${renderAppHeader(ctx)}
    <section class="hero hero--compact">
      <h2 class="hero__title hero__title--sm">Calendario · 2 semanas</h2>
      <p class="hero__text hero__text--sm">Tocá un turno para ver el detalle. Usá 📋 WA para copiar la semana al grupo.</p>
    </section>
    <div class="calendario-wrap">
      ${renderSemanaGrid(vigente, turnos, 'Semana en vigencia')}
      ${renderSemanaGrid(siguiente, turnos, 'Semana siguiente')}
    </div>`;

  ctx.main.querySelectorAll('[data-turno-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const turno = turnosCache.get(btn.dataset.turnoId);
      if (turno) showTurnoPopup(turno, semanaLabels.get(turno.semana_id) || 'Turno');
    });
  });

  ctx.main.querySelectorAll('[data-copy-wa]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const semanaId = btn.dataset.copyWa;
      const semana = semanaById.get(semanaId);
      if (!semana) return;
      btn.disabled = true;
      try {
        await copySemanaWhatsApp(semana, turnos, semanaLabels.get(semanaId));
      } catch {
        showToast('No se pudo copiar. Intentá de nuevo.');
      } finally {
        btn.disabled = false;
      }
    });
  });

  ctx.main.classList.add('main-content--calendario');
}

export function cleanupCalendario(ctx) {
  ctx?.main?.classList.remove('main-content--calendario');
}
