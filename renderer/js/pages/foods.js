let _allFoods = [];

async function foodsOnEnter() {
  _allFoods = await api.foods.getAll();
  const q = document.getElementById('foods-search').value.trim().toLowerCase();
  _renderFoodsTable(q ? _allFoods.filter(f => f.name.toLowerCase().includes(q)) : _allFoods);
}

function _renderFoodsTable(foods) {
  const wrap = document.getElementById('foods-table-wrap');
  if (!foods.length) {
    wrap.innerHTML = `<p class="empty">${t('foods.noFoods')}</p>`;
    return;
  }

  const table = document.createElement('table');
  table.innerHTML = `<thead><tr>
    <th>${t('common.name')}</th><th>${t('th.kcal')}</th><th>${t('th.protein')}</th><th>${t('th.carbs')}</th><th>${t('th.fat')}</th><th>${t('th.fiber')}</th><th>${t('th.piece')}</th><th>${t('th.liquid')}</th><th>★</th><th></th>
  </tr></thead>`;
  const tbody = document.createElement('tbody');

  for (const f of foods) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${f.name}</td>
      <td>${f.calories}</td>
      <td>${f.protein}g</td>
      <td>${f.carbs}g</td>
      <td>${f.fat}g</td>
      <td>${f.fiber || 0}g</td>
      <td>${f.piece_grams ? f.piece_grams + 'g' : '—'}</td>
      <td>${f.is_liquid ? '💧' : ''}</td>
      <td>
        <button class="fav-btn ${f.favorite ? 'fav-on' : ''}" data-id="${f.id}">★</button>
      </td>
      <td class="row-actions">
        <button class="edit-btn" data-id="${f.id}">✎</button>
        <button class="del" data-id="${f.id}">✕</button>
      </td>`;

    const editTr = document.createElement('tr');
    editTr.id = `food-edit-${f.id}`;
    editTr.style.display = 'none';
    editTr.className = 'edit-row';
    editTr.innerHTML = `<td colspan="10"><div class="inline-form">
      <input type="text"   class="edit-name"  value="${f.name}" placeholder="Name" required>
      <input type="number" class="edit-kcal"   value="${f.calories}" placeholder="kcal" min="0" step="0.1" required>
      <input type="number" class="edit-protein" value="${f.protein}" placeholder="protein" min="0" step="0.1">
      <input type="number" class="edit-carbs"  value="${f.carbs}" placeholder="carbs" min="0" step="0.1">
      <input type="number" class="edit-fat"    value="${f.fat}" placeholder="fat" min="0" step="0.1">
      <input type="number" class="edit-fiber"  value="${f.fiber || ''}" placeholder="fiber" min="0" step="0.1">
      <input type="number" class="edit-piece"  value="${f.piece_grams || ''}" placeholder="piece g" min="0" step="0.1">
      <label class="liquid-check"><input type="checkbox" class="edit-liquid" ${f.is_liquid ? 'checked' : ''}> 💧</label>
      <button class="edit-save btn-primary" data-id="${f.id}">Save</button>
      <button class="edit-cancel btn-secondary" data-id="${f.id}">Cancel</button>
    </div></td>`;

    tbody.appendChild(tr);
    tbody.appendChild(editTr);
  }

  table.appendChild(tbody);
  wrap.innerHTML = '';
  wrap.appendChild(table);

  // Favorite toggle
  wrap.querySelectorAll('.fav-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { favorite } = await api.foods.toggleFavorite(+btn.dataset.id);
      btn.classList.toggle('fav-on', !!favorite);
    });
  });

  // Edit toggle
  wrap.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = document.getElementById(`food-edit-${btn.dataset.id}`);
      row.style.display = row.style.display === 'none' ? 'table-row' : 'none';
    });
  });

  // Edit save
  wrap.querySelectorAll('.edit-save').forEach(btn => {
    btn.addEventListener('click', async () => {
      const row = document.getElementById(`food-edit-${btn.dataset.id}`);
      await api.foods.update({
        id:          +btn.dataset.id,
        name:        row.querySelector('.edit-name').value.trim(),
        calories:    +row.querySelector('.edit-kcal').value,
        protein:     +row.querySelector('.edit-protein').value || 0,
        carbs:       +row.querySelector('.edit-carbs').value || 0,
        fat:         +row.querySelector('.edit-fat').value || 0,
        fiber:       +row.querySelector('.edit-fiber').value || 0,
        piece_grams: +row.querySelector('.edit-piece').value || null,
        is_liquid:   row.querySelector('.edit-liquid').checked,
      });
      foodsOnEnter();
    });
  });

  // Edit cancel
  wrap.querySelectorAll('.edit-cancel').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(`food-edit-${btn.dataset.id}`).style.display = 'none';
    });
  });

  // Delete
  wrap.querySelectorAll('.del').forEach(btn => {
    btn.addEventListener('click', async () => {
      await api.foods.delete(+btn.dataset.id);
      foodsOnEnter();
    });
  });
}

function foodsInitEvents() {
  // Search filter
  document.getElementById('foods-search').addEventListener('input', () => {
    const q = document.getElementById('foods-search').value.trim().toLowerCase();
    _renderFoodsTable(q ? _allFoods.filter(f => f.name.toLowerCase().includes(q)) : _allFoods);
  });

  // Barcode lookup → pre-fill add form
  document.getElementById('foods-barcode-btn').addEventListener('click', async () => {
    const barcode = document.getElementById('foods-barcode').value.trim();
    const statusEl = document.getElementById('foods-barcode-status');
    if (!barcode) return;
    statusEl.textContent = '...';
    statusEl.className = 'barcode-status';
    const result = await api.barcode.lookup(barcode);
    if (result) {
      statusEl.textContent = t('barcode.found');
      statusEl.className = 'barcode-status barcode-ok';
      document.getElementById('f-name').value    = result['name_' + getCurrentLang()] || result.name;
      document.getElementById('f-kcal').value    = result.calories;
      document.getElementById('f-protein').value = result.protein;
      document.getElementById('f-carbs').value   = result.carbs;
      document.getElementById('f-fat').value     = result.fat;
      document.getElementById('f-fiber').value   = result.fiber;
      document.getElementById('f-liquid').checked = !!result.is_liquid;
      document.getElementById('f-name').focus();
    } else {
      statusEl.textContent = t('barcode.notFound');
      statusEl.className = 'barcode-status barcode-err';
    }
    document.getElementById('foods-barcode').value = '';
  });
  document.getElementById('foods-barcode').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); document.getElementById('foods-barcode-btn').click(); }
  });

  // Cancel add form
  document.getElementById('f-cancel').addEventListener('click', () => {
    document.getElementById('foods-add-form').reset();
    document.querySelectorAll('.preset-btn[data-form="foods"]').forEach(b => b.classList.remove('preset-active'));
    document.getElementById('foods-barcode-status').textContent = '';
  });

  // Add food form
  document.getElementById('foods-add-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name     = document.getElementById('f-name').value.trim();
    const calories = +document.getElementById('f-kcal').value;
    if (!name || !calories) return;
    await api.foods.add({
      name, calories,
      protein:     +document.getElementById('f-protein').value || 0,
      carbs:       +document.getElementById('f-carbs').value   || 0,
      fat:         +document.getElementById('f-fat').value     || 0,
      fiber:       +document.getElementById('f-fiber').value   || 0,
      piece_grams: +document.getElementById('f-piece').value   || null,
      is_liquid:   document.getElementById('f-liquid').checked,
    });
    e.target.reset();
    document.querySelectorAll('.preset-btn[data-form="foods"]').forEach(b => b.classList.remove('preset-active'));
    foodsOnEnter();
  });

  // Import button
  document.getElementById('foods-import-btn').addEventListener('click', async () => {
    const filePath = await api.import.selectFile();
    if (!filePath) return;
    try {
      const result = await api.import.foods({ filePath });
      alert(t('import.success').replace('{n}', result.imported).replace('{s}', result.skipped));
      foodsOnEnter();
    } catch (e) {
      alert(t('import.error'));
    }
  });

  // Macro preset buttons
  document.querySelectorAll('.preset-btn[data-form="foods"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const kcal = +document.getElementById('f-kcal').value;
      if (!kcal) { document.getElementById('f-kcal').focus(); return; }
      document.getElementById('f-protein').value = Math.round(kcal * +btn.dataset.p / 100 / 4 * 100) / 100;
      document.getElementById('f-carbs').value   = Math.round(kcal * +btn.dataset.c / 100 / 4 * 100) / 100;
      document.getElementById('f-fat').value     = Math.round(kcal * +btn.dataset.f / 100 / 9 * 100) / 100;
      document.querySelectorAll('.preset-btn[data-form="foods"]').forEach(b => b.classList.remove('preset-active'));
      btn.classList.add('preset-active');
    });
  });
}
