// ── Supplements management page ─────────────────────────────────────────────

async function supplementsOnEnter() {
  const supplements = await api.supplements.getAll();
  _renderSupplementsTable(supplements);
}

function _renderSupplementsTable(supplements) {
  const wrap = document.getElementById('suppl-table-wrap');
  if (!supplements.length) {
    wrap.innerHTML = `<p class="empty">${t('suppl.noSupplements')}</p>`;
    return;
  }

  const table = document.createElement('table');
  table.innerHTML = `<thead><tr>
    <th>#</th><th>${t('suppl.name')}</th><th>${t('suppl.qty')}</th><th></th>
  </tr></thead>`;
  const tbody = document.createElement('tbody');

  for (let i = 0; i < supplements.length; i++) {
    const s = supplements[i];
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${s.name}</td>
      <td>${s.qty}</td>
      <td class="row-actions">
        <button class="edit-btn" data-id="${s.id}">✎</button>
        <button class="del" data-id="${s.id}">✕</button>
      </td>`;

    const editTr = document.createElement('tr');
    editTr.id = `suppl-edit-${s.id}`;
    editTr.style.display = 'none';
    editTr.className = 'edit-row';
    editTr.innerHTML = `<td colspan="4"><div class="inline-form">
      <input type="text" class="edit-name" value="${s.name}" required>
      <input type="number" class="edit-qty" value="${s.qty}" min="1" step="1" style="width:60px">
      <button class="edit-save btn-primary" data-id="${s.id}">${t('common.save')}</button>
      <button class="edit-cancel btn-secondary" data-id="${s.id}">${t('common.cancel')}</button>
    </div></td>`;

    tbody.appendChild(tr);
    tbody.appendChild(editTr);
  }

  table.appendChild(tbody);
  wrap.innerHTML = '';
  wrap.appendChild(table);

  wrap.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = document.getElementById(`suppl-edit-${btn.dataset.id}`);
      row.style.display = row.style.display === 'none' ? 'table-row' : 'none';
    });
  });

  wrap.querySelectorAll('.edit-save').forEach(btn => {
    btn.addEventListener('click', async () => {
      const row = document.getElementById(`suppl-edit-${btn.dataset.id}`);
      await api.supplements.update({
        id:   +btn.dataset.id,
        name: row.querySelector('.edit-name').value.trim(),
        qty:  +row.querySelector('.edit-qty').value || 1,
      });
      supplementsOnEnter();
    });
  });

  wrap.querySelectorAll('.edit-cancel').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(`suppl-edit-${btn.dataset.id}`).style.display = 'none';
    });
  });

  wrap.querySelectorAll('.del').forEach(btn => {
    btn.addEventListener('click', async () => {
      await api.supplements.delete(+btn.dataset.id);
      supplementsOnEnter();
    });
  });
}

function supplementsInitEvents() {
  document.getElementById('suppl-add-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('suppl-name').value.trim();
    const qty  = +document.getElementById('suppl-qty').value || 1;
    if (!name) return;
    await api.supplements.add({ name, qty });
    document.getElementById('suppl-name').value = '';
    document.getElementById('suppl-qty').value = '1';
    supplementsOnEnter();
  });
}

// ── Dashboard supplements checklist ─────────────────────────────────────────

async function _dashRenderSupplements(date) {
  const supplements = await api.supplements.getDay(date);
  const section = document.getElementById('dash-supplements-section');

  if (!supplements.length) {
    section.style.display = 'none';
    return;
  }

  section.style.display = '';
  const list = document.getElementById('dash-supplements-list');
  list.innerHTML = '';

  const totalPills = supplements.reduce((s, x) => s + x.qty, 0);
  const takenPills = supplements.reduce((s, x) => s + x.taken, 0);
  const statusEl = document.getElementById('dash-suppl-status');
  statusEl.textContent = takenPills === totalPills
    ? `${takenPills}/${totalPills} — ${t('suppl.allTaken')}`
    : `${takenPills}/${totalPills} — ${totalPills - takenPills} ${t('suppl.remaining')}`;

  for (const s of supplements) {
    const done = s.taken >= s.qty;
    const row = document.createElement('div');
    row.className = 'suppl-check-row' + (done ? ' suppl-taken' : '');
    row.innerHTML = `
      <span class="suppl-check-name">${s.name}</span>
      <span class="suppl-pill-count ${done ? 'suppl-pill-done' : ''}">${s.taken}/${s.qty}</span>
      <button class="suppl-take-btn ${done ? 'suppl-take-done' : ''}" data-id="${s.id}">+</button>`;
    list.appendChild(row);
  }

  list.querySelectorAll('.suppl-take-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await api.supplements.take({ supplement_id: +btn.dataset.id, date });
      _dashRenderSupplements(date);
    });
  });
}
