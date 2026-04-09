// ── Page registry ────────────────────────────────────────────────────────────
const _pages = {
  dashboard: { id: 'page-dashboard', onEnter: (p) => dashOnEnter(p) },
  foods:     { id: 'page-foods',     onEnter: (p) => foodsOnEnter(p) },
  recipes:   { id: 'page-recipes',   onEnter: (p) => recipesOnEnter(p) },
  history:   { id: 'page-history',   onEnter: (p) => historyOnEnter(p) },
  week:      { id: 'page-week',      onEnter: (p) => weekOnEnter(p) },
  day:       { id: 'page-day',       onEnter: (p) => dayOnEnter(p) },
  weight:      { id: 'page-weight',      onEnter: (p) => weightOnEnter(p) },
  supplements: { id: 'page-supplements', onEnter: (p) => supplementsOnEnter(p) },
  goals:       { id: 'page-goals',       onEnter: (p) => goalsOnEnter(p) },
  settings:  { id: 'page-settings',  onEnter: (p) => settingsPageOnEnter(p) },
};

let _currentPage = null;

function navigate(pageName, param) {
  document.querySelectorAll('.page').forEach(el => el.style.display = 'none');
  const page = _pages[pageName];
  if (!page) return;
  document.getElementById(page.id).style.display = '';
  _currentPage = pageName;

  document.querySelectorAll('.nav-link').forEach(a => {
    a.classList.toggle('active', a.dataset.page === pageName);
  });

  page.onEnter(param);
}

function getCurrentPage() { return _currentPage; }

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Nav link clicks
  document.querySelectorAll('.nav-link').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(a.dataset.page);
    });
  });

  // Global dialog close buttons (data-close="dialogId")
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.close).close();
    });
  });

  // Init all page event listeners (called once)
  dashInitEvents();
  foodsInitEvents();
  recipesInitEvents();
  settingsInitEvents();
  supplementsInitEvents();
  weightInitEvents();
  dayInitEvents();

  // Global shortcut from main process: focus quick-add
  window.electronAPI.on('shortcut:quickAdd', () => {
    navigate('dashboard');
    setTimeout(() => {
      const input = document.getElementById('dash-food-input');
      if (input) input.focus();
    }, 150);
  });

  // Load language, apply translations, then boot
  api.settings.get().then(s => {
    setLanguage(s.language || 'en');
    navigate('dashboard');
  });
});
