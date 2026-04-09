const { ipcMain } = require('electron');
const { getDb } = require('../db');

function registerSettingsIpc() {
  ipcMain.handle('settings:get', () => {
    const defaults = {
      cal_goal: 2000, protein_goal: 150, carbs_goal: 250,
      fat_goal: 70, weight_goal: 0, water_goal: 2000,
    };
    for (const { key, value } of getDb().prepare('SELECT key, value FROM settings').all()) {
      if (key in defaults) defaults[key] = parseFloat(value);
    }
    return defaults;
  });

  ipcMain.handle('settings:save', (_, settings) => {
    const stmt = getDb().prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    );
    for (const [key, val] of Object.entries(settings)) stmt.run(key, String(val));
    return { ok: true };
  });
}

module.exports = registerSettingsIpc;
