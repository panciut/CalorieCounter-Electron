const { ipcMain } = require('electron');
const { getDb } = require('../db');
const { pushUndo } = require('./undo.ipc');

const today = () => new Date().toISOString().slice(0, 10);

function registerWaterIpc() {
  ipcMain.handle('water:getDay', (_, { date }) => {
    const d = date || today();
    const db = getDb();
    const { total_ml } = db.prepare(
      'SELECT COALESCE(SUM(ml), 0) AS total_ml FROM water_log WHERE date = ?'
    ).get(d);
    const entries = db.prepare(
      'SELECT * FROM water_log WHERE date = ? ORDER BY id DESC'
    ).all(d);
    return { total_ml, entries };
  });

  ipcMain.handle('water:add', (_, { date, ml }) => {
    const result = getDb().prepare(
      'INSERT INTO water_log (date, ml) VALUES (?, ?)'
    ).run(date || today(), ml);
    pushUndo('water:add', { id: result.lastInsertRowid });
    return { id: result.lastInsertRowid };
  });

  ipcMain.handle('water:delete', (_, { id }) => {
    const db = getDb();
    const row = db.prepare('SELECT date, ml FROM water_log WHERE id = ?').get(id);
    if (row) pushUndo('water:delete', { date: row.date, ml: row.ml });
    db.prepare('DELETE FROM water_log WHERE id = ?').run(id);
    return { ok: true };
  });
}

module.exports = registerWaterIpc;
