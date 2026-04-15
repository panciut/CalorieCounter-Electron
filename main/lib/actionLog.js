// Append a row to action_log. Call this inside any IPC handler after the DB mutation.
function logAction(db, kind, { food_name, grams, details } = {}) {
  try {
    db.prepare(`
      INSERT INTO action_log (kind, food_name, grams, details)
      VALUES (?, ?, ?, ?)
    `).run(kind, food_name ?? null, grams ?? null, details ? JSON.stringify(details) : null);
  } catch (e) {
    // Never crash the caller because of logging
    console.warn('[actionLog] failed:', e.message);
  }
}

module.exports = { logAction };
