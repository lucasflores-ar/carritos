import { login, loginDemo, loginDemoAdmin, logout } from '../auth.js';
import { isDemoMode } from '../supabase-client.js';
import { escapeHtml } from '../utils.js';

export function renderLogin({ error } = {}) {
  const demo = isDemoMode();
  return `
    <div class="login-page">
      <div class="login-card">
        <h1 class="login-card__title">Gestión de Exhibidores</h1>
        <p class="login-card__sub">Ingresá con tu email para ver el cronograma y gestionar turnos.</p>
        ${error ? `<div class="login-card__error" role="alert">${escapeHtml(error)}</div>` : ''}
        <form id="login-form">
          <div class="form-field">
            <label for="email">Email</label>
            <input id="email" name="email" type="email" required autocomplete="email" placeholder="tu@email.com" />
          </div>
          <div class="form-field">
            <label for="password">Contraseña</label>
            <input id="password" name="password" type="password" required autocomplete="current-password" />
          </div>
          <button type="submit" class="btn btn--primary">Ingresar</button>
        </form>
        ${
          demo
            ? `<div class="login-card__demo">
                <p>Modo demo (sin Supabase configurado)</p>
                <button type="button" class="btn btn--secondary btn--sm" data-demo="voluntario" style="margin-top:0.5rem;width:100%">Entrar como voluntario (María)</button>
                <button type="button" class="btn btn--secondary btn--sm" data-demo="admin" style="margin-top:0.5rem;width:100%">Entrar como admin</button>
              </div>`
            : ''
        }
      </div>
    </div>`;
}

export function mountLogin(root, { onSuccess }) {
  const form = root.querySelector('#login-form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    try {
      await login(fd.get('email'), fd.get('password'));
      onSuccess();
    } catch (err) {
      onSuccess({ error: err.message || 'No se pudo iniciar sesión' });
    }
  });
  root.querySelector('[data-demo="voluntario"]')?.addEventListener('click', () => {
    loginDemo();
    onSuccess();
  });
  root.querySelector('[data-demo="admin"]')?.addEventListener('click', () => {
    loginDemoAdmin();
    onSuccess();
  });
}

export { logout };
