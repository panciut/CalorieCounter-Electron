const { ipcMain } = require('electron');
const { getDb } = require('../db');
const { generateAll } = require('../lib/notifications');

function ensureTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS notification_dismissals (
      key TEXT PRIMARY KEY,
      dismissed_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT
    )
  `);
}

function registerNotificationsIpc() {
  ipcMain.handle('notifications:getAll', () => {
    const db = getDb();
    ensureTable(db);
    const all = generateAll(db);
    const dismissed = new Set(
      db.prepare(
        "SELECT key FROM notification_dismissals WHERE expires_at IS NULL OR expires_at > datetime('now')"
      ).all().map(r => r.key)
    );
    return all.filter(n => !dismissed.has(n.key));
  });

  ipcMain.handle('notifications:dismiss', (_, { key, expires_at }) => {
    const db = getDb();
    ensureTable(db);
    db.prepare(
      "INSERT OR REPLACE INTO notification_dismissals (key, dismissed_at, expires_at) VALUES (?, datetime('now'), ?)"
    ).run(key, expires_at ?? null);
    return { ok: true };
  });

  ipcMain.handle('notifications:undoDismiss', (_, { key }) => {
    const db = getDb();
    ensureTable(db);
    db.prepare('DELETE FROM notification_dismissals WHERE key = ?').run(key);
    return { ok: true };
  });

  ipcMain.handle('notifications:dismissAll', (_, payload) => {
    const db = getDb();
    ensureTable(db);
    const keys = Array.isArray(payload?.keys) && payload.keys.length
      ? payload.keys
      : generateAll(db).map(n => n.key);
    const stmt = db.prepare(
      "INSERT OR REPLACE INTO notification_dismissals (key, dismissed_at, expires_at) VALUES (?, datetime('now'), NULL)"
    );
    db.transaction(() => { for (const k of keys) stmt.run(k); })();
    return { ok: true };
  });

  ipcMain.handle('notifications:recentDismissed', (_, payload) => {
    const db = getDb();
    ensureTable(db);
    const limit = payload?.limit ?? 20;
    return db.prepare(
      'SELECT key, dismissed_at, expires_at FROM notification_dismissals ORDER BY dismissed_at DESC LIMIT ?'
    ).all(limit);
  });
}

module.exports = registerNotificationsIpc;
