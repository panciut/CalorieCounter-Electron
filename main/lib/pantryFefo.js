// Shared pantry FEFO helpers — used by pantry.ipc.js and log.ipc.js

function isPantryEnabled(db) {
  const row = db.prepare("SELECT value FROM settings WHERE key='pantry_enabled'").get();
  return row ? Number(row.value) === 1 : true;
}

/**
 * Deduct `grams_needed` from the food's pantry batches using FEFO order.
 * Batches with an expiry date are drained first (earliest expiry first);
 * null-expiry batches come last.
 * Returns { requested, deducted, shortage }.
 */
function deductFoodFEFO(db, food_id, grams_needed) {
  const batches = db.prepare(
    "SELECT id, quantity_g FROM pantry WHERE food_id = ? ORDER BY CASE WHEN expiry_date IS NULL THEN '9999-99-99' ELSE expiry_date END ASC, id ASC"
  ).all(food_id);

  let remaining = grams_needed;
  for (const batch of batches) {
    if (remaining <= 0) break;
    if (batch.quantity_g <= remaining) {
      db.prepare('DELETE FROM pantry WHERE id = ?').run(batch.id);
      remaining -= batch.quantity_g;
    } else {
      db.prepare("UPDATE pantry SET quantity_g = ?, updated_at = datetime('now') WHERE id = ?")
        .run(batch.quantity_g - remaining, batch.id);
      remaining = 0;
    }
  }
  return { requested: grams_needed, deducted: grams_needed - remaining, shortage: remaining };
}

/**
 * Check how much of food_id is in stock vs grams needed — does NOT mutate.
 * Returns { have_g, shortage }.
 */
function checkStock(db, food_id, grams) {
  const row = db.prepare('SELECT COALESCE(SUM(quantity_g), 0) AS total FROM pantry WHERE food_id = ?').get(food_id);
  const have_g = row ? row.total : 0;
  const shortage = Math.max(0, grams - have_g);
  return { have_g, shortage };
}

module.exports = { isPantryEnabled, deductFoodFEFO, checkStock };
