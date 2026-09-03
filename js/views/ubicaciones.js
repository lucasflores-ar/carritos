import { fetchUbicaciones, fetchTurnos } from '../api.js';
import { renderAppHeader, renderUbicacionCard, renderTurnoCard, bindCardNavigation } from '../components.js';
import { escapeHtml, mapsUrl } from '../utils.js';
import { icons } from '../icons.js';

export async function renderUbicacionesList(ctx) {
  const ubicaciones = await fetchUbicaciones();
  ctx.main.innerHTML = `
    ${renderAppHeader({ nombre: ctx.nombre })}
    <section class="hero">
      <p class="hero__eyebrow">Puntos activos</p>
      <h2 class="hero__title">Ubicaciones</h2>
      <p class="hero__text">Consultá la referencia exacta y los horarios de cada punto.</p>
    </section>
    ${ubicaciones.map((u) => renderUbicacionCard(u)).join('')}`;
  bindCardNavigation(ctx.main);
}

export async function renderUbicacionDetalle(ctx, id) {
  const [ubicaciones, turnos] = await Promise.all([fetchUbicaciones(), fetchTurnos()]);
  const u = ubicaciones.find((x) => x.id === id);
  if (!u) {
    ctx.main.innerHTML = '<p class="empty-state">Ubicación no encontrada.</p>';
    return;
  }
  const delPunto = turnos.filter((t) => t.ubicacion_id === id);
  const maps = mapsUrl({ nombre_punto: u.nombre_punto, link_maps: u.link_maps });

  ctx.main.innerHTML = `
    ${renderAppHeader({ nombre: ctx.nombre })}
    <nav class="breadcrumb"><a href="#/ubicaciones">Ubicaciones</a><span class="breadcrumb__sep">›</span>${escapeHtml(u.nombre_punto)}</nav>
    <div class="detail-head">
      <p class="detail-head__id">${escapeHtml(u.id)}</p>
      <h2 class="detail-head__title">${escapeHtml(u.nombre_punto)}</h2>
      <p class="detail-head__ref">${escapeHtml(u.referencia_exacta || '')}</p>
      <a class="btn btn--maps" href="${maps}" target="_blank" rel="noopener">${icons.pin} Abrir en Google Maps</a>
    </div>
    <div class="card">
      <h3 class="info-card__title">${icons.calendar} Horarios asociados</h3>
      <p>${u.total_turnos} turno${u.total_turnos !== 1 ? 's' : ''} programado${u.total_turnos !== 1 ? 's' : ''} en este punto</p>
    </div>
    <h3 class="section-head__title" style="margin-top:1rem">Turnos en este punto</h3>
    ${delPunto.map((t) => renderTurnoCard(t)).join('')}`;
  bindCardNavigation(ctx.main);
}
