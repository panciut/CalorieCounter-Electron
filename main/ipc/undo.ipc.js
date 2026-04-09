const { ipcMain } = require('electron');
const { getDb } = require('../db');

function pushUndo(action, data) {
  const db = getDb();
  db.prepare('INSERT INTO undo_stack (action, data) VALUES (?, ?)').run(action, JSON.stringify(data));
  db.prepare('DELETE FROM undo_stack WHERE id NOT IN (SELECT id FROM undo_stack ORDER BY id DESC LIMIT 20)').run();
}

function registerUndoIpc() {
  ipcMain.handle('undo:pop', () => {
    const db = getDb();
    const entry = db.prepare('SELECT * FROM undo_stack ORDER BY id DESC LIMIT 1').get();
    if (!entry) return null;

    db.prepare('DELETE FROM undo_stack WHERE id = ?').run(entry.id);
    const data = JSON.parse(entry.data);
    const action = entry.action;

    switch (action) {
      case 'log:add':
        db.prepare('DELETE FROM log WHERE id = ?').run(data.id);
        return { action, description: 'log entry' };

      case 'log:delete':
        db.prepare('INSERT INTO log (date, food_id, grams, meal) VALUES (?, ?, ?, ?)').run(data.date, data.food_id, data.grams, data.meal);
        return { action, description: 'log entry' };

      case 'water:add':
        db.prepare('DELETE FROM water_log WHERE id = ?').run(data.id);
        return { action, description: 'water entry' };

      case 'water:delete':
        db.prepare('INSERT INTO water_log (date, ml) VALUES (?, ?)').run(data.date, data.ml);
        return { action, description: 'water entry' };

      case 'weight:add':
        db.prepare('DELETE FROM weight_log WHERE id = ?').run(data.id);
        return { action, description: 'weight entry' };

      case 'weight:delete':
        db.prepare('INSERT INTO weight_log (date, weight) VALUES (?, ?)').run(data.date, data.weight);
        return { action, description: 'weight entry' };

      default:
        return null;
    }
  });
}

module.exports = { registerUndoIpc, pushUndo };
