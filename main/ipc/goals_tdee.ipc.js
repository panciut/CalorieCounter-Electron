const { ipcMain } = require('electron');
const { getDb } = require('../db');

function registerGoalsTdeeIpc() {
  // Adaptive TDEE: avg calories + weight change correction
  ipcMain.handle('goals:calculateTDEE', () => {
    const db = getDb();

    const logData = db.prepare(`
      SELECT l.date, SUM(f.calories / 100.0 * l.grams) as calories
      FROM log l JOIN foods f ON f.id = l.food_id
      WHERE l.status = 'logged' AND l.date >= date('now', '-30 days')
      GROUP BY l.date ORDER BY l.date
    `).all();

    const weightData = db.prepare(`
      SELECT date, weight FROM weight_log
      WHERE date >= date('now', '-30 days')
      ORDER BY date
    `).all();

    if (logData.length < 5) {
      return { tdee: null, confidence: 'low', data_points: logData.length };
    }

    const avgCal = logData.reduce((s, d) => s + d.calories, 0) / logData.length;

    let tdee = avgCal;
    if (weightData.length >= 2) {
      const weightChange = weightData[weightData.length - 1].weight - weightData[0].weight;
      const daySpan = logData.length;
      // 7700 kcal ≈ 1 kg of fat; distribute daily correction
      tdee = avgCal - (weightChange * 7700 / daySpan);
    }

    return {
      tdee: Math.round(tdee),
      confidence: logData.length >= 14 ? 'high' : 'medium',
      data_points: logData.length,
    };
  });

  // Suggest calorie/macro targets based on goal type + TDEE
  ipcMain.handle('goals:suggest', (_, { goal_type, tdee }) => {
    const db = getDb();
    const weightRow = db.prepare('SELECT weight FROM weight_log ORDER BY date DESC LIMIT 1').get();
    const weightKg = weightRow ? weightRow.weight : 70;

    let cal_rec = tdee;
    let rate_per_week_kg = 0;

    if (goal_type === 'lose') {
      cal_rec = Math.max(1200, Math.round(tdee - 500));
      rate_per_week_kg = -0.5;
    } else if (goal_type === 'gain') {
      cal_rec = Math.round(tdee + 400);
      rate_per_week_kg = 0.4;
    }

    const protein_rec = Math.round(weightKg * 2.0);

    return {
      cal_rec,
      cal_min: Math.round(cal_rec * 0.9),
      cal_max: Math.round(cal_rec * 1.1),
      protein_rec,
      rate_per_week_kg,
    };
  });
}

module.exports = registerGoalsTdeeIpc;
