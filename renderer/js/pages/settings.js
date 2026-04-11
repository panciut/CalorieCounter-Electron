// ── Macro range calculator ────────────────────────────────────────────────────

function calcMacroRanges(weight_kg, calories) {
  // Protein: 1.6–2.2 g/kg, recommended 1.75 g/kg
  const protein_min = Math.round(weight_kg * 1.6);
  const protein_max = Math.round(weight_kg * 2.2);
  const protein_rec = Math.round(weight_kg * 1.75);

  // Fat: floor = max(weight×0.6, 45g), ceiling = 30% of calories
  const fat_min = Math.round(Math.max(weight_kg * 0.6, 45));
  const fat_max = Math.round(calories * 0.30 / 9);
  const fat_rec = Math.round(Math.max(weight_kg * 0.7, calories * 0.28 / 9));

  // Carbs: fill remaining calories using recommended protein & fat
  // Range = invert: max carbs when protein/fat at minimum, min carbs when at maximum
  const carbs_max = Math.max(0, Math.round((calories - protein_min * 4 - fat_min * 9) / 4));
  const carbs_min = Math.max(0, Math.round((calories - protein_max * 4 - fat_max * 9) / 4));
  const carbs_rec = Math.max(0, Math.round((calories - protein_rec * 4 - fat_rec * 9) / 4));

  // Fiber: static evidence-based range
  const fiber_min = 25;
  const fiber_max = 38;
  const fiber_rec = 30;

  return { protein_min, protein_max, protein_rec, fat_min, fat_max, fat_rec, carbs_min, carbs_max, carbs_rec, fiber_min, fiber_max, fiber_rec };
}

// ── Goals page ──────────────────────────────────────────────────────────────

async function goalsOnEnter() {
  const [s, weights] = await Promise.all([api.settings.get(), api.weight.getAll()]);
  const latestWeight = weights.length ? (weights[weights.length - 1].weight ?? '') : '';
  const calRec = Math.round(s.cal_rec || ((s.cal_min || 1800) + (s.cal_max || 2200)) / 2);
  document.getElementById('calc-weight').value              = latestWeight;
  document.getElementById('calc-calories-display').textContent = calRec + ' kcal';
  document.getElementById('s-cal-min').value     = Math.round(s.cal_min     || 1800);
  document.getElementById('s-cal-max').value     = Math.round(s.cal_max     || 2200);
  document.getElementById('s-cal-rec').value     = calRec;
  document.getElementById('s-protein-min').value = Math.round(s.protein_min || 120);
  document.getElementById('s-protein-max').value = Math.round(s.protein_max || 180);
  document.getElementById('s-protein-rec').value = Math.round(s.protein_rec || 150);
  document.getElementById('s-carbs-min').value   = Math.round(s.carbs_min   || 200);
  document.getElementById('s-carbs-max').value   = Math.round(s.carbs_max   || 300);
  document.getElementById('s-carbs-rec').value   = Math.round(s.carbs_rec   || 250);
  document.getElementById('s-fat-min').value     = Math.round(s.fat_min     || 55);
  document.getElementById('s-fat-max').value     = Math.round(s.fat_max     || 85);
  document.getElementById('s-fat-rec').value     = Math.round(s.fat_rec     || 70);
  document.getElementById('s-fiber-min').value   = Math.round(s.fiber_min   || 20);
  document.getElementById('s-fiber-max').value   = Math.round(s.fiber_max   || 35);
  document.getElementById('s-fiber-rec').value   = Math.round(s.fiber_rec   || 30);
  document.getElementById('s-weight').value      = s.weight_goal || '';
  document.getElementById('s-water').value       = Math.round(s.water_goal || 2000);
  document.getElementById('s-tol1').value        = Math.round(s.tol_1 || 5);
  document.getElementById('s-tol2').value        = Math.round(s.tol_2 || 10);
  document.getElementById('s-tol3').value        = Math.round(s.tol_3 || 20);
}

function settingsInitEvents() {
  // Macro calculator
  document.getElementById('calc-btn').addEventListener('click', async () => {
    const weight = +document.getElementById('calc-weight').value;
    if (!weight) return;
    // Read calorie rec from the current input value (what the user set)
    const calories = +document.getElementById('s-cal-rec').value
      || Math.round((+document.getElementById('s-cal-min').value + +document.getElementById('s-cal-max').value) / 2)
      || 2000;

    // Update calorie display to reflect what was used
    document.getElementById('calc-calories-display').textContent = calories + ' kcal';

    const r = calcMacroRanges(weight, calories);
    document.getElementById('s-protein-min').value = r.protein_min;
    document.getElementById('s-protein-max').value = r.protein_max;
    document.getElementById('s-protein-rec').value = r.protein_rec;
    document.getElementById('s-fat-min').value     = r.fat_min;
    document.getElementById('s-fat-max').value     = r.fat_max;
    document.getElementById('s-fat-rec').value     = r.fat_rec;
    document.getElementById('s-carbs-min').value   = r.carbs_min;
    document.getElementById('s-carbs-max').value   = r.carbs_max;
    document.getElementById('s-carbs-rec').value   = r.carbs_rec;
    document.getElementById('s-fiber-min').value   = r.fiber_min;
    document.getElementById('s-fiber-max').value   = r.fiber_max;
    document.getElementById('s-fiber-rec').value   = r.fiber_rec;

    const preview = document.getElementById('calc-preview');
    preview.style.display = '';
    preview.innerHTML = `
      <span class="calc-pill">Protein ${r.protein_min}–${r.protein_max}g · rec ${r.protein_rec}g</span>
      <span class="calc-pill">Fat ${r.fat_min}–${r.fat_max}g · rec ${r.fat_rec}g</span>
      <span class="calc-pill">Carbs ${r.carbs_min}–${r.carbs_max}g · rec ${r.carbs_rec}g</span>
      <span class="calc-pill">Fiber ${r.fiber_min}–${r.fiber_max}g · rec ${r.fiber_rec}g</span>`;
  });

  // Goals form
  document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await api.settings.save({
      cal_min:     +document.getElementById('s-cal-min').value     || 1800,
      cal_max:     +document.getElementById('s-cal-max').value     || 2200,
      cal_rec:     +document.getElementById('s-cal-rec').value     || 2000,
      protein_min: +document.getElementById('s-protein-min').value || 120,
      protein_max: +document.getElementById('s-protein-max').value || 180,
      protein_rec: +document.getElementById('s-protein-rec').value || 150,
      carbs_min:   +document.getElementById('s-carbs-min').value   || 200,
      carbs_max:   +document.getElementById('s-carbs-max').value   || 300,
      carbs_rec:   +document.getElementById('s-carbs-rec').value   || 250,
      fat_min:     +document.getElementById('s-fat-min').value     || 55,
      fat_max:     +document.getElementById('s-fat-max').value     || 85,
      fat_rec:     +document.getElementById('s-fat-rec').value     || 70,
      fiber_min:   +document.getElementById('s-fiber-min').value   || 20,
      fiber_max:   +document.getElementById('s-fiber-max').value   || 35,
      fiber_rec:   +document.getElementById('s-fiber-rec').value   || 30,
      weight_goal: +document.getElementById('s-weight').value      || 0,
      water_goal:  +document.getElementById('s-water').value       || 2000,
      tol_1:       +document.getElementById('s-tol1').value        || 5,
      tol_2:       +document.getElementById('s-tol2').value        || 10,
      tol_3:       +document.getElementById('s-tol3').value        || 20,
    });
    // Refresh the calculator calorie display to reflect the just-saved rec value
    const newCalRec = +document.getElementById('s-cal-rec').value || 2000;
    document.getElementById('calc-calories-display').textContent = newCalRec + ' kcal';

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
