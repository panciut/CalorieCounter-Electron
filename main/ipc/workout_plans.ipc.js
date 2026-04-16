const { ipcMain } = require('electron');
const { getDb } = require('../db');

function withExercises(db, plans) {
  if (!plans.length) return plans;
  const ids = plans.map(p => p.id);
  const rows = db.prepare(
    `SELECT wpe.*, et.name AS exercise_name, et.category AS exercise_category
     FROM workout_plan_exercises wpe
     JOIN exercise_types et ON et.id = wpe.exercise_type_id
     WHERE wpe.plan_id IN (${ids.map(() => '?').join(',')})
     ORDER BY wpe.plan_id, wpe.sort_order`
  ).all(...ids);
  const map = {};
  for (const r of rows) {
    if (!map[r.plan_id]) map[r.plan_id] = [];
    map[r.plan_id].push(r);
  }
  return plans.map(p => ({ ...p, exercises: map[p.id] || [] }));
}

function registerWorkoutPlansIpc() {
  ipcMain.handle('workoutPlans:getAll', () => {
    const db = getDb();
    const plans = db.prepare(
      `SELECT wp.*, COUNT(wpe.id) AS exercise_count
       FROM workout_plans wp
       LEFT JOIN workout_plan_exercises wpe ON wpe.plan_id = wp.id
       GROUP BY wp.id ORDER BY wp.created_at DESC`
    ).all();
    return plans;
  });

  ipcMain.handle('workoutPlans:get', (_, { id }) => {
    const db = getDb();
    const plan = db.prepare('SELECT * FROM workout_plans WHERE id=?').get(id);
    if (!plan) return null;
    return withExercises(db, [plan])[0];
  });

  ipcMain.handle('workoutPlans:create', (_, { name, description, exercises }) => {
    const db = getDb();
    return db.transaction(() => {
      const { lastInsertRowid } = db.prepare(
        'INSERT INTO workout_plans (name, description) VALUES (?, ?)'
      ).run(name, description || null);
      const ins = db.prepare(
        'INSERT INTO workout_plan_exercises (plan_id, exercise_type_id, sort_order, target_sets, target_reps, target_duration_min, target_weight_kg, rest_sec, is_optional, superset_group, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );
      (exercises || []).forEach((ex, i) => {
        ins.run(lastInsertRowid, ex.exercise_type_id, i, ex.target_sets || null, ex.target_reps || null, ex.target_duration_min || null, ex.target_weight_kg || null, ex.rest_sec || null, ex.is_optional ? 1 : 0, ex.superset_group || null, ex.notes || null);
      });
      return { id: lastInsertRowid };
    })();
  });

  ipcMain.handle('workoutPlans:update', (_, { id, name, description, exercises }) => {
    const db = getDb();
    return db.transaction(() => {
      db.prepare('UPDATE workout_plans SET name=?, description=?, updated_at=date(\'now\') WHERE id=?').run(name, description || null, id);
      db.prepare('DELETE FROM workout_plan_exercises WHERE plan_id=?').run(id);
      const ins = db.prepare(
        'INSERT INTO workout_plan_exercises (plan_id, exercise_type_id, sort_order, target_sets, target_reps, target_duration_min, target_weight_kg, rest_sec, is_optional, superset_group, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );
      (exercises || []).forEach((ex, i) => {
        ins.run(id, ex.exercise_type_id, i, ex.target_sets || null, ex.target_reps || null, ex.target_duration_min || null, ex.target_weight_kg || null, ex.rest_sec || null, ex.is_optional ? 1 : 0, ex.superset_group || null, ex.notes || null);
      });
      return { ok: true };
    })();
  });

  ipcMain.handle('workoutPlans:delete', (_, { id }) => {
    getDb().prepare('DELETE FROM workout_plans WHERE id=?').run(id);
    return { ok: true };
  });

  ipcMain.handle('workoutPlans:duplicate', (_, { id }) => {
    const db = getDb();
    return db.transaction(() => {
      const original = db.prepare('SELECT * FROM workout_plans WHERE id=?').get(id);
      if (!original) return { ok: false };
      const { lastInsertRowid: newId } = db.prepare(
        'INSERT INTO workout_plans (name, description) VALUES (?, ?)'
      ).run(original.name + ' (copy)', original.description);
      const exercises = db.prepare('SELECT * FROM workout_plan_exercises WHERE plan_id=? ORDER BY sort_order').all(id);
      const ins = db.prepare(
        'INSERT INTO workout_plan_exercises (plan_id, exercise_type_id, sort_order, target_sets, target_reps, target_duration_min, target_weight_kg, rest_sec, is_optional, superset_group, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );
      exercises.forEach(ex => {
        ins.run(newId, ex.exercise_type_id, ex.sort_order, ex.target_sets, ex.target_reps, ex.target_duration_min, ex.target_weight_kg, ex.rest_sec, ex.is_optional, ex.superset_group, ex.notes);
      });
      return { id: newId };
    })();
  });
}

module.exports = registerWorkoutPlansIpc;
