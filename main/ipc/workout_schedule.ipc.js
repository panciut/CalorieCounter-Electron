const { ipcMain } = require('electron');
const { getDb } = require('../db');

function registerWorkoutScheduleIpc() {
  ipcMain.handle('workoutSchedule:getWeek', (_, { weekStart }) => {
    const db = getDb();
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const date = d.toISOString().slice(0, 10);
      const entries = db.prepare(
        `SELECT ws.*, wp.name AS plan_name
         FROM workout_schedule ws
         LEFT JOIN workout_plans wp ON wp.id = ws.plan_id
         WHERE ws.date = ? ORDER BY ws.id`
      ).all(date);
      const exercisesLogged = db.prepare('SELECT COUNT(*) AS n FROM exercises WHERE date=?').get(date)?.n || 0;
      days.push({ date, entries, exercises_logged: exercisesLogged });
    }
    return days;
  });

  ipcMain.handle('workoutSchedule:getDay', (_, { date }) => {
    const db = getDb();
    const entries = db.prepare(
      `SELECT ws.*, wp.name AS plan_name
       FROM workout_schedule ws
       LEFT JOIN workout_plans wp ON wp.id = ws.plan_id
       WHERE ws.date = ? ORDER BY ws.id`
    ).all(date);
    return entries;
  });

  ipcMain.handle('workoutSchedule:assign', (_, { date, plan_id }) => {
    const { lastInsertRowid } = getDb().prepare(
      'INSERT INTO workout_schedule (date, plan_id, status) VALUES (?, ?, \'planned\')'
    ).run(date, plan_id);
    return { id: lastInsertRowid, ok: true };
  });

  ipcMain.handle('workoutSchedule:setRest', (_, { date }) => {
    const { lastInsertRowid } = getDb().prepare(
      'INSERT INTO workout_schedule (date, plan_id, status) VALUES (?, NULL, \'rest\')'
    ).run(date);
    return { id: lastInsertRowid, ok: true };
  });

  ipcMain.handle('workoutSchedule:clear', (_, { id }) => {
    getDb().prepare('DELETE FROM workout_schedule WHERE id=?').run(id);
    return { ok: true };
  });

  ipcMain.handle('workoutSchedule:setStatus', (_, { id, status }) => {
    getDb().prepare('UPDATE workout_schedule SET status=? WHERE id=?').run(status, id);
    return { ok: true };
  });

  ipcMain.handle('workoutSchedule:move', (_, { id, toDate }) => {
    getDb().prepare('UPDATE workout_schedule SET date=? WHERE id=?').run(toDate, id);
    return { ok: true };
  });

  ipcMain.handle('workoutSchedule:swap', (_, { idA, idB }) => {
    const db = getDb();
    return db.transaction(() => {
      const a = db.prepare('SELECT date FROM workout_schedule WHERE id=?').get(idA);
      const b = db.prepare('SELECT date FROM workout_schedule WHERE id=?').get(idB);
      if (!a || !b) return { ok: false };
      db.prepare('UPDATE workout_schedule SET date=? WHERE id=?').run(b.date, idA);
      db.prepare('UPDATE workout_schedule SET date=? WHERE id=?').run(a.date, idB);
      return { ok: true };
    })();
  });
}

module.exports = registerWorkoutScheduleIpc;
