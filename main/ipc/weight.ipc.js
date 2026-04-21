const { ipcMain } = require('electron');
const { getDb } = require('../db');
const { pushUndo } = require('./undo.ipc');

const today = () => new Date().toISOString().slice(0, 10);

function registerWeightIpc() {
  ipcMain.handle('weight:getAll', () =>
    getDb().prepare(`
      SELECT w.*, s.name AS scale_name
      FROM weight_log w
      LEFT JOIN scales s ON s.id = w.scale_id
      ORDER BY w.date ASC
    `).all()
  );

  ipcMain.handle('weight:add', (_, { weight, date, fat_pct, muscle_mass, water_pct, bone_mass, scale_id }) => {
    const db = getDb();
    const d = date || today();
    const sid = scale_id ?? (db.prepare('SELECT id FROM scales WHERE is_default = 1').get()?.id ?? null);
    db.prepare(`
      INSERT INTO weight_log (date, weight, fat_pct, muscle_mass, water_pct, bone_mass, scale_id) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        weight = excluded.weight,
        fat_pct = COALESCE(excluded.fat_pct, fat_pct),
        muscle_mass = COALESCE(excluded.muscle_mass, muscle_mass),
        water_pct = COALESCE(excluded.water_pct, water_pct),
        bone_mass = COALESCE(excluded.bone_mass, bone_mass),
        scale_id = COALESCE(excluded.scale_id, scale_id)
    `).run(d, weight, fat_pct ?? null, muscle_mass ?? null, water_pct ?? null, bone_mass ?? null, sid);
    const row = db.prepare('SELECT id FROM weight_log WHERE date = ?').get(d);
    pushUndo('weight:add', { id: row.id });
    return { ok: true };
  });

  ipcMain.handle('weight:update', (_, { id, weight, date, fat_pct, muscle_mass, water_pct, bone_mass, scale_id }) => {
    const db = getDb();
    const prev = db.prepare('SELECT * FROM weight_log WHERE id = ?').get(id);
    if (!prev) return { ok: false, reason: 'not_found' };
    try {
      db.prepare(`
        UPDATE weight_log
        SET date = ?, weight = ?, fat_pct = ?, muscle_mass = ?, water_pct = ?, bone_mass = ?, scale_id = ?
        WHERE id = ?
      `).run(date, weight, fat_pct ?? null, muscle_mass ?? null, water_pct ?? null, bone_mass ?? null, scale_id ?? null, id);
    } catch (err) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') return { ok: false, reason: 'duplicate_date' };
      throw err;
    }
    pushUndo('weight:update', prev);
    return { ok: true };
  });

  ipcMain.handle('weight:delete', (_, { id }) => {
    const db = getDb();
    const row = db.prepare('SELECT date, weight FROM weight_log WHERE id = ?').get(id);
    if (row) pushUndo('weight:delete', { date: row.date, weight: row.weight });
    db.prepare('DELETE FROM weight_log WHERE id = ?').run(id);
    return { ok: true };
  });

  // ── Scales CRUD ────────────────────────────────────────────────────────────

  ipcMain.handle('scales:getAll', () =>
    getDb().prepare('SELECT * FROM scales ORDER BY is_default DESC, name').all()
  );

  ipcMain.handle('scales:create', (_, { name }) => {
    const db = getDb();
    const count = db.prepare('SELECT COUNT(*) AS n FROM scales').get().n;
    const isDefault = count === 0 ? 1 : 0;
    const result = db.prepare('INSERT INTO scales (name, is_default) VALUES (?, ?)').run(name, isDefault);
    return { id: result.lastInsertRowid };
  });

  ipcMain.handle('scales:rename', (_, { id, name }) => {
    getDb().prepare('UPDATE scales SET name = ? WHERE id = ?').run(name, id);
    return { ok: true };
  });

  ipcMain.handle('scales:delete', (_, { id }) => {
    const db = getDb();
    const scale = db.prepare('SELECT is_default FROM scales WHERE id = ?').get(id);
    if (!scale) return { ok: false, reason: 'not_found' };
    if (scale.is_default) return { ok: false, reason: 'is_default' };
    db.transaction(() => {
      db.prepare('UPDATE weight_log SET scale_id = NULL WHERE scale_id = ?').run(id);
      db.prepare('DELETE FROM scales WHERE id = ?').run(id);
    })();
    return { ok: true };
  });

  ipcMain.handle('scales:setDefault', (_, { id }) => {
    const db = getDb();
    db.transaction(() => {
      db.prepare('UPDATE scales SET is_default = 0').run();
      db.prepare('UPDATE scales SET is_default = 1 WHERE id = ?').run(id);
    })();
    return { ok: true };
  });
}

module.exports = registerWeightIpc;
