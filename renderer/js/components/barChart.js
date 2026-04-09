const _charts = {};

function createOrUpdateBarChart(canvasId, labels, values, goalValue) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const datasets = [{
    label: 'Calories',
    data: values,
    backgroundColor: 'rgba(196,92,0,0.7)',
    borderColor: '#c45c00',
    borderWidth: 1,
    borderRadius: 4,
  }];

  if (goalValue) {
    datasets.push({
      label: 'Goal',
      data: labels.map(() => goalValue),
      type: 'line',
      borderColor: '#ffd60a',
      borderDash: [5, 4],
      borderWidth: 1.5,
      pointRadius: 0,
      fill: false,
    });
  }

  const config = {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { mode: 'index', intersect: false },
      },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.07)' }, ticks: { color: '#888' } },
        x: { grid: { display: false }, ticks: { color: '#888' } },
      },
      animation: { duration: 200 },
    },
  };

  if (_charts[canvasId]) {
    _charts[canvasId].data.labels = labels;
    _charts[canvasId].data.datasets = datasets;
    _charts[canvasId].update('none');
  } else {
    _charts[canvasId] = new Chart(canvas, config);
  }
}

// Linear regression helper
function _linearRegression(xs, ys) {
  const n = ys.length;
  if (n < 2) return { slope: 0, intercept: ys[0] || 0 };
  const sx = xs.reduce((a, b) => a + b, 0);
  const sy = ys.reduce((a, b) => a + b, 0);
  const sxy = xs.reduce((sum, x, i) => sum + x * ys[i], 0);
  const sx2 = xs.reduce((sum, x) => sum + x * x, 0);
  const denom = n * sx2 - sx * sx;
  const slope = denom ? (n * sxy - sx * sy) / denom : 0;
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

function createOrUpdateLineChart(canvasId, entries, goalWeight) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !entries.length) return null;

  const labels  = entries.map(e => typeof fmtDate === 'function' ? fmtDate(e.date) : e.date);
  const weights = entries.map(e => e.weight);
  const xs      = weights.map((_, i) => i);

  const { slope, intercept } = _linearRegression(xs, weights);
  const trendData = xs.map(x => +(slope * x + intercept).toFixed(2));

  const datasets = [
    {
      label: 'Weight',
      data: weights,
      borderColor: '#c45c00',
      backgroundColor: 'rgba(196,92,0,0.1)',
      borderWidth: 2,
      pointRadius: 4,
      pointBackgroundColor: '#e07020',
      tension: 0.2,
      fill: false,
    },
    {
      label: 'Trend',
      data: trendData,
      borderColor: '#888',
      borderDash: [5, 4],
      borderWidth: 1.5,
      pointRadius: 0,
      fill: false,
    },
  ];

  if (goalWeight) {
    datasets.push({
      label: 'Goal',
      data: labels.map(() => goalWeight),
      borderColor: '#e07020',
      borderDash: [5, 4],
      borderWidth: 1.5,
      pointRadius: 0,
      fill: false,
    });
  }

  const config = {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { mode: 'index', intersect: false },
      },
      scales: {
        y: {
          grid: { color: 'rgba(255,255,255,0.07)' },
          ticks: { color: '#888', callback: v => v + ' kg' },
        },
        x: {
          grid: { display: false },
          ticks: { color: '#888', maxTicksLimit: 10 },
        },
      },
      animation: { duration: 200 },
    },
  };

  if (_charts[canvasId]) {
    _charts[canvasId].data.labels = labels;
    _charts[canvasId].data.datasets = datasets;
    _charts[canvasId].update('none');
  } else {
    _charts[canvasId] = new Chart(canvas, config);
  }

  return { slope, intercept };
}
