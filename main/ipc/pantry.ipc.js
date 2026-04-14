const { ipcMain } = require('electron');
const { getDb } = require('../db');
const { isPantryEnabled, deductFoodFEFO, checkStock } = require('../lib/pantryFefo');

function registerPantryIpc() {
  // Return all batches (one row per batch), sorted: earliest expiry first, null expiry last, then food name.
  // Client aggregates into PantryAggregate.
  ipcMain.handle('pantry:getAll', () =>
    getDb().prepare(`
      SELECT p.id, p.food_id, f.name AS food_name, f.piece_grams,
             p.quantity_g, p.expiry_date, p.updated_at,
             p.package_id, fp.grams AS package_grams
      FROM pantry p
      JOIN foods f ON f.id = p.food_id
      LEFT JOIN food_packages fp ON fp.id = p.package_id
      ORDER BY CASE WHEN p.expiry_date IS NULL THEN '9999-99-99' ELSE p.expiry_date END ASC, f.name ASC
    `).all()
  );

  // Add a new batch (no UNIQUE conflict — always inserts)
  ipcMain.handle('pantry:addBatch', (_, { food_id, quantity_g, expiry_date, package_id }) => {
    getDb().prepare(`
      INSERT INTO pantry (food_id, quantity_g, expiry_date, package_id, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(food_id, quantity_g, expiry_date || null, package_id ?? null);
    return { ok: true };
  });

  // Set exact quantity + expiry + package for a specific batch (by batch id)
  ipcMain.handle('pantry:set', (_, { id, quantity_g, expiry_date, package_id }) => {
    getDb().prepare(`
      UPDATE pantry SET quantity_g = ?, expiry_date = ?, package_id = ?, updated_at = datetime('now') WHERE id = ?
    `).run(quantity_g, expiry_date || null, package_id ?? null, id);
    return { ok: true };
  });

  // Delete a single batch (used for both "remove" and "discard")
  ipcMain.handle('pantry:delete', (_, { id }) => {
    getDb().prepare('DELETE FROM pantry WHERE id = ?').run(id);
    return { ok: true };
  });

  // Check stock for a food without mutating (for plan-time shortage warning)
  ipcMain.handle('pantry:checkStock', (_, { food_id, grams }) => {
    const db = getDb();
    if (!isPantryEnabled(db)) return { have_g: 0, shortage: 0 };
    return checkStock(db, food_id, grams);
  });

  // Shopping list (unchanged)
  ipcMain.handle('shopping:getAll', () =>
    getDb().prepare(`
      SELECT s.id, s.food_id, f.name as food_name, s.quantity_g, s.checked
      FROM shopping_list s JOIN foods f ON f.id = s.food_id
      ORDER BY s.checked, f.name
    `).all()
  );

  ipcMain.handle('shopping:add', (_, { food_id, quantity_g }) => {
    const { lastInsertRowid } = getDb().prepare(
      'INSERT INTO shopping_list (food_id, quantity_g) VALUES (?, ?)'
    ).run(food_id, quantity_g || 0);
    return { id: lastInsertRowid };
  });

  ipcMain.handle('shopping:toggle', (_, { id }) => {
    getDb().prepare('UPDATE shopping_list SET checked = CASE WHEN checked = 0 THEN 1 ELSE 0 END WHERE id = ?').run(id);
    return { ok: true };
  });

  ipcMain.handle('shopping:delete', (_, { id }) => {
    getDb().prepare('DELETE FROM shopping_list WHERE id = ?').run(id);
    return { ok: true };
  });

  ipcMain.handle('shopping:clearChecked', () => {
    getDb().prepare('DELETE FROM shopping_list WHERE checked = 1').run();
    return { ok: true };
  });

  // canMake: sum batches per food_id before comparing to recipe requirement
  ipcMain.handle('pantry:canMake', (_, { recipe_id, recipe_type }) => {
    const db = getDb();
    const table = recipe_type === 'bundle' ? 'recipe_ingredients' : 'actual_recipe_ingredients';
    const ingredients = db.prepare(`
      SELECT ri.food_id, f.name as food_name, ri.grams as need_g,
             COALESCE((SELECT SUM(p.quantity_g) FROM pantry p WHERE p.food_id = ri.food_id), 0) as have_g
      FROM ${table} ri
      JOIN foods f ON f.id = ri.food_id
      WHERE ri.recipe_id = ?
    `).all(recipe_id);
    const missing = ingredients.filter(i => i.have_g < i.need_g);
    return { recipe_id, can_make: missing.length === 0, ingredients, missing };
  });

  // canMakeAll: bulk check
  ipcMain.handle('pantry:canMakeAll', (_, { recipe_type }) => {
    const db = getDb();
    const table = recipe_type === 'bundle' ? 'recipe_ingredients' : 'actual_recipe_ingredients';
    const recipeTable = recipe_type === 'bundle' ? 'recipes' : 'actual_recipes';
    const rows = db.prepare(`
      SELECT ri.recipe_id,
             SUM(CASE WHEN COALESCE((SELECT SUM(p.quantity_g) FROM pantry p WHERE p.food_id = ri.food_id), 0) < ri.grams THEN 1 ELSE 0 END) as missing_count
      FROM ${table} ri
      GROUP BY ri.recipe_id
    `).all();
    const map = {};
    for (const r of rows) map[r.recipe_id] = r.missing_count;
    const allIds = db.prepare(`SELECT id FROM ${recipeTable}`).all().map(r => r.id);
    return allIds.map(id => ({
      recipe_id: id,
      can_make: (map[id] ?? 0) === 0,
      missing_count: map[id] ?? 0,
    }));
  });

  // Deduct recipe ingredients using FEFO. Returns shortages per ingredient.
  ipcMain.handle('pantry:deductRecipe', (_, { recipe_id, scale = 1, recipe_type = 'actual' }) => {
    const db = getDb();
    if (!isPantryEnabled(db)) return { ok: true, shortages: [] };
    const table = recipe_type === 'bundle' ? 'recipe_ingredients' : 'actual_recipe_ingredients';
    const ingredients = db.prepare(`
      SELECT ri.food_id, f.name as food_name, ri.grams FROM ${table} ri
      JOIN foods f ON f.id = ri.food_id
      WHERE ri.recipe_id = ?
    `).all(recipe_id);

    const shortages = [];
    db.transaction(() => {
      for (const ing of ingredients) {
        const result = deductFoodFEFO(db, ing.food_id, ing.grams * scale);
        if (result.shortage > 0) {
          shortages.push({ food_name: ing.food_name, shortage: Math.round(result.shortage * 10) / 10 });
        }
      }
    })();
    return { ok: true, shortages };
  });
}

module.exports = registerPantryIpc;
