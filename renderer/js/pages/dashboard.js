// ── Dashboard state ──────────────────────────────────────────────────────────

let _dashToday      = '';
let _dashSettings   = {};
let _dashFoods      = [];
let _dashSelected   = null; // currently selected food for logging
let _dashSelectedRecipe = null; // currently selected recipe with editable ingredients
let _dashFoodSearch = null;
let _dashRecipes    = [];

// Shared quick-food dialog target (used by both dash and day pages)
let _quickFoodDate  = '';

// ── Entry point ──────────────────────────────────────────────────────────────

async function dashOnEnter() {
  _dashToday = new Date().toISOString().slice(0, 10);
  document.getElementById('dash-date').textContent = fmtDate(_dashToday);

  let entries, favorites, foods, settings, waterData, recipes, notesData, frequent;
  try {
    [entries, favorites, foods, settings, waterData, recipes, notesData, frequent] = await Promise.all([
      api.log.getDay(_dashToday),
      api.foods.getFavorites(),
      api.foods.getAll(),
      api.settings.get(),
      api.water.getDay(_dashToday),
      api.recipes.getAll(),
      api.notes.get(_dashToday),
      api.foods.getFrequent(10),
    ]);
  } catch (err) {
    console.error('[dashOnEnter] data load failed:', err);
    setTimeout(() => dashOnEnter(), 400);
    return;
  }

  _dashFoods    = foods;
  _dashSettings = settings;
  _dashRecipes  = recipes;

  _dashRenderTotals(entries, settings);
  _dashRenderFavorites(favorites);
  _dashRenderFrequent(frequent);
  _dashRenderEntries(entries, foods);
  _dashRenderWater(waterData.total_ml, settings.water_goal || 2000, waterData.entries);
  _dashInitSearch(foods, recipes, frequent);
  _dashRenderSupplements(_dashToday);
  document.getElementById('dash-notes').value = notesData.note || '';

  api.streaks.get().then(s => {
    document.getElementById('streak-current').textContent = s.current + ' ' + t('streak.days');
    document.getElementById('streak-best').textContent = s.best + ' ' + t('streak.days');
  });
}

// ── Shared bar-color helper ──────────────────────────────────────────────────
// Green when actual is within [min, max].
// Outside the range, deviation is measured as % of the boundary value.
// tol_1 = grace zone still green, tol_2 = yellow→orange, tol_3 = orange→red.
function getBarColor(actual, min, max, settings) {
  if (actual >= min && actual <= max) return 'bar-green';
  const t1 = settings.tol_1 || 5;
  const t2 = settings.tol_2 || 10;
  const t3 = settings.tol_3 || 20;
  const dev = actual < min
    ? (min - actual) / min * 100
    : (actual - max) / max * 100;
  if (dev <= t1) return 'bar-green';
  if (dev <= t2) return 'bar-yellow';
  if (dev <= t3) return 'bar-orange';
  return 'bar-red';
}

// ── Render helpers ───────────────────────────────────────────────────────────

function _dashRenderTotals(entries, settings) {
  let cal = 0, pro = 0, carbs = 0, fat = 0, fib = 0;
  for (const e of entries) { cal += e.calories; pro += e.protein; carbs += e.carbs; fat += e.fat; fib += (e.fiber || 0); }
  cal   = Math.round(cal   * 100) / 100;
  pro   = Math.round(pro   * 100) / 100;
  carbs = Math.round(carbs * 100) / 100;
  fat   = Math.round(fat   * 100) / 100;
  fib   = Math.round(fib   * 100) / 100;

  document.getElementById('dash-kcal').textContent    = cal;
  document.getElementById('dash-protein').textContent = pro + 'g';
  document.getElementById('dash-carbs').textContent   = carbs + 'g';
  document.getElementById('dash-fat').textContent     = fat + 'g';
  document.getElementById('dash-fiber').textContent   = fib + 'g';

  const calMax = settings.cal_max || 2200;
  const calMin = settings.cal_min || 1800;
  const calRec = settings.cal_rec || Math.round((calMin + calMax) / 2);
  const remaining = Math.round(calRec - cal);
  const remEl = document.getElementById('dash-remaining');
  const remBarColor = getBarColor(cal, calMin, calMax, settings);
  if (remaining > 0) {
    remEl.textContent = remaining + ' ' + t('macro.kcal') + ' ' + t('dash.remaining');
  } else {
    remEl.textContent = t('dash.overBy') + ' ' + Math.abs(remaining) + ' ' + t('macro.kcal');
  }
  remEl.className = 'budget-remaining ' + remBarColor;

  const bars = [
    { id: 'cal',    actual: cal,   min: calMin,                    max: calMax,                    rec: settings.cal_rec     || 0, unit: 'kcal' },
    { id: 'protein',actual: pro,   min: settings.protein_min || 0, max: settings.protein_max || 0, rec: settings.protein_rec || 0, unit: 'g' },
    { id: 'carbs',  actual: carbs, min: settings.carbs_min   || 0, max: settings.carbs_max   || 0, rec: settings.carbs_rec   || 0, unit: 'g' },
    { id: 'fat',    actual: fat,   min: settings.fat_min     || 0, max: settings.fat_max     || 0, rec: settings.fat_rec     || 0, unit: 'g' },
    { id: 'fiber',  actual: fib,   min: settings.fiber_min   || 0, max: settings.fiber_max   || 0, rec: settings.fiber_rec   || 0, unit: 'g' },
  ];

  const SCALE = 1.30; // track represents 130% of max, giving visible overflow headroom

  for (const { id, actual, min, max, rec, unit } of bars) {
    const scale = max * SCALE;
    const pct = scale ? Math.min(100, actual / scale * 100) : 0;
    const bar = document.getElementById('bar-' + id);
    bar.style.width = pct + '%';
    bar.className = 'progress-bar ' + getBarColor(actual, min, max, settings);
    document.getElementById('num-' + id).textContent =
      actual + unit + ' · ' + Math.round(min) + '–' + Math.round(max) + unit;

    const minTick = document.getElementById('tick-min-' + id);
    const recTick = document.getElementById('tick-'     + id);
    const maxTick = document.getElementById('tick-max-' + id);

    if (scale) {
      if (minTick && min) { minTick.style.left = (min / scale * 100) + '%'; minTick.style.display = ''; }
      else if (minTick)   { minTick.style.display = 'none'; }

      if (recTick && rec) { recTick.style.left = (rec / scale * 100) + '%'; recTick.style.display = ''; }
      else if (recTick)   { recTick.style.display = 'none'; }

      if (maxTick && max) { maxTick.style.left = (100 / SCALE) + '%'; maxTick.style.display = ''; }
      else if (maxTick)   { maxTick.style.display = 'none'; }
    }
  }

  createOrUpdateMacroPie('macro-pie-canvas', { protein: pro, carbs, fat, calories: cal });
}

function _dashRenderFavorites(favorites) {
  const section = document.getElementById('favorites-section');
  const row     = document.getElementById('favorites-row');
  if (!favorites.length) { section.style.display = 'none'; return; }
  section.style.display = '';
  row.innerHTML = '';
  for (const f of favorites) {
    const btn = document.createElement('button');
    btn.className   = 'quick-btn';
    btn.textContent = f.name;
    btn.addEventListener('click', async () => {
      await api.log.add({ food_id: f.id, grams: f.piece_grams || 100, meal: 'Snack', date: _dashToday });
      dashOnEnter();
    });
    row.appendChild(btn);
  }
}

function _dashRenderFrequent(frequent) {
  const section = document.getElementById('frequent-section');
  const row     = document.getElementById('frequent-row');
  if (!frequent.length) { section.style.display = 'none'; return; }
  section.style.display = '';
  row.innerHTML = '';
  for (const f of frequent) {
    const btn = document.createElement('button');
    btn.className   = 'quick-btn';
    btn.textContent = f.name;
    btn.title       = `${f.use_count}x · ${f.calories} kcal/100g`;
    btn.addEventListener('click', () => {
      _dashSelectFood(f);
      // Focus the search input so user sees the form
      document.getElementById('dash-food-input').value = f.name;
    });
    row.appendChild(btn);
  }
}

function _dashRenderWater(totalMl, goal, entries) {
  const pct = goal ? Math.min(100, Math.round(totalMl / goal * 100)) : 0;
  document.getElementById('water-bar').style.width = pct + '%';
  document.getElementById('water-label').textContent =
    Math.round(totalMl) + ' / ' + Math.round(goal) + ' ml';

  const container = document.getElementById('water-entries');
  const toggle = document.getElementById('water-toggle');

  if (!entries || !entries.length) {
    container.innerHTML = '';
    container.classList.add('water-entries-collapsed');
    toggle.style.display = 'none';
    return;
  }

  toggle.style.display = '';
  container.innerHTML = entries.map(e => {
    const src = (!e.source || e.source === 'manual')
      ? `<span class="water-source water-source-manual">${t('water.manual')}</span>`
      : `<span class="water-source water-source-food">↩ ${e.source}</span>`;
    return `<div class="water-entry" data-id="${e.id}">
      <span class="water-entry-ml">${Math.round(e.ml)} ml</span>
      ${src}
      <button class="water-del" data-id="${e.id}">✕</button>
    </div>`;
  }).join('');

  container.querySelectorAll('.water-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      await api.water.delete(+btn.dataset.id);
      _refreshWater();
    });
  });
}

function _dashRenderEntries(entries, foods) {
  const container = document.getElementById('dash-entries');
  if (!entries.length) {
    container.innerHTML = `<p class="empty">${t('dash.nothingLogged')}</p>`;
    return;
  }

  const groups = {};
  for (const e of entries) { (groups[e.meal] = groups[e.meal] || []).push(e); }
  const mealOrder = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

  container.innerHTML = '';
  for (const meal of mealOrder) {
    if (!groups[meal]) continue;
    const header = document.createElement('div');
    header.className   = 'meal-header';
    header.textContent = tMeal(meal);
    container.appendChild(header);
    container.appendChild(_buildEntryTable(groups[meal], foods, 'dash'));
  }

  _wireEntryTable(container, 'dash', foods, () => dashOnEnter());
}

function _buildEntryTable(items, foods, prefix) {
  const table = document.createElement('table');
  table.innerHTML = `<thead><tr><th>${t('th.food')}</th><th>${t('th.g')}</th><th>${t('th.kcal')}</th><th>${t('th.protein')}</th><th>${t('th.carbs')}</th><th>${t('th.fat')}</th><th>${t('th.fiber')}</th><th></th></tr></thead>`;
  const tbody = document.createElement('tbody');

  for (const e of items) {
    const tr = document.createElement('tr');
    tr.dataset.entryId = e.id;
    tr.innerHTML = `
      <td>${e.name}</td><td>${Math.round(e.grams * 100) / 100}</td><td>${e.calories}</td>
      <td>${e.protein}g</td><td>${e.carbs}g</td><td>${e.fat}g</td><td>${e.fiber || 0}g</td>
      <td class="row-actions">
        <button class="edit-btn" data-id="${e.id}">✎</button>
        <button class="del"      data-id="${e.id}">✕</button>
      </td>`;

    const editTr = document.createElement('tr');
    editTr.id          = `${prefix}-edit-${e.id}`;
    editTr.style.display = 'none';
    editTr.className   = 'edit-row';
    const foodOptions  = foods.map(f =>
      `<option value="${f.id}"${f.id === e.food_id ? ' selected' : ''}>${f.name}</option>`
    ).join('');
    const mealOptions  = ['Breakfast','Lunch','Dinner','Snack'].map(m =>
      `<option${m === e.meal ? ' selected' : ''}>${m}</option>`
    ).join('');
    editTr.innerHTML = `<td colspan="8"><div class="inline-form">
      <select class="edit-food-sel">${foodOptions}</select>
      <input type="number" class="edit-grams" value="${e.grams}" min="0.1" step="0.1">
      <select class="edit-meal">${mealOptions}</select>
      <button class="edit-save btn-primary" data-id="${e.id}">Save</button>
      <button class="edit-cancel btn-secondary" data-id="${e.id}">Cancel</button>
    </div></td>`;

    tbody.appendChild(tr);
    tbody.appendChild(editTr);
  }

  table.appendChild(tbody);
  return table;
}

function _wireEntryTable(container, prefix, foods, refresh) {
  container.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = document.getElementById(`${prefix}-edit-${btn.dataset.id}`);
      row.style.display = row.style.display === 'none' ? 'table-row' : 'none';
    });
  });

  container.querySelectorAll('.del').forEach(btn => {
    btn.addEventListener('click', async () => {
      await api.log.delete(+btn.dataset.id);
      refresh();
    });
  });

  container.querySelectorAll('.edit-save').forEach(btn => {
    btn.addEventListener('click', async () => {
      const row   = document.getElementById(`${prefix}-edit-${btn.dataset.id}`);
      const food_id = +row.querySelector('.edit-food-sel').value;
      const grams   = +row.querySelector('.edit-grams').value;
      const meal    = row.querySelector('.edit-meal').value;
      await api.log.update({ id: +btn.dataset.id, food_id, grams, meal });
      refresh();
    });
  });

  container.querySelectorAll('.edit-cancel').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(`${prefix}-edit-${btn.dataset.id}`).style.display = 'none';
    });
  });
}

function _dashInitSearch(foods, recipes, frequent) {
  if (!_dashFoodSearch) {
    _dashFoodSearch = new FoodSearch('dash-food-input', 'dash-search-results', _dashItemSelected);
  }
  // Build frequency map for search boosting
  const freqMap = {};
  if (frequent) for (const f of frequent) freqMap[f.id] = f.use_count;

  // Tag foods with frequency
  const taggedFoods = foods.map(f => ({ ...f, _freq: freqMap[f.id] || 0 }));

  // Merge foods and recipes into one searchable list
  const recipeItems = (recipes || []).map(r => ({
    ...r,
    isRecipe: true,
    name: r.name,
    _freq: 0,
  }));
  _dashFoodSearch.setItems([...taggedFoods, ...recipeItems]);
}

function _dashItemSelected(item) {
  if (item.isRecipe) {
    _dashSelectRecipe(item);
  } else {
    _dashSelectFood(item);
  }
}

function _dashSelectFood(food) {
  _dashSelected = food;
  _dashSelectedRecipe = null;
  document.getElementById('dash-recipe-form').style.display = 'none';
  const form      = document.getElementById('dash-log-form');
  const gramsInp  = document.getElementById('dash-grams');
  const piecesInp = document.getElementById('dash-pieces');
  const toggle    = document.getElementById('dash-toggle-unit');
  form.style.display = '';

  // Show food macro preview (per 100g)
  const preview = document.getElementById('dash-food-preview');
  preview.innerHTML = `<span style="color:var(--text);font-weight:600">${food.name}</span>
    <span>${t('common.per100g')}:</span>
    <span><span class="mp-val">${food.calories}</span> ${t('macro.kcal')}</span>
    <span><span class="mp-val">${food.protein}</span>g ${t('macro.protein')}</span>
    <span><span class="mp-val">${food.carbs}</span>g ${t('macro.carbs')}</span>
    <span><span class="mp-val">${food.fat}</span>g ${t('macro.fat')}</span>
    <span><span class="mp-val">${food.fiber || 0}</span>g ${t('macro.fiber')}</span>`;

  if (food.piece_grams) {
    // Default to pieces, but allow switching
    _showUnitInputs('dash', 'pieces');
  } else {
    _showUnitInputs('dash', 'grams');
  }
}

function _showUnitInputs(prefix, mode) {
  const gramsInp  = document.getElementById(prefix + '-grams');
  const piecesInp = document.getElementById(prefix + '-pieces');
  const toggle    = document.getElementById(prefix + '-toggle-unit');
  const food      = prefix === 'dash' ? _dashSelected : _daySelected;

  if (mode === 'pieces') {
    gramsInp.style.display  = 'none';  gramsInp.required  = false; gramsInp.value = '';
    piecesInp.style.display = '';      piecesInp.required = true;  piecesInp.value = '1'; piecesInp.focus();
    toggle.style.display    = '';
    toggle.textContent      = t('dash.switchToGrams');
    piecesInp.placeholder   = `${t('common.pieces')} (${food.piece_grams}g)`;
  } else {
    piecesInp.style.display = 'none';  piecesInp.required = false; piecesInp.value = '';
    gramsInp.style.display  = '';      gramsInp.required  = true;  gramsInp.value = ''; gramsInp.focus();
    if (food && food.piece_grams) {
      toggle.style.display  = '';
      toggle.textContent    = t('dash.switchToPieces');
    } else {
      toggle.style.display  = 'none';
    }
  }
}

async function _dashSelectRecipe(recipe) {
  _dashSelected = null;
  document.getElementById('dash-log-form').style.display = 'none';

  // Fetch full recipe with ingredients
  const full = await api.recipes.get(recipe.id);
  _dashSelectedRecipe = {
    id: full.id,
    name: full.name,
    ingredients: full.ingredients.map(ing => ({ ...ing, editGrams: ing.grams })),
  };

  document.getElementById('dash-recipe-form').style.display = '';
  _dashRenderRecipeEditor();
}

function _dashRenderRecipeEditor() {
  const r = _dashSelectedRecipe;
  if (!r) return;

  const container = document.getElementById('dash-recipe-ingredients');
  container.innerHTML = '';

  for (let i = 0; i < r.ingredients.length; i++) {
    const ing = r.ingredients[i];
    const row = document.createElement('div');
    row.className = 'rie-row';

    const computedCal     = Math.round(ing.calories / ing.grams * ing.editGrams * 100) / 100;
    const computedProtein = Math.round(ing.protein  / ing.grams * ing.editGrams * 100) / 100;
    const computedCarbs   = Math.round(ing.carbs    / ing.grams * ing.editGrams * 100) / 100;
    const computedFat     = Math.round(ing.fat      / ing.grams * ing.editGrams * 100) / 100;
    const computedFiber   = Math.round((ing.fiber || 0) / ing.grams * ing.editGrams * 100) / 100;

    row.innerHTML = `
      <span class="rie-name">${ing.name}</span>
      <input type="number" class="rie-grams" value="${ing.editGrams}" min="0" step="0.1" data-idx="${i}">
      <span class="rie-unit">g</span>
      <span class="rie-macros">${computedCal} kcal · ${computedProtein}g P · ${computedCarbs}g C · ${computedFat}g F · ${computedFiber}g Fib</span>`;

    container.appendChild(row);
  }

  // Wire up grams inputs
  container.querySelectorAll('.rie-grams').forEach(input => {
    input.addEventListener('input', () => {
      const idx = +input.dataset.idx;
      r.ingredients[idx].editGrams = +input.value || 0;
      _dashRenderRecipeEditor();
    });
  });

  // Update totals
  _dashRenderRecipeTotals();
}

function _dashRenderRecipeTotals() {
  const r = _dashSelectedRecipe;
  if (!r) return;

  let cal = 0, pro = 0, carbs = 0, fat = 0, fib = 0;
  for (const ing of r.ingredients) {
    const ratio = ing.editGrams / ing.grams;
    cal   += ing.calories * ratio;
    pro   += ing.protein  * ratio;
    carbs += ing.carbs    * ratio;
    fat   += ing.fat      * ratio;
    fib   += (ing.fiber || 0) * ratio;
  }

  const totals = document.getElementById('dash-recipe-totals');
  totals.innerHTML = `<span style="color:var(--text);font-weight:600">${r.name}</span>
    <span>${t('common.total')}:</span>
    <span><span class="mp-val">${Math.round(cal)}</span> ${t('macro.kcal')}</span>
    <span><span class="mp-val">${Math.round(pro * 100) / 100}</span>g ${t('macro.protein')}</span>
    <span><span class="mp-val">${Math.round(carbs * 100) / 100}</span>g ${t('macro.carbs')}</span>
    <span><span class="mp-val">${Math.round(fat * 100) / 100}</span>g ${t('macro.fat')}</span>
    <span><span class="mp-val">${Math.round(fib * 100) / 100}</span>g ${t('macro.fiber')}</span>`;
}

// ── Event wiring (called once) ───────────────────────────────────────────────

function _setMealPill(containerId, hiddenId, meal) {
  document.getElementById(hiddenId).value = meal;
  document.querySelectorAll(`#${containerId} .meal-pill`).forEach(btn => {
    btn.classList.toggle('meal-pill--active', btn.dataset.meal === meal);
  });
}

function dashInitEvents() {
  // Meal pill selection
  document.querySelectorAll('#dash-meal-pills .meal-pill').forEach(btn => {
    btn.addEventListener('click', () => _setMealPill('dash-meal-pills', 'dash-meal', btn.dataset.meal));
  });

  // Log food add
  document.getElementById('dash-log-btn').addEventListener('click', async () => {
    if (!_dashSelected) return;
    const gramsInp  = document.getElementById('dash-grams');
    const piecesInp = document.getElementById('dash-pieces');
    const meal      = document.getElementById('dash-meal').value;
    const piecesVisible = piecesInp.style.display !== 'none';
    const grams = piecesVisible && piecesInp.value
      ? Math.round(+piecesInp.value * _dashSelected.piece_grams * 100) / 100
      : Math.round(+gramsInp.value * 100) / 100;
    if (!grams) return;
    await api.log.add({ food_id: _dashSelected.id, grams, meal, date: _dashToday });
    _dashSelected = null;
    _dashFoodSearch && _dashFoodSearch.clear();
    document.getElementById('dash-log-form').style.display = 'none';
    gramsInp.value = ''; piecesInp.value = '';
    dashOnEnter();
  });

  document.getElementById('dash-log-cancel').addEventListener('click', () => {
    _dashSelected = null;
    _dashFoodSearch && _dashFoodSearch.clear();
    document.getElementById('dash-log-form').style.display = 'none';
    document.getElementById('dash-toggle-unit').style.display = 'none';
    document.getElementById('dash-grams').value = '';
    document.getElementById('dash-pieces').value = '';
    _setMealPill('dash-meal-pills', 'dash-meal', 'Snack');
  });

  document.getElementById('dash-toggle-unit').addEventListener('click', (e) => {
    e.preventDefault();
    const piecesVisible = document.getElementById('dash-pieces').style.display !== 'none';
    _showUnitInputs('dash', piecesVisible ? 'grams' : 'pieces');
  });

  // Recipe log from dashboard
  document.getElementById('dash-recipe-log-btn').addEventListener('click', async () => {
    if (!_dashSelectedRecipe) return;
    const meal = document.getElementById('dash-recipe-meal').value;
    // Log each ingredient individually with edited grams
    for (const ing of _dashSelectedRecipe.ingredients) {
      if (ing.editGrams > 0) {
        await api.log.add({ food_id: ing.food_id, grams: ing.editGrams, meal, date: _dashToday });
      }
    }
    _dashSelectedRecipe = null;
    _dashFoodSearch && _dashFoodSearch.clear();
    document.getElementById('dash-recipe-form').style.display = 'none';
    dashOnEnter();
  });

  document.getElementById('dash-recipe-cancel').addEventListener('click', () => {
    _dashSelectedRecipe = null;
    _dashFoodSearch && _dashFoodSearch.clear();
    document.getElementById('dash-recipe-form').style.display = 'none';
  });

  // Water entries toggle
  document.getElementById('water-toggle').addEventListener('click', () => {
    const el = document.getElementById('water-entries');
    const btn = document.getElementById('water-toggle');
    const collapsed = el.classList.toggle('water-entries-collapsed');
    btn.setAttribute('aria-expanded', String(!collapsed));
  });

  // Water buttons
  document.getElementById('water-200').addEventListener('click', async () => {
    await api.water.add({ date: _dashToday, ml: 200, source: 'manual' });
    _refreshWater();
  });
  document.getElementById('water-500').addEventListener('click', async () => {
    await api.water.add({ date: _dashToday, ml: 500, source: 'manual' });
    _refreshWater();
  });
  document.getElementById('water-custom').addEventListener('click', () => {
    document.getElementById('water-custom-dialog').showModal();
    setTimeout(() => document.getElementById('wc-ml').focus(), 50);
  });
  document.getElementById('wc-submit').addEventListener('click', async () => {
    const ml = +document.getElementById('wc-ml').value;
    if (!ml) return;
    await api.water.add({ date: _dashToday, ml, source: 'manual' });
    document.getElementById('water-custom-dialog').close();
    document.getElementById('wc-ml').value = '';
    _refreshWater();
  });

  // Barcode lookup inside quick-food dialog
  document.getElementById('qf-barcode-btn').addEventListener('click', async () => {
    const barcode = document.getElementById('qf-barcode').value.trim();
    const statusEl = document.getElementById('qf-barcode-status');
    if (!barcode) return;
    statusEl.textContent = '...';
    statusEl.className = 'barcode-status';
    const result = await api.barcode.lookup(barcode);
    if (result) {
      statusEl.textContent = t('barcode.found');
      statusEl.className = 'barcode-status barcode-ok';
      document.getElementById('qf-name').value = result['name_' + getCurrentLang()] || result.name;
      document.getElementById('qf-kcal').value = result.calories;
      document.getElementById('qf-protein').value = result.protein;
      document.getElementById('qf-carbs').value = result.carbs;
      document.getElementById('qf-fat').value = result.fat;
      document.getElementById('qf-fiber').value = result.fiber;
      document.getElementById('qf-liquid').checked = !!result.is_liquid;
      setTimeout(() => document.getElementById('qf-grams').focus(), 50);
    } else {
      statusEl.textContent = t('barcode.notFound');
      statusEl.className = 'barcode-status barcode-err';
    }
    document.getElementById('qf-barcode').value = '';
  });
  document.getElementById('qf-barcode').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); document.getElementById('qf-barcode-btn').click(); }
  });

  // Daily notes auto-save
  document.getElementById('dash-notes').addEventListener('blur', () => {
    api.notes.save({ date: _dashToday, note: document.getElementById('dash-notes').value });
  });

  document.getElementById('dash-open-quick').addEventListener('click', () => {
    _quickFoodDate = _dashToday;
    document.getElementById('quick-food-dialog').showModal();
    setTimeout(() => document.getElementById('qf-name').focus(), 50);
  });

  // Quick-food preset buttons
  document.querySelectorAll('.qf-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const kcal = +document.getElementById('qf-kcal').value;
      if (!kcal) { document.getElementById('qf-kcal').focus(); return; }
      document.getElementById('qf-protein').value = Math.round(kcal * +btn.dataset.p / 100 / 4 * 100) / 100;
      document.getElementById('qf-carbs').value   = Math.round(kcal * +btn.dataset.c / 100 / 4 * 100) / 100;
      document.getElementById('qf-fat').value     = Math.round(kcal * +btn.dataset.f / 100 / 9 * 100) / 100;
      document.querySelectorAll('.qf-preset').forEach(b => b.classList.remove('preset-active'));
      btn.classList.add('preset-active');
    });
  });

  // Quick-food submit
  document.getElementById('qf-submit').addEventListener('click', async () => {
    const name     = document.getElementById('qf-name').value.trim();
    const calories = +document.getElementById('qf-kcal').value || 0;
    const grams    = +document.getElementById('qf-grams').value;
    if (!name || !calories || !grams) return;
    await api.log.addQuick({
      food: {
        name, calories,
        protein:     +document.getElementById('qf-protein').value || 0,
        carbs:       +document.getElementById('qf-carbs').value   || 0,
        fat:         +document.getElementById('qf-fat').value     || 0,
        fiber:       +document.getElementById('qf-fiber').value   || 0,
        piece_grams: +document.getElementById('qf-piece').value   || null,
        is_liquid:   document.getElementById('qf-liquid').checked,
      },
      grams,
      meal: document.getElementById('qf-meal').value,
      date: _quickFoodDate || _dashToday,
    });
    document.getElementById('quick-food-dialog').close();
    _resetQuickFoodForm();
    // Refresh whichever page is active
    if (_quickFoodDate && _quickFoodDate !== _dashToday) {
      dayOnEnter(_quickFoodDate);
    } else {
      dashOnEnter();
    }
  });
}

function _resetQuickFoodForm() {
  document.getElementById('qf-liquid').checked = false;
  ['qf-name','qf-kcal','qf-protein','qf-carbs','qf-fat','qf-fiber','qf-grams','qf-piece'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.querySelectorAll('.qf-preset').forEach(b => b.classList.remove('preset-active'));
}

async function _refreshWater() {
  const d = _dashToday || new Date().toISOString().slice(0, 10);
  const waterData = await api.water.getDay(d);
  _dashRenderWater(waterData.total_ml, (_dashSettings && _dashSettings.water_goal) || 2000, waterData.entries);
}

// Expose helpers used by day.js
function buildEntryTable(items, foods, prefix)           { return _buildEntryTable(items, foods, prefix); }
function wireEntryTable(container, prefix, foods, refresh){ return _wireEntryTable(container, prefix, foods, refresh); }
