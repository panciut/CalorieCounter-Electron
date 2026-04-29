const { ipcMain } = require('electron');
const { getDb } = require('../db');

function registerFoodsIpc() {
  function attachPackages(db, foods) {
    const packages = db.prepare('SELECT id, food_id, grams, price FROM food_packages ORDER BY food_id, grams ASC').all();
    const byFood = new Map();
    for (const p of packages) {
      if (!byFood.has(p.food_id)) byFood.set(p.food_id, []);
      byFood.get(p.food_id).push({ id: p.id, food_id: p.food_id, grams: p.grams, price: p.price ?? null });
    }
    for (const f of foods) f.packages = byFood.get(f.id) ?? [];
    return foods;
  }

  ipcMain.handle('foods:getAll', () => {
    const db = getDb();
    return attachPackages(db, db.prepare('SELECT * FROM foods WHERE is_placeholder = 0 ORDER BY name').all());
  });

  ipcMain.handle('foods:getFavorites', () => {
    const db = getDb();
    return attachPackages(db, db.prepare('SELECT * FROM foods WHERE favorite = 1 AND is_placeholder = 0 ORDER BY name').all());
  });

  ipcMain.handle('foods:add', (_, { name, calories, protein, carbs, fat, fiber, piece_grams, is_liquid, is_bulk, barcode, opened_days, discard_threshold_pct, price_per_100g, sugar, saturated_fat, sodium_mg }) => {
    const bulk = is_bulk ? 1 : 0;
    const piece = bulk ? null : (piece_grams || null);
    const result = getDb().prepare(
      'INSERT INTO foods (name, calories, protein, carbs, fat, fiber, piece_grams, is_liquid, is_bulk, barcode, opened_days, discard_threshold_pct, price_per_100g, sugar, saturated_fat, sodium_mg) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(name, calories, protein || 0, carbs || 0, fat || 0, fiber || 0, piece, is_liquid ? 1 : 0, bulk, barcode || null, opened_days ?? null, discard_threshold_pct ?? 5, price_per_100g ?? null, sugar ?? null, saturated_fat ?? null, sodium_mg ?? null);
    return { id: result.lastInsertRowid };
  });

  ipcMain.handle('foods:delete', (_, { id }) => {
    const db = getDb();
    db.prepare('DELETE FROM log WHERE food_id = ?').run(id);
    db.prepare('DELETE FROM recipe_ingredients WHERE food_id = ?').run(id);
    db.prepare('DELETE FROM foods WHERE id = ?').run(id);
    return { ok: true };
  });

  ipcMain.handle('foods:update', (_, { id, name, calories, protein, carbs, fat, fiber, piece_grams, is_liquid, is_bulk, barcode, opened_days, discard_threshold_pct, price_per_100g, sugar, saturated_fat, sodium_mg }) => {
    const bulk = is_bulk ? 1 : 0;
    const piece = bulk ? null : (piece_grams || null);
    getDb().prepare(
      'UPDATE foods SET name=?, calories=?, protein=?, carbs=?, fat=?, fiber=?, piece_grams=?, is_liquid=?, is_bulk=?, barcode=?, opened_days=?, discard_threshold_pct=?, price_per_100g=?, sugar=?, saturated_fat=?, sodium_mg=? WHERE id=?'
    ).run(name, calories, protein || 0, carbs || 0, fat || 0, fiber || 0, piece, is_liquid ? 1 : 0, bulk, barcode || null, opened_days ?? null, discard_threshold_pct ?? 5, price_per_100g ?? null, sugar ?? null, saturated_fat ?? null, sodium_mg ?? null, id);
    return { ok: true };
  });

  ipcMain.handle('foods:getFrequent', (_, { limit }) => {
    const db = getDb();
    const rows = db.prepare(`
      SELECT f.*, COUNT(l.id) AS use_count
      FROM foods f
      JOIN log l ON l.food_id = f.id
      WHERE f.is_placeholder = 0
      GROUP BY f.id
      ORDER BY use_count DESC
      LIMIT ?
    `).all(limit || 10);
    return attachPackages(db, rows);
  });

  ipcMain.handle('foods:toggleFavorite', (_, { id }) => {
    const db = getDb();
    db.prepare('UPDATE foods SET favorite = 1 - favorite WHERE id = ?').run(id);
    const food = db.prepare('SELECT favorite FROM foods WHERE id = ?').get(id);
    return { favorite: food.favorite };
  });

  ipcMain.handle('foods:addPackage', (_, { food_id, grams, price }) => {
    const result = getDb().prepare('INSERT INTO food_packages (food_id, grams, price) VALUES (?, ?, ?)').run(food_id, grams, price ?? null);
    return { id: result.lastInsertRowid };
  });

  ipcMain.handle('foods:updatePackage', (_, { id, grams, price }) => {
    const db = getDb();
    const count = db.prepare('SELECT COUNT(*) as n FROM pantry WHERE package_id = ?').get(id).n;
    if (count > 0) return { ok: false, error: 'pack_in_use', batch_count: count };
    db.prepare('UPDATE food_packages SET grams = ?, price = ? WHERE id = ?').run(grams, price ?? null, id);
    return { ok: true };
  });

  ipcMain.handle('foods:deletePackage', (_, { id }) => {
    const db = getDb();
    const count = db.prepare('SELECT COUNT(*) as n FROM pantry WHERE package_id = ?').get(id).n;
    if (count > 0) return { ok: false, error: 'pack_in_use', batch_count: count };
    db.prepare('DELETE FROM food_packages WHERE id = ?').run(id);
    return { ok: true };
  });
}

module.exports = registerFoodsIpc;
