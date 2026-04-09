let _dayDate    = '';
let _dayFromWeek = '';
let _dayFoods   = [];
let _daySelected = null;
let _dayFoodSearch = null;

async function dayOnEnter(param) {
  if (typeof param === 'object') {
    _dayDate     = param.date;
    _dayFromWeek = param.fromWeek || '';
  } else {
    _dayDate     = param;
    _dayFromWeek = '';
  }

  document.getElementById('day-title').textContent = fmtDate(_dayDate);

  const [entries, foods] = await Promise.all([
    api.log.getDay(_dayDate),
    api.foods.getAll(),
  ]);
  _dayFoods = foods;

  // Totals
  const totalsEl = document.getElementById('day-totals');
  const tot = entries.reduce((acc, e) => {
    acc.calories += e.calories; acc.protein += e.protein;
    acc.carbs    += e.carbs;    acc.fat     += e.fat;
    acc.fiber    += (e.fiber || 0);
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
  totalsEl.innerHTML = `
    <div class="macro"><span>${Math.round(tot.calories * 10) / 10}</span>${t('macro.kcal')}</div>
    <div class="macro"><span>${Math.round(tot.protein  * 10) / 10}g</span>${t('macro.protein')}</div>
    <div class="macro"><span>${Math.round(tot.carbs    * 10) / 10}g</span>${t('macro.carbs')}</div>
    <div class="macro"><span>${Math.round(tot.fat      * 10) / 10}g</span>${t('macro.fat')}</div>
    <div class="macro"><span>${Math.round(tot.fiber    * 10) / 10}g</span>${t('macro.fiber')}</div>`;

  // Entries
  const container = document.getElementById('day-entries');
  if (!entries.length) {
    container.innerHTML = `<p class="empty">${t('day.nothingLogged')}</p>`;
  } else {
    const groups = {};
    for (const e of entries) (groups[e.meal] = groups[e.meal] || []).push(e);
    container.innerHTML = '';
    for (const meal of ['Breakfast', 'Lunch', 'Dinner', 'Snack']) {
      if (!groups[meal]) continue;
      const h = document.createElement('div');
      h.className = 'meal-header'; h.textContent = tMeal(meal);
      container.appendChild(h);
      container.appendChild(buildEntryTable(groups[meal], foods, 'day'));
    }
    wireEntryTable(container, 'day', foods, () => dayOnEnter({ date: _dayDate, fromWeek: _dayFromWeek }));
  }

  // Init food search for this page
  if (!_dayFoodSearch) {
    _dayFoodSearch = new FoodSearch('day-food-input', 'day-search-results', _dayFoodSelected);
  }
  _dayFoodSearch.setItems(foods);
}

function _dayFoodSelected(food) {
  _daySelected = food;
  document.getElementById('day-log-form').style.display = '';
  if (food.piece_grams) {
    _showUnitInputs('day', 'pieces');
  } else {
    _showUnitInputs('day', 'grams');
  }
}

function dayInitEvents() {
  document.getElementById('day-back').addEventListener('click', (e) => {
    e.preventDefault();
    if (_dayFromWeek) navigate('week', _dayFromWeek);
    else navigate('history');
  });

  document.getElementById('day-log-btn').addEventListener('click', async () => {
    if (!_daySelected) return;
    const gramsInp  = document.getElementById('day-grams');
    const piecesInp = document.getElementById('day-pieces');
    const meal      = document.getElementById('day-meal').value;
    const piecesVisible = piecesInp.style.display !== 'none';
    const grams = piecesVisible && piecesInp.value
      ? Math.round(+piecesInp.value * _daySelected.piece_grams * 100) / 100
      : Math.round(+gramsInp.value * 100) / 100;
    if (!grams) return;
    await api.log.add({ food_id: _daySelected.id, grams, meal, date: _dayDate });
    _daySelected = null;
    _dayFoodSearch && _dayFoodSearch.clear();
    document.getElementById('day-log-form').style.display = 'none';
    gramsInp.value = ''; piecesInp.value = '';
    dayOnEnter({ date: _dayDate, fromWeek: _dayFromWeek });
  });

  document.getElementById('day-log-cancel').addEventListener('click', () => {
    _daySelected = null;
    _dayFoodSearch && _dayFoodSearch.clear();
    document.getElementById('day-log-form').style.display = 'none';
    document.getElementById('day-toggle-unit').style.display = 'none';
    document.getElementById('day-grams').value  = '';
    document.getElementById('day-pieces').value = '';
  });

  document.getElementById('day-toggle-unit').addEventListener('click', (e) => {
    e.preventDefault();
    const piecesVisible = document.getElementById('day-pieces').style.display !== 'none';
    _showUnitInputs('day', piecesVisible ? 'grams' : 'pieces');
  });

  document.getElementById('day-open-quick').addEventListener('click', () => {
    _quickFoodDate = _dayDate;
    document.getElementById('quick-food-dialog').showModal();
    setTimeout(() => document.getElementById('qf-name').focus(), 50);
  });
}
