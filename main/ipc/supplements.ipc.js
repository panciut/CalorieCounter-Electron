const { ipcMain } = require('electron');
const { getDb } = require('../db');

function registerSupplementsIpc() {
  ipcMain.handle('supplements:getAll', () =>
    getDb().prepare('SELECT * FROM supplements ORDER BY name').all()
  );

  ipcMain.handle('supplements:add', (_, { name, qty }) => {
    const result = getDb().prepare(
      'INSERT INTO supplements (name, qty) VALUES (?, ?)'
    ).run(name, qty || 1);
    return { id: result.lastInsertRowid };
  });

  ipcMain.handle('supplements:update', (_, { id, name, qty }) => {
    getDb().prepare(
      'UPDATE supplements SET name = ?, qty = ? WHERE id = ?'
    ).run(name, qty || 1, id);
    return { ok: true };
  });

  ipcMain.handle('supplements:delete', (_, { id }) => {
    getDb().prepare('DELETE FROM supplements WHERE id = ?').run(id);
    return { ok: true };
  });

  // Get supplements with today's count
  ipcMain.handle('supplements:getDay', (_, { date }) => {
    return getDb().prepare(`
      SELECT s.id, s.name, s.qty,
        COALESCE(sl.count, 0) AS taken
      FROM supplements s
      LEFT JOIN supplement_log sl ON sl.supplement_id = s.id AND sl.date = ?
      ORDER BY s.name
    `).all(date);
  });

  // Increment taken count (wraps back to 0 after reaching qty)
  ipcMain.handle('supplements:take', (_, { supplement_id, date }) => {
    const db = getDb();
    const suppl = db.prepare('SELECT qty FROM supplements WHERE id = ?').get(supplement_id);
    if (!suppl) return { taken: 0 };

    const existing = db.prepare(
      'SELECT count FROM supplement_log WHERE supplement_id = ? AND date = ?'
    ).get(supplement_id, date);

    let newCount;
    if (!existing) {
      newCount = 1;
      db.prepare(
        'INSERT INTO supplement_log (supplement_id, date, count) VALUES (?, ?, ?)'
      ).run(supplement_id, date, newCount);
    } else {
      newCount = existing.count >= suppl.qty ? 0 : existing.count + 1;
      if (newCount === 0) {
        db.prepare('DELETE FROM supplement_log WHERE supplement_id = ? AND date = ?').run(supplement_id, date);
      } else {
        db.prepare('UPDATE supplement_log SET count = ? WHERE supplement_id = ? AND date = ?').run(newCount, supplement_id, date);
      }
    }
    return { taken: newCount };
  });
}

module.exports = registerSupplementsIpc;
