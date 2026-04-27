const { ipcMain } = require('electron');
const { getDb } = require('../db');
const { isPantryEnabled, getDefaultPantryId, deductFoodFEFO, deductSealedFEFO, checkStock } = require('../lib/pantryFefo');
const { logAction } = require('../lib/actionLog');

function registerPantryIpc() {

  // ── Pantry location CRUD ─────────────────────────────────────────────────────

  ipcMain.handle('pantries:getAll', () =>
    getDb().prepare('SELECT * FROM pantries ORDER BY is_default DESC, name').all()
  );

  ipcMain.handle('pantries:create', (_, { name }) => {
    const db = getDb();
    const count = db.prepare('SELECT COUNT(*) AS n FROM pantries').get().n;
    const isDefault = count === 0 ? 1 : 0;
    const result = db.prepare('INSERT INTO pantries (name, is_default) VALUES (?, ?)').run(name, isDefault);
    return { id: result.lastInsertRowid };
  });

  ipcMain.handle('pantries:rename', (_, { id, name }) => {
    getDb().prepare('UPDATE pantries SET name = ? WHERE id = ?').run(name, id);
    return { ok: true };
  });

  ipcMain.handle('pantries:delete', (_, { id }) => {
    const db = getDb();
    const pantry = db.prepare('SELECT is_default FROM pantries WHERE id = ?').get(id);
    if (!pantry) return { ok: false, reason: 'not_found' };
    if (pantry.is_default) return { ok: false, reason: 'is_default' };
    db.transaction(() => {
      db.prepare('DELETE FROM pantry WHERE pantry_id = ?').run(id);
      db.prepare('DELETE FROM shopping_list WHERE pantry_id = ?').run(id);
      db.prepare('DELETE FROM pantries WHERE id = ?').run(id);
    })();
    return { ok: true };
  });

  ipcMain.handle('pantries:setDefault', (_, { id }) => {
    const db = getDb();
    db.transaction(() => {
      db.prepare('UPDATE pantries SET is_default = 0').run();
      db.prepare('UPDATE pantries SET is_default = 1 WHERE id = ?').run(id);
    })();
    return { ok: true };
  });

  // ── Pantry batches ──────────────────────────────────────────────────────────

  ipcMain.handle('pantry:getAll', (_, { pantry_id } = {}) => {
    const db = getDb();
    const pid = pantry_id ?? getDefaultPantryId(db);
    return db.prepare(`
      SELECT p.id, p.food_id, f.name AS food_name, f.piece_grams,
             p.quantity_g, p.expiry_date, p.updated_at,
             p.package_id, fp.grams AS package_grams,
             p.opened_at, p.opened_days, p.starting_grams, p.pantry_id
      FROM pantry p
      JOIN foods f ON f.id = p.food_id
      LEFT JOIN food_packages fp ON fp.id = p.package_id
      WHERE p.pantry_id = ?
      ORDER BY CASE WHEN p.expiry_date IS NULL THEN '9999-99-99' ELSE p.expiry_date END ASC, f.name ASC
    `).all(pid);
  });

  ipcMain.handle('pantry:addBatch', (_, { food_id, quantity_g, expiry_date, package_id, pantry_id }) => {
    const db = getDb();
    const pid = pantry_id ?? getDefaultPantryId(db);
    // A batch with no package selected is loose/already open.
    // A batch with a package but less than the full pack size is also already open.
    const pkgGrams = package_id
      ? db.prepare('SELECT grams FROM food_packages WHERE id = ?').get(package_id)?.grams ?? null
      : null;
    const isOpen = package_id === null || package_id === undefined || (pkgGrams !== null && quantity_g < pkgGrams);
    db.prepare(`
      INSERT INTO pantry (food_id, quantity_g, expiry_date, package_id, starting_grams, opened_at, pantry_id, updated_at)
      VALUES (?, ?, ?, ?, ?, ${isOpen ? "datetime('now')" : 'NULL'}, ?, datetime('now'))
    `).run(food_id, quantity_g, expiry_date || null, package_id ?? null, quantity_g, pid);
    const food = db.prepare('SELECT name FROM foods WHERE id = ?').get(food_id);
    logAction(db, 'pantry:add', { food_name: food?.name, grams: quantity_g, details: { expiry_date: expiry_date || null } });
    return { ok: true };
  });

  ipcMain.handle('pantry:set', (_, { id, quantity_g, expiry_date, package_id }) => {
    getDb().prepare(`
      UPDATE pantry SET quantity_g = ?, expiry_date = ?, package_id = ?, updated_at = datetime('now') WHERE id = ?
    `).run(quantity_g, expiry_date || null, package_id ?? null, id);
    return { ok: true };
  });

  ipcMain.handle('pantry:delete', (_, { id }) => {
    const db = getDb();
    const row = db.prepare('SELECT p.quantity_g, f.name AS food_name FROM pantry p JOIN foods f ON f.id = p.food_id WHERE p.id = ?').get(id);
    db.prepare('DELETE FROM pantry WHERE id = ?').run(id);
    if (row) logAction(db, 'pantry:discard', { food_name: row.food_name, grams: row.quantity_g });
    return { ok: true };
  });

  ipcMain.handle('pantry:checkStock', (_, { food_id, grams, pantry_id }) => {
    const db = getDb();
    if (!isPantryEnabled(db)) return { have_g: 0, shortage: 0 };
    return checkStock(db, food_id, grams, pantry_id);
  });

  // Returns per-food pantry stock with pack breakdown for the given pantry.
  // Shape: { [food_id]: { total_g, loose_g, packs: [{ grams, count }] } }
  ipcMain.handle('pantry:getStockMap', (_, { pantry_id } = {}) => {
    const db = getDb();
    if (!isPantryEnabled(db)) return {};
    const pid = pantry_id ?? getDefaultPantryId(db);
    const rows = db.prepare(`
      SELECT p.food_id, p.quantity_g, p.package_id, p.opened_at, fp.grams AS package_grams
      FROM pantry p
      LEFT JOIN food_packages fp ON fp.id = p.package_id
      WHERE p.pantry_id = ? AND p.quantity_g > 0
    `).all(pid);

    const byFood = {};
    for (const r of rows) {
      const f = byFood[r.food_id] ?? (byFood[r.food_id] = { total_g: 0, loose_g: 0, _packs: new Map() });
      f.total_g += r.quantity_g;
      const isSealed = r.package_id && r.package_grams && r.package_grams > 0 && !r.opened_at;
      if (isSealed) {
        // Sealed batches: count whole packs (and any awkward leftover as loose, just in case).
        const whole = Math.floor(r.quantity_g / r.package_grams + 1e-6);
        const remainder = r.quantity_g - whole * r.package_grams;
        if (whole > 0) {
          f._packs.set(r.package_grams, (f._packs.get(r.package_grams) ?? 0) + whole);
        }
        if (remainder > 0.5) f.loose_g += remainder;
      } else {
        // Opened (or unpackaged) → leftover grams.
        f.loose_g += r.quantity_g;
      }
    }
    const out = {};
    for (const [fid, f] of Object.entries(byFood)) {
      out[fid] = {
        total_g: Math.round(f.total_g * 10) / 10,
        loose_g: Math.round(f.loose_g * 10) / 10,
        packs: [...f._packs.entries()]
          .map(([grams, count]) => ({ grams, count: Math.round(count * 10) / 10 }))
          .sort((a, b) => a.grams - b.grams),
      };
    }
    return out;
  });

  // ── Shopping list ────────────────────────────────────────────────────────────

  ipcMain.handle('shopping:getAll', (_, { pantry_id } = {}) => {
    const db = getDb();
    const pid = pantry_id ?? getDefaultPantryId(db);
    return db.prepare(`
      SELECT s.id, s.food_id, f.name as food_name, s.quantity_g, s.checked, s.pantry_id
      FROM shopping_list s JOIN foods f ON f.id = s.food_id
      WHERE s.pantry_id = ?
      ORDER BY s.checked, f.name
    `).all(pid);
  });

  ipcMain.handle('shopping:add', (_, { food_id, quantity_g, pantry_id }) => {
    const db = getDb();
    const pid = pantry_id ?? getDefaultPantryId(db);
    const { lastInsertRowid } = db.prepare(
      'INSERT INTO shopping_list (food_id, quantity_g, pantry_id) VALUES (?, ?, ?)'
    ).run(food_id, quantity_g || 0, pid);
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

  ipcMain.handle('shopping:clearChecked', (_, { pantry_id } = {}) => {
    const db = getDb();
    const pid = pantry_id ?? getDefaultPantryId(db);
    db.prepare('DELETE FROM shopping_list WHERE checked = 1 AND pantry_id = ?').run(pid);
    return { ok: true };
  });

  // ── canMake / canMakeAll ─────────────────────────────────────────────────────

  ipcMain.handle('pantry:canMake', (_, { recipe_id, recipe_type, pantry_id }) => {
    const db = getDb();
    const pid = pantry_id ?? getDefaultPantryId(db);
    const table = recipe_type === 'bundle' ? 'recipe_ingredients' : 'actual_recipe_ingredients';
    const ingredients = db.prepare(`
      SELECT ri.food_id, f.name as food_name, ri.grams as need_g,
             COALESCE((SELECT SUM(p.quantity_g) FROM pantry p WHERE p.food_id = ri.food_id AND p.pantry_id = ?), 0) as have_g
      FROM ${table} ri
      JOIN foods f ON f.id = ri.food_id
      WHERE ri.recipe_id = ?
    `).all(pid, recipe_id);
    const missing = ingredients.filter(i => i.have_g < i.need_g);
    return { recipe_id, can_make: missing.length === 0, ingredients, missing };
  });

  ipcMain.handle('pantry:canMakeAll', (_, { recipe_type, pantry_id }) => {
    const db = getDb();
    const pid = pantry_id ?? getDefaultPantryId(db);
    const table = recipe_type === 'bundle' ? 'recipe_ingredients' : 'actual_recipe_ingredients';
    const recipeTable = recipe_type === 'bundle' ? 'recipes' : 'actual_recipes';
    const rows = db.prepare(`
      SELECT ri.recipe_id,
             SUM(CASE WHEN COALESCE((SELECT SUM(p.quantity_g) FROM pantry p WHERE p.food_id = ri.food_id AND p.pantry_id = ?), 0) < ri.grams THEN 1 ELSE 0 END) as missing_count
      FROM ${table} ri
      GROUP BY ri.recipe_id
    `).all(pid);
    const map = {};
    for (const r of rows) map[r.recipe_id] = r.missing_count;
    const allIds = db.prepare(`SELECT id FROM ${recipeTable}`).all().map(r => r.id);
    return allIds.map(id => ({
      recipe_id: id,
      can_make: (map[id] ?? 0) === 0,
      missing_count: map[id] ?? 0,
    }));
  });

  // ── Recipe deduction ─────────────────────────────────────────────────────────

  ipcMain.handle('pantry:deductRecipe', (_, { recipe_id, scale = 1, recipe_type = 'actual', pantry_id }) => {
    const db = getDb();
    if (!isPantryEnabled(db)) return { ok: true, shortages: [] };
    const pid = pantry_id ?? getDefaultPantryId(db);
    const table = recipe_type === 'bundle' ? 'recipe_ingredients' : 'actual_recipe_ingredients';
    const ingredients = db.prepare(`
      SELECT ri.food_id, f.name as food_name, ri.grams FROM ${table} ri
      JOIN foods f ON f.id = ri.food_id
      WHERE ri.recipe_id = ?
    `).all(recipe_id);

    const shortages = [];
    const allEvents = [];
    db.transaction(() => {
      for (const ing of ingredients) {
        const result = deductFoodFEFO(db, ing.food_id, ing.grams * scale, pid);
        if (result.shortage > 0) {
          shortages.push({ food_name: ing.food_name, shortage: Math.round(result.shortage * 10) / 10 });
        }
        allEvents.push(...result.events);
      }
    })();
    return { ok: true, shortages, events: allEvents };
  });

  // ── Batch management ─────────────────────────────────────────────────────────

  ipcMain.handle('pantry:setOpenedDays', (_, { batch_id, days }) => {
    getDb().prepare(`
      UPDATE pantry
      SET opened_days = ?,
          expiry_date = CASE
            WHEN opened_at IS NULL THEN expiry_date
            WHEN expiry_date IS NULL THEN date(opened_at, '+' || ? || ' days')
            ELSE MIN(expiry_date, date(opened_at, '+' || ? || ' days'))
          END,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(days, days, days, batch_id);
    return { ok: true };
  });

  ipcMain.handle('pantry:resolveResidual', (_, { food_id, overflow_g, mode, pantry_id }) => {
    if (mode === 'residual') return { ok: true, events: [] };
    const db = getDb();
    let events = [];
    db.transaction(() => {
      const result = deductSealedFEFO(db, food_id, overflow_g, pantry_id);
      events = result.events;
    })();
    return { ok: true, events };
  });

  // ── Action log ───────────────────────────────────────────────────────────────

  ipcMain.handle('actionlog:getRecent', (_, { limit = 200 } = {}) =>
    getDb().prepare(`
      SELECT id, kind, food_name, grams, details, ts
      FROM action_log
      ORDER BY id DESC
      LIMIT ?
    `).all(limit)
  );
}

module.exports = registerPantryIpc;
