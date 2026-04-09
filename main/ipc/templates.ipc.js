const { ipcMain } = require('electron');
const { getDb } = require('../db');

const today = () => new Date().toISOString().slice(0, 10);

function registerTemplatesIpc() {
  ipcMain.handle('templates:getAll', () =>
    getDb().prepare(`
      SELECT mt.id, mt.name,
        COUNT(ti.id) AS item_count,
        ROUND(SUM(f.calories * ti.grams / 100), 1) AS total_calories
      FROM meal_templates mt
      LEFT JOIN template_items ti ON ti.template_id = mt.id
      LEFT JOIN foods f ON f.id = ti.food_id
      GROUP BY mt.id
      ORDER BY mt.name
    `).all()
  );

  ipcMain.handle('templates:get', (_, { id }) => {
    const db = getDb();
    const template = db.prepare('SELECT * FROM meal_templates WHERE id = ?').get(id);
    const items = db.prepare(`
      SELECT ti.id, ti.food_id, ti.grams, ti.meal,
        f.name,
        ROUND(f.calories * ti.grams / 100, 1) AS calories,
        ROUND(f.protein  * ti.grams / 100, 1) AS protein,
        ROUND(f.carbs    * ti.grams / 100, 1) AS carbs,
        ROUND(f.fat      * ti.grams / 100, 1) AS fat,
        ROUND(f.fiber    * ti.grams / 100, 1) AS fiber
      FROM template_items ti
      JOIN foods f ON f.id = ti.food_id
      WHERE ti.template_id = ?
    `).all(id);
    return { ...template, items };
  });

  ipcMain.handle('templates:create', (_, { name, items }) => {
    const db = getDb();
    return db.transaction(() => {
      const { lastInsertRowid } = db.prepare(
        'INSERT INTO meal_templates (name) VALUES (?)'
      ).run(name);
      const insertItem = db.prepare(
        'INSERT INTO template_items (template_id, food_id, grams, meal) VALUES (?, ?, ?, ?)'
      );
      for (const { food_id, grams, meal } of items) {
        insertItem.run(lastInsertRowid, food_id, grams, meal || 'Snack');
      }
      return { id: lastInsertRowid };
    })();
  });

  ipcMain.handle('templates:createFromDay', (_, { name, date }) => {
    const db = getDb();
    const d = date || today();
    return db.transaction(() => {
      const entries = db.prepare(
        'SELECT food_id, grams, meal FROM log WHERE date = ?'
      ).all(d);
      if (!entries.length) return { id: null, count: 0 };
      const { lastInsertRowid } = db.prepare(
        'INSERT INTO meal_templates (name) VALUES (?)'
      ).run(name);
      const insertItem = db.prepare(
        'INSERT INTO template_items (template_id, food_id, grams, meal) VALUES (?, ?, ?, ?)'
      );
      for (const { food_id, grams, meal } of entries) {
        insertItem.run(lastInsertRowid, food_id, grams, meal);
      }
      return { id: lastInsertRowid, count: entries.length };
    })();
  });

  ipcMain.handle('templates:delete', (_, { id }) => {
    getDb().prepare('DELETE FROM meal_templates WHERE id = ?').run(id);
    return { ok: true };
  });

  ipcMain.handle('templates:apply', (_, { id, date }) => {
    const db = getDb();
    const d = date || today();
    return db.transaction(() => {
      const items = db.prepare(
        'SELECT food_id, grams, meal FROM template_items WHERE template_id = ?'
      ).all(id);
      const insert = db.prepare(
        'INSERT INTO log (date, food_id, grams, meal) VALUES (?, ?, ?, ?)'
      );
      for (const { food_id, grams, meal } of items) {
        insert.run(d, food_id, grams, meal);
      }
      return { count: items.length };
    })();
  });
}

module.exports = registerTemplatesIpc;
