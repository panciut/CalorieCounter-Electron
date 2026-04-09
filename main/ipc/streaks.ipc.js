const { ipcMain } = require('electron');
const { getDb } = require('../db');

function registerStreaksIpc() {
  ipcMain.handle('streaks:get', () => {
    const dates = getDb().prepare(
      'SELECT DISTINCT date FROM log ORDER BY date DESC'
    ).all().map(r => r.date);

    if (!dates.length) return { current: 0, best: 0 };

    const today = new Date().toISOString().slice(0, 10);
    const dateSet = new Set(dates);

    // Current streak: count consecutive days ending at today (or yesterday)
    let current = 0;
    let d = new Date(today + 'T00:00:00');
    // Allow starting from today or yesterday
    if (!dateSet.has(today)) {
      d.setDate(d.getDate() - 1);
      if (!dateSet.has(d.toISOString().slice(0, 10))) {
        current = 0;
      }
    }
    while (dateSet.has(d.toISOString().slice(0, 10))) {
      current++;
      d.setDate(d.getDate() - 1);
    }

    // Best streak: find longest consecutive run
    let best = 0, run = 1;
    const sorted = [...dates].sort();
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1] + 'T00:00:00');
      const curr = new Date(sorted[i] + 'T00:00:00');
      if (curr - prev === 86400000) {
        run++;
      } else {
        best = Math.max(best, run);
        run = 1;
      }
    }
    best = Math.max(best, run);

    return { current, best };
  });
}

module.exports = registerStreaksIpc;
