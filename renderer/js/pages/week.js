let _weekStart = '';
let _weekFromNav = false;

function getThisMonday() {
  const today = new Date();
  const day = today.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

async function weekOnEnter(param) {
  // Called from nav (no param) or from history (string date)
  if (!param) {
    _weekStart   = getThisMonday();
    _weekFromNav = true;
  } else {
    _weekStart   = param;
    _weekFromNav = false;
  }

  const [days, settings] = await Promise.all([
    api.log.getWeekDetail(_weekStart),
    api.settings.get(),
  ]);

  // Date range title
  const end = new Date(_weekStart + 'T00:00:00');
  end.setDate(end.getDate() + 6);
  document.getElementById('week-title').textContent =
    fmtDate(_weekStart) + ' – ' + fmtDate(end.toISOString().slice(0, 10));

  // Back button visibility
  const backEl = document.getElementById('week-back');
  backEl.style.display = _weekFromNav ? 'none' : '';

  // Build dayMap
  const dayMap = {};
  for (const d of days) dayMap[d.date] = d;

  // Always build full 7-day list (fill missing days with zeros)
  const allDays = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(_weekStart + 'T00:00:00');
    dt.setDate(dt.getDate() + i);
    const iso = dt.toISOString().slice(0, 10);
    allDays.push(dayMap[iso] || { date: iso, calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
  }

  // Week avg totals (only count days that have data)
  const totalsEl = document.getElementById('week-totals');
  const daysWithData = allDays.filter(d => d.calories > 0);
  if (daysWithData.length) {
    const n   = daysWithData.length;
    const avg = {
      calories: Math.round(daysWithData.reduce((s, d) => s + d.calories, 0) / n * 10) / 10,
      protein:  Math.round(daysWithData.reduce((s, d) => s + d.protein,  0) / n * 10) / 10,
      carbs:    Math.round(daysWithData.reduce((s, d) => s + d.carbs,    0) / n * 10) / 10,
      fat:      Math.round(daysWithData.reduce((s, d) => s + d.fat,      0) / n * 10) / 10,
      fiber:    Math.round(daysWithData.reduce((s, d) => s + (d.fiber || 0), 0) / n * 10) / 10,
    };
    totalsEl.innerHTML = `
      <div class="macro"><span>${avg.calories}</span>${t('week.avgPerDay')}</div>
      <div class="macro"><span>${avg.protein}g</span>${t('week.avgProtein')}</div>
      <div class="macro"><span>${avg.carbs}g</span>${t('week.avgCarbs')}</div>
      <div class="macro"><span>${avg.fat}g</span>${t('week.avgFat')}</div>
      <div class="macro"><span>${avg.fiber}g</span>${t('week.avgFiber')}</div>`;
  } else {
    totalsEl.innerHTML = '';
  }

  // Bar chart (all 7 days)
  const labels = [], values = [];
  for (const d of allDays) {
    const locale = getCurrentLang() === 'it' ? 'it-IT' : 'en-US';
    labels.push(new Date(d.date + 'T00:00:00').toLocaleDateString(locale, { weekday: 'short' }));
    values.push(d.calories);
  }
  createOrUpdateBarChart('week-bar-canvas', labels, values, settings.cal_max || settings.cal_min || 0);

  // Table — all 7 days
  const wrap = document.getElementById('week-table-wrap');
  const today = new Date().toISOString().slice(0, 10);
  const locale = getCurrentLang() === 'it' ? 'it-IT' : 'en-US';

  const table = document.createElement('table');
  table.innerHTML = `<thead><tr>
    <th>${t('week.date')}</th><th>${t('th.kcal')}</th><th>${t('th.protein')}</th><th>${t('th.carbs')}</th><th>${t('th.fat')}</th><th>${t('th.fiber')}</th>
  </tr></thead>`;
  const tbody = document.createElement('tbody');

  for (const d of allDays) {
    const isToday  = d.date === today;
    const hasData  = d.calories > 0;
    const calMin   = settings.cal_min || 0;
    const calMax   = settings.cal_max || 0;
    const pct      = calMax ? Math.min(100, Math.round(d.calories / calMax * 100)) : 0;
    const barColor = getBarColor(d.calories, calMin, calMax, settings);
    const dayName  = new Date(d.date + 'T00:00:00').toLocaleDateString(locale, { weekday: 'short' });

    const tr = document.createElement('tr');
    if (isToday)  tr.classList.add('week-today');
    if (!hasData) tr.classList.add('week-empty-day');

    tr.innerHTML = `
      <td>
        <span class="week-day-name">${dayName}</span>
        <a class="day-link" data-date="${d.date}">${fmtDate(d.date)}</a>
        ${isToday ? `<span class="week-today-badge">${t('week.today')}</span>` : ''}
      </td>
      <td>
        <span class="week-cal-num">${hasData ? d.calories : '—'}</span>
        ${hasData ? `<div class="progress-track week-cal-bar"><div class="progress-bar ${barColor}" style="width:${pct}%"></div></div>` : ''}
      </td>
      <td>${hasData ? d.protein + 'g' : '—'}</td>
      <td>${hasData ? d.carbs   + 'g' : '—'}</td>
      <td>${hasData ? d.fat     + 'g' : '—'}</td>
      <td>${hasData ? (d.fiber || 0) + 'g' : '—'}</td>`;
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
