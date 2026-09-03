import {
  fetchTurno,
  fetchAsignacionesTurno,
  tomarTurno,
  darseDeBaja,
  subscribeAsignaciones,
  estoyAnotado,
} from '../api.js';
import { renderAppHeader, renderBadge, bindCardNavigation } from '../components.js';
import { icons } from '../icons.js';
import {
  escapeHtml,
  formatHora,
  mapsUrl,
  confirmDialog,
  showToast,
  whatsappUrl,
} from '../utils.js';
import { isAdmin, getVoluntarioId } from '../auth.js';

let unsubscribeRealtime = null;

export async function renderTurnoDetalle(ctx, id) {
  if (unsubscribeRealtime) {
    unsubscribeRealtime();
    unsubscribeRealtime = null;
  }

  const turno = await fetchTurno(id);
  if (!turno) {
    ctx.main.innerHTML = '<p class="empty-state">Turno no encontrado.</p>';
    return;
  }

  const render = async () => {
    const [asigs, anotado] = await Promise.all([
      fetchAsignacionesTurno(id),
      estoyAnotado(id),
    ]);
    const volId = getVoluntarioId();
    const admin = isAdmin();
    const maps = mapsUrl(turno);

    const cuposHtml = buildCuposList(turno, asigs, volId);
    const { bannerHtml, actionsHtml } = buildBanner(turno, asigs, anotado, admin, volId);

    ctx.main.innerHTML = `
      ${renderAppHeader({ nombre: ctx.nombre })}
      <nav class="breadcrumb"><a href="#/cronograma">Cronograma</a><span class="breadcrumb__sep">›</span>${escapeHtml(id)}</nav>
      <div class="detail-head">
        <div class="detail-head__row">
          <span class="detail-head__time">${escapeHtml(turno.dia_semana)} · ${formatHora(turno.hora_inicio)}</span>
          ${renderBadge(turno.estado_turno)}
        </div>
        <p class="detail-head__id">${escapeHtml(id)}</p>
        <h2 class="detail-head__title">${escapeHtml(turno.nombre_punto)}</h2>
        <p class="detail-head__ref">${escapeHtml(turno.referencia_exacta || '')}</p>
        <a class="btn btn--maps" href="${maps}" target="_blank" rel="noopener">${icons.pin} Abrir en Google Maps</a>
      </div>
      <div class="card">
        <h3 class="info-card__title">${icons.people} Voluntarios</h3>
        <ul class="cupo-list">${cuposHtml}</ul>
      </div>
      <div class="card">
        <h3 class="info-card__title">${icons.box} Logística del exhibidor</h3>
        <p><strong>${escapeHtml(turno.nombre_exhibidor)}</strong></p>
        <p class="card__row">Retirar y devolver en: ${escapeHtml(turno.direccion_retiro || '—')}</p>
        <p class="card__row">Custodia: ${escapeHtml(turno.responsable_guarda || '—')}</p>
        <a class="card__link" href="#/exhibidores/${turno.exhibidor_id}">Ver ficha del exhibidor</a>
      </div>
      ${anotado ? renderChecklist(turno, asigs, volId) : ''}
      <div class="banner banner--${bannerVariant(turno, anotado)}">${bannerHtml}${actionsHtml ? `<div class="banner__actions">${actionsHtml}</div>` : ''}</div>`;

    bindActions(ctx, id, turno, anotado);
    bindCardNavigation(ctx.main);
  };

  await render();
  unsubscribeRealtime = subscribeAsignaciones(() => render());
}

function buildCuposList(turno, asigs, miVolId) {
  const items = [];
  for (let i = 0; i < turno.cupos; i++) {
    const asig = asigs[i];
    if (asig) {
      const v = asig.voluntario;
      const esYo = asig.voluntario_id === miVolId;
      const wa = whatsappUrl(v?.telefono, v?.nombre);
      const nombre = wa
        ? `<a href="${wa}" target="_blank" rel="noopener">${escapeHtml(v.nombre)}</a>`
        : escapeHtml(v?.nombre || '—');
      items.push(
        `<li class="cupo-list__item${esYo ? ' cupo-list__item--mine' : ''}">Cupo ${i + 1}: ${nombre}${esYo ? ' (vos)' : ''}</li>`,
      );
    } else {
      items.push(`<li class="cupo-list__item">Cupo ${i + 1}: libre — puede ser tuyo</li>`);
    }
  }
  return items.join('');
}

function buildBanner(turno, asigs, anotado, admin, volId) {
  if (anotado) {
    return {
      bannerHtml: '<strong>Estás anotado a este turno</strong>',
      actionsHtml: `<button type="button" class="btn btn--danger" data-action="baja">Darme de baja</button>`,
    };
  }
  if (turno.estado_turno === 'Vacante') {
    return {
      bannerHtml: `<strong>Quedan ${turno.vacantes} cupo${turno.vacantes !== 1 ? 's' : ''} libres</strong>`,
      actionsHtml: `<button type="button" class="btn btn--primary" data-action="tomar">Tomar este turno</button>`,
    };
  }
  if (turno.estado_turno === 'Parcial') {
    const compañero = asigs.find((a) => a.voluntario_id !== volId)?.voluntario?.nombre || 'un compañero';
    return {
      bannerHtml: `<strong>Queda 1 cupo — vas con ${escapeHtml(compañero)}</strong>`,
      actionsHtml: `<button type="button" class="btn btn--primary" data-action="tomar">Tomar este turno</button>`,
    };
  }
  return {
    bannerHtml: '<strong>Este turno ya tiene una cobertura registrada.</strong>',
    actionsHtml: admin ? `<button type="button" class="btn btn--secondary btn--sm" data-action="admin-edit">Gestionar asignaciones</button>` : '',
  };
}

function bannerVariant(turno, anotado) {
  if (anotado) return 'info';
  if (turno.estado_turno === 'Vacante') return 'vacante';
  if (turno.estado_turno === 'Parcial') return 'parcial';
  return 'cubierto';
}

function renderChecklist(turno, asigs, volId) {
  const compañeros = asigs.filter((a) => a.voluntario_id !== volId).map((a) => a.voluntario?.nombre);
  const maps = mapsUrl(turno);
  return `
    <div class="card">
      <h3 class="info-card__title">${icons.clipboard} Checklist pre-salida</h3>
      <ul class="checklist">
        <li class="checklist__item">${icons.pin} ${escapeHtml(turno.nombre_punto)} — ${escapeHtml(turno.referencia_exacta || '')}</li>
        <li class="checklist__item">${icons.pin} <a href="${maps}" target="_blank" rel="noopener">Abrir en Google Maps</a></li>
        <li class="checklist__item">${icons.box} Retiro: ${escapeHtml(turno.direccion_retiro || '—')}</li>
        <li class="checklist__item">${icons.people} ${compañeros.length ? `Compañero: ${escapeHtml(compañeros.join(', '))}` : 'Sin compañero asignado'}</li>
      </ul>
    </div>`;
}

function bindActions(ctx, id, turno, anotado) {
  ctx.main.querySelector('[data-action="tomar"]')?.addEventListener('click', async () => {
    const btn = ctx.main.querySelector('[data-action="tomar"]');
    btn.disabled = true;
    try {
      await tomarTurno(id);
      showToast('¡Turno confirmado!');
      await renderTurnoDetalle(ctx, id);
    } catch (err) {
      if (err.message === 'CUPO_LLENO') {
        showToast('Alguien tomó este cupo recién');
        await renderTurnoDetalle(ctx, id);
      } else if (err.message === 'SIN_VOLUNTARIO') {
        showToast('Tu cuenta no está vinculada a un voluntario');
      } else {
        showToast(err.message || 'No se pudo tomar el turno');
      }
      btn.disabled = false;
    }
  });

  ctx.main.querySelector('[data-action="baja"]')?.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Darse de baja',
      text: '¿Confirmás que querés liberar tu cupo en este turno?',
      confirmLabel: 'Sí, darme de baja',
    });
    if (!ok) return;
    try {
      await darseDeBaja(id);
      showToast('Te diste de baja del turno');
      await renderTurnoDetalle(ctx, id);
    } catch (err) {
      showToast(err.message || 'No se pudo completar la baja');
    }
  });
}

export function cleanupTurnoDetalle() {
  if (unsubscribeRealtime) {
    unsubscribeRealtime();
    unsubscribeRealtime = null;
  }
}
