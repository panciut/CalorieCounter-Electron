/**
 * Seed script — run with: node seed_data.js
 * Populates the Electron app's database with foods, log history, weight, and recipes.
 */
const Database = require('better-sqlite3');
const path = require('path');
const os   = require('os');

// Resolve the same path Electron uses: ~/Library/Application Support/caloriecounter/
const userDataDir = path.join(os.homedir(), 'Library', 'Application Support', 'caloriecounter');
const dbPath = path.join(userDataDir, 'calories.db');

console.log('Database path:', dbPath);

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema (mirrors db.js) ───────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS foods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    calories REAL NOT NULL,
    protein REAL NOT NULL,
    carbs REAL NOT NULL,
    fat REAL NOT NULL
  );
  CREATE TABLE IF NOT EXISTS log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    food_id INTEGER NOT NULL,
    grams REAL NOT NULL,
    FOREIGN KEY (food_id) REFERENCES foods(id)
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS weight_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    weight REAL NOT NULL
  );
  CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT
  );
  CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    food_id INTEGER NOT NULL,
    grams REAL NOT NULL,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (food_id) REFERENCES foods(id)
  );
  CREATE TABLE IF NOT EXISTS water_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    ml REAL NOT NULL
  );
`);

for (const stmt of [
  "ALTER TABLE foods ADD COLUMN piece_grams REAL",
  "ALTER TABLE foods ADD COLUMN favorite INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE log ADD COLUMN meal TEXT NOT NULL DEFAULT 'Snack'",
]) { try { db.exec(stmt); } catch (_) {} }

// ── Foods ────────────────────────────────────────────────────────────────────
// [name, kcal/100g, protein, carbs, fat, piece_grams, favorite]
const FOODS = [
  ['Chicken Breast', 165, 31.0,  0.0,  3.6, null, 1],
  ['Brown Rice',     216,  4.5, 45.0,  1.6, null, 0],
  ['Egg',            155, 13.0,  1.1, 11.0, 50,   1],
  ['Banana',          89,  1.1, 23.0,  0.3, 120,  0],
  ['Greek Yogurt',    59, 10.0,  3.6,  0.4, null, 1],
  ['Oats',           389, 17.0, 66.0,  7.0, null, 0],
  ['Salmon',         208, 20.0,  0.0, 13.4, null, 0],
  ['Broccoli',        34,  2.8,  7.0,  0.4, null, 0],
  ['Olive Oil',      884,  0.0,  0.0,100.0, null, 0],
  ['Whole Milk',      61,  3.2,  4.8,  3.3, null, 0],
  ['Pasta',          371, 13.0, 74.0,  1.5, null, 0],
  ['Cheddar Cheese', 403, 25.0,  1.3, 33.0, null, 0],
  ['Apple',           52,  0.3, 14.0,  0.2, 180,  0],
  ['Almonds',        579, 21.0, 22.0, 50.0, null, 0],
  ['Sweet Potato',    86,  1.6, 20.0,  0.1, null, 0],
];

const insertFood = db.prepare(
  'INSERT OR IGNORE INTO foods (name, calories, protein, carbs, fat, piece_grams, favorite) VALUES (?,?,?,?,?,?,?)'
);
for (const f of FOODS) insertFood.run(...f);

// Build name → food map
const foodMap = {};
for (const row of db.prepare('SELECT id, name, piece_grams FROM foods').all()) {
  foodMap[row.name] = row;
}

// ── Settings ─────────────────────────────────────────────────────────────────
const insertSetting = db.prepare(
  'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
);
for (const [k, v] of [
  ['cal_goal', '2200'], ['protein_goal', '160'], ['carbs_goal', '260'],
  ['fat_goal', '75'], ['weight_goal', '78'], ['water_goal', '2500'],
]) { insertSetting.run(k, v); }

// ── Meal plans ───────────────────────────────────────────────────────────────
// Each plan: array of [food_name, grams_or_pieces, meal]
const MEAL_PLANS = [
  // Plan A — chicken & rice
  [
    ['Oats', 80, 'Breakfast'], ['Banana', 1, 'Breakfast'], ['Egg', 2, 'Breakfast'],
    ['Chicken Breast', 200, 'Lunch'], ['Brown Rice', 150, 'Lunch'], ['Broccoli', 100, 'Lunch'],
    ['Salmon', 150, 'Dinner'], ['Sweet Potato', 200, 'Dinner'], ['Olive Oil', 10, 'Dinner'],
  ],
  // Plan B — pasta
  [
    ['Egg', 3, 'Breakfast'], ['Whole Milk', 200, 'Breakfast'], ['Oats', 60, 'Breakfast'],
    ['Pasta', 180, 'Lunch'], ['Cheddar Cheese', 40, 'Lunch'], ['Olive Oil', 15, 'Lunch'],
    ['Chicken Breast', 150, 'Dinner'], ['Broccoli', 150, 'Dinner'],
    ['Apple', 1, 'Snack'],
  ],
  // Plan C — lighter
  [
    ['Greek Yogurt', 200, 'Breakfast'], ['Banana', 1, 'Breakfast'], ['Almonds', 30, 'Breakfast'],
    ['Salmon', 180, 'Lunch'], ['Brown Rice', 120, 'Lunch'], ['Broccoli', 120, 'Lunch'],
    ['Egg', 2, 'Dinner'], ['Whole Milk', 150, 'Dinner'],
    ['Apple', 1, 'Snack'],
  ],
  // Plan D — high protein
  [
    ['Egg', 4, 'Breakfast'], ['Oats', 80, 'Breakfast'], ['Whole Milk', 200, 'Breakfast'],
    ['Chicken Breast', 250, 'Lunch'], ['Sweet Potato', 180, 'Lunch'], ['Olive Oil', 10, 'Lunch'],
    ['Greek Yogurt', 150, 'Dinner'], ['Almonds', 25, 'Dinner'],
  ],
];

// ── Log entries Jan 1 – Feb 28 2026 ─────────────────────────────────────────
// Simple deterministic pseudo-random (avoid Math.random() for reproducibility)
let _seed = 42;
function rand() {
  _seed = (_seed * 1664525 + 1013904223) & 0x7fffffff;
  return _seed / 0x7fffffff;
}
function randBetween(lo, hi) { return lo + rand() * (hi - lo); }
function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }

const insertLog = db.prepare(
  'INSERT INTO log (date, food_id, grams, meal) VALUES (?, ?, ?, ?)'
);

// Clear any existing log data for this period before seeding
db.prepare("DELETE FROM log WHERE date BETWEEN '2026-01-01' AND '2026-02-28'").run();

const startDate = new Date('2026-01-01T00:00:00');
const endDate   = new Date('2026-02-28T00:00:00');
const logTx = db.transaction(() => {
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    if (rand() < 0.15) continue; // skip ~15% of days
    const isoDate = d.toISOString().slice(0, 10);
    const plan    = pick(MEAL_PLANS);
    for (const [foodName, rawAmount, meal] of plan) {
      const food = foodMap[foodName];
      if (!food) continue;
      // piece-based foods: rawAmount = number of pieces
      const grams = food.piece_grams && rawAmount <= 10
        ? Math.round(rawAmount * food.piece_grams * randBetween(0.9, 1.1) * 10) / 10
        : Math.round(rawAmount * randBetween(0.9, 1.1) * 10) / 10;
      insertLog.run(isoDate, food.id, grams, meal);
    }
  }
});
logTx();

// ── Weight log ───────────────────────────────────────────────────────────────
const insertWeight = db.prepare(
  'INSERT OR IGNORE INTO weight_log (date, weight) VALUES (?, ?)'
);
// Simulate weight loss from 85kg → ~82kg over Jan–Feb with noise
const weightTx = db.transaction(() => {
  let w = 85.0;
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 7)) {
    w = Math.round((w - 0.2 + randBetween(-0.3, 0.3)) * 10) / 10;
    insertWeight.run(d.toISOString().slice(0, 10), w);
  }
});
weightTx();

// ── Recipes ──────────────────────────────────────────────────────────────────
const RECIPES = [
  {
    name: 'Power Breakfast Bowl',
    description: 'Oats + banana + eggs for a filling start',
    ingredients: [
      ['Oats', 80], ['Banana', 120], ['Egg', 100], ['Whole Milk', 100],
    ],
  },
  {
    name: 'Chicken Rice Bowl',
    description: 'Classic lean bulk meal',
    ingredients: [
      ['Chicken Breast', 200], ['Brown Rice', 150], ['Broccoli', 100], ['Olive Oil', 10],
    ],
  },
  {
    name: 'Salmon & Sweet Potato',
    description: 'High omega-3 dinner',
    ingredients: [
      ['Salmon', 180], ['Sweet Potato', 200], ['Broccoli', 100], ['Olive Oil', 10],
    ],
  },
];

const insertRecipe = db.prepare('INSERT OR IGNORE INTO recipes (name, description) VALUES (?, ?)');
const insertIng    = db.prepare(
  'INSERT INTO recipe_ingredients (recipe_id, food_id, grams) VALUES (?, ?, ?)'
);

const recipesTx = db.transaction(() => {
  for (const r of RECIPES) {
    // Skip if recipe already exists
    const existing = db.prepare('SELECT id FROM recipes WHERE name = ?').get(r.name);
    if (existing) continue;
    const { lastInsertRowid } = insertRecipe.run(r.name, r.description);
    for (const [foodName, grams] of r.ingredients) {
      const food = foodMap[foodName];
      if (food) insertIng.run(lastInsertRowid, food.id, grams);
    }
  }
});
recipesTx();

// ── Done ─────────────────────────────────────────────────────────────────────
const foodCount   = db.prepare('SELECT COUNT(*) AS n FROM foods').get().n;
const logCount    = db.prepare('SELECT COUNT(*) AS n FROM log').get().n;
const weightCount = db.prepare('SELECT COUNT(*) AS n FROM weight_log').get().n;
const recipeCount = db.prepare('SELECT COUNT(*) AS n FROM recipes').get().n;

console.log(`✓ Seeded: ${foodCount} foods, ${logCount} log entries, ${weightCount} weight entries, ${recipeCount} recipes`);
db.close();
