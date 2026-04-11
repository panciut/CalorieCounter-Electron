const { ipcMain } = require('electron');
const { getDb } = require('../db');
const { pushUndo } = require('./undo.ipc');

const today = () => new Date().toISOString().slice(0, 10);

function registerWeightIpc() {
  ipcMain.handle('weight:getAll', () =>
    getDb().prepare('SELECT * FROM weight_log ORDER BY date ASC').all()
  );

  ipcMain.handle('weight:add', (_, { weight, date, fat_pct, muscle_mass, water_pct, bone_mass }) => {
    const db = getDb();
    const d = date || today();
    db.prepare(`
      INSERT INTO weight_log (date, weight, fat_pct, muscle_mass, water_pct, bone_mass) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        weight = excluded.weight,
        fat_pct = COALESCE(excluded.fat_pct, fat_pct),
        muscle_mass = COALESCE(excluded.muscle_mass, muscle_mass),
        water_pct = COALESCE(excluded.water_pct, water_pct),
        bone_mass = COALESCE(excluded.bone_mass, bone_mass)
    `).run(d, weight, fat_pct ?? null, muscle_mass ?? null, water_pct ?? null, bone_mass ?? null);
    const row = db.prepare('SELECT id FROM weight_log WHERE date = ?').get(d);
    pushUndo('weight:add', { id: row.id });
    return { ok: true };
  });

  ipcMain.handle('weight:delete', (_, { id }) => {
    const db = getDb();
    const row = db.prepare('SELECT date, weight FROM weight_log WHERE id = ?').get(id);
    if (row) pushUndo('weight:delete', { date: row.date, weight: row.weight });
    db.prepare('DELETE FROM weight_log WHERE id = ?').run(id);
    return { ok: true };
  });
}

module.exports = registerWeightIpc;
