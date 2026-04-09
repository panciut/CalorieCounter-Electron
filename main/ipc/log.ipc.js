const { ipcMain } = require('electron');
const { getDb } = require('../db');

const today = () => new Date().toISOString().slice(0, 10);

function registerLogIpc() {
  ipcMain.handle('log:getDay', (_, { date }) => {
    const d = date || today();
    return getDb().prepare(`
      SELECT l.id, l.food_id, l.meal, f.name, l.grams,
        ROUND(f.calories * l.grams / 100, 1) AS calories,
        ROUND(f.protein  * l.grams / 100, 1) AS protein,
        ROUND(f.carbs    * l.grams / 100, 1) AS carbs,
        ROUND(f.fat      * l.grams / 100, 1) AS fat
      FROM log l
      JOIN foods f ON l.food_id = f.id
      WHERE l.date = ?
      ORDER BY
        CASE l.meal
          WHEN 'Breakfast' THEN 1
          WHEN 'Lunch'     THEN 2
          WHEN 'Dinner'    THEN 3
          ELSE 4
        END, l.id
    `).all(d);
  });

  ipcMain.handle('log:add', (_, { food_id, grams, meal, date }) => {
    const result = getDb().prepare(
      'INSERT INTO log (date, food_id, grams, meal) VALUES (?, ?, ?, ?)'
    ).run(date || today(), food_id, grams, meal || 'Snack');
    return { id: result.lastInsertRowid };
  });

  ipcMain.handle('log:addQuick', (_, { food, grams, meal, date }) => {
    const db = getDb();
    const d = date || today();
    return db.transaction(() => {
      const foodResult = db.prepare(
        'INSERT INTO foods (name, calories, protein, carbs, fat, piece_grams) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(food.name, food.calories, food.protein || 0, food.carbs || 0, food.fat || 0, food.piece_grams || null);
      const logResult = db.prepare(
        'INSERT INTO log (date, food_id, grams, meal) VALUES (?, ?, ?, ?)'
      ).run(d, foodResult.lastInsertRowid, grams, meal || 'Snack');
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
    getDb().prepare('DELETE FROM log WHERE id = ?').run(id);
    return { ok: true };
  });

  ipcMain.handle('log:getWeeklySummaries', () =>
    getDb().prepare(`
      SELECT
        strftime('%Y-%W', date) AS week,
        MIN(date) AS week_start,
        COUNT(date) AS days_logged,
        ROUND(AVG(day_calories), 1) AS avg_calories,
        ROUND(AVG(day_protein),  1) AS avg_protein,
        ROUND(AVG(day_carbs),    1) AS avg_carbs,
        ROUND(AVG(day_fat),      1) AS avg_fat
      FROM (
        SELECT l.date,
          SUM(f.calories * l.grams / 100) AS day_calories,
          SUM(f.protein  * l.grams / 100) AS day_protein,
          SUM(f.carbs    * l.grams / 100) AS day_carbs,
          SUM(f.fat      * l.grams / 100) AS day_fat
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
        ROUND(SUM(f.calories * l.grams / 100), 1) AS calories,
        ROUND(SUM(f.protein  * l.grams / 100), 1) AS protein,
        ROUND(SUM(f.carbs    * l.grams / 100), 1) AS carbs,
        ROUND(SUM(f.fat      * l.grams / 100), 1) AS fat
      FROM log l
      JOIN foods f ON l.food_id = f.id
      WHERE l.date BETWEEN ? AND date(?, '+6 days')
      GROUP BY l.date
      ORDER BY l.date ASC
    `).all(weekStart, weekStart)
  );
}

module.exports = registerLogIpc;
