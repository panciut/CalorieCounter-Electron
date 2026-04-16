// Notification generators — pure functions that read the DB and return
// structured notification data. All i18n happens in the renderer.

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysUntilISO(iso) {
  const target = new Date(iso + 'T00:00:00').getTime();
  const now = new Date(todayISO() + 'T00:00:00').getTime();
  return Math.round((target - now) / 86400_000);
}

function getSettingInt(db, key, fallback) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  if (!row) return fallback;
  const n = parseInt(row.value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function getSettingStr(db, key, fallback) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

function generatePantryExpiryNotifications(db) {
  if (getSettingStr(db, 'pantry_enabled', '1') !== '1') return [];
  if (getSettingStr(db, 'notif_pantry_expiry', '1') !== '1') return [];
  const warn = getSettingInt(db, 'pantry_warn_days', 3);
  const urgent = getSettingInt(db, 'pantry_urgent_days', 1);

  const rows = db.prepare(`
    SELECT p.id, p.expiry_date, p.opened_at, p.opened_days, f.name
    FROM pantry p
    JOIN foods f ON f.id = p.food_id
    WHERE p.quantity_g > 0
  `).all();

  const out = [];
  const now = Date.now();

  for (const r of rows) {
    // a) calendar expiry
    if (r.expiry_date) {
      const d = daysUntilISO(r.expiry_date);
      if (d <= warn) {
        out.push({
          key: `pantry_expiry:batch=${r.id}:${r.expiry_date}`,
          type: 'pantry_expiry',
          severity: d <= urgent ? 'urgent' : 'warn',
          payload: {
            food_name: r.name,
            days_until: d,
            expiry_date: r.expiry_date,
          },
          action: { page: 'pantry' },
          created_at: new Date().toISOString(),
        });
      }
    }

    // b) opened-pack expiry (opened_at + opened_days)
    if (r.opened_at && r.opened_days) {
      const dueMs = new Date(r.opened_at).getTime() + r.opened_days * 86400_000;
      const daysLeft = Math.ceil((dueMs - now) / 86400_000);
      if (daysLeft <= warn) {
        out.push({
          key: `pantry_opened:batch=${r.id}:${r.opened_at}:${r.opened_days}`,
          type: 'pantry_opened',
          severity: daysLeft <= urgent ? 'urgent' : 'warn',
          payload: {
            food_name: r.name,
            days_until: daysLeft,
          },
          action: { page: 'pantry' },
          created_at: new Date().toISOString(),
        });
      }
    }
  }
  return out;
}

function hasAnyData(db) {
  const row = db.prepare('SELECT MIN(date) AS min_date FROM log').get();
  return row && row.min_date != null;
}

function generateMissingLogNotifications(db) {
  if (getSettingStr(db, 'notif_missing_log', '1') !== '1') return [];
  if (!hasAnyData(db)) return [];
  const y = yesterdayISO();
  const count = db.prepare(
    "SELECT COUNT(*) AS n FROM log WHERE date = ? AND status = 'logged'"
  ).get(y).n;
  if (count > 0) return [];
  return [{
    key: `missing_log:${y}`,
    type: 'missing_log',
    severity: 'warn',
    payload: { date: y },
    action: { page: 'history', params: { date: y } },
    created_at: new Date().toISOString(),
  }];
}

function generateMissingActiveEnergyNotifications(db) {
  if (getSettingStr(db, 'notif_missing_energy', '1') !== '1') return [];
  if (!hasAnyData(db)) return [];
  const y = yesterdayISO();
  const row = db.prepare('SELECT active_kcal FROM daily_energy WHERE date = ?').get(y);
  if (row && row.active_kcal > 0) return [];
  return [{
    key: `missing_active_energy:${y}`,
    type: 'missing_active_energy',
    severity: 'info',
    payload: { date: y },
    action: { page: 'net' },
    created_at: new Date().toISOString(),
  }];
}

function generateLowPantryNotifications(db) {
  if (getSettingStr(db, 'pantry_enabled', '1') !== '1') return [];
  if (getSettingStr(db, 'notif_low_pantry', '1') !== '1') return [];

  // Group pantry batches by food — only consider foods with exactly one batch remaining
  const rows = db.prepare(`
    SELECT p.food_id, f.name, f.piece_grams,
           COUNT(*) AS batch_count,
           MIN(p.quantity_g) AS quantity_g,
           MIN(p.starting_grams) AS starting_grams
    FROM pantry p
    JOIN foods f ON f.id = p.food_id
    WHERE p.quantity_g > 0
    GROUP BY p.food_id
    HAVING batch_count = 1
  `).all();

  const out = [];
  for (const r of rows) {
    let isLow = false;

    if (r.piece_grams) {
      // Discrete items: low if less than one serving remains
      isLow = r.quantity_g < r.piece_grams;
    } else if (r.starting_grams) {
      // Bulk / no piece_grams: low if less than 20% of the original pack remains
      isLow = r.quantity_g < r.starting_grams * 0.2;
    }

    if (isLow) {
      out.push({
        key: `low_pantry:food=${r.food_id}`,
        type: 'low_pantry',
        severity: 'info',
        payload: {
          food_name: r.name,
          remaining_g: Math.round(r.quantity_g),
        },
        action: { page: 'pantry' },
        created_at: new Date().toISOString(),
      });
    }
  }
  return out;
}

function generateMissingWeightNotifications(db) {
  if (getSettingStr(db, 'notif_weight', '1') !== '1') return [];
  const warnDays = getSettingInt(db, 'notif_weight_warn_days', 3);
  const urgentDays = getSettingInt(db, 'notif_weight_urgent_days', 7);

  const row = db.prepare('SELECT MAX(date) AS last_date FROM weight_log').get();
  if (!row || !row.last_date) return []; // never logged weight — no nag

  const daysSince = -daysUntilISO(row.last_date); // daysUntilISO returns negative for past dates
  if (daysSince < warnDays) return [];

  return [{
    key: `missing_weight:${todayISO()}`,
    type: 'missing_weight',
    severity: daysSince >= urgentDays ? 'urgent' : 'warn',
    payload: { days_since: daysSince },
    action: { page: 'weight' },
    created_at: new Date().toISOString(),
  }];
}

function generateAll(db) {
  const out = [];
  try { out.push(...generatePantryExpiryNotifications(db)); } catch (e) { console.error('pantry_expiry gen failed:', e); }
  try { out.push(...generateLowPantryNotifications(db)); } catch (e) { console.error('low_pantry gen failed:', e); }
  try { out.push(...generateMissingLogNotifications(db)); } catch (e) { console.error('missing_log gen failed:', e); }
  try { out.push(...generateMissingActiveEnergyNotifications(db)); } catch (e) { console.error('missing_active_energy gen failed:', e); }
  try { out.push(...generateMissingWeightNotifications(db)); } catch (e) { console.error('missing_weight gen failed:', e); }
  return out;
}

module.exports = { generateAll };
