const { ipcMain } = require('electron');
const { getDb } = require('../db');

const localDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

function withSets(db, exercises) {
  if (!exercises.length) return exercises;
  const ids = exercises.map(e => e.id);
  const sets = db.prepare(
    `SELECT * FROM exercise_sets WHERE exercise_id IN (${ids.map(()=>'?').join(',')}) ORDER BY exercise_id, set_number`
  ).all(...ids);
  const setMap = {};
  for (const s of sets) {
    if (!setMap[s.exercise_id]) setMap[s.exercise_id] = [];
    setMap[s.exercise_id].push(s);
  }
  return exercises.map(e => ({ ...e, sets: setMap[e.id] || [] }));
}

function registerExercisesIpc() {
  ipcMain.handle('exercises:getDay', (_, { date }) => {
    const db = getDb();
    const d = date || localDate();
    const rows = db.prepare('SELECT * FROM exercises WHERE date = ? ORDER BY id').all(d);
    return withSets(db, rows);
  });

  ipcMain.handle('exercises:getRange', (_, { startDate, endDate }) => {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM exercises WHERE date BETWEEN ? AND ? ORDER BY date, id').all(startDate, endDate);
    return withSets(db, rows);
  });

  ipcMain.handle('exercises:add', (_, { date, type, duration_min, calories_burned, notes, sets }) => {
    const db = getDb();
    const d = date || localDate();
    return db.transaction(() => {
      const { lastInsertRowid } = db.prepare(
        'INSERT INTO exercises (date, type, duration_min, calories_burned, notes, source) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(d, type, duration_min || 0, calories_burned || 0, notes || null, 'manual');
      if (sets && sets.length) {
        const ins = db.prepare('INSERT INTO exercise_sets (exercise_id, set_number, reps, weight_kg) VALUES (?, ?, ?, ?)');
        sets.forEach((s, i) => ins.run(lastInsertRowid, i + 1, s.reps || null, s.weight_kg || null));
      }
      return { id: lastInsertRowid };
    })();
  });

  ipcMain.handle('exercises:update', (_, { id, type, duration_min, calories_burned, notes }) => {
    getDb().prepare(
      'UPDATE exercises SET type=?, duration_min=?, calories_burned=?, notes=? WHERE id=?'
    ).run(type, duration_min, calories_burned, notes || null, id);
    return { ok: true };
  });

  ipcMain.handle('exercises:delete', (_, { id }) => {
    getDb().prepare('DELETE FROM exercises WHERE id = ?').run(id);
    return { ok: true };
  });

  ipcMain.handle('exercises:getTypes', () =>
    getDb().prepare('SELECT * FROM exercise_types ORDER BY category, name').all()
  );

  ipcMain.handle('exercises:addType', (_, { name, met_value, category }) => {
    const { lastInsertRowid } = getDb().prepare(
      'INSERT INTO exercise_types (name, met_value, category) VALUES (?, ?, ?)'
    ).run(name, met_value || 5.0, category || 'other');
    return { id: lastInsertRowid };
  });

  // Estimate calories burned using MET formula: kcal = MET * weight_kg * (duration_min / 60)
  ipcMain.handle('exercises:estimate', (_, { type, duration_min, weight_kg }) => {
    const db = getDb();
    const et = db.prepare('SELECT met_value FROM exercise_types WHERE name = ?').get(type);
    const met = et ? et.met_value : 5.0;
    const calories = Math.round(met * weight_kg * (duration_min / 60));
    return { calories };
  });
}

module.exports = registerExercisesIpc;
