async function historyOnEnter() {
  const [weeks, settings] = await Promise.all([
    api.log.getWeeklySummaries(),
    api.settings.get(),
  ]);
  _renderHistoryChart(weeks, settings.cal_goal);
  _renderHistoryTable(weeks);
}

function _renderHistoryChart(weeks, calGoal) {
  const card = document.getElementById('history-chart-card');
  if (!weeks.length) { card.style.display = 'none'; return; }
  card.style.display = '';

  // Chart: most recent 12 weeks, oldest first
  const slice  = weeks.slice(0, 12).reverse();
  const labels = slice.map(w => w.week_start);
  const values = slice.map(w => w.avg_calories || 0);
  createOrUpdateBarChart('history-bar-canvas', labels, values, calGoal);
}

function _renderHistoryTable(weeks) {
  const wrap = document.getElementById('history-table-wrap');
  if (!weeks.length) {
    wrap.innerHTML = '<p class="empty">No history yet. Start logging food today!</p>';
    return;
  }

  const table = document.createElement('table');
  table.innerHTML = `<thead><tr>
    <th>Week of</th><th>Days logged</th>
    <th>Avg kcal</th><th>Avg protein</th><th>Avg carbs</th><th>Avg fat</th>
  </tr></thead>`;
  const tbody = document.createElement('tbody');

  for (const w of weeks) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><a class="week-link" data-week="${w.week_start}">${w.week_start}</a></td>
      <td>${w.days_logged}/7</td>
      <td>${w.avg_calories}</td>
      <td>${w.avg_protein}g</td>
      <td>${w.avg_carbs}g</td>
      <td>${w.avg_fat}g</td>`;
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.innerHTML = '';
  wrap.appendChild(table);

  wrap.querySelectorAll('.week-link').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      navigate('week', a.dataset.week);
    });
  });
}
