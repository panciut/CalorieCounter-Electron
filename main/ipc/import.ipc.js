const { ipcMain } = require('electron');
const { dialog } = require('electron');
const { getDb } = require('../db');
const fs = require('fs');
const path = require('path');

function registerImportIpc() {
  ipcMain.handle('import:selectFile', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'CSV / JSON', extensions: ['csv', 'json'] },
      ],
    });
    if (result.canceled || !result.filePaths.length) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('import:foods', (_, { filePath }) => {
    const db = getDb();
    const ext = path.extname(filePath).toLowerCase();
    const raw = fs.readFileSync(filePath, 'utf-8');
    let foods = [];

    if (ext === '.json') {
      foods = JSON.parse(raw);
    } else {
      // CSV
      const lines = raw.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) return { imported: 0, skipped: 0 };
      const header = lines[0].split(',').map(h => h.trim().toLowerCase());
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim());
        const obj = {};
        header.forEach((h, idx) => { obj[h] = cols[idx]; });
        foods.push(obj);
      }
    }

    let imported = 0, skipped = 0;
    const insert = db.prepare(
      'INSERT OR IGNORE INTO foods (name, calories, protein, carbs, fat, fiber, piece_grams) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    db.transaction(() => {
      for (const f of foods) {
        const name = f.name;
        const calories = +f.calories || 0;
        if (!name || !calories) { skipped++; continue; }
        const result = insert.run(
          name, calories,
          +f.protein || 0,
          +f.carbs || 0,
          +f.fat || 0,
          +f.fiber || 0,
          +f.piece_grams || null
        );
        if (result.changes > 0) imported++;
        else skipped++;
      }
    })();

    return { imported, skipped };
  });
}

module.exports = registerImportIpc;
