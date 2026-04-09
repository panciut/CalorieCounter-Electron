const { ipcMain } = require('electron');
const { getDb } = require('../db');

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
    return { id: result.lastInsertRowid };
  });

  ipcMain.handle('water:delete', (_, { id }) => {
    getDb().prepare('DELETE FROM water_log WHERE id = ?').run(id);
    return { ok: true };
  });
}

module.exports = registerWaterIpc;
