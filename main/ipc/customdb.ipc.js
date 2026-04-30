const { ipcMain, dialog } = require('electron');
const { getDb } = require('../db');
const Database = require('better-sqlite3');

const BARCODE_COLS = ['barcode', 'ean', 'code', 'upc', 'gtin', 'barcode_ean', 'codice'];
const NAME_COLS    = ['name', 'product_name', 'nome', 'description', 'descrizione', 'alimento'];
const CAL_COLS     = ['calories', 'energy_kcal', 'kcal', 'energy', 'calorie', 'energia_kcal', 'calorie_100g'];
const PROT_COLS    = ['protein', 'proteins', 'proteine', 'protein_100g', 'proteine_100g'];
const CARB_COLS    = ['carbs', 'carbohydrates', 'carboidrati', 'carbohydrates_100g', 'carboidrati_100g'];
const FAT_COLS     = ['fat', 'fats', 'grassi', 'lipids', 'fat_100g', 'grassi_100g', 'lipidi_100g'];
const FIBER_COLS   = ['fiber', 'fibre', 'fibra', 'dietary_fiber', 'fiber_100g', 'fibra_100g'];

let _db = null;
let _dbPath = null;
let _map = null;

function openDb(filePath) {
  try {
    return new Database(filePath, { readonly: true, fileMustExist: true });
  } catch {
    return null;
  }
}

function detectColumns(db) {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
  let best = null, bestScore = 0;
  for (const table of tables) {
    try {
      const cols = db.prepare(`PRAGMA table_info("${table}")`).all().map(r => r.name.toLowerCase());
      const find = (candidates) => candidates.find(c => cols.includes(c)) || null;
      const barcode = find(BARCODE_COLS);
      const name    = find(NAME_COLS);
      const cal     = find(CAL_COLS);
      const prot    = find(PROT_COLS);
      const carb    = find(CARB_COLS);
      const fat     = find(FAT_COLS);
      const fiber   = find(FIBER_COLS);
      const score   = [barcode, name, cal, prot, carb, fat].filter(Boolean).length;
      if (score > bestScore) {
        bestScore = score;
        best = { table, barcode, name, cal, prot, carb, fat, fiber };
      }
    } catch {}
  }
  return best && bestScore >= 2 ? best : null;
}

function getOrLoadDb() {
  const storedPath = getDb().prepare("SELECT value FROM settings WHERE key='custom_db_path'").get()?.value;
  if (!storedPath) return { db: null, map: null };
  if (storedPath === _dbPath && _db) return { db: _db, map: _map };
  _db = openDb(storedPath);
  _dbPath = storedPath;
  _map = _db ? detectColumns(_db) : null;
  return { db: _db, map: _map };
}

function mapRow(row, map) {
  const g = (col) => col ? (row[col] ?? null) : null;
  const r2 = v => v != null ? Math.round(Number(v) * 100) / 100 : 0;
  return {
    name:      g(map.name) || '',
    name_en:   g(map.name) || '',
    name_it:   g(map.name) || '',
    calories:  r2(g(map.cal)),
    protein:   r2(g(map.prot)),
    carbs:     r2(g(map.carb)),
    fat:       r2(g(map.fat)),
    fiber:     r2(g(map.fiber)),
    is_liquid: false,
    pack_grams: null,
    image_url:  null,
  };
}

// Exported helpers used by barcode.ipc.js
function queryCustomDbBarcode(barcode) {
  const { db, map } = getOrLoadDb();
  if (!db || !map || !map.barcode) return null;
  try {
    const row = db.prepare(`SELECT * FROM "${map.table}" WHERE "${map.barcode}" = ? LIMIT 1`).get(String(barcode));
    return row ? mapRow(row, map) : null;
  } catch { return null; }
}

function queryCustomDbName(query) {
  const { db, map } = getOrLoadDb();
  if (!db || !map || !map.name) return [];
  try {
    const rows = db.prepare(`SELECT * FROM "${map.table}" WHERE "${map.name}" LIKE ? LIMIT 20`).all(`%${query}%`);
    return rows.map(r => mapRow(r, map));
  } catch { return []; }
}

function registerCustomDbIpc() {
  ipcMain.handle('customdb:selectFile', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Seleziona database alimenti',
      filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite', 'sqlite3'] }],
      properties: ['openFile'],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('customdb:setPath', (_, { filePath }) => {
    if (!filePath) {
      getDb().prepare("DELETE FROM settings WHERE key='custom_db_path'").run();
      _db = null; _dbPath = null; _map = null;
      return { ok: true };
    }
    const db = openDb(filePath);
    if (!db) return { ok: false, error: 'File non valido o non leggibile' };
    const map = detectColumns(db);
    if (!map) { db.close(); return { ok: false, error: 'Nessuna tabella compatibile trovata nel database' }; }
    db.close();
    getDb().prepare("INSERT INTO settings (key,value) VALUES ('custom_db_path',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(filePath);
    _db = null; _dbPath = null; _map = null;
    return { ok: true };
  });

  ipcMain.handle('customdb:getStatus', () => {
    const storedPath = getDb().prepare("SELECT value FROM settings WHERE key='custom_db_path'").get()?.value;
    if (!storedPath) return { path: null, status: 'none' };
    const { db, map } = getOrLoadDb();
    if (!db) return { path: storedPath, status: 'error', error: 'File non trovato o non leggibile' };
    if (!map) return { path: storedPath, status: 'error', error: 'Nessuna tabella compatibile' };
    let rows = 0;
    try { rows = db.prepare(`SELECT COUNT(*) as c FROM "${map.table}"`).get()?.c || 0; } catch {}
    return { path: storedPath, status: 'ok', table: map.table, rows };
  });
}

module.exports = { registerCustomDbIpc, queryCustomDbBarcode, queryCustomDbName };
