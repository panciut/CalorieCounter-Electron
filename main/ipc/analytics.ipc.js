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

    const exOut = db.prepare(`
      SELECT date, SUM(calories_burned) as calories_out
      FROM exercises
      WHERE date >= date('now', '-' || ? || ' days')
      GROUP BY date
    `).all(days - 1);

    // Merge by date
    const map = {};
    for (const row of foodIn) map[row.date] = { date: row.date, calories_in: row.calories_in, calories_out: 0 };
    for (const row of exOut) {
      if (!map[row.date]) map[row.date] = { date: row.date, calories_in: 0, calories_out: 0 };
      map[row.date].calories_out = row.calories_out;
    }

    return Object.values(map).map(r => ({
      date: r.date,
      calories_in: Math.round(r.calories_in),
      calories_out: Math.round(r.calories_out),
      net: Math.round(r.calories_in - r.calories_out),
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
