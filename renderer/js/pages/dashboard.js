// ── Dashboard state ──────────────────────────────────────────────────────────

let _dashToday      = '';
let _dashSettings   = {};
let _dashFoods      = [];
let _dashSelected   = null; // currently selected food for logging
let _dashFoodSearch = null;

// Shared quick-food dialog target (used by both dash and day pages)
let _quickFoodDate  = '';

// ── Entry point ──────────────────────────────────────────────────────────────

async function dashOnEnter() {
  _dashToday = new Date().toISOString().slice(0, 10);
  document.getElementById('dash-date').textContent = _dashToday;

  const [entries, favorites, foods, settings, waterData] = await Promise.all([
    api.log.getDay(_dashToday),
    api.foods.getFavorites(),
    api.foods.getAll(),
    api.settings.get(),
    api.water.getDay(_dashToday),
  ]);

  _dashFoods    = foods;
  _dashSettings = settings;

  _dashRenderTotals(entries, settings);
  _dashRenderFavorites(favorites);
  _dashRenderEntries(entries, foods);
  _dashRenderWater(waterData.total_ml, settings.water_goal || 2000);
  _dashInitSearch(foods);
}

// ── Render helpers ───────────────────────────────────────────────────────────

function _dashRenderTotals(entries, settings) {
  let cal = 0, pro = 0, carbs = 0, fat = 0;
  for (const e of entries) { cal += e.calories; pro += e.protein; carbs += e.carbs; fat += e.fat; }
  cal   = Math.round(cal   * 10) / 10;
  pro   = Math.round(pro   * 10) / 10;
  carbs = Math.round(carbs * 10) / 10;
  fat   = Math.round(fat   * 10) / 10;

  document.getElementById('dash-kcal').textContent    = cal;
  document.getElementById('dash-protein').textContent = pro + 'g';
  document.getElementById('dash-carbs').textContent   = carbs + 'g';
  document.getElementById('dash-fat').textContent     = fat + 'g';

  const bars = [
    { id: 'cal',    actual: cal,   goal: settings.cal_goal,     unit: 'kcal' },
    { id: 'protein',actual: pro,   goal: settings.protein_goal, unit: 'g' },
    { id: 'carbs',  actual: carbs, goal: settings.carbs_goal,   unit: 'g' },
    { id: 'fat',    actual: fat,   goal: settings.fat_goal,     unit: 'g' },
  ];

  for (const { id, actual, goal, unit } of bars) {
    const pct = goal ? Math.min(100, Math.round(actual / goal * 100)) : 0;
    const bar = document.getElementById('bar-' + id);
    bar.style.width = pct + '%';
    bar.className = 'progress-bar ' + (actual > goal ? 'bar-red' : actual >= goal * 0.9 ? 'bar-yellow' : 'bar-green');
    document.getElementById('num-' + id).textContent =
      actual + unit + ' / ' + Math.round(goal) + unit;
  }

  createOrUpdateMacroPie('macro-pie-canvas', { protein: pro, carbs, fat });
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

function _dashRenderWater(totalMl, goal) {
  const pct = goal ? Math.min(100, Math.round(totalMl / goal * 100)) : 0;
  document.getElementById('water-bar').style.width = pct + '%';
  document.getElementById('water-label').textContent =
    Math.round(totalMl) + ' / ' + Math.round(goal) + ' ml';
}

function _dashRenderEntries(entries, foods) {
  const container = document.getElementById('dash-entries');
  if (!entries.length) {
    container.innerHTML = '<p class="empty">Nothing logged yet today.</p>';
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
    header.textContent = meal;
    container.appendChild(header);
    container.appendChild(_buildEntryTable(groups[meal], foods, 'dash'));
  }

  _wireEntryTable(container, 'dash', foods, () => dashOnEnter());
}

function _buildEntryTable(items, foods, prefix) {
  const table = document.createElement('table');
  table.innerHTML = '<thead><tr><th>Food</th><th>g</th><th>kcal</th><th>protein</th><th>carbs</th><th>fat</th><th></th></tr></thead>';
  const tbody = document.createElement('tbody');

  for (const e of items) {
    const tr = document.createElement('tr');
    tr.dataset.entryId = e.id;
    tr.innerHTML = `
      <td>${e.name}</td><td>${e.grams}</td><td>${e.calories}</td>
      <td>${e.protein}g</td><td>${e.carbs}g</td><td>${e.fat}g</td>
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
    editTr.innerHTML = `<td colspan="7"><div class="inline-form">
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

function _dashInitSearch(foods) {
  if (!_dashFoodSearch) {
    _dashFoodSearch = new FoodSearch('dash-food-input', 'dash-search-results', _dashFoodSelected);
  }
  _dashFoodSearch.setItems(foods);
}

function _dashFoodSelected(food) {
  _dashSelected = food;
  const form      = document.getElementById('dash-log-form');
  const gramsInp  = document.getElementById('dash-grams');
  const piecesInp = document.getElementById('dash-pieces');
  form.style.display = '';
  if (food.piece_grams) {
    gramsInp.style.display  = 'none'; gramsInp.required  = false; gramsInp.value = '';
    piecesInp.style.display = '';     piecesInp.required = true;  piecesInp.focus();
  } else {
    piecesInp.style.display = 'none'; piecesInp.required = false; piecesInp.value = '';
    gramsInp.style.display  = '';     gramsInp.required  = true;  gramsInp.focus();
  }
}

// ── Event wiring (called once) ───────────────────────────────────────────────

function dashInitEvents() {
  // Log food add
  document.getElementById('dash-log-btn').addEventListener('click', async () => {
    if (!_dashSelected) return;
    const gramsInp  = document.getElementById('dash-grams');
    const piecesInp = document.getElementById('dash-pieces');
    const meal      = document.getElementById('dash-meal').value;
    const grams = _dashSelected.piece_grams && piecesInp.value
      ? +piecesInp.value * _dashSelected.piece_grams
      : +gramsInp.value;
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
    document.getElementById('dash-grams').value = '';
    document.getElementById('dash-pieces').value = '';
  });

  // Water buttons
  document.getElementById('water-200').addEventListener('click', async () => {
    await api.water.add({ date: _dashToday, ml: 200 });
    _refreshWater();
  });
  document.getElementById('water-500').addEventListener('click', async () => {
    await api.water.add({ date: _dashToday, ml: 500 });
    _refreshWater();
  });
  document.getElementById('water-custom').addEventListener('click', () => {
    document.getElementById('water-custom-dialog').showModal();
    setTimeout(() => document.getElementById('wc-ml').focus(), 50);
  });
  document.getElementById('wc-submit').addEventListener('click', async () => {
    const ml = +document.getElementById('wc-ml').value;
    if (!ml) return;
    await api.water.add({ date: _dashToday, ml });
    document.getElementById('water-custom-dialog').close();
    document.getElementById('wc-ml').value = '';
    _refreshWater();
  });

  // Quick-food dialog
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
      document.getElementById('qf-protein').value = Math.round(kcal * +btn.dataset.p / 100 / 4 * 10) / 10;
      document.getElementById('qf-carbs').value   = Math.round(kcal * +btn.dataset.c / 100 / 4 * 10) / 10;
      document.getElementById('qf-fat').value     = Math.round(kcal * +btn.dataset.f / 100 / 9 * 10) / 10;
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
        piece_grams: +document.getElementById('qf-piece').value   || null,
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
  ['qf-name','qf-kcal','qf-protein','qf-carbs','qf-fat','qf-grams','qf-piece'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.querySelectorAll('.qf-preset').forEach(b => b.classList.remove('preset-active'));
}

async function _refreshWater() {
  const d = _dashToday || new Date().toISOString().slice(0, 10);
  const waterData = await api.water.getDay(d);
  _dashRenderWater(waterData.total_ml, (_dashSettings && _dashSettings.water_goal) || 2000);
}

// Expose helpers used by day.js
function buildEntryTable(items, foods, prefix)           { return _buildEntryTable(items, foods, prefix); }
function wireEntryTable(container, prefix, foods, refresh){ return _wireEntryTable(container, prefix, foods, refresh); }
