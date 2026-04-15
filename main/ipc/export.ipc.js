const { ipcMain, dialog, app } = require('electron');
const { getDb, getDbPath } = require('../db');
const fs = require('fs');

function q(s) { return `"${String(s ?? '').replace(/"/g, '""')}"`; }

function registerExportIpc() {
  // ── Export data as JSON or CSV ────────────────────────────────────────────
  ipcMain.handle('export:data', async (_, { format }) => {
    const db = getDb();

    const foods      = db.prepare('SELECT * FROM foods').all();
    const log        = db.prepare(`
      SELECT l.id, l.date, f.name AS food_name, l.grams, l.meal, l.status,
        ROUND(f.calories * l.grams / 100, 2) AS calories,
        ROUND(f.protein  * l.grams / 100, 2) AS protein,
        ROUND(f.carbs    * l.grams / 100, 2) AS carbs,
        ROUND(f.fat      * l.grams / 100, 2) AS fat,
        ROUND(f.fiber    * l.grams / 100, 2) AS fiber
      FROM log l JOIN foods f ON l.food_id = f.id
      ORDER BY l.date DESC, l.id
    `).all();
    const weightLog  = db.prepare('SELECT * FROM weight_log ORDER BY date DESC').all();
    const waterLog   = db.prepare('SELECT * FROM water_log ORDER BY date DESC').all();
    const exercises  = db.prepare('SELECT * FROM exercises ORDER BY date DESC').all();
    const notes      = db.prepare('SELECT * FROM daily_notes ORDER BY date DESC').all();
    const supplements = db.prepare('SELECT * FROM supplements').all();

    const ext = format === 'json' ? 'json' : 'csv';
    const result = await dialog.showSaveDialog({
      defaultPath: `calorie-counter-export-${new Date().toISOString().slice(0,10)}.${ext}`,
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
    });
    if (result.canceled || !result.filePath) return { ok: false };

    if (format === 'json') {
      const data = { foods, log, weight_log: weightLog, water_log: waterLog, exercises, daily_notes: notes, supplements };
      fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf-8');
    } else {
      let csv = '';

      csv += '## Foods\n';
      csv += 'id,name,calories,protein,carbs,fat,fiber,piece_grams,is_liquid,favorite\n';
      for (const f of foods)
        csv += `${f.id},${q(f.name)},${f.calories},${f.protein},${f.carbs},${f.fat},${f.fiber},${f.piece_grams ?? ''},${f.is_liquid ?? 0},${f.favorite ?? 0}\n`;

      csv += '\n## Food Log\n';
      csv += 'id,date,food_name,grams,meal,status,calories,protein,carbs,fat,fiber\n';
      for (const l of log)
        csv += `${l.id},${l.date},${q(l.food_name)},${l.grams},${l.meal},${l.status ?? 'logged'},${l.calories},${l.protein},${l.carbs},${l.fat},${l.fiber}\n`;

      csv += '\n## Weight & Body Composition\n';
      csv += 'id,date,weight,fat_pct,muscle_mass,water_pct,bone_mass\n';
      for (const w of weightLog)
        csv += `${w.id},${w.date},${w.weight},${w.fat_pct ?? ''},${w.muscle_mass ?? ''},${w.water_pct ?? ''},${w.bone_mass ?? ''}\n`;

      csv += '\n## Exercises\n';
      csv += 'id,date,type,duration_min,calories_burned,notes,source\n';
      for (const e of exercises)
        csv += `${e.id},${e.date},${q(e.type)},${e.duration_min},${e.calories_burned},${q(e.notes ?? '')},${e.source}\n`;

      csv += '\n## Water Log\n';
      csv += 'id,date,ml,source\n';
      for (const w of waterLog)
        csv += `${w.id},${w.date},${w.ml},${q(w.source ?? '')}\n`;

      csv += '\n## Daily Notes\n';
      csv += 'date,note\n';
      for (const n of notes)
        csv += `${n.date},${q(n.note)}\n`;

      csv += '\n## Supplements\n';
      csv += 'id,name,qty\n';
      for (const s of supplements)
        csv += `${s.id},${q(s.name)},${s.qty}\n`;

      fs.writeFileSync(result.filePath, csv, 'utf-8');
    }

    return { ok: true, path: result.filePath };
  });

  // ── Export food database as JSON ──────────────────────────────────────────
  ipcMain.handle('export:foods', async () => {
    const db = getDb();
    const foods = db.prepare('SELECT name, calories, protein, carbs, fat, fiber, piece_grams, is_liquid, barcode, favorite FROM foods ORDER BY name').all();

    const result = await dialog.showSaveDialog({
      defaultPath: `foods-${new Date().toISOString().slice(0,10)}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return { ok: false };

    fs.writeFileSync(result.filePath, JSON.stringify(foods, null, 2), 'utf-8');
    return { ok: true, path: result.filePath, count: foods.length };
  });

  // ── Export pantry as JSON ─────────────────────────────────────────────────
  ipcMain.handle('export:pantry', async () => {
    const db = getDb();
    const pantry = db.prepare(`
      SELECT p.id, f.name AS food_name, p.quantity_g, p.expiry_date,
             p.package_id, fp.grams AS package_grams,
             p.opened_at, p.opened_days, p.starting_grams, p.updated_at
      FROM pantry p
      JOIN foods f ON f.id = p.food_id
      LEFT JOIN food_packages fp ON fp.id = p.package_id
      ORDER BY f.name, p.expiry_date
    `).all();

    const result = await dialog.showSaveDialog({
      defaultPath: `pantry-${new Date().toISOString().slice(0,10)}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return { ok: false };

    fs.writeFileSync(result.filePath, JSON.stringify(pantry, null, 2), 'utf-8');
    return { ok: true, path: result.filePath, count: pantry.length };
  });

  // ── Export full database backup (.db file) ────────────────────────────────
  ipcMain.handle('export:backup', async () => {
    const result = await dialog.showSaveDialog({
      defaultPath: `calorie-counter-backup-${new Date().toISOString().slice(0,10)}.db`,
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    });
    if (result.canceled || !result.filePath) return { ok: false };

    const db = getDb();
    // Checkpoint WAL so the backup is complete
    db.pragma('wal_checkpoint(FULL)');
    fs.copyFileSync(getDbPath(), result.filePath);
    return { ok: true, path: result.filePath };
  });
}

module.exports = registerExportIpc;
