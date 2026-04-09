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

  document.getElementById('day-title').textContent = _dayDate;

  const [entries, foods] = await Promise.all([
    api.log.getDay(_dayDate),
    api.foods.getAll(),
  ]);
  _dayFoods = foods;

  // Totals
  const totalsEl = document.getElementById('day-totals');
  const t = entries.reduce((acc, e) => {
    acc.calories += e.calories; acc.protein += e.protein;
    acc.carbs    += e.carbs;    acc.fat     += e.fat;
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  totalsEl.innerHTML = `
    <div class="macro"><span>${Math.round(t.calories * 10) / 10}</span>kcal</div>
    <div class="macro"><span>${Math.round(t.protein  * 10) / 10}g</span>protein</div>
    <div class="macro"><span>${Math.round(t.carbs    * 10) / 10}g</span>carbs</div>
    <div class="macro"><span>${Math.round(t.fat      * 10) / 10}g</span>fat</div>`;

  // Entries
  const container = document.getElementById('day-entries');
  if (!entries.length) {
    container.innerHTML = '<p class="empty">Nothing logged this day.</p>';
  } else {
    const groups = {};
    for (const e of entries) (groups[e.meal] = groups[e.meal] || []).push(e);
    container.innerHTML = '';
    for (const meal of ['Breakfast', 'Lunch', 'Dinner', 'Snack']) {
      if (!groups[meal]) continue;
      const h = document.createElement('div');
      h.className = 'meal-header'; h.textContent = meal;
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
  const form      = document.getElementById('day-log-form');
  const gramsInp  = document.getElementById('day-grams');
  const piecesInp = document.getElementById('day-pieces');
  form.style.display = '';
  if (food.piece_grams) {
    gramsInp.style.display  = 'none'; gramsInp.required  = false; gramsInp.value = '';
    piecesInp.style.display = '';     piecesInp.required = true;  piecesInp.focus();
  } else {
    piecesInp.style.display = 'none'; piecesInp.required = false; piecesInp.value = '';
    gramsInp.style.display  = '';     gramsInp.required  = true;  gramsInp.focus();
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
    const grams = _daySelected.piece_grams && piecesInp.value
      ? +piecesInp.value * _daySelected.piece_grams
      : +gramsInp.value;
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
    document.getElementById('day-grams').value  = '';
    document.getElementById('day-pieces').value = '';
  });

  document.getElementById('day-open-quick').addEventListener('click', () => {
    _quickFoodDate = _dayDate;
    document.getElementById('quick-food-dialog').showModal();
    setTimeout(() => document.getElementById('qf-name').focus(), 50);
  });
}
