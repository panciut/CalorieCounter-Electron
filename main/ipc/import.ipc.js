const { ipcMain, dialog, app } = require('electron');
const { getDb, getDbPath, closeDb } = require('../db');
const fs = require('fs');
const path = require('path');

function registerImportIpc() {
  // ── File picker ────────────────────────────────────────────────────────────
  ipcMain.handle('import:selectFile', async (_, { extensions } = {}) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Data file', extensions: extensions ?? ['csv', 'json', 'db'] }],
    });
    if (result.canceled || !result.filePaths.length) return null;
    return result.filePaths[0];
  });

  // ── Import foods (CSV or JSON) ─────────────────────────────────────────────
  ipcMain.handle('import:foods', (_, { filePath }) => {
    const db  = getDb();
    const ext = path.extname(filePath).toLowerCase();
    const raw = fs.readFileSync(filePath, 'utf-8');
    let foods = [];

    if (ext === '.json') {
      const parsed = JSON.parse(raw);
      foods = Array.isArray(parsed) ? parsed : (parsed.foods ?? []);
    } else {
      const lines = raw.split(/\r?\n/).filter(l => l.trim() && !l.startsWith('#'));
      if (lines.length < 2) return { imported: 0, skipped: 0 };
      const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].match(/(".*?"|[^,]+)/g)?.map(c => c.trim().replace(/^"|"$/g, '')) ?? [];
        const obj = {};
        header.forEach((h, idx) => { obj[h] = cols[idx] ?? ''; });
        foods.push(obj);
      }
    }

    let imported = 0, skipped = 0;
    const insert = db.prepare(
      `INSERT OR IGNORE INTO foods (name, calories, protein, carbs, fat, fiber, piece_grams, is_liquid)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    db.transaction(() => {
      for (const f of foods) {
        if (!f.name || !f.calories) { skipped++; continue; }
        const r = insert.run(
          f.name, +f.calories || 0, +f.protein || 0, +f.carbs || 0,
          +f.fat || 0, +f.fiber || 0,
          f.piece_grams ? +f.piece_grams : null,
          +f.is_liquid || 0
        );
        r.changes > 0 ? imported++ : skipped++;
      }
    })();
    return { imported, skipped };
  });

  // ── Import full JSON export (foods + log + weight + exercises + water) ─────
  ipcMain.handle('import:fullJson', (_, { filePath }) => {
    const db  = getDb();
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);

    let stats = { foods: 0, log: 0, weight: 0, exercises: 0, water: 0 };

    db.transaction(() => {
      // Foods
      const insFood = db.prepare(
        `INSERT OR IGNORE INTO foods (name, calories, protein, carbs, fat, fiber, piece_grams, is_liquid)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const f of data.foods ?? []) {
        const r = insFood.run(f.name, f.calories, f.protein, f.carbs, f.fat, f.fiber,
          f.piece_grams ?? null, f.is_liquid ?? 0);
        if (r.changes) stats.foods++;
      }

      // Log — match by food name to get food_id
      const insLog = db.prepare(
        `INSERT OR IGNORE INTO log (food_id, date, grams, meal, status)
         VALUES ((SELECT id FROM foods WHERE name = ?), ?, ?, ?, ?)`
      );
      for (const l of data.log ?? []) {
        const r = insLog.run(l.food_name, l.date, l.grams, l.meal, l.status ?? 'logged');
        if (r.changes) stats.log++;
      }

      // Weight / body comp
      const insWeight = db.prepare(
        `INSERT OR IGNORE INTO weight_log (date, weight, fat_pct, muscle_mass, water_pct, bone_mass)
         VALUES (?, ?, ?, ?, ?, ?)`
      );
      for (const w of data.weight_log ?? []) {
        const r = insWeight.run(w.date, w.weight, w.fat_pct ?? null, w.muscle_mass ?? null,
          w.water_pct ?? null, w.bone_mass ?? null);
        if (r.changes) stats.weight++;
      }

      // Exercises
      const insEx = db.prepare(
        `INSERT OR IGNORE INTO exercises (date, type, duration_min, calories_burned, notes, source)
         VALUES (?, ?, ?, ?, ?, ?)`
      );
      for (const e of data.exercises ?? []) {
        const r = insEx.run(e.date, e.type, e.duration_min, e.calories_burned,
          e.notes ?? null, e.source ?? 'manual');
        if (r.changes) stats.exercises++;
      }

      // Water
      const insWater = db.prepare(
        `INSERT OR IGNORE INTO water_log (date, ml, source) VALUES (?, ?, ?)`
      );
      for (const w of data.water_log ?? []) {
        const r = insWater.run(w.date, w.ml, w.source ?? 'manual');
        if (r.changes) stats.water++;
      }
    })();

    return { ok: true, stats };
  });

  // ── Export DB backup (handled in export.ipc.js, but picker lives here) ─────

  // ── Restore full database backup (.db file) ───────────────────────────────
  ipcMain.handle('import:backup', async (_, { filePath }) => {
    // Basic sanity check: SQLite files start with "SQLite format 3"
    const header = Buffer.alloc(16);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, header, 0, 16, 0);
    fs.closeSync(fd);
    if (!header.toString('utf8').startsWith('SQLite format 3')) {
      return { ok: false, error: 'Not a valid SQLite database file.' };
    }

    const currentPath = getDbPath();
    closeDb();
    fs.copyFileSync(filePath, currentPath);

    // Relaunch the app so everything reinitialises cleanly
    app.relaunch();
    app.exit(0);
    return { ok: true }; // never reached, but satisfies the IPC contract
  });
}

module.exports = registerImportIpc;
