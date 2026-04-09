const { ipcMain } = require('electron');
const { getDb } = require('../db');

function registerFoodsIpc() {
  ipcMain.handle('foods:getAll', () =>
    getDb().prepare('SELECT * FROM foods ORDER BY name').all()
  );

  ipcMain.handle('foods:getFavorites', () =>
    getDb().prepare('SELECT * FROM foods WHERE favorite = 1 ORDER BY name').all()
  );

  ipcMain.handle('foods:add', (_, { name, calories, protein, carbs, fat, fiber, piece_grams, is_liquid }) => {
    const result = getDb().prepare(
      'INSERT INTO foods (name, calories, protein, carbs, fat, fiber, piece_grams, is_liquid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(name, calories, protein || 0, carbs || 0, fat || 0, fiber || 0, piece_grams || null, is_liquid ? 1 : 0);
    return { id: result.lastInsertRowid };
  });

  ipcMain.handle('foods:delete', (_, { id }) => {
    const db = getDb();
    db.prepare('DELETE FROM log WHERE food_id = ?').run(id);
    db.prepare('DELETE FROM recipe_ingredients WHERE food_id = ?').run(id);
    db.prepare('DELETE FROM foods WHERE id = ?').run(id);
    return { ok: true };
  });

  ipcMain.handle('foods:update', (_, { id, name, calories, protein, carbs, fat, fiber, piece_grams, is_liquid }) => {
    getDb().prepare(
      'UPDATE foods SET name=?, calories=?, protein=?, carbs=?, fat=?, fiber=?, piece_grams=?, is_liquid=? WHERE id=?'
    ).run(name, calories, protein || 0, carbs || 0, fat || 0, fiber || 0, piece_grams || null, is_liquid ? 1 : 0, id);
    return { ok: true };
  });

  ipcMain.handle('foods:getFrequent', (_, { limit }) => {
    return getDb().prepare(`
      SELECT f.*, COUNT(l.id) AS use_count
      FROM foods f
      JOIN log l ON l.food_id = f.id
      GROUP BY f.id
      ORDER BY use_count DESC
      LIMIT ?
    `).all(limit || 10);
  });

  ipcMain.handle('foods:toggleFavorite', (_, { id }) => {
    const db = getDb();
    db.prepare('UPDATE foods SET favorite = 1 - favorite WHERE id = ?').run(id);
    const food = db.prepare('SELECT favorite FROM foods WHERE id = ?').get(id);
    return { favorite: food.favorite };
  });
}

module.exports = registerFoodsIpc;
