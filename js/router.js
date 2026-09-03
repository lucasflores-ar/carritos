import { getDisplayName, logout, isAuthenticated, onAuthChange } from './auth.js';
import { requireAuth, showLoginModal } from './views/login.js';
import { renderCronograma } from './views/cronograma.js';
import { renderMisTurnos } from './views/mis-turnos.js';
import { renderUbicacionesList, renderUbicacionDetalle } from './views/ubicaciones.js';
import { renderExhibidoresList, renderExhibidorDetalle } from './views/exhibidores.js';
import { renderCalendario, cleanupCalendario } from './views/calendario.js';
import { renderTurnoDetalle, cleanupTurnoDetalle } from './views/turno-detalle.js';
import {
  renderBottomNav,
  renderSidebarNav,
  bindNav,
  bindHeaderAuth,
  NAV_ITEMS,
} from './components.js';
import { isDemoMode } from './supabase-client.js';
import { isDesktop } from './utils.js';

const viewRoot = document.getElementById('view-root');
const bottomNav = document.getElementById('bottom-nav');
const demoBanner = document.getElementById('demo-banner');
const appShell = document.getElementById('app-shell');

let lastDesktop = isDesktop();
let renderSeq = 0;

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

function buildCtx() {
  const authenticated = isAuthenticated();
  return {
    main: viewRoot,
    authenticated,
    nombre: authenticated ? getDisplayName() : null,
  };
}

async function handleLogin() {
  await showLoginModal();
  render();
}

async function handleLogout() {
  await logout();
  render();
}

function bindShellAuth() {
  bindHeaderAuth(viewRoot, { onLogin: handleLogin, onLogout: handleLogout });
  const sidebarSlot = document.getElementById('sidebar-slot');
  if (sidebarSlot) bindHeaderAuth(sidebarSlot, { onLogin: handleLogin, onLogout: handleLogout });
}

function updateShell(activeNav, ctx, desktop) {
  appShell?.classList.toggle('app-shell--desktop', desktop);

  const sidebarSlot = document.getElementById('sidebar-slot');
  if (desktop && sidebarSlot) {
    sidebarSlot.innerHTML = renderSidebarNav(activeNav, ctx);
    bindNav(sidebarSlot);
  } else if (sidebarSlot) {
    sidebarSlot.innerHTML = '';
  }

  if (!bottomNav.querySelector('.bottom-nav__item')) {
    bottomNav.innerHTML = renderBottomNav(activeNav);
    bindNav(bottomNav);
  } else {
    bottomNav.querySelectorAll('.bottom-nav__item').forEach((btn) => {
      const navId = btn.dataset.nav?.replace('#/', '') || '';
      btn.classList.toggle('bottom-nav__item--active', navId === activeNav);
    });
  }
}

async function render() {
  cleanupTurnoDetalle();
  cleanupCalendario({ main: viewRoot });

  if (demoBanner) {
    demoBanner.classList.toggle('hidden', !isDemoMode());
  }

  bottomNav.classList.remove('hidden');

  const desktop = isDesktop();
  const { parts } = parseRoute();
  const activeNav = getActiveNav(parts);
  const ctx = buildCtx();
  const seq = ++renderSeq;

  updateShell(activeNav, ctx, desktop);

  try {
    const route = parts[0] || 'cronograma';
    switch (route) {
      case 'cronograma':
        await renderCronograma(ctx);
        break;
      case 'calendario':
        await renderCalendario(ctx);
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
    if (seq === renderSeq) {
      viewRoot.innerHTML = `<p class="empty-state">Error: ${err.message}</p>`;
    }
    return;
  }

  if (seq !== renderSeq) return;
  bindShellAuth();
}

export function initRouter() {
  onAuthChange(() => render());
  window.addEventListener('hashchange', render);
  window.addEventListener('resize', () => {
    const nowDesktop = isDesktop();
    if (nowDesktop !== lastDesktop) {
      lastDesktop = nowDesktop;
      render();
    }
  });
  if (!window.location.hash || window.location.hash === '#') {
    window.location.hash = '#/cronograma';
  }
  render();
}

export { requireAuth };
