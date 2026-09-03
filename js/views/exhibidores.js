import { fetchExhibidores, fetchTurnos, updateExhibidor } from '../api.js';
import { renderAppHeader, renderExhibidorCard, renderTurnoCard, bindCardNavigation } from '../components.js';
import { escapeHtml } from '../utils.js';
import { icons } from '../icons.js';
import { isAdmin } from '../auth.js';
import { showToast } from '../utils.js';

export async function renderExhibidoresList(ctx) {
  const exhibidores = await fetchExhibidores();
  ctx.main.innerHTML = `
    ${renderAppHeader({ nombre: ctx.nombre })}
    <section class="hero">
      <p class="hero__eyebrow">Logística semanal</p>
      <h2 class="hero__title">Exhibidores</h2>
      <p class="hero__text">Consultá quién guarda cada exhibidor y dónde retirarlo.</p>
    </section>
    ${exhibidores.map((e) => renderExhibidorCard(e)).join('')}`;
  bindCardNavigation(ctx.main);
}

export async function renderExhibidorDetalle(ctx, id) {
  const [exhibidores, turnos] = await Promise.all([fetchExhibidores(), fetchTurnos()]);
  const e = exhibidores.find((x) => x.id === id);
  if (!e) {
    ctx.main.innerHTML = '<p class="empty-state">Exhibidor no encontrado.</p>';
    return;
  }
  const delExh = turnos.filter((t) => t.exhibidor_id === id);
  const admin = isAdmin();

  const formAdmin = admin
    ? `
    <div class="card form-card">
      <h3 class="info-card__title">${icons.edit} Actualizar logística</h3>
      <p class="form-card__hint">Solo las personas administradoras pueden modificar estos datos.</p>
      <form id="form-exhibidor">
        <div class="form-field">
          <label for="responsable">Responsable de guarda</label>
          <input id="responsable" name="responsable_guarda" value="${escapeHtml(e.responsable_guarda || '')}" />
        </div>
        <div class="form-field">
          <label for="direccion">Dirección de retiro y devolución</label>
          <input id="direccion" name="direccion_retiro" value="${escapeHtml(e.direccion_retiro || '')}" />
        </div>
        <div class="form-field">
          <label for="estado">Estado</label>
          <select id="estado" name="estado">
            <option value="Activo"${e.estado === 'Activo' ? ' selected' : ''}>Activo</option>
            <option value="Inactivo"${e.estado === 'Inactivo' ? ' selected' : ''}>Inactivo</option>
          </select>
        </div>
        <button type="submit" class="btn btn--primary">Guardar cambios</button>
      </form>
    </div>`
    : '';

  ctx.main.innerHTML = `
    ${renderAppHeader({ nombre: ctx.nombre })}
    <nav class="breadcrumb"><a href="#/exhibidores">Exhibidores</a><span class="breadcrumb__sep">›</span>${escapeHtml(e.id)}</nav>
    <div class="detail-head">
      <div class="detail-head__row">
        <p class="detail-head__id">${escapeHtml(e.id)}</p>
        <span class="badge badge--activo">${escapeHtml(e.estado)}</span>
      </div>
      <h2 class="detail-head__title">${escapeHtml(e.nombre_exhibidor)}</h2>
      <p class="card__row">${icons.pin} Retiro y devolución: ${escapeHtml(e.direccion_retiro || '—')}</p>
      <p class="card__row">${icons.box} Custodia actual: ${escapeHtml(e.responsable_guarda || '—')}</p>
    </div>
    ${formAdmin}
    <h3 class="section-head__title" style="margin-top:1rem">Turnos de la semana</h3>
    ${delExh.map((t) => renderTurnoCard(t)).join('')}`;

  bindCardNavigation(ctx.main);
  ctx.main.querySelector('#form-exhibidor')?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    try {
      await updateExhibidor(id, {
        responsable_guarda: fd.get('responsable_guarda'),
        direccion_retiro: fd.get('direccion_retiro'),
        estado: fd.get('estado'),
      });
      showToast('Logística actualizada');
      renderExhibidorDetalle(ctx, id);
    } catch (err) {
      showToast(err.message || 'Error al guardar');
    }
  });
}
