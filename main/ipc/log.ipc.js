const { ipcMain } = require('electron');
const { getDb } = require('../db');
const { pushUndo } = require('./undo.ipc');

const today = () => new Date().toISOString().slice(0, 10);

function registerLogIpc() {
  ipcMain.handle('log:getDay', (_, { date }) => {
    const d = date || today();
    return getDb().prepare(`
      SELECT l.id, l.food_id, l.meal, f.name, l.grams,
        ROUND(f.calories * l.grams / 100, 2) AS calories,
        ROUND(f.protein  * l.grams / 100, 2) AS protein,
        ROUND(f.carbs    * l.grams / 100, 2) AS carbs,
        ROUND(f.fat      * l.grams / 100, 2) AS fat,
        ROUND(f.fiber    * l.grams / 100, 2) AS fiber
      FROM log l
      JOIN foods f ON l.food_id = f.id
      WHERE l.date = ?
      ORDER BY
        MIN(l.id) OVER (PARTITION BY l.meal), l.id
    `).all(d);
  });

  ipcMain.handle('log:add', (_, { food_id, grams, meal, date }) => {
    const db = getDb();
    const d = date || today();
    const result = db.prepare(
      'INSERT INTO log (date, food_id, grams, meal) VALUES (?, ?, ?, ?)'
    ).run(d, food_id, grams, meal || 'Snack');
    pushUndo('log:add', { id: result.lastInsertRowid });
    // Auto-add water for liquid foods (grams ≈ ml)
    const food = db.prepare('SELECT name, is_liquid FROM foods WHERE id = ?').get(food_id);
    if (food && food.is_liquid) {
      db.prepare('INSERT INTO water_log (date, ml, source, log_id) VALUES (?, ?, ?, ?)').run(d, grams, food.name, result.lastInsertRowid);
    }
    return { id: result.lastInsertRowid };
  });

  ipcMain.handle('log:addQuick', (_, { food, grams, meal, date }) => {
    const db = getDb();
    const d = date || today();
    return db.transaction(() => {
      const foodResult = db.prepare(
        'INSERT INTO foods (name, calories, protein, carbs, fat, fiber, piece_grams, is_liquid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(food.name, food.calories, food.protein || 0, food.carbs || 0, food.fat || 0, food.fiber || 0, food.piece_grams || null, food.is_liquid ? 1 : 0);
      const logResult = db.prepare(
        'INSERT INTO log (date, food_id, grams, meal) VALUES (?, ?, ?, ?)'
      ).run(d, foodResult.lastInsertRowid, grams, meal || 'Snack');
      if (food.is_liquid) {
        db.prepare('INSERT INTO water_log (date, ml, source, log_id) VALUES (?, ?, ?, ?)').run(d, grams, food.name, logResult.lastInsertRowid);
      }
      return { id: logResult.lastInsertRowid, food_id: foodResult.lastInsertRowid };
    })();
  });

  ipcMain.handle('log:update', (_, { id, food_id, grams, meal }) => {
    getDb().prepare(
      'UPDATE log SET food_id = ?, grams = ?, meal = ? WHERE id = ?'
    ).run(food_id, grams, meal, id);
    return { ok: true };
  });

  ipcMain.handle('log:delete', (_, { id }) => {
    const db = getDb();
    const row = db.prepare('SELECT date, food_id, grams, meal FROM log WHERE id = ?').get(id);
    if (row) pushUndo('log:delete', { date: row.date, food_id: row.food_id, grams: row.grams, meal: row.meal });
    db.prepare('DELETE FROM log WHERE id = ?').run(id);
    // Remove linked water entry if exists
    db.prepare('DELETE FROM water_log WHERE log_id = ?').run(id);
    return { ok: true };
  });

  ipcMain.handle('log:getWeeklySummaries', () =>
    getDb().prepare(`
      SELECT
        strftime('%Y-%W', date) AS week,
        MIN(date) AS week_start,
        COUNT(date) AS days_logged,
        ROUND(AVG(day_calories), 2) AS avg_calories,
        ROUND(AVG(day_protein),   2) AS avg_protein,
        ROUND(AVG(day_carbs),     2) AS avg_carbs,
        ROUND(AVG(day_fat),       2) AS avg_fat,
        ROUND(AVG(day_fiber),     2) AS avg_fiber
      FROM (
        SELECT l.date,
          SUM(f.calories * l.grams / 100) AS day_calories,
          SUM(f.protein  * l.grams / 100) AS day_protein,
          SUM(f.carbs    * l.grams / 100) AS day_carbs,
          SUM(f.fat      * l.grams / 100) AS day_fat,
          SUM(f.fiber    * l.grams / 100) AS day_fiber
        FROM log l JOIN foods f ON l.food_id = f.id
        GROUP BY l.date
      )
      GROUP BY week
      ORDER BY week DESC
    `).all()
  );

  ipcMain.handle('log:getWeekDetail', (_, { weekStart }) =>
    getDb().prepare(`
      SELECT
        l.date,
        ROUND(SUM(f.calories * l.grams / 100), 2) AS calories,
        ROUND(SUM(f.protein  * l.grams / 100), 2) AS protein,
        ROUND(SUM(f.carbs    * l.grams / 100), 2) AS carbs,
        ROUND(SUM(f.fat      * l.grams / 100), 2) AS fat,
        ROUND(SUM(f.fiber    * l.grams / 100), 2) AS fiber
      FROM log l
      JOIN foods f ON l.food_id = f.id
      WHERE l.date BETWEEN ? AND date(?, '+6 days')
      GROUP BY l.date
      ORDER BY l.date ASC
    `).all(weekStart, weekStart)
  );
}

module.exports = registerLogIpc;
