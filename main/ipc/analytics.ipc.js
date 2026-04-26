const { ipcMain } = require('electron');
const { getDb } = require('../db');

function registerAnalyticsIpc() {
  ipcMain.handle('analytics:caloriesTrend', (_, { days = 30 }) => {
    const db = getDb();
    const foodIn = db.prepare(`
      SELECT l.date, SUM(f.calories / 100.0 * l.grams) as calories_in
      FROM log l JOIN foods f ON f.id = l.food_id
      WHERE l.status = 'logged' AND l.date >= date('now', '-' || ? || ' days')
      GROUP BY l.date
    `).all(days - 1);

    const energyOut = db.prepare(`
      SELECT date, resting_kcal, active_kcal, extra_kcal, steps,
             (resting_kcal + active_kcal + extra_kcal) as calories_out
      FROM daily_energy
      WHERE date >= date('now', '-' || ? || ' days')
    `).all(days - 1);

    // Merge by date
    const map = {};
    for (const row of foodIn) map[row.date] = { date: row.date, calories_in: row.calories_in, calories_out: 0, resting_kcal: 0, active_kcal: 0, extra_kcal: 0, steps: 0 };
    for (const row of energyOut) {
      if (!map[row.date]) map[row.date] = { date: row.date, calories_in: 0, calories_out: 0, resting_kcal: 0, active_kcal: 0, extra_kcal: 0, steps: 0 };
      map[row.date].calories_out = row.calories_out;
      map[row.date].resting_kcal = row.resting_kcal;
      map[row.date].active_kcal  = row.active_kcal;
      map[row.date].extra_kcal   = row.extra_kcal;
      map[row.date].steps        = row.steps;
    }

    return Object.values(map).map(r => ({
      date:         r.date,
      calories_in:  Math.round(r.calories_in),
      calories_out: Math.round(r.calories_out),
      resting_kcal: Math.round(r.resting_kcal),
      active_kcal:  Math.round(r.active_kcal),
      extra_kcal:   Math.round(r.extra_kcal),
      steps:        r.steps || 0,
      net:          Math.round(r.calories_in - r.calories_out),
    })).sort((a, b) => a.date.localeCompare(b.date));
  });

  ipcMain.handle('analytics:macroTrend', (_, { days = 30 }) => {
    const db = getDb();
    return db.prepare(`
      SELECT l.date,
             ROUND(SUM(f.protein / 100.0 * l.grams)) as protein,
             ROUND(SUM(f.carbs   / 100.0 * l.grams)) as carbs,
             ROUND(SUM(f.fat     / 100.0 * l.grams)) as fat,
             ROUND(SUM(f.fiber   / 100.0 * l.grams)) as fiber
      FROM log l JOIN foods f ON f.id = l.food_id
      WHERE l.status = 'logged' AND l.date >= date('now', '-' || ? || ' days')
      GROUP BY l.date
      ORDER BY l.date
    `).all(days - 1);
  });

  ipcMain.handle('analytics:exerciseTrend', (_, { days = 60 }) => {
    const db = getDb();
    return db.prepare(`
      SELECT date, COUNT(*) as count,
             SUM(duration_min) as total_min,
             SUM(calories_burned) as total_burned
      FROM exercises
      WHERE date >= date('now', '-' || ? || ' days')
      GROUP BY date
      ORDER BY date
    `).all(days - 1);
  });
}

module.exports = registerAnalyticsIpc;
