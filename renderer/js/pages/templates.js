// ── Templates page ──────────────────────────────────────────────────────────

async function templatesOnEnter() {
  const templates = await api.templates.getAll();
  _renderTemplatesList(templates);
}

function _renderTemplatesList(templates) {
  const container = document.getElementById('templates-list');
  if (!templates.length) {
    container.innerHTML = `<p class="empty">${t('templates.noTemplates')}</p>`;
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'recipes-grid';

  for (const tpl of templates) {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.innerHTML = `
      <div class="recipe-card-name">${tpl.name}</div>
      <div class="recipe-card-macros">
        <div><span>${tpl.total_calories || 0}</span> ${t('macro.kcal')}</div>
        <div style="margin-left:auto;color:var(--text-sec)">${tpl.item_count} ${t('templates.items')}</div>
      </div>
      <div class="recipe-card-actions">
        <button class="btn-primary tpl-apply-btn" data-id="${tpl.id}">${t('templates.apply')}</button>
        <button class="del tpl-del-btn" data-id="${tpl.id}">✕ ${t('common.delete')}</button>
      </div>`;
    grid.appendChild(card);
  }

  container.innerHTML = '';
  container.appendChild(grid);

  container.querySelectorAll('.tpl-apply-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const today = new Date().toISOString().slice(0, 10);
      await api.templates.apply(+btn.dataset.id, today);
      navigate('dashboard');
    });
  });

  container.querySelectorAll('.tpl-del-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await api.templates.delete(+btn.dataset.id);
      templatesOnEnter();
    });
  });
}

function templatesInitEvents() {
  // Save today as template
  document.getElementById('tpl-save-today').addEventListener('click', () => {
    document.getElementById('tpl-name-input').value = '';
    document.getElementById('template-name-dialog').showModal();
    setTimeout(() => document.getElementById('tpl-name-input').focus(), 50);
  });

  // Template name dialog submit
  document.getElementById('tpl-name-submit').addEventListener('click', async () => {
    const name = document.getElementById('tpl-name-input').value.trim();
    if (!name) return;
    const today = new Date().toISOString().slice(0, 10);
    await api.templates.createFromDay(name, today);
    document.getElementById('template-name-dialog').close();
    templatesOnEnter();
  });

  // Dashboard: apply template button
  document.getElementById('dash-apply-template').addEventListener('click', async () => {
    const templates = await api.templates.getAll();
    const list = document.getElementById('tpl-pick-list');
    if (!templates.length) {
      list.innerHTML = `<p class="empty">${t('templates.noTemplates')}</p>`;
    } else {
      list.innerHTML = '';
      for (const tpl of templates) {
        const btn = document.createElement('button');
        btn.className = 'btn-secondary';
        btn.style.cssText = 'display:block;width:100%;margin-bottom:6px;text-align:left';
        btn.textContent = `${tpl.name} — ${tpl.total_calories || 0} ${t('macro.kcal')} (${tpl.item_count} ${t('templates.items')})`;
        btn.addEventListener('click', async () => {
          const today = new Date().toISOString().slice(0, 10);
          await api.templates.apply(+tpl.id, today);
          document.getElementById('template-pick-dialog').close();
          dashOnEnter();
        });
        list.appendChild(btn);
      }
    }
    document.getElementById('template-pick-dialog').showModal();
  });
}
