const { ipcMain } = require('electron');
const { getDb } = require('../db');
const { pushUndo } = require('./undo.ipc');

const today = () => new Date().toISOString().slice(0, 10);

function registerWeightIpc() {
  ipcMain.handle('weight:getAll', () =>
    getDb().prepare('SELECT * FROM weight_log ORDER BY date ASC').all()
  );

  ipcMain.handle('weight:add', (_, { weight, date }) => {
    const db = getDb();
    const d = date || today();
    const result = db.prepare(
      'INSERT INTO weight_log (date, weight) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET weight = excluded.weight'
    ).run(d, weight);
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
