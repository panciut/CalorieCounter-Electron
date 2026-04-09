let _weekStart = '';

async function weekOnEnter(weekStart) {
  _weekStart = weekStart;

  const [days, settings] = await Promise.all([
    api.log.getWeekDetail(weekStart),
    api.settings.get(),
  ]);

  // Date range title
  const start = new Date(weekStart + 'T00:00:00');
  const end   = new Date(weekStart + 'T00:00:00');
  end.setDate(end.getDate() + 6);
  const fmt = { month: 'short', day: 'numeric' };
  document.getElementById('week-title').textContent =
    start.toLocaleDateString(undefined, fmt) + ' – ' +
    end.toLocaleDateString(undefined, { ...fmt, year: 'numeric' });

  // Week avg totals
  const totalsEl = document.getElementById('week-totals');
  if (days.length) {
    const n   = days.length;
    const avg = {
      calories: Math.round(days.reduce((s, d) => s + d.calories, 0) / n * 10) / 10,
      protein:  Math.round(days.reduce((s, d) => s + d.protein,  0) / n * 10) / 10,
      carbs:    Math.round(days.reduce((s, d) => s + d.carbs,    0) / n * 10) / 10,
      fat:      Math.round(days.reduce((s, d) => s + d.fat,      0) / n * 10) / 10,
    };
    totalsEl.innerHTML = `
      <div class="macro"><span>${avg.calories}</span>avg kcal/day</div>
      <div class="macro"><span>${avg.protein}g</span>avg protein</div>
      <div class="macro"><span>${avg.carbs}g</span>avg carbs</div>
      <div class="macro"><span>${avg.fat}g</span>avg fat</div>`;
  } else {
    totalsEl.innerHTML = '';
  }

  // Build 7-day skeleton (fill missing days with 0)
  const dayMap = {};
  for (const d of days) dayMap[d.date] = d;
  const labels = [], values = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(weekStart + 'T00:00:00');
    dt.setDate(dt.getDate() + i);
    const iso = dt.toISOString().slice(0, 10);
    labels.push(iso.slice(5)); // MM-DD
    values.push(dayMap[iso] ? dayMap[iso].calories : 0);
  }
  createOrUpdateBarChart('week-bar-canvas', labels, values, settings.cal_goal);

  // Table
  const wrap = document.getElementById('week-table-wrap');
  if (!days.length) {
    wrap.innerHTML = '<p class="empty">No entries for this week.</p>';
    return;
  }

  const table = document.createElement('table');
  table.innerHTML = `<thead><tr>
    <th>Date</th><th>kcal</th><th>protein</th><th>carbs</th><th>fat</th>
  </tr></thead>`;
  const tbody = document.createElement('tbody');

  for (const d of days) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><a class="day-link" data-date="${d.date}">${d.date}</a></td>
      <td>${d.calories}</td><td>${d.protein}g</td><td>${d.carbs}g</td><td>${d.fat}g</td>`;
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.innerHTML = '';
  wrap.appendChild(table);

  wrap.querySelectorAll('.day-link').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      navigate('day', { date: a.dataset.date, fromWeek: _weekStart });
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('week-back').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('history');
  });
});
