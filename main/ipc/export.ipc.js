const { ipcMain } = require('electron');
const { dialog } = require('electron');
const { getDb } = require('../db');
const fs = require('fs');

function registerExportIpc() {
  ipcMain.handle('export:data', async (_, { format }) => {
    const db = getDb();

    const foods = db.prepare('SELECT * FROM foods').all();
    const log = db.prepare(`
      SELECT l.id, l.date, f.name AS food_name, l.grams, l.meal,
        ROUND(f.calories * l.grams / 100, 2) AS calories,
        ROUND(f.protein  * l.grams / 100, 2) AS protein,
        ROUND(f.carbs    * l.grams / 100, 2) AS carbs,
        ROUND(f.fat      * l.grams / 100, 2) AS fat,
        ROUND(f.fiber    * l.grams / 100, 2) AS fiber
      FROM log l JOIN foods f ON l.food_id = f.id
      ORDER BY l.date DESC, l.id
    `).all();
    const weightLog = db.prepare('SELECT * FROM weight_log ORDER BY date DESC').all();
    const waterLog = db.prepare('SELECT * FROM water_log ORDER BY date DESC').all();
    const dailyNotes = db.prepare('SELECT * FROM daily_notes ORDER BY date DESC').all();
    const supplements = db.prepare('SELECT * FROM supplements').all();

    const ext = format === 'json' ? 'json' : 'csv';
    const result = await dialog.showSaveDialog({
      defaultPath: `calorie-counter-export.${ext}`,
      filters: [
        { name: ext.toUpperCase(), extensions: [ext] },
      ],
    });

    if (result.canceled || !result.filePath) return { ok: false };

    if (format === 'json') {
      const data = { foods, log, weight_log: weightLog, water_log: waterLog, daily_notes: dailyNotes, supplements };
      fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf-8');
    } else {
      let csv = '';

      // Foods
      csv += '## Foods\n';
      csv += 'id,name,calories,protein,carbs,fat,fiber,piece_grams,favorite\n';
      for (const f of foods) {
        csv += `${f.id},"${(f.name || '').replace(/"/g, '""')}",${f.calories},${f.protein},${f.carbs},${f.fat},${f.fiber},${f.piece_grams || ''},${f.favorite}\n`;
      }

      // Log
      csv += '\n## Log\n';
      csv += 'id,date,food_name,grams,meal,calories,protein,carbs,fat,fiber\n';
      for (const l of log) {
        csv += `${l.id},${l.date},"${(l.food_name || '').replace(/"/g, '""')}",${l.grams},${l.meal},${l.calories},${l.protein},${l.carbs},${l.fat},${l.fiber}\n`;
      }

      // Weight log
      csv += '\n## Weight\n';
      csv += 'id,date,weight\n';
      for (const w of weightLog) {
        csv += `${w.id},${w.date},${w.weight}\n`;
      }

      // Water log
      csv += '\n## Water\n';
      csv += 'id,date,ml\n';
      for (const w of waterLog) {
        csv += `${w.id},${w.date},${w.ml}\n`;
      }

      // Daily notes
      csv += '\n## Notes\n';
      csv += 'date,note\n';
      for (const n of dailyNotes) {
        csv += `${n.date},"${(n.note || '').replace(/"/g, '""')}"\n`;
      }

      // Supplements
      csv += '\n## Supplements\n';
      csv += 'id,name,qty\n';
      for (const s of supplements) {
        csv += `${s.id},"${(s.name || '').replace(/"/g, '""')}",${s.qty}\n`;
      }

      fs.writeFileSync(result.filePath, csv, 'utf-8');
    }

    return { ok: true, path: result.filePath };
  });
}

module.exports = registerExportIpc;
