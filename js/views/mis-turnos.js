import { fetchMisTurnos, fetchAsignacionesTurno } from '../api.js';
import { renderAppHeader, renderBadge, bindCardNavigation } from '../components.js';
import { icons } from '../icons.js';
import { escapeHtml, formatHora, mapsUrl } from '../utils.js';
import { getVoluntarioId } from '../auth.js';
import { requireAuth } from './login.js';

export async function renderMisTurnos(ctx) {
  if (!ctx.authenticated) {
    ctx.main.innerHTML = `
      ${renderAppHeader(ctx)}
      <section class="hero">
        <p class="hero__eyebrow">Tu semana</p>
        <h2 class="hero__title">Mis turnos</h2>
        <p class="hero__text">Iniciá sesión para ver tus turnos asignados y el checklist pre-salida.</p>
      </section>
      <button type="button" class="btn btn--primary" data-action="login-prompt">Iniciar sesión</button>`;
    ctx.main.querySelector('[data-action="login-prompt"]')?.addEventListener('click', () =>
      requireAuth('Ingresá para ver tus turnos asignados.'),
    );
    return;
  }

  const volId = getVoluntarioId();
  const turnos = volId ? await fetchMisTurnos(volId) : [];

  const cards = await Promise.all(
    turnos.sort((a, b) => a.orden_dia - b.orden_dia || a.hora_inicio.localeCompare(b.hora_inicio)).map(async (t) => {
      const asigs = await fetchAsignacionesTurno(t.id);
      const compañeros = asigs
        .filter((a) => a.voluntario_id !== volId)
        .map((a) => a.voluntario?.nombre)
        .filter(Boolean);
      const maps = mapsUrl(t);
      return `
        <article class="card card--clickable" data-href="#/turno/${t.id}">
          <div class="card__head">
            <p class="card__meta"><strong>${escapeHtml(t.dia_semana)} · ${formatHora(t.hora_inicio)}</strong> ${escapeHtml(t.id)}</p>
            ${renderBadge(t.estado_turno)}
          </div>
          <h3 class="card__title">${escapeHtml(t.nombre_punto)}</h3>
          <ul class="checklist">
            <li class="checklist__item">${icons.pin} ${escapeHtml(t.referencia_exacta || '—')}</li>
            <li class="checklist__item">${icons.pin} <a href="${maps}" target="_blank" rel="noopener" onclick="event.stopPropagation()">Abrir en Google Maps</a></li>
            <li class="checklist__item">${icons.box} Retiro: ${escapeHtml(t.direccion_retiro || '—')}</li>
            <li class="checklist__item">${icons.people} ${compañeros.length ? `Compañero: ${escapeHtml(compañeros.join(', '))}` : 'Sin compañero asignado aún'}</li>
          </ul>
          <span class="card__link">${icons.clock} Ver detalle y gestionar</span>
        </article>`;
    }),
  );

  ctx.main.innerHTML = `
    ${renderAppHeader(ctx)}
    <section class="hero">
      <p class="hero__eyebrow">Tu semana</p>
      <h2 class="hero__title">Mis turnos</h2>
      <p class="hero__text">Checklist pre-salida: punto, referencia, maps y retiro del exhibidor.</p>
    </section>
    ${cards.length ? cards.join('') : '<p class="empty-state">Todavía no tenés turnos asignados. Podés tomar uno desde el cronograma.</p>'}`;

  bindCardNavigation(ctx.main);
}
