import { getSession, getDisplayName, logout } from './auth.js';
import { renderLogin, mountLogin } from './views/login.js';
import { renderCronograma } from './views/cronograma.js';
import { renderMisTurnos } from './views/mis-turnos.js';
import { renderUbicacionesList, renderUbicacionDetalle } from './views/ubicaciones.js';
import { renderExhibidoresList, renderExhibidorDetalle } from './views/exhibidores.js';
import { renderTurnoDetalle, cleanupTurnoDetalle } from './views/turno-detalle.js';
import { renderBottomNav, renderSidebarNav, bindNav, NAV_ITEMS } from './components.js';
import { isDemoMode } from './supabase-client.js';
import { isDesktop } from './utils.js';

const viewRoot = document.getElementById('view-root');
const bottomNav = document.getElementById('bottom-nav');
const demoBanner = document.getElementById('demo-banner');
const appShell = document.getElementById('app-shell');

let loginError = null;

function parseRoute() {
  const hash = window.location.hash.slice(1) || '/cronograma';
  const parts = hash.replace(/^\//, '').split('/').filter(Boolean);
  return { parts, raw: hash };
}

function getActiveNav(parts) {
  if (parts[0] === 'turno') return 'cronograma';
  if (parts[0] === 'ubicaciones' && parts[1]) return 'ubicaciones';
  if (parts[0] === 'exhibidores' && parts[1]) return 'exhibidores';
  const match = NAV_ITEMS.find((n) => n.id === parts[0]);
  return match?.id || 'cronograma';
}

async function render() {
  cleanupTurnoDetalle();
  const session = getSession();

  if (demoBanner) {
    demoBanner.classList.toggle('hidden', !isDemoMode());
  }

  if (!session) {
    bottomNav.classList.add('hidden');
    appShell?.classList.remove('app-shell--desktop');
    viewRoot.innerHTML = renderLogin({ error: loginError });
    mountLogin(viewRoot, {
      onSuccess: (opts) => {
        loginError = opts?.error ?? null;
        if (!opts?.error) loginError = null;
        render();
      },
    });
    return;
  }

  bottomNav.classList.remove('hidden');
  const desktop = isDesktop();
  appShell?.classList.toggle('app-shell--desktop', desktop);

  const { parts } = parseRoute();
  const activeNav = getActiveNav(parts);
  const ctx = {
    main: viewRoot,
    nombre: getDisplayName(),
  };

  if (desktop) {
    const sidebarSlot = document.getElementById('sidebar-slot');
    if (sidebarSlot) {
      sidebarSlot.innerHTML = renderSidebarNav(activeNav, { nombre: ctx.nombre });
      bindNav(sidebarSlot);
      sidebarSlot.querySelector('[data-action="logout"]')?.addEventListener('click', handleLogout);
    }
  }

  bottomNav.innerHTML = renderBottomNav(activeNav);
  bindNav(bottomNav);

  viewRoot.innerHTML = '<p class="loading">Cargando…</p>';

  try {
    const route = parts[0] || 'cronograma';
    switch (route) {
      case 'cronograma':
        await renderCronograma(ctx);
        break;
      case 'mis-turnos':
        await renderMisTurnos(ctx);
        break;
      case 'ubicaciones':
        if (parts[1]) await renderUbicacionDetalle(ctx, parts[1]);
        else await renderUbicacionesList(ctx);
        break;
      case 'exhibidores':
        if (parts[1]) await renderExhibidorDetalle(ctx, parts[1]);
        else await renderExhibidoresList(ctx);
        break;
      case 'turno':
        await renderTurnoDetalle(ctx, parts[1]);
        break;
      default:
        window.location.hash = '#/cronograma';
        return;
    }
  } catch (err) {
    viewRoot.innerHTML = `<p class="empty-state">Error: ${err.message}</p>`;
  }

  viewRoot.querySelector('[data-action="logout"]')?.addEventListener('click', handleLogout);
}

async function handleLogout() {
  await logout();
  window.location.hash = '#/login';
  render();
}

export function initRouter() {
  window.addEventListener('hashchange', render);
  window.addEventListener('resize', () => render());
  if (!window.location.hash || window.location.hash === '#') {
    window.location.hash = '#/cronograma';
  }
  render();
}
