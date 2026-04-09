const { ipcMain } = require('electron');
const { getDb } = require('../db');

function registerNotesIpc() {
  ipcMain.handle('notes:get', (_, { date }) => {
    const row = getDb().prepare('SELECT note FROM daily_notes WHERE date = ?').get(date);
    return { note: row ? row.note : '' };
  });

  ipcMain.handle('notes:save', (_, { date, note }) => {
    if (note.trim()) {
      getDb().prepare(
        'INSERT INTO daily_notes (date, note) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET note = excluded.note'
      ).run(date, note);
    } else {
      getDb().prepare('DELETE FROM daily_notes WHERE date = ?').run(date);
    }
    return { ok: true };
  });
}

module.exports = registerNotesIpc;
