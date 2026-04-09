const { ipcMain } = require('electron');
const { getDb } = require('../db');

const today = () => new Date().toISOString().slice(0, 10);

function registerWeightIpc() {
  ipcMain.handle('weight:getAll', () =>
    getDb().prepare('SELECT * FROM weight_log ORDER BY date ASC').all()
  );

  ipcMain.handle('weight:add', (_, { weight, date }) => {
    getDb().prepare(
      'INSERT INTO weight_log (date, weight) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET weight = excluded.weight'
    ).run(date || today(), weight);
    return { ok: true };
  });

  ipcMain.handle('weight:delete', (_, { id }) => {
    getDb().prepare('DELETE FROM weight_log WHERE id = ?').run(id);
    return { ok: true };
  });
}

module.exports = registerWeightIpc;
