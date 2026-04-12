const { ipcMain } = require('electron');
const { getDb } = require('../db');
const { pushUndo } = require('./undo.ipc');

// Use local date to avoid UTC timezone bug
const today = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

function registerLogIpc() {
  ipcMain.handle('log:getDay', (_, { date }) => {
    const d = date || today();
    return getDb().prepare(`
      SELECT l.id, l.food_id, l.meal, l.status, f.name, l.grams,
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

  ipcMain.handle('log:getPlanned', (_, { date }) => {
    const d = date || today();
    return getDb().prepare(`
      SELECT l.id, l.food_id, l.meal, l.status, f.name, l.grams,
        ROUND(f.calories * l.grams / 100, 2) AS calories,
        ROUND(f.protein  * l.grams / 100, 2) AS protein,
        ROUND(f.carbs    * l.grams / 100, 2) AS carbs,
        ROUND(f.fat      * l.grams / 100, 2) AS fat,
        ROUND(f.fiber    * l.grams / 100, 2) AS fiber
      FROM log l
      JOIN foods f ON l.food_id = f.id
      WHERE l.date = ? AND l.status = 'planned'
      ORDER BY l.id
    `).all(d);
  });

  ipcMain.handle('log:confirmPlanned', (_, { id }) => {
    const db = getDb();
    return db.transaction(() => {
      const row = db.prepare(`
        SELECT l.id, l.date, l.grams, f.name AS food_name, f.is_liquid
        FROM log l JOIN foods f ON l.food_id = f.id
        WHERE l.id = ? AND l.status = 'planned'
      `).get(id);
      if (!row) return { ok: false };
      db.prepare("UPDATE log SET status = 'logged' WHERE id = ?").run(id);
      if (row.is_liquid) {
        // Auto-add water for liquid foods on confirm (grams ≈ ml), mirroring log:add
        const existing = db.prepare('SELECT id FROM water_log WHERE log_id = ?').get(id);
        if (!existing) {
          db.prepare('INSERT INTO water_log (date, ml, source, log_id) VALUES (?, ?, ?, ?)')
            .run(row.date, row.grams, row.food_name, id);
        }
      }
      return { ok: true };
    })();
  });

  ipcMain.handle('log:confirmAllPlanned', (_, { date }) => {
    const d = date || today();
    const db = getDb();
    return db.transaction(() => {
      const rows = db.prepare(`
        SELECT l.id, l.date, l.grams, f.name AS food_name, f.is_liquid
        FROM log l JOIN foods f ON l.food_id = f.id
        WHERE l.date = ? AND l.status = 'planned'
      `).all(d);
      db.prepare("UPDATE log SET status = 'logged' WHERE date = ? AND status = 'planned'").run(d);
      const insertWater = db.prepare('INSERT INTO water_log (date, ml, source, log_id) VALUES (?, ?, ?, ?)');
      const waterExists = db.prepare('SELECT id FROM water_log WHERE log_id = ?');
      for (const r of rows) {
        if (r.is_liquid && !waterExists.get(r.id)) {
          insertWater.run(r.date, r.grams, r.food_name, r.id);
        }
      }
      return { ok: true };
    })();
  });

  ipcMain.handle('log:add', (_, { food_id, grams, meal, date, status }) => {
    const db = getDb();
    const d = date || today();
    const s = status || 'logged';
    const result = db.prepare(
      'INSERT INTO log (date, food_id, grams, meal, status) VALUES (?, ?, ?, ?, ?)'
    ).run(d, food_id, grams, meal || 'Snack', s);
    if (s === 'logged') {
      pushUndo('log:add', { id: result.lastInsertRowid });
      // Auto-add water for liquid foods (grams ≈ ml)
      const food = db.prepare('SELECT name, is_liquid FROM foods WHERE id = ?').get(food_id);
      if (food && food.is_liquid) {
        db.prepare('INSERT INTO water_log (date, ml, source, log_id) VALUES (?, ?, ?, ?)').run(d, grams, food.name, result.lastInsertRowid);
      }
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
        "INSERT INTO log (date, food_id, grams, meal, status) VALUES (?, ?, ?, ?, 'logged')"
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
    db.prepare('DELETE FROM water_log WHERE log_id = ?').run(id);
    return { ok: true };
  });

  // Weekly summaries only count logged (not planned) entries
  ipcMain.handle('log:getWeeklySummaries', () =>
    getDb().prepare(`
      SELECT
        strftime('%Y-%W', date) AS week,
        MIN(date) AS week_start,
        COUNT(DISTINCT date) AS days_logged,
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
        WHERE l.status = 'logged'
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
        AND l.status = 'logged'
      GROUP BY l.date
      ORDER BY l.date ASC
    `).all(weekStart, weekStart)
  );
}

module.exports = registerLogIpc;
