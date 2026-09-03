import { login, loginDemo, loginDemoAdmin, logout, isAuthenticated } from '../auth.js';
import { isDemoMode } from '../supabase-client.js';
import { escapeHtml } from '../utils.js';

function loginFormHtml({ error, message, idPrefix = '' } = {}) {
  const demo = isDemoMode();
  return `
    ${message ? `<p class="login-card__sub">${escapeHtml(message)}</p>` : ''}
    ${error ? `<div class="login-card__error" role="alert">${escapeHtml(error)}</div>` : ''}
    <form id="${idPrefix}login-form">
      <div class="form-field">
        <label for="${idPrefix}email">Email</label>
        <input id="${idPrefix}email" name="email" type="email" required autocomplete="email" placeholder="tu@email.com" />
      </div>
      <div class="form-field">
        <label for="${idPrefix}password">Contraseña</label>
        <input id="${idPrefix}password" name="password" type="password" required autocomplete="current-password" />
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
    }`;
}

function mountLoginForm(root, { idPrefix = '', onSuccess }) {
  const form = root.querySelector(`#${idPrefix}login-form`);
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    try {
      await login(fd.get('email'), fd.get('password'));
      onSuccess(true);
    } catch (err) {
      onSuccess(false, err.message || 'No se pudo iniciar sesión');
    }
  });
  root.querySelector('[data-demo="voluntario"]')?.addEventListener('click', () => {
    loginDemo();
    onSuccess(true);
  });
  root.querySelector('[data-demo="admin"]')?.addEventListener('click', () => {
    loginDemoAdmin();
    onSuccess(true);
  });
}

/** Modal de login — se abre solo al intentar una acción que requiere cuenta. */
export function showLoginModal({ message } = {}) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';
    backdrop.innerHTML = `
      <div class="login-card login-card--modal" role="dialog" aria-modal="true" aria-labelledby="login-modal-title">
        <button type="button" class="login-modal__close" data-action="close" aria-label="Cerrar">×</button>
        <h2 class="login-card__title" id="login-modal-title">Iniciar sesión</h2>
        ${loginFormHtml({ message: message || 'Ingresá para gestionar turnos y ver tus asignaciones.' })}
      </div>`;

    const close = (ok) => {
      backdrop.remove();
      resolve(!!ok);
    };

    const remountOnError = (errMsg) => {
      const card = backdrop.querySelector('.login-card');
      card.innerHTML = `
        <button type="button" class="login-modal__close" data-action="close" aria-label="Cerrar">×</button>
        <h2 class="login-card__title">Iniciar sesión</h2>
        ${loginFormHtml({ error: errMsg, message: message || 'Ingresá para gestionar turnos y ver tus asignaciones.' })}`;
      backdrop.querySelector('[data-action="close"]')?.addEventListener('click', () => close(false));
      mountLoginForm(card, {
        onSuccess: (ok, err) => (ok ? close(true) : remountOnError(err)),
      });
    };

    backdrop.querySelector('[data-action="close"]')?.addEventListener('click', () => close(false));
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close(false);
    });
    mountLoginForm(backdrop, {
      onSuccess: (ok, err) => (ok ? close(true) : remountOnError(err)),
    });
    document.body.appendChild(backdrop);
    backdrop.querySelector('input[type="email"]')?.focus();
  });
}

export async function requireAuth(message) {
  if (isAuthenticated()) return true;
  return showLoginModal({ message });
}

export { logout };
