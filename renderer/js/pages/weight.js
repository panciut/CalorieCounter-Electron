async function weightOnEnter() {
  const [entries, settings] = await Promise.all([
    api.weight.getAll(),
    api.settings.get(),
  ]);

  const goalWeight = settings.weight_goal || 0;

  if (entries.length) {
    document.getElementById('weight-stats').style.display = '';
    document.getElementById('weight-current').textContent = entries[entries.length - 1].weight + ' kg';
    document.getElementById('weight-goal-val').textContent = goalWeight ? goalWeight + ' kg' : '—';

    // Chart
    document.getElementById('weight-chart-card').style.display = '';
    const regression = createOrUpdateLineChart('weight-line-canvas', entries, goalWeight || null);

    // Prediction
    let predText = '—';
    if (goalWeight && regression && regression.slope) {
      const { slope, intercept } = regression;
      const last = entries[entries.length - 1].weight;
      if ((slope < 0 && goalWeight < last) || (slope > 0 && goalWeight > last)) {
        const n      = entries.length - 1;
        const daysToGoal = (goalWeight - intercept) / slope;
        const day0   = new Date(entries[0].date + 'T00:00:00');
        day0.setDate(day0.getDate() + Math.round(daysToGoal));
        predText = day0.toISOString().slice(0, 10);
      } else if (goalWeight) {
        predText = 'on track';
      }
    } else if (goalWeight) {
      predText = 'set a goal';
    }
    document.getElementById('weight-prediction').textContent = predText;

    // Legend
    document.getElementById('weight-legend').innerHTML = `
      <span class="legend-item">
        <span class="legend-dot" style="background:#c45c00"></span> Weight
      </span>
      <span class="legend-item">
        <span class="legend-dot" style="background:#888;border-radius:0;height:2px;border-top:2px dashed #888"></span> Trend
      </span>
      ${goalWeight ? `<span class="legend-item">
        <span class="legend-dot" style="background:#e07020;border-radius:0;height:2px"></span> Goal
      </span>` : ''}`;
  } else {
    document.getElementById('weight-stats').style.display = 'none';
    document.getElementById('weight-chart-card').style.display = 'none';
  }

  // Table (most recent first)
  _renderWeightTable([...entries].reverse());
}

function _renderWeightTable(entries) {
  const wrap = document.getElementById('weight-table-wrap');
  if (!entries.length) {
    wrap.innerHTML = '<p class="empty">No weight entries yet. Log your first one above.</p>';
    return;
  }

  const table = document.createElement('table');
  table.innerHTML = '<thead><tr><th>Date</th><th>Weight (kg)</th><th></th></tr></thead>';
  const tbody = document.createElement('tbody');

  for (const e of entries) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${e.date}</td>
      <td>${e.weight}</td>
      <td><button class="del" data-id="${e.id}">✕</button></td>`;
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.innerHTML = '';
  wrap.appendChild(table);

  wrap.querySelectorAll('.del').forEach(btn => {
    btn.addEventListener('click', async () => {
      await api.weight.delete(+btn.dataset.id);
      weightOnEnter();
    });
  });
}

function weightInitEvents() {
  // Set today's date as default
  document.getElementById('weight-date').valueAsDate = new Date();

  document.getElementById('weight-add-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const weight = +document.getElementById('weight-val').value;
    const date   = document.getElementById('weight-date').value;
    if (!weight) return;
    await api.weight.add({ weight, date });
    document.getElementById('weight-val').value = '';
    weightOnEnter();
  });
}
