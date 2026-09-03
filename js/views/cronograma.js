import { fetchTurnos } from '../api.js';
import {
  renderAppHeader,
  renderTurnoCard,
  renderTurnoCardCompact,
  renderBadge,
  bindCardNavigation,
} from '../components.js';
import { icons } from '../icons.js';
import {
  escapeHtml,
  groupByDay,
  contadoresGlobales,
  DIAS,
  DIAS_ORDEN,
  isDesktop,
} from '../utils.js';

let filtroDia = 'todos';
let soloVacantes = false;

export async function renderCronograma(ctx) {
  const turnos = await fetchTurnos();
  let lista = turnos;
  if (soloVacantes) lista = turnos.filter((t) => t.vacantes > 0);
  const stats = contadoresGlobales(turnos);
  const groups = groupByDay(lista, filtroDia);

  const chips = DIAS.map(
    (d) =>
      `<button type="button" class="chip${filtroDia === d.key ? ' chip--active' : ''}" data-dia="${d.key}">${escapeHtml(d.label)}</button>`,
  ).join('');

  const mobileList = groups.length
    ? groups
        .map(
          (g) => `
        <section class="day-group">
          <h2 class="day-group__title">${escapeHtml(g.dia)} · ${g.turnos.length} turno${g.turnos.length !== 1 ? 's' : ''}</h2>
          ${g.turnos.map((t) => renderTurnoCard(t)).join('')}
        </section>`,
        )
        .join('')
    : '<p class="empty-state">No hay turnos para este filtro.</p>';

  const desktopGrid = isDesktop()
    ? `<div class="cronograma-desktop-grid"><div class="week-grid">${DIAS_ORDEN.map((dia) => {
        const delDia = lista.filter((t) => t.dia_semana === dia);
        return `<div class="week-grid__col">
          <p class="week-grid__col-title">${escapeHtml(dia.slice(0, 3))}</p>
          ${delDia.map((t) => renderTurnoCardCompact(t)).join('') || '<p class="empty-state" style="padding:0.5rem">—</p>'}
        </div>`;
      }).join('')}</div></div>`
    : '';

  ctx.main.innerHTML = `
    ${renderAppHeader({ nombre: ctx.nombre })}
    <section class="hero">
      <p class="hero__eyebrow">Cronograma semanal</p>
      <h2 class="hero__title">Turnos de predicación pública</h2>
      <p class="hero__text">Consultá la cobertura, el punto y la logística del exhibidor antes de salir.</p>
      <button type="button" class="btn btn--primary" data-action="ver-vacantes">${icons.alert} Ver una vacante</button>
    </section>
    <div class="stats-grid">
      <div class="stat-card">
        <p class="stat-card__label">Turnos con cupo</p>
        <p class="stat-card__value stat-card__value--danger">${stats.turnosConCupo}</p>
        <p class="stat-card__hint">${stats.cuposLibres} cupo${stats.cuposLibres !== 1 ? 's' : ''} libre${stats.cuposLibres !== 1 ? 's' : ''}</p>
      </div>
      <div class="stat-card">
        <p class="stat-card__label">Total semanal</p>
        <p class="stat-card__value">${stats.total}</p>
        <p class="stat-card__hint stat-card__hint--success">${stats.cubiertos} cubiertos</p>
      </div>
    </div>
    <div class="section-head">
      <h2 class="section-head__title">Filtrar por día</h2>
      <p class="section-head__sub">Los turnos aparecen ordenados por día y hora. ${icons.calendar}</p>
    </div>
    <div class="chips" role="tablist">${chips}</div>
    <div class="section-head section-head__row">
      <div>
        <h2 class="section-head__title">Turnos semanales</h2>
        <p class="section-head__sub">${soloVacantes ? 'Mostrando turnos con cupo disponible.' : 'Tocá un turno para ver el detalle y cubrir una vacante.'}</p>
      </div>
      ${icons.clipboard}
    </div>
    <div class="cronograma-mobile-list">${mobileList}</div>
    ${desktopGrid}`;

  bindCardNavigation(ctx.main);
  ctx.main.querySelector('[data-action="ver-vacantes"]')?.addEventListener('click', () => {
    soloVacantes = true;
    filtroDia = 'todos';
    renderCronograma(ctx);
  });
  ctx.main.querySelectorAll('[data-dia]').forEach((chip) => {
    chip.addEventListener('click', () => {
      filtroDia = chip.dataset.dia;
      renderCronograma(ctx);
    });
  });
}

export function resetCronogramaFilters() {
  filtroDia = 'todos';
  soloVacantes = false;
}
