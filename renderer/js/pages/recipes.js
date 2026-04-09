let _rcFoods       = [];
let _rcIngredients = []; // [{food_id, name, grams, calories, protein, carbs, fat}]
let _rcSelectedFood = null;
let _rcFoodSearch   = null;
let _rlRecipeId     = null;
let _rlRecipeMacros = null;

async function recipesOnEnter() {
  const [recipes, foods] = await Promise.all([api.recipes.getAll(), api.foods.getAll()]);
  _rcFoods = foods;
  _rcFoodSearch && _rcFoodSearch.setItems(foods);
  _renderRecipeList(recipes);
}

function _renderRecipeList(recipes) {
  const container = document.getElementById('recipes-list');
  if (!recipes.length) {
    container.innerHTML = `<p class="empty">${t('recipes.noRecipes')}</p>`;
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'recipes-grid';

  for (const r of recipes) {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.innerHTML = `
      <div class="recipe-card-name">${r.name}</div>
      ${r.description ? `<div class="recipe-card-desc">${r.description}</div>` : ''}
      <div class="recipe-card-macros">
        <div><span>${r.total_calories}</span> kcal</div>
        <div><span>${r.total_protein}g</span> protein</div>
        <div><span>${r.total_carbs}g</span> carbs</div>
        <div><span>${r.total_fat}g</span> fat</div>
        <div><span>${r.total_fiber || 0}g</span> fiber</div>
        <div style="margin-left:auto;color:var(--text-sec)">${r.ingredient_count} ${t('recipes.ingredients')}</div>
      </div>
      <div class="recipe-card-actions">
        <button class="btn-primary rc-log-btn" data-id="${r.id}"
          data-cal="${r.total_calories}" data-pro="${r.total_protein}"
          data-carbs="${r.total_carbs}" data-fat="${r.total_fat}" data-fiber="${r.total_fiber || 0}"
          data-name="${r.name}">${t('recipes.log')}</button>
        <button class="del rc-del-btn" data-id="${r.id}">✕ Delete</button>
      </div>`;
    grid.appendChild(card);
  }

  container.innerHTML = '';
  container.appendChild(grid);

  container.querySelectorAll('.rc-log-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _rlRecipeId = +btn.dataset.id;
      _rlRecipeMacros = {
        calories: +btn.dataset.cal,
        protein:  +btn.dataset.pro,
        carbs:    +btn.dataset.carbs,
        fat:      +btn.dataset.fat,
        fiber:    +btn.dataset.fiber,
      };
      document.getElementById('rl-title').textContent = 'Log: ' + btn.dataset.name;
      _updateLogPreview();
      document.getElementById('recipe-log-dialog').showModal();
    });
  });

  container.querySelectorAll('.rc-del-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await api.recipes.delete(+btn.dataset.id);
      recipesOnEnter();
    });
  });
}

function _updateLogPreview() {
  if (!_rlRecipeMacros) return;
  const scale = +document.getElementById('rl-scale').value || 1;
  const m = _rlRecipeMacros;
  document.getElementById('rl-preview').textContent =
    `${t('rl.willLog')} ${Math.round(m.calories * scale)} ${t('macro.kcal')} · ${Math.round(m.protein * scale)}g ${t('macro.protein')} · ` +
    `${Math.round(m.carbs * scale)}g ${t('macro.carbs')} · ${Math.round(m.fat * scale)}g ${t('macro.fat')} · ${Math.round(m.fiber * scale)}g ${t('macro.fiber')}`;
}

function _updateRecipeMacroPreview() {
  const totals = _rcIngredients.reduce((acc, ing) => {
    acc.calories += ing.calories; acc.protein += ing.protein;
    acc.carbs    += ing.carbs;    acc.fat     += ing.fat;
    acc.fiber    += (ing.fiber || 0);
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

  const preview = document.getElementById('rc-macro-preview');
  if (_rcIngredients.length) {
    preview.style.display = '';
    document.getElementById('rc-total-cal').textContent     = Math.round(totals.calories * 10) / 10 + ' kcal';
    document.getElementById('rc-total-protein').textContent = Math.round(totals.protein  * 10) / 10 + 'g protein';
    document.getElementById('rc-total-carbs').textContent   = Math.round(totals.carbs    * 10) / 10 + 'g carbs';
    document.getElementById('rc-total-fat').textContent     = Math.round(totals.fat      * 10) / 10 + 'g fat';
    document.getElementById('rc-total-fiber').textContent   = Math.round(totals.fiber    * 10) / 10 + 'g fiber';
  } else {
    preview.style.display = 'none';
  }
}

function _renderIngredientList() {
  const list = document.getElementById('rc-ingredients-list');
  list.innerHTML = '';
  if (!_rcIngredients.length) return;

  for (let i = 0; i < _rcIngredients.length; i++) {
    const ing = _rcIngredients[i];
    const row = document.createElement('div');
    row.className = 'ingredient-row';
    row.innerHTML = `
      <div>
        <strong>${ing.name}</strong> — ${ing.grams}g
        <div class="ingredient-macros">${ing.calories} kcal · ${ing.protein}g P · ${ing.carbs}g C · ${ing.fat}g F · ${ing.fiber || 0}g Fib</div>
      </div>
      <button class="del rc-remove-ing" data-idx="${i}">✕</button>`;
    list.appendChild(row);
  }

  list.querySelectorAll('.rc-remove-ing').forEach(btn => {
    btn.addEventListener('click', () => {
      _rcIngredients.splice(+btn.dataset.idx, 1);
      _renderIngredientList();
      _updateRecipeMacroPreview();
    });
  });
}

function recipesInitEvents() {
  // New recipe button
  document.getElementById('recipe-new-btn').addEventListener('click', () => {
    _rcIngredients = [];
    _rcSelectedFood = null;
    document.getElementById('rc-name').value = '';
    document.getElementById('rc-desc').value = '';
    document.getElementById('rc-grams').value = '';
    document.getElementById('rc-ingredients-list').innerHTML = '';
    document.getElementById('rc-macro-preview').style.display = 'none';
    if (_rcFoodSearch) _rcFoodSearch.clear();
    document.getElementById('rc-ingredient-form').style.display = 'none';
    document.getElementById('recipe-create-dialog').showModal();
    setTimeout(() => document.getElementById('rc-name').focus(), 50);
  });

  // Recipe ingredient food search
  _rcFoodSearch = new FoodSearch('rc-food-input', 'rc-search-results', (food) => {
    _rcSelectedFood = food;
    document.getElementById('rc-ingredient-form').style.display = '';
    document.getElementById('rc-grams').focus();
  });
  _rcFoodSearch.setItems(_rcFoods);

  // Add ingredient button
  document.getElementById('rc-add-ingredient').addEventListener('click', () => {
    const food  = _rcSelectedFood;
    const grams = +document.getElementById('rc-grams').value;
    if (!food || !grams) return;
    _rcIngredients.push({
      food_id:  food.id,
      name:     food.name,
      grams,
      calories: Math.round(food.calories * grams / 100 * 10) / 10,
      protein:  Math.round(food.protein  * grams / 100 * 10) / 10,
      carbs:    Math.round(food.carbs    * grams / 100 * 10) / 10,
      fat:      Math.round(food.fat      * grams / 100 * 10) / 10,
      fiber:    Math.round((food.fiber || 0) * grams / 100 * 10) / 10,
    });
    _rcSelectedFood = null;
    _rcFoodSearch.clear();
    document.getElementById('rc-grams').value = '';
    document.getElementById('rc-ingredient-form').style.display = 'none';
    _renderIngredientList();
    _updateRecipeMacroPreview();
  });

  // Create recipe submit
  document.getElementById('rc-submit').addEventListener('click', async () => {
    const name = document.getElementById('rc-name').value.trim();
    if (!name || !_rcIngredients.length) return;
    await api.recipes.create({
      name,
      description: document.getElementById('rc-desc').value.trim() || null,
      ingredients: _rcIngredients.map(({ food_id, grams }) => ({ food_id, grams })),
    });
    document.getElementById('recipe-create-dialog').close();
    recipesOnEnter();
  });

  // Log recipe
  document.getElementById('rl-scale').addEventListener('input', _updateLogPreview);
  document.getElementById('rl-submit').addEventListener('click', async () => {
    if (!_rlRecipeId) return;
    await api.recipes.log({
      recipe_id: _rlRecipeId,
      meal:  document.getElementById('rl-meal').value,
      scale: +document.getElementById('rl-scale').value || 1,
    });
    document.getElementById('recipe-log-dialog').close();
    navigate('dashboard');
  });
}
