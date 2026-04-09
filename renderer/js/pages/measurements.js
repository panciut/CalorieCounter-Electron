let _measChart = null;

async function measurementsOnEnter() {
  const entries = await api.measurements.getAll();

  // Chart
  const chartCard = document.getElementById('meas-chart-card');
  if (entries.length) {
    chartCard.style.display = '';
    _renderMeasChart(entries);
    _renderMeasLegend();
  } else {
    chartCard.style.display = 'none';
  }

  // Table
  _renderMeasTable([...entries].reverse());
}

const _measParts = [
  { key: 'waist',  i18n: 'meas.waist',  color: '#c45c00' },
  { key: 'chest',  i18n: 'meas.chest',  color: '#30d158' },
  { key: 'arms',   i18n: 'meas.arms',   color: '#ffd60a' },
  { key: 'thighs', i18n: 'meas.thighs', color: '#ff453a' },
  { key: 'hips',   i18n: 'meas.hips',   color: '#5ac8fa' },
  { key: 'neck',   i18n: 'meas.neck',   color: '#bf5af2' },
];

function _renderMeasChart(entries) {
  const canvas = document.getElementById('meas-line-canvas');
  const labels = entries.map(e => fmtDate(e.date));

  const datasets = _measParts
    .filter(p => entries.some(e => e[p.key] != null))
    .map(p => ({
      label: t(p.i18n),
      data: entries.map(e => e[p.key]),
      borderColor: p.color,
      backgroundColor: p.color,
      borderWidth: 2,
      pointRadius: 3,
      tension: 0.3,
      spanGaps: true,
    }));

  if (_measChart) _measChart.destroy();

  _measChart = new Chart(canvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#888', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#888', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
      },
    },
  });
}

function _renderMeasLegend() {
  document.getElementById('meas-legend').innerHTML = _measParts.map(p =>
    `<span class="legend-item"><span class="legend-dot" style="background:${p.color}"></span> ${t(p.i18n)}</span>`
  ).join('');
}

function _renderMeasTable(entries) {
  const wrap = document.getElementById('meas-table-wrap');
  if (!entries.length) {
    wrap.innerHTML = `<p class="empty">${t('meas.noEntries')}</p>`;
    return;
  }

  const table = document.createElement('table');
  table.innerHTML = `<thead><tr>
    <th>${t('weight.dateCol')}</th>
    ${_measParts.map(p => `<th>${t(p.i18n)}</th>`).join('')}
    <th></th>
  </tr></thead>`;

  const tbody = document.createElement('tbody');
  for (const e of entries) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${fmtDate(e.date)}</td>
      ${_measParts.map(p => `<td>${e[p.key] != null ? e[p.key] : ''}</td>`).join('')}
      <td><button class="del" data-id="${e.id}">&#x2715;</button></td>`;
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrap.innerHTML = '';
  wrap.appendChild(table);

  wrap.querySelectorAll('.del').forEach(btn => {
    btn.addEventListener('click', async () => {
      await api.measurements.delete(+btn.dataset.id);
      measurementsOnEnter();
    });
  });
}

function measurementsInitEvents() {
  document.getElementById('meas-date').valueAsDate = new Date();

  document.getElementById('meas-add-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const date   = document.getElementById('meas-date').value;
    const waist  = +document.getElementById('meas-waist').value || null;
    const chest  = +document.getElementById('meas-chest').value || null;
    const arms   = +document.getElementById('meas-arms').value || null;
    const thighs = +document.getElementById('meas-thighs').value || null;
    const hips   = +document.getElementById('meas-hips').value || null;
    const neck   = +document.getElementById('meas-neck').value || null;
    if (!date) return;
    await api.measurements.add({ date, waist, chest, arms, thighs, hips, neck });
    // Clear inputs except date
    ['meas-waist','meas-chest','meas-arms','meas-thighs','meas-hips','meas-neck'].forEach(id => {
      document.getElementById(id).value = '';
    });
    measurementsOnEnter();
  });
}
