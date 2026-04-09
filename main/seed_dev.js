/**
 * Development seed — populates the last 3 weeks of data.
 * Runs once: guarded by the 'seeded_dev' settings key.
 * Remove that key (or delete the DB) to re-run.
 */
const { getDb } = require('./db');

// Deterministic pseudo-random (same sequence every run)
let _rng = 42;
const rand    = () => { _rng = (_rng * 1664525 + 1013904223) & 0x7fffffff; return _rng / 0x7fffffff; };
const jitter  = (v, pct = 0.12) => Math.round(v * (1 - pct + rand() * pct * 2) * 10) / 10;
const pick    = (arr) => arr[Math.floor(rand() * arr.length)];
const isoDate = (d) => d.toISOString().slice(0, 10);

// Meal plans: [foodName, grams, meal]
const MEAL_PLANS = [
  [
    ['Oats', 80, 'Breakfast'], ['Egg', 150, 'Breakfast'], ['Banana', 120, 'Breakfast'],
    ['Chicken Breast', 220, 'Lunch'], ['Brown Rice', 160, 'Lunch'], ['Broccoli', 100, 'Lunch'], ['Olive Oil', 12, 'Lunch'],
    ['Salmon', 170, 'Dinner'], ['Sweet Potato', 200, 'Dinner'],
    ['Greek Yogurt', 200, 'Snack'], ['Almonds', 25, 'Snack'],
  ],
  [
    ['Egg', 200, 'Breakfast'], ['Whole Milk', 200, 'Breakfast'], ['Oats', 60, 'Breakfast'],
    ['Pasta', 180, 'Lunch'], ['Cheddar Cheese', 40, 'Lunch'], ['Olive Oil', 15, 'Lunch'],
    ['Chicken Breast', 200, 'Dinner'], ['Broccoli', 150, 'Dinner'], ['Sweet Potato', 180, 'Dinner'],
    ['Apple', 180, 'Snack'], ['Almonds', 30, 'Snack'],
  ],
  [
    ['Greek Yogurt', 200, 'Breakfast'], ['Banana', 120, 'Breakfast'], ['Almonds', 30, 'Breakfast'],
    ['Salmon', 180, 'Lunch'], ['Brown Rice', 130, 'Lunch'], ['Broccoli', 120, 'Lunch'],
    ['Chicken Breast', 200, 'Dinner'], ['Sweet Potato', 200, 'Dinner'], ['Olive Oil', 10, 'Dinner'],
    ['Egg', 100, 'Snack'], ['Whole Milk', 150, 'Snack'],
  ],
  [
    ['Egg', 200, 'Breakfast'], ['Oats', 80, 'Breakfast'], ['Whole Milk', 200, 'Breakfast'],
    ['Chicken Breast', 250, 'Lunch'], ['Sweet Potato', 180, 'Lunch'], ['Olive Oil', 10, 'Lunch'],
    ['Salmon', 160, 'Dinner'], ['Brown Rice', 140, 'Dinner'], ['Broccoli', 100, 'Dinner'],
    ['Greek Yogurt', 150, 'Snack'],
  ],
];

// Today's partial log: breakfast + lunch only (realistic mid-day state)
const TODAY_ENTRIES = [
  ['Oats', 80, 'Breakfast'],
  ['Egg', 150, 'Breakfast'],
  ['Whole Milk', 200, 'Breakfast'],
  ['Chicken Breast', 220, 'Lunch'],
  ['Brown Rice', 160, 'Lunch'],
  ['Broccoli', 120, 'Lunch'],
  ['Olive Oil', 12, 'Lunch'],
];

function seedDev() {
  const db = getDb();

  // Guard: only run once
  const already = db.prepare("SELECT value FROM settings WHERE key = 'seeded_dev'").get();
  if (already) return;

  const foodRows = db.prepare('SELECT id, name FROM foods').all();
  if (!foodRows.length) {
    console.log('[seed_dev] No foods in DB — skipping seed (add foods first)');
    return;
  }
  const foodMap = Object.fromEntries(foodRows.map(f => [f.name, f.id]));

  const insertLog = db.prepare(
    'INSERT INTO log (date, food_id, grams, meal) VALUES (?, ?, ?, ?)'
  );
  const insertWater = db.prepare(
    'INSERT INTO water_log (date, ml) VALUES (?, ?)'
  );
  const insertWeight = db.prepare(
    'INSERT OR IGNORE INTO weight_log (date, weight) VALUES (?, ?)'
  );

  const today     = new Date();
  today.setHours(0, 0, 0, 0);

  db.transaction(() => {
    // ── 3 weeks of history (skip today, handled separately) ──────────────────
    for (let daysAgo = 21; daysAgo >= 1; daysAgo--) {
      const d = new Date(today);
      d.setDate(d.getDate() - daysAgo);
      const dateStr = isoDate(d);

      // Skip ~15% of days
      if (rand() < 0.15) continue;

      const plan = pick(MEAL_PLANS);
      for (const [name, grams, meal] of plan) {
        const foodId = foodMap[name];
        if (!foodId) continue;
        insertLog.run(dateStr, foodId, jitter(grams), meal);
      }

      // Water: 1400–2600 ml per day in 2-4 entries
      const totalWater = Math.round((1400 + rand() * 1200) / 100) * 100;
      const sips = [500, 500, 300, 200, 200].slice(0, Math.floor(rand() * 3) + 2);
      let poured = 0;
      for (let i = 0; i < sips.length - 1 && poured < totalWater; i++) {
        const ml = Math.min(sips[i], totalWater - poured);
        insertWater.run(dateStr, ml);
        poured += ml;
      }
      if (poured < totalWater) insertWater.run(dateStr, totalWater - poured);
    }

    // ── Weight: weekly entries over the 3 weeks (slight downward trend) ──────
    let w = 84.5;
    for (let weeksAgo = 3; weeksAgo >= 0; weeksAgo--) {
      const d = new Date(today);
      d.setDate(d.getDate() - weeksAgo * 7);
      w = Math.round((w - 0.3 + (rand() - 0.5) * 0.4) * 10) / 10;
      insertWeight.run(isoDate(d), w);
    }

    // ── Today: partial log (breakfast + lunch) ────────────────────────────────
    const todayStr = isoDate(today);
    for (const [name, grams, meal] of TODAY_ENTRIES) {
      const foodId = foodMap[name];
      if (!foodId) continue;
      insertLog.run(todayStr, foodId, jitter(grams, 0.05), meal);
    }
    // 900 ml water so far today
    insertWater.run(todayStr, 500);
    insertWater.run(todayStr, 400);

    // Mark as done
    db.prepare(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('seeded_dev', '1')"
    ).run();
  })();

  const logCount    = db.prepare("SELECT COUNT(*) AS n FROM log WHERE date >= date('now', '-22 days')").get().n;
  const weightCount = db.prepare('SELECT COUNT(*) AS n FROM weight_log').get().n;
  console.log(`[seed_dev] Seeded ${logCount} log entries and ${weightCount} weight entries`);
}

module.exports = { seedDev };
