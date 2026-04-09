document.addEventListener('keydown', (e) => {
  const tag = document.activeElement && document.activeElement.tagName;
  const inInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag);
  const modKey  = e.metaKey || e.ctrlKey;

  // Escape: close topmost open dialog
  if (e.key === 'Escape') {
    const openDialogs = [...document.querySelectorAll('dialog[open]')];
    if (openDialogs.length) openDialogs[openDialogs.length - 1].close();
    return;
  }

  // Cmd/Ctrl+N: focus food search (handled globally via main process too)
  if (modKey && e.key === 'n') {
    e.preventDefault();
    navigate('dashboard');
    setTimeout(() => {
      const input = document.getElementById('dash-food-input');
      if (input) input.focus();
    }, 100);
    return;
  }

  // Number keys 1–6: navigate pages (only when not typing in an input)
  if (!inInput && !modKey && !e.altKey) {
    const pageMap = {
      '1': 'dashboard',
      '2': 'foods',
      '3': 'recipes',
      '4': 'history',
      '5': 'weight',
      '6': 'supplements',
      '7': 'goals',
      '8': 'settings',
      '9': 'templates',
      '0': 'measurements',
    };
    if (pageMap[e.key]) {
      e.preventDefault();
      navigate(pageMap[e.key]);
    }
  }
});
