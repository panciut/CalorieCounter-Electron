// ── Goals page ──────────────────────────────────────────────────────────────

async function goalsOnEnter() {
  const s = await api.settings.get();
  document.getElementById('s-cal').value    = Math.round(s.cal_goal);
  document.getElementById('s-protein').value = Math.round(s.protein_goal);
  document.getElementById('s-carbs').value   = Math.round(s.carbs_goal);
  document.getElementById('s-fat').value     = Math.round(s.fat_goal);
  document.getElementById('s-fiber').value   = Math.round(s.fiber_goal);
  document.getElementById('s-weight').value  = s.weight_goal || '';
  document.getElementById('s-water').value   = Math.round(s.water_goal || 2000);
}

function settingsInitEvents() {
  // Goals form
  document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await api.settings.save({
      cal_goal:     +document.getElementById('s-cal').value     || 2000,
      protein_goal: +document.getElementById('s-protein').value || 150,
      carbs_goal:   +document.getElementById('s-carbs').value   || 250,
      fat_goal:     +document.getElementById('s-fat').value     || 70,
      fiber_goal:   +document.getElementById('s-fiber').value   || 25,
      weight_goal:  +document.getElementById('s-weight').value  || 0,
      water_goal:   +document.getElementById('s-water').value   || 2000,
    });
    const saved = document.getElementById('settings-saved');
    saved.style.display = '';
    setTimeout(() => { saved.style.display = 'none'; }, 2000);
  });

  // Language flag buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const lang = btn.dataset.lang;
      await api.settings.save({ language: lang });
      setLanguage(lang);
      _updateLangButtons(lang);
    });
  });

  // Theme buttons
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const theme = btn.dataset.theme;
      await api.settings.save({ theme });
      applyTheme(theme);
    });
  });

  // Export buttons
  document.getElementById('export-json').addEventListener('click', async () => {
    const result = await api.export.data('json');
    const status = document.getElementById('export-status');
    if (result.ok) {
      status.textContent = t('export.success');
      status.style.color = 'var(--green)';
    } else {
      status.textContent = '';
    }
    status.style.display = result.ok ? '' : 'none';
    if (result.ok) setTimeout(() => { status.style.display = 'none'; }, 3000);
  });

  document.getElementById('export-csv').addEventListener('click', async () => {
    const result = await api.export.data('csv');
    const status = document.getElementById('export-status');
    if (result.ok) {
      status.textContent = t('export.success');
      status.style.color = 'var(--green)';
    } else {
      status.textContent = '';
    }
    status.style.display = result.ok ? '' : 'none';
    if (result.ok) setTimeout(() => { status.style.display = 'none'; }, 3000);
  });
}

// ── Settings page ───────────────────────────────────────────────────────────

function settingsPageOnEnter() {
  _updateLangButtons(getCurrentLang());
  _updateThemeButtons();
}

function _updateLangButtons(lang) {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('lang-active', btn.dataset.lang === lang);
  });
}

function _updateThemeButtons() {
  const current = document.body.classList.contains('light') ? 'light' : 'dark';
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('lang-active', btn.dataset.theme === current);
  });
}

function applyTheme(theme) {
  document.body.classList.toggle('light', theme === 'light');
  _updateThemeButtons();
}
