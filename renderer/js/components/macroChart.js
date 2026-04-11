let _macroPieChart = null;
let _macroPieMacros = { protein: 0, carbs: 0, fat: 0, calories: 0 };

const _centerPlugin = {
  id: 'centerLabel',
  afterDraw(chart) {
    const { protein, carbs, fat, calories } = _macroPieMacros;
    const total = protein + carbs + fat;
    const { ctx, chartArea: { width, height, left, top } } = chart;
    if (!total) return;
    ctx.save();
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = '#e8e8ed';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(calories) + ' kcal', left + width / 2, top + height / 2);
    ctx.restore();
  },
};

function createOrUpdateMacroPie(canvasId, { protein, carbs, fat, calories }) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  _macroPieMacros = { protein, carbs, fat, calories };
  const total = protein + carbs + fat;
  const data = {
    labels: ['Protein', 'Carbs', 'Fat'],
    datasets: [{
      data: total > 0 ? [protein, carbs, fat] : [1, 1, 1],
      backgroundColor: ['#30d158', '#c45c00', '#ffd60a'],
      borderWidth: 0,
    }],
  };

  if (_macroPieChart) {
    _macroPieChart.data = data;
    _macroPieChart.update('none');
  } else {
    _macroPieChart = new Chart(canvas, {
      type: 'doughnut',
      data,
      options: {
        cutout: '62%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: ctx => `${ctx.label}: ${Number(ctx.raw).toFixed(1)}g` },
          },
        },
        animation: { duration: 250 },
      },
      plugins: [_centerPlugin],
    });
  }

  canvas.parentElement.style.display = '';
}
