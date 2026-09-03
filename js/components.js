import { icons } from './icons.js';
import { escapeHtml, formatHora, badgeClass, truncate } from './utils.js';

export function renderAppHeader({ nombre, authenticated }) {
  const greeting = authenticated ? `Hola, ${escapeHtml(nombre)}` : 'Programa semanal';
  const authBtn = authenticated
    ? `<button type="button" class="btn-logout" data-action="logout">Cerrar sesión ${icons.logout}</button>`
    : `<button type="button" class="btn-logout btn-logout--login" data-action="login">Iniciar sesión</button>`;
  return `
    <header class="app-header">
      <div class="app-header__top">
        <div>
          <p class="app-header__brand">Gestión de Exhibidores</p>
          <h1 class="app-header__greeting">${greeting}</h1>
        </div>
        ${authBtn}
      </div>
    </header>`;
}

export function renderBadge(estado) {
  const cls = badgeClass(estado);
  return `<span class="badge badge--${cls}">${escapeHtml(estado)}</span>`;
}

export function renderTurnoCard(turno, { linkPrefix = '#/turno', scrollTarget = false } = {}) {
  const volText = turno.voluntarios_label || 'Todavía no hay voluntarios asignados';
  const retiro = truncate(`${turno.nombre_exhibidor} · retiro en ${turno.direccion_retiro}`, 48);
  return `
    <article class="card card--clickable${scrollTarget ? ' card--scroll-target' : ''}"${scrollTarget ? ' id="primera-vacante"' : ''} data-href="${linkPrefix}/${turno.id}">
      <div class="card__head">
        <p class="card__meta"><strong>${escapeHtml(turno.dia_semana)} · ${formatHora(turno.hora_inicio)}</strong> ${escapeHtml(turno.id)}</p>
        ${renderBadge(turno.estado_turno)}
      </div>
      <h3 class="card__title">${escapeHtml(turno.nombre_punto)}</h3>
      <p class="card__row">${icons.pin} ${escapeHtml(turno.referencia_exacta || '—')}</p>
      <p class="card__row">${icons.box} ${escapeHtml(retiro)}</p>
      <p class="card__row">${icons.people} ${escapeHtml(volText)}</p>
      <span class="card__link">${icons.clock} Ver detalle y gestionar</span>
    </article>`;
}

export function renderTurnoCardCompact(turno) {
  return `
    <article class="card card--clickable" data-href="#/turno/${turno.id}">
      <div class="card__head">
        <p class="card__meta"><strong>${formatHora(turno.hora_inicio)}</strong> ${escapeHtml(turno.id)}</p>
        ${renderBadge(turno.estado_turno)}
      </div>
      <p class="card__title" style="font-size:0.875rem;margin-bottom:0.25rem">${escapeHtml(turno.nombre_exhibidor)}</p>
      <p class="card__row" style="margin:0">${icons.people} ${escapeHtml(turno.voluntarios_label || 'Vacante')}</p>
    </article>`;
}

export function renderUbicacionCard(u) {
  const vacBadge =
    u.vacantes > 0 ? `<span class="badge badge--vacantes-count">${u.vacantes} vacante${u.vacantes > 1 ? 's' : ''}</span>` : '';
  return `
    <article class="card card--clickable" data-href="#/ubicaciones/${u.id}">
      <div class="card__head">
        <p class="card__meta">${icons.pin}</p>
        ${vacBadge}
      </div>
      <h3 class="card__title">${escapeHtml(u.nombre_punto)}</h3>
      <p class="card__text">${escapeHtml(u.referencia_exacta || '—')}</p>
      <div class="card__field">
        <span class="card__field-label">Horarios</span>
        <span class="card__field-value">${escapeHtml(truncate(u.horarios, 56))}</span>
      </div>
      <div class="card__footer">
        <span>${u.total_turnos} turno${u.total_turnos !== 1 ? 's' : ''} semanal${u.total_turnos !== 1 ? 'es' : ''}</span>
        <span class="card__chevron">${icons.chevron}</span>
      </div>
    </article>`;
}

export function renderExhibidorCard(e) {
  return `
    <article class="card card--clickable" data-href="#/exhibidores/${e.id}">
      <div class="card__head">
        <p class="card__meta">${icons.box}</p>
        <span class="badge badge--activo">${escapeHtml(e.estado)}</span>
      </div>
      <h3 class="card__title">${escapeHtml(e.nombre_exhibidor)}</h3>
      <p class="card__text">Custodia: ${escapeHtml(e.responsable_guarda || '—')}</p>
      <div class="card__field">
        <span class="card__field-label">Dirección de retiro</span>
        <span class="card__field-value">${escapeHtml(e.direccion_retiro || '—')}</span>
      </div>
      <p class="card__text">${escapeHtml(truncate(e.horarios, 56))}</p>
      <div class="card__footer">
        <span></span>
        <span class="card__chevron">${icons.chevron}</span>
      </div>
    </article>`;
}

export const NAV_ITEMS = [
  { id: 'cronograma', label: 'Cronograma', hash: '#/cronograma', icon: 'home' },
  { id: 'mis-turnos', label: 'Mis turnos', hash: '#/mis-turnos', icon: 'list' },
  { id: 'ubicaciones', label: 'Ubicaciones', hash: '#/ubicaciones', icon: 'mapPin' },
  { id: 'exhibidores', label: 'Exhibidores', hash: '#/exhibidores', icon: 'package' },
];

export function renderBottomNav(activeId) {
  return NAV_ITEMS.map(
    (item) => `
    <button type="button" class="bottom-nav__item${item.id === activeId ? ' bottom-nav__item--active' : ''}" data-nav="${item.hash}">
      ${icons[item.icon]}
      ${escapeHtml(item.label)}
    </button>`,
  ).join('');
}

export function renderSidebarNav(activeId, { nombre, authenticated }) {
  const items = NAV_ITEMS.map(
    (item) => `
    <button type="button" class="sidebar-nav__item${item.id === activeId ? ' sidebar-nav__item--active' : ''}" data-nav="${item.hash}">
      ${icons[item.icon]}
      ${escapeHtml(item.label)}
    </button>`,
  ).join('');
  const userLine = authenticated ? `Hola, ${escapeHtml(nombre)}` : 'Programa semanal';
  const authBtn = authenticated
    ? `<button type="button" class="sidebar-nav__item" data-action="logout">${icons.logout} Cerrar sesión</button>`
    : `<button type="button" class="sidebar-nav__item" data-action="login">Iniciar sesión</button>`;
  return `
    <nav class="sidebar-nav" aria-label="Navegación principal">
      <p class="sidebar-nav__brand">Gestión de Exhibidores</p>
      <p class="sidebar-nav__user">${userLine}</p>
      ${items}
      <div class="sidebar-nav__logout">${authBtn}</div>
    </nav>`;
}

export function bindHeaderAuth(root, { onLogin, onLogout }) {
  root.querySelector('[data-action="login"]')?.addEventListener('click', onLogin);
  root.querySelector('[data-action="logout"]')?.addEventListener('click', onLogout);
}

export function bindCardNavigation(root) {
  root.querySelectorAll('[data-href]').forEach((el) => {
    el.addEventListener('click', () => {
      const href = el.dataset.href;
      if (href) window.location.hash = href.replace(/^#/, '');
    });
  });
}

export function bindNav(root) {
  root.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.location.hash = btn.dataset.nav.replace(/^#/, '');
    });
  });
}
