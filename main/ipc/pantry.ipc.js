const { ipcMain } = require('electron');
const { getDb } = require('../db');

function registerPantryIpc() {
  ipcMain.handle('pantry:getAll', () =>
    getDb().prepare(`
      SELECT p.id, p.food_id, f.name as food_name, f.piece_grams, p.quantity_g, p.updated_at
      FROM pantry p JOIN foods f ON f.id = p.food_id
      ORDER BY f.name
    `).all()
  );

  // Add to pantry (accumulates on top of existing quantity)
  ipcMain.handle('pantry:upsert', (_, { food_id, quantity_g }) => {
    getDb().prepare(`
      INSERT INTO pantry (food_id, quantity_g, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(food_id) DO UPDATE SET quantity_g = quantity_g + ?, updated_at = datetime('now')
    `).run(food_id, quantity_g, quantity_g);
    return { ok: true };
  });

  // Set exact quantity
  ipcMain.handle('pantry:set', (_, { food_id, quantity_g }) => {
    getDb().prepare(`
      INSERT INTO pantry (food_id, quantity_g, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(food_id) DO UPDATE SET quantity_g = ?, updated_at = datetime('now')
    `).run(food_id, quantity_g, quantity_g);
    return { ok: true };
  });

  ipcMain.handle('pantry:delete', (_, { id }) => {
    getDb().prepare('DELETE FROM pantry WHERE id = ?').run(id);
    return { ok: true };
  });

  // Shopping list
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

  // Single recipe check: Returns { recipe_id, can_make, ingredients, missing }
  ipcMain.handle('pantry:canMake', (_, { recipe_id, recipe_type }) => {
    const db = getDb();
    const table = recipe_type === 'bundle' ? 'recipe_ingredients' : 'actual_recipe_ingredients';
    const ingredients = db.prepare(`
      SELECT ri.food_id, f.name as food_name, ri.grams as need_g,
             COALESCE(p.quantity_g, 0) as have_g
      FROM ${table} ri
      JOIN foods f ON f.id = ri.food_id
      LEFT JOIN pantry p ON p.food_id = ri.food_id
      WHERE ri.recipe_id = ?
    `).all(recipe_id);
    const missing = ingredients.filter(i => i.have_g < i.need_g);
    return { recipe_id, can_make: missing.length === 0, ingredients, missing };
  });

  // Bulk check for all recipes of a given type — returns { recipe_id, can_make, missing_count }[]
  ipcMain.handle('pantry:canMakeAll', (_, { recipe_type }) => {
    const db = getDb();
    const table = recipe_type === 'bundle' ? 'recipe_ingredients' : 'actual_recipe_ingredients';
    const recipeTable = recipe_type === 'bundle' ? 'recipes' : 'actual_recipes';
    const rows = db.prepare(`
      SELECT ri.recipe_id,
             SUM(CASE WHEN COALESCE(p.quantity_g, 0) < ri.grams THEN 1 ELSE 0 END) as missing_count
      FROM ${table} ri
      LEFT JOIN pantry p ON p.food_id = ri.food_id
      GROUP BY ri.recipe_id
    `).all();
    const map = {};
    for (const r of rows) map[r.recipe_id] = r.missing_count;
    // Also include recipes with 0 ingredients (they have no rows in ingredient table)
    const allIds = db.prepare(`SELECT id FROM ${recipeTable}`).all().map(r => r.id);
    return allIds.map(id => ({
      recipe_id: id,
      can_make: (map[id] ?? 0) === 0,
      missing_count: map[id] ?? 0,
    }));
  });

  // Deduct recipe ingredients from pantry (for actual_recipes only)
  // scale: multiplier (e.g. 0.5 means half recipe). Removes items that go to 0.
  ipcMain.handle('pantry:deductRecipe', (_, { recipe_id, scale = 1, recipe_type = 'actual' }) => {
    const db = getDb();
    const table = recipe_type === 'bundle' ? 'recipe_ingredients' : 'actual_recipe_ingredients';
    const ingredients = db.prepare(`SELECT food_id, grams FROM ${table} WHERE recipe_id = ?`).all(recipe_id);
    const deductOne = db.prepare(`
      UPDATE pantry SET quantity_g = MAX(0, quantity_g - ?), updated_at = datetime('now')
      WHERE food_id = ?
    `);
    const removeZero = db.prepare(`DELETE FROM pantry WHERE food_id = ? AND quantity_g <= 0`);
    const deductAll = db.transaction(() => {
      for (const ing of ingredients) {
        deductOne.run(ing.grams * scale, ing.food_id);
        removeZero.run(ing.food_id);
      }
    });
    deductAll();
    return { ok: true };
  });
}

module.exports = registerPantryIpc;
