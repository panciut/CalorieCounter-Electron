const { ipcMain } = require('electron');
const { getDb } = require('../db');

function registerSupplementsIpc() {
  ipcMain.handle('supplements:getAll', () =>
    getDb().prepare('SELECT * FROM supplements ORDER BY name').all()
  );

  ipcMain.handle('supplements:add', (_, { name, qty, unit, notes }) => {
    const today = new Date().toISOString().split('T')[0];
    const result = getDb().prepare(
      'INSERT INTO supplements (name, qty, unit, notes, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(name, qty || 1, unit || '', notes || '', today);
    return { id: result.lastInsertRowid };
  });

  ipcMain.handle('supplements:update', (_, { id, name, qty, unit, notes }) => {
    getDb().prepare(
      'UPDATE supplements SET name = ?, qty = ?, unit = ?, notes = ? WHERE id = ?'
    ).run(name, qty || 1, unit || '', notes || '', id);
    return { ok: true };
  });

  ipcMain.handle('supplements:delete', (_, { id }) => {
    getDb().prepare('DELETE FROM supplements WHERE id = ?').run(id);
    return { ok: true };
  });

  // Get supplements with today's count — only supplements created on or before this date
  ipcMain.handle('supplements:getDay', (_, { date }) => {
    return getDb().prepare(`
      SELECT s.id, s.name, s.qty, s.unit,
        COALESCE(sl.count, 0) AS taken
      FROM supplements s
      LEFT JOIN supplement_log sl ON sl.supplement_id = s.id AND sl.date = ?
      WHERE s.created_at <= ?
      ORDER BY s.name
    `).all(date, date);
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

  // Adherence summary for the History tab
  ipcMain.handle('supplements:getAdherence', (_, { days }) => {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    const start = startDate.toISOString().split('T')[0];

    // All supplements that existed at some point during the range
    const supplements = db.prepare(
      "SELECT id, name, qty, unit, created_at FROM supplements WHERE created_at <= ? ORDER BY name"
    ).all(today);

    // All log entries in range
    const logs = db.prepare(
      "SELECT supplement_id, date, count FROM supplement_log WHERE date >= ? AND date <= ? ORDER BY date DESC"
    ).all(start, today);

    const logMap = new Map();
    for (const log of logs) {
      if (!logMap.has(log.supplement_id)) logMap.set(log.supplement_id, []);
      logMap.get(log.supplement_id).push(log);
    }

    const msPerDay = 86400000;
    return supplements.map(s => {
      // Effective start = whichever is later: range start or supplement creation date
      const effectiveStart = s.created_at > start ? s.created_at : start;
      const startMs = new Date(effectiveStart).getTime();
      const endMs = new Date(today).getTime();
      const daysExpected = Math.floor((endMs - startMs) / msPerDay) + 1;

      const sLogs = (logMap.get(s.id) || []).filter(l => l.date >= effectiveStart);
      const daysTaken = sLogs.filter(l => l.count >= s.qty).length;

      return {
        id: s.id,
        name: s.name,
        qty: s.qty,
        unit: s.unit,
        created_at: s.created_at,
        daysExpected,
        daysTaken,
        adherencePct: daysExpected > 0 ? Math.round((daysTaken / daysExpected) * 100) : 0,
        logs: sLogs.slice(0, 90),
      };
    });
  });
}

module.exports = registerSupplementsIpc;
