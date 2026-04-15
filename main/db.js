const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

let db;

function getDbPath() {
  return path.join(app.getPath('userData'), 'calories.db');
}

function getDb() {
  if (!db) {
    db = new Database(getDbPath());
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

function initDb() {
  const database = getDb();

  database.exec(`
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

    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      duration_min REAL NOT NULL DEFAULT 0,
      calories_burned REAL NOT NULL DEFAULT 0,
      notes TEXT,
      source TEXT NOT NULL DEFAULT 'manual'
    );

    CREATE TABLE IF NOT EXISTS exercise_sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exercise_id INTEGER NOT NULL,
      set_number INTEGER NOT NULL,
      reps INTEGER,
      weight_kg REAL,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS exercise_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      met_value REAL NOT NULL DEFAULT 5.0,
      category TEXT NOT NULL DEFAULT 'other'
    );

    CREATE TABLE IF NOT EXISTS actual_recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      yield_g REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (date('now'))
    );

    CREATE TABLE IF NOT EXISTS actual_recipe_ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER NOT NULL,
      food_id INTEGER NOT NULL,
      grams REAL NOT NULL,
      FOREIGN KEY (recipe_id) REFERENCES actual_recipes(id) ON DELETE CASCADE,
      FOREIGN KEY (food_id) REFERENCES foods(id)
    );

    CREATE TABLE IF NOT EXISTS water_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      ml REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_notes (
      date TEXT PRIMARY KEY,
      note TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS supplements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      qty INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS supplement_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplement_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (supplement_id) REFERENCES supplements(id) ON DELETE CASCADE,
      UNIQUE(supplement_id, date)
    );

    CREATE TABLE IF NOT EXISTS meal_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS template_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL,
      food_id INTEGER NOT NULL,
      grams REAL NOT NULL,
      meal TEXT NOT NULL DEFAULT 'Snack',
      FOREIGN KEY (template_id) REFERENCES meal_templates(id) ON DELETE CASCADE,
      FOREIGN KEY (food_id) REFERENCES foods(id)
    );

    CREATE TABLE IF NOT EXISTS body_measurements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      waist REAL, chest REAL, arms REAL, thighs REAL, hips REAL, neck REAL
    );

    CREATE TABLE IF NOT EXISTS undo_stack (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      action TEXT NOT NULL,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pantry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      food_id INTEGER NOT NULL UNIQUE,
      quantity_g REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS shopping_list (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      food_id INTEGER NOT NULL,
      quantity_g REAL NOT NULL DEFAULT 0,
      checked INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS daily_energy (
      date TEXT PRIMARY KEY,
      resting_kcal REAL NOT NULL DEFAULT 0,
      active_kcal REAL NOT NULL DEFAULT 0,
      extra_kcal REAL NOT NULL DEFAULT 0
    );
  `);

  // Migrations: add columns that may not exist in imported databases
  const migrations = [
    "ALTER TABLE foods ADD COLUMN piece_grams REAL",
    "ALTER TABLE foods ADD COLUMN favorite INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE log ADD COLUMN meal TEXT NOT NULL DEFAULT 'Snack'",
    "ALTER TABLE foods ADD COLUMN fiber REAL NOT NULL DEFAULT 0",
    "ALTER TABLE foods ADD COLUMN is_liquid INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE water_log ADD COLUMN source TEXT",
    "ALTER TABLE water_log ADD COLUMN log_id INTEGER",
    "ALTER TABLE log ADD COLUMN status TEXT NOT NULL DEFAULT 'logged'",
    "ALTER TABLE weight_log ADD COLUMN fat_pct REAL",
    "ALTER TABLE weight_log ADD COLUMN muscle_mass REAL",
    "ALTER TABLE weight_log ADD COLUMN water_pct REAL",
    "ALTER TABLE weight_log ADD COLUMN bone_mass REAL",
    "ALTER TABLE supplements ADD COLUMN unit TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE supplements ADD COLUMN notes TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE supplements ADD COLUMN created_at TEXT NOT NULL DEFAULT '2000-01-01'",
    "ALTER TABLE foods ADD COLUMN barcode TEXT",
    "ALTER TABLE pantry ADD COLUMN package_id INTEGER",
    "ALTER TABLE foods ADD COLUMN opened_days INTEGER",
    "ALTER TABLE foods ADD COLUMN discard_threshold_pct REAL NOT NULL DEFAULT 10",
    "ALTER TABLE pantry ADD COLUMN opened_at TEXT",
    "ALTER TABLE pantry ADD COLUMN opened_days INTEGER",
    "ALTER TABLE pantry ADD COLUMN starting_grams REAL",
    "ALTER TABLE actual_recipes ADD COLUMN prep_time_min INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE actual_recipes ADD COLUMN cook_time_min INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE actual_recipes ADD COLUMN tools TEXT",
    "ALTER TABLE actual_recipes ADD COLUMN procedure TEXT",
    "ALTER TABLE foods ADD COLUMN price_per_100g REAL",
    "ALTER TABLE foods ADD COLUMN is_bulk INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE food_packages ADD COLUMN price REAL",
    `CREATE TABLE IF NOT EXISTS action_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      food_name TEXT,
      grams REAL,
      details TEXT,
      ts TEXT DEFAULT (datetime('now'))
    )`,
  ];
  for (const stmt of migrations) {
    try { database.exec(stmt); } catch (_) {}
  }

  // food_packages table (one-to-many with foods)
  try {
    database.exec(`
      CREATE TABLE IF NOT EXISTS food_packages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        food_id INTEGER NOT NULL,
        grams REAL NOT NULL,
        FOREIGN KEY(food_id) REFERENCES foods(id) ON DELETE CASCADE
      )
    `);
    database.exec(`CREATE INDEX IF NOT EXISTS idx_food_packages_food ON food_packages(food_id)`);
  } catch (_) {}

  // One-time migration: drop UNIQUE(food_id) on pantry, add expiry_date column
  try {
    const indexes = database.prepare("PRAGMA index_list('pantry')").all();
    const hasUniqueOnFoodId = indexes.some(idx => {
      if (!idx.unique) return false;
      const cols = database.prepare(`PRAGMA index_info('${idx.name}')`).all();
      return cols.length === 1 && cols[0].name === 'food_id';
    });
    if (hasUniqueOnFoodId) {
      database.transaction(() => {
        database.exec(`
          CREATE TABLE IF NOT EXISTS pantry_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            food_id INTEGER NOT NULL,
            quantity_g REAL NOT NULL,
            expiry_date TEXT,
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE CASCADE
          )
        `);
        database.exec(`
          INSERT INTO pantry_new (id, food_id, quantity_g, expiry_date, updated_at)
            SELECT id, food_id, quantity_g, NULL, updated_at FROM pantry
        `);
        database.exec('DROP TABLE pantry');
        database.exec('ALTER TABLE pantry_new RENAME TO pantry');
        database.exec('CREATE INDEX IF NOT EXISTS idx_pantry_food_expiry ON pantry(food_id, expiry_date)');
      })();
    }
  } catch (e) { console.error('pantry schema migration failed:', e); }

  // Backfill starting_grams for existing batches that predate the column
  try {
    database.exec("UPDATE pantry SET starting_grams = quantity_g WHERE starting_grams IS NULL");
  } catch (_) {}

  // One-time migration v1: convert Shape A foods (piece_grams with no matching
  // package) into proper food_packages rows, clearing piece_grams. Leaves
  // Shape B foods alone (piece_grams AND a larger package both set).
  try {
    const migrated = database.prepare("SELECT value FROM settings WHERE key = 'schema.piece_pack_migrated_v1'").get();
    if (!migrated) {
      const foods = database.prepare("SELECT id, name, piece_grams FROM foods WHERE piece_grams IS NOT NULL").all();
      const getPackages = database.prepare("SELECT id, grams FROM food_packages WHERE food_id = ?");
      const insertPackage = database.prepare("INSERT INTO food_packages (food_id, grams) VALUES (?, ?)");
      const clearPieceGrams = database.prepare("UPDATE foods SET piece_grams = NULL WHERE id = ?");
      database.transaction(() => {
        for (const f of foods) {
          const packs = getPackages.all(f.id);
          const hasLarger = packs.some(p => p.grams > f.piece_grams + 0.01);
          const hasMatching = packs.some(p => Math.abs(p.grams - f.piece_grams) < 0.01);
          if (hasLarger) continue; // Shape B: keep piece_grams
          if (packs.length === 0) {
            insertPackage.run(f.id, f.piece_grams);
            clearPieceGrams.run(f.id);
            console.log(`[migration v1] ${f.name}: piece_grams ${f.piece_grams}g → new package`);
          } else if (hasMatching) {
            clearPieceGrams.run(f.id);
            console.log(`[migration v1] ${f.name}: piece_grams cleared (duplicate of existing pack)`);
          }
        }
      })();
      database.prepare("INSERT INTO settings (key, value) VALUES ('schema.piece_pack_migrated_v1', '1')").run();
    }
  } catch (e) { console.error('piece_pack migration failed:', e); }

  // One-time migration v2: backfill pantry.package_id for rows that predate
  // current pack-aware add flow, and split multi-pack rows into one row per pack.
  // For a row with NULL package_id:
  //   - if quantity_g ≤ smallest pack whose grams ≥ quantity_g → link to that pack
  //   - else if quantity_g divides evenly into a pack → split into N rows of that pack
  //   - else: skip (ambiguous)
  // For a row with non-NULL package_id but quantity_g > pack.grams → split.
  try {
    const migrated = database.prepare("SELECT value FROM settings WHERE key = 'schema.pantry_package_backfill_v1'").get();
    if (!migrated) {
      const getRows = database.prepare(`
        SELECT id, food_id, quantity_g, package_id, expiry_date, opened_at, opened_days, starting_grams
        FROM pantry
      `);
      const getPackages = database.prepare("SELECT id, grams FROM food_packages WHERE food_id = ? ORDER BY grams");
      const updateRow = database.prepare("UPDATE pantry SET package_id = ?, quantity_g = ?, starting_grams = ? WHERE id = ?");
      const insertRow = database.prepare(`
        INSERT INTO pantry (food_id, quantity_g, expiry_date, package_id, opened_at, opened_days, starting_grams, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      const EPS = 0.02;

      database.transaction(() => {
        const rows = getRows.all();
        for (const r of rows) {
          const packs = getPackages.all(r.food_id);
          if (packs.length === 0) continue;

          const currentPack = r.package_id ? packs.find(p => p.id === r.package_id) : null;
          if (currentPack && r.quantity_g <= currentPack.grams * (1 + EPS)) continue;

          let refPack = currentPack;
          if (!refPack) {
            const fits = packs.find(p => r.quantity_g <= p.grams * (1 + EPS));
            if (fits) {
              refPack = fits;
            } else {
              const divisible = packs.filter(p => {
                const ratio = r.quantity_g / p.grams;
                return Math.abs(ratio - Math.round(ratio)) < EPS && Math.round(ratio) >= 1;
              });
              if (divisible.length === 0) continue;
              refPack = divisible[0];
            }
          }

          const n = Math.round(r.quantity_g / refPack.grams);
          if (n <= 0) continue;

          if (n === 1) {
            const newStarting = r.starting_grams != null ? r.starting_grams : refPack.grams;
            updateRow.run(refPack.id, r.quantity_g, newStarting, r.id);
            console.log(`[pantry backfill] row ${r.id}: linked to pack ${refPack.id} (${refPack.grams}g)`);
          } else {
            updateRow.run(refPack.id, refPack.grams, refPack.grams, r.id);
            for (let i = 1; i < n; i++) {
              insertRow.run(r.food_id, refPack.grams, r.expiry_date, refPack.id, r.opened_at, r.opened_days, refPack.grams);
            }
            console.log(`[pantry backfill] row ${r.id}: split into ${n} × ${refPack.grams}g (pack ${refPack.id})`);
          }
        }
      })();
      database.prepare("INSERT INTO settings (key, value) VALUES ('schema.pantry_package_backfill_v1', '1')").run();
    }
  } catch (e) { console.error('pantry package backfill failed:', e); }

  // Default settings
  const insertSetting = database.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
  );
  for (const [key, val] of [
    ['cal_goal', '2000'],
    ['protein_goal', '150'],
    ['carbs_goal', '250'],
    ['fat_goal', '70'],
    ['weight_goal', '0'],
    ['fiber_goal', '25'],
    ['water_goal', '2000'],
    ['language', 'en'],
    ['theme', 'dark'],
    ['pantry_enabled', '1'],
    ['pantry_warn_days', '3'],
    ['pantry_urgent_days', '1'],
    ['currency_symbol', '€'],
  ]) {
    insertSetting.run(key, val);
  }

  // Seed default exercise types
  const insertExType = database.prepare(
    'INSERT OR IGNORE INTO exercise_types (name, met_value, category) VALUES (?, ?, ?)'
  );
  for (const [name, met, cat] of [
    ['Running',        9.8, 'cardio'],
    ['Cycling',        7.5, 'cardio'],
    ['Swimming',       8.0, 'cardio'],
    ['Walking',        3.5, 'cardio'],
    ['HIIT',           8.0, 'cardio'],
    ['Weight Training',6.0, 'strength'],
    ['Calisthenics',   8.0, 'strength'],
    ['Yoga',           3.0, 'flexibility'],
    ['Stretching',     2.5, 'flexibility'],
    ['Other',          5.0, 'other'],
  ]) {
    insertExType.run(name, met, cat);
  }
}

module.exports = { getDb, getDbPath, closeDb, initDb };
