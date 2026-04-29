const { ipcMain, BrowserWindow } = require('electron');
const offDb = require('../lib/offDb');
const offImport = require('../lib/offImport');
const { getDb } = require('../db');

let activeImport = null;

function broadcast(channel, payload) {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send(channel, payload);
  }
}

function setSetting(key, value) {
  getDb().prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  ).run(key, String(value));
}

function registerOffLocalIpc() {
  ipcMain.handle('off:status', () => offDb.getStatus());

  ipcMain.handle('off:download', async () => {
    if (activeImport) return { ok: false, error: 'busy' };
    activeImport = offImport.startImport((p) => broadcast('off:importProgress', p));
    try {
      const counters = await activeImport.done;
      activeImport = null;
      setSetting('off_local_enabled', 1);
      setSetting('off_local_last_synced', new Date().toISOString().slice(0, 10));
      return { ok: true, counters };
    } catch (err) {
      activeImport = null;
      return { ok: false, error: String(err && err.message || err) };
    }
  });

  ipcMain.handle('off:cancel', () => {
    if (!activeImport) return { ok: false, error: 'no_active_import' };
    activeImport.cancel();
    return { ok: true };
  });

  ipcMain.handle('off:delete', () => {
    if (activeImport) return { ok: false, error: 'busy' };
    offDb.deleteOffDb();
    setSetting('off_local_enabled', 0);
    setSetting('off_local_last_synced', '');
    return { ok: true };
  });
}

module.exports = registerOffLocalIpc;
