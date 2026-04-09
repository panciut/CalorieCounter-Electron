const { ipcMain } = require('electron');
const { getDb } = require('../db');

function registerMeasurementsIpc() {
  ipcMain.handle('measurements:getAll', () =>
    getDb().prepare('SELECT * FROM body_measurements ORDER BY date ASC').all()
  );

  ipcMain.handle('measurements:add', (_, { date, waist, chest, arms, thighs, hips, neck }) => {
    const result = getDb().prepare(
      'INSERT INTO body_measurements (date, waist, chest, arms, thighs, hips, neck) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(date, waist || null, chest || null, arms || null, thighs || null, hips || null, neck || null);
    return { id: result.lastInsertRowid };
  });

  ipcMain.handle('measurements:delete', (_, { id }) => {
    getDb().prepare('DELETE FROM body_measurements WHERE id = ?').run(id);
    return { ok: true };
  });
}

module.exports = registerMeasurementsIpc;
