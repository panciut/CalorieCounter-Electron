// Shared pantry FEFO helpers — used by pantry.ipc.js and log.ipc.js

// When remaining overflow after draining all open batches is at or below this
// threshold, we don't automatically open the next sealed batch — instead we
// surface a "residual or new pack?" prompt to the user.
// Formula: max(15g, 5% of the just-drained batch's starting_grams).
function residualLimit(lastBatchStarting) {
  return Math.max(15, (lastBatchStarting || 0) * 0.05);
}

function isPantryEnabled(db) {
  const row = db.prepare("SELECT value FROM settings WHERE key='pantry_enabled'").get();
  return row ? Number(row.value) === 1 : true;
}

function getDefaultPantryId(db) {
  const row = db.prepare('SELECT id FROM pantries WHERE is_default = 1').get();
  return row?.id ?? 1;
}

/**
 * Deduct `grams_needed` from the food's pantry batches using FEFO order,
 * scoped to a specific pantry location.
 *
 * Strategy:
 *   Pass 1 — drain already-open batches first (opened_at IS NOT NULL).
 *   After pass 1, if there is still a remainder AND sealed batches exist:
 *     - If remainder <= residualLimit → emit residual_or_new event and stop
 *       (caller must follow up via pantry:resolveResidual).
 *     - Otherwise → Pass 2: spill into sealed batches and mark them opened.
 *
 * Returns { requested, deducted, shortage, events }
 *   events: DeductionEvent[] — empty array when pantry is empty/no batches.
 */
function deductFoodFEFO(db, food_id, grams_needed, pantry_id) {
  const pid = pantry_id ?? getDefaultPantryId(db);
  const food = db.prepare(
    'SELECT name, opened_days, discard_threshold_pct FROM foods WHERE id = ?'
  ).get(food_id);
  const foodName = food ? food.name : String(food_id);
  const defaultDays = food ? (food.opened_days ?? null) : null;
  const thresholdPct = food ? (food.discard_threshold_pct ?? 5) : 5;

  // Load all batches in FEFO order (earliest expiry first, null last)
  const allBatches = db.prepare(`
    SELECT id, quantity_g, expiry_date, opened_at, opened_days, starting_grams
    FROM pantry
    WHERE food_id = ? AND pantry_id = ?
    ORDER BY
      CASE WHEN expiry_date IS NULL THEN '9999-99-99' ELSE expiry_date END ASC,
      id ASC
  `).all(food_id, pid);

  const openBatches   = allBatches.filter(b => b.opened_at !== null);
  const sealedBatches = allBatches.filter(b => b.opened_at === null);

  const events = [];
  let remaining = grams_needed;
  let lastDrainedStarting = null;

  // ── Pass 1: drain open batches ────────────────────────────────────────────
  for (const batch of openBatches) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantity_g, remaining);
    remaining -= take;
    const newQty = batch.quantity_g - take;
    const sg = batch.starting_grams || batch.quantity_g;

    if (newQty <= 0) {
      db.prepare('DELETE FROM pantry WHERE id = ?').run(batch.id);
      lastDrainedStarting = sg;
      events.push({ kind: 'finished', batch_id: batch.id, food_id, food_name: foodName, pantry_id: pid });
    } else {
      db.prepare("UPDATE pantry SET quantity_g = ?, updated_at = datetime('now') WHERE id = ?")
        .run(newQty, batch.id);
      if (newQty / sg <= thresholdPct / 100) {
        events.push({ kind: 'near_empty', batch_id: batch.id, food_id, food_name: foodName, remaining_g: newQty, starting_g: sg, pantry_id: pid });
      }
    }
  }

  if (remaining <= 0 || sealedBatches.length === 0) {
    return { requested: grams_needed, deducted: grams_needed - remaining, shortage: remaining, events };
  }

  // ── Residual check ────────────────────────────────────────────────────────
  const limit = residualLimit(lastDrainedStarting ?? (sealedBatches[0]?.starting_grams || sealedBatches[0]?.quantity_g));
  if (remaining <= limit) {
    events.push({
      kind: 'residual_or_new',
      food_id,
      food_name: foodName,
      overflow_g: remaining,
      next_batch_id: sealedBatches[0]?.id ?? null,
      pantry_id: pid,
    });
    return { requested: grams_needed, deducted: grams_needed, shortage: 0, events };
  }

  // ── Pass 2: spill into sealed batches ─────────────────────────────────────
  for (const batch of sealedBatches) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantity_g, remaining);
    remaining -= take;
    const newQty = batch.quantity_g - take;
    const sg = batch.starting_grams || batch.quantity_g;

    if (newQty <= 0) {
      db.prepare('DELETE FROM pantry WHERE id = ?').run(batch.id);
      lastDrainedStarting = sg;
      events.push({ kind: 'finished', batch_id: batch.id, food_id, food_name: foodName, pantry_id: pid });
    } else {
      db.prepare(`
        UPDATE pantry
        SET quantity_g = ?,
            opened_at = datetime('now'),
            expiry_date = CASE
              WHEN ? IS NULL THEN expiry_date
              WHEN expiry_date IS NULL THEN date('now', '+' || ? || ' days')
              ELSE MIN(expiry_date, date('now', '+' || ? || ' days'))
            END,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(newQty, defaultDays, defaultDays, defaultDays, batch.id);
      const afterRow = db.prepare('SELECT expiry_date FROM pantry WHERE id = ?').get(batch.id);
      console.log(`[FEFO pass2] batch ${batch.id}: qty ${batch.quantity_g}→${newQty}, expiry ${batch.expiry_date}→${afterRow?.expiry_date}, defaultDays=${defaultDays}`);
      events.push({ kind: 'opened', batch_id: batch.id, food_id, food_name: foodName, default_days: defaultDays, pantry_id: pid });
      if (newQty / sg <= thresholdPct / 100) {
        events.push({ kind: 'near_empty', batch_id: batch.id, food_id, food_name: foodName, remaining_g: newQty, starting_g: sg, pantry_id: pid });
      }
    }
  }

  return { requested: grams_needed, deducted: grams_needed - remaining, shortage: remaining, events };
}

/**
 * Check how much of food_id is in stock vs grams needed — does NOT mutate.
 * Returns { have_g, shortage }.
 */
function checkStock(db, food_id, grams, pantry_id) {
  const pid = pantry_id ?? getDefaultPantryId(db);
  const row = db.prepare('SELECT COALESCE(SUM(quantity_g), 0) AS total FROM pantry WHERE food_id = ? AND pantry_id = ?').get(food_id, pid);
  const have_g = row ? row.total : 0;
  const shortage = Math.max(0, grams - have_g);
  return { have_g, shortage };
}

/**
 * Perform a follow-up deduction into sealed batches only (used by pantry:resolveResidual).
 * Same event emission as pass 2 above.
 */
function deductSealedFEFO(db, food_id, grams_needed, pantry_id) {
  const pid = pantry_id ?? getDefaultPantryId(db);
  const food = db.prepare(
    'SELECT name, opened_days, discard_threshold_pct FROM foods WHERE id = ?'
  ).get(food_id);
  const foodName = food ? food.name : String(food_id);
  const defaultDays = food ? (food.opened_days ?? null) : null;
  const thresholdPct = food ? (food.discard_threshold_pct ?? 5) : 5;

  const sealedBatches = db.prepare(`
    SELECT id, quantity_g, expiry_date, starting_grams
    FROM pantry
    WHERE food_id = ? AND opened_at IS NULL AND pantry_id = ?
    ORDER BY
      CASE WHEN expiry_date IS NULL THEN '9999-99-99' ELSE expiry_date END ASC,
      id ASC
  `).all(food_id, pid);

  const events = [];
  let remaining = grams_needed;

  for (const batch of sealedBatches) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantity_g, remaining);
    remaining -= take;
    const newQty = batch.quantity_g - take;
    const sg = batch.starting_grams || batch.quantity_g;

    if (newQty <= 0) {
      db.prepare('DELETE FROM pantry WHERE id = ?').run(batch.id);
      events.push({ kind: 'finished', batch_id: batch.id, food_id, food_name: foodName, pantry_id: pid });
    } else {
      db.prepare(`
        UPDATE pantry
        SET quantity_g = ?,
            opened_at = datetime('now'),
            expiry_date = CASE
              WHEN ? IS NULL THEN expiry_date
              WHEN expiry_date IS NULL THEN date('now', '+' || ? || ' days')
              ELSE MIN(expiry_date, date('now', '+' || ? || ' days'))
            END,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(newQty, defaultDays, defaultDays, defaultDays, batch.id);
      events.push({ kind: 'opened', batch_id: batch.id, food_id, food_name: foodName, default_days: defaultDays, pantry_id: pid });
      if (newQty / sg <= thresholdPct / 100) {
        events.push({ kind: 'near_empty', batch_id: batch.id, food_id, food_name: foodName, remaining_g: newQty, starting_g: sg, pantry_id: pid });
      }
    }
  }

  return { requested: grams_needed, deducted: grams_needed - remaining, shortage: remaining, events };
}

module.exports = { isPantryEnabled, getDefaultPantryId, deductFoodFEFO, deductSealedFEFO, checkStock };
