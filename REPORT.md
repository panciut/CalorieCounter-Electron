# CalorieCounter Electron — Application Report

## Overview

A personal Mac desktop app for tracking daily food intake, macronutrients, water consumption, and body weight. Built as an Electron app with a dark-themed single-page renderer, replacing an earlier Flask/Python web version. All data is stored locally; no network required.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron 33 |
| Database | better-sqlite3 (synchronous SQLite) |
| Charts | Chart.js 4 (UMD, vendored from node_modules) |
| Fuzzy search | Fuse.js 7 (vendored) |
| Frontend | Vanilla JS, HTML, CSS — no framework |
| IPC bridge | `contextBridge` + `ipcMain.handle` / `ipcRenderer.invoke` |

---

## Architecture

```
main process (Node.js)
├── main.js          — BrowserWindow, IPC registration, globalShortcut
├── preload.js       — contextBridge: exposes window.electronAPI.{invoke, on, off}
├── db.js            — better-sqlite3 singleton, initDb(), migrations
└── ipc/
    ├── foods.ipc.js
    ├── log.ipc.js
    ├── recipes.ipc.js
    ├── water.ipc.js
    ├── weight.ipc.js
    └── settings.ipc.js

renderer process (browser-like, no Node access)
├── index.html       — single-page shell with all <section class="page"> + <dialog> modals
├── style.css
└── js/
    ├── api.js           — thin async wrappers over window.electronAPI.invoke
    ├── router.js        — navigate(page, param), DOMContentLoaded boot
    ├── shortcuts.js     — keyboard shortcut handler
    ├── components/
    │   ├── foodSearch.js  — Fuse.js dropdown (FoodSearch class)
    │   ├── macroChart.js  — Chart.js doughnut factory
    │   └── barChart.js    — Chart.js bar + line chart factories
    └── pages/
        ├── dashboard.js, foods.js, recipes.js, history.js
        ├── week.js, day.js, weight.js, settings.js
```

The renderer uses classic `<script>` tags (not ES modules), so all page functions are globals. The router hides/shows `<section class="page">` elements and calls each page's `xOnEnter(param)` function on navigation.

---

## Database

**Location:** `~/Library/Application Support/caloriecounter/calories.db`
**Mode:** WAL + foreign keys enabled

| Table | Key Columns | Notes |
|---|---|---|
| `foods` | `id, name, calories, protein, carbs, fat, piece_grams, favorite` | `piece_grams` enables piece-count logging; `favorite` is 0/1 |
| `log` | `id, date TEXT, food_id, grams, meal TEXT` | meal = Breakfast/Lunch/Dinner/Snack |
| `settings` | `key TEXT PK, value TEXT` | key-value store |
| `weight_log` | `id, date TEXT UNIQUE, weight REAL` | one entry per date (upsert on conflict) |
| `recipes` | `id, name UNIQUE, description` | |
| `recipe_ingredients` | `id, recipe_id, food_id, grams` | CASCADE delete when recipe deleted |
| `water_log` | `id, date TEXT, ml REAL` | multiple rows per day, summed at query time |

**Default settings keys:** `cal_goal` (2000), `protein_goal` (150), `carbs_goal` (250), `fat_goal` (70), `weight_goal` (0), `water_goal` (2000)

**Migrations** (safe, wrapped in try/catch): adds `piece_grams` and `favorite` to `foods`, adds `meal` to `log` — so an imported Flask DB upgrades automatically.

---

## IPC API

All calls go through `window.electronAPI.invoke(channel, args)`.

### `foods:*`
| Channel | Description |
|---|---|
| `foods:getAll` | All foods, ordered by name |
| `foods:getFavorites` | Foods with `favorite = 1` |
| `foods:add` | Insert food; returns `{ id }` |
| `foods:delete` | Delete by id |
| `foods:toggleFavorite` | Flips 0↔1; returns `{ favorite }` |

### `log:*`
| Channel | Description |
|---|---|
| `log:getDay` | All entries for a date with computed kcal/macros (JOIN foods); ordered Breakfast→Lunch→Dinner→Snack |
| `log:add` | Insert log entry |
| `log:addQuick` | Atomic transaction: insert food + log entry |
| `log:update` | Update grams/food/meal for an entry |
| `log:delete` | Delete entry by id |
| `log:getWeeklySummaries` | Aggregate by ISO week: avg kcal/protein/carbs/fat, days logged; descending |
| `log:getWeekDetail` | Per-day totals for a 7-day window starting `weekStart` |

### `recipes:*`
| Channel | Description |
|---|---|
| `recipes:getAll` | All recipes with aggregated totals + ingredient count |
| `recipes:get` | Single recipe with ingredient list (with per-ingredient macros) |
| `recipes:create` | Atomic: insert recipe + all ingredients |
| `recipes:delete` | Delete recipe (cascades to ingredients) |
| `recipes:log` | Expand recipe into individual log rows; supports `scale` multiplier |
| `recipes:updateIngredients` | Replace all ingredients for a recipe |

### `water:*`
| Channel | Description |
|---|---|
| `water:getDay` | `{ total_ml, entries[] }` for a date |
| `water:add` | Insert a water entry |
| `water:delete` | Delete by id |

### `weight:*`
| Channel | Description |
|---|---|
| `weight:getAll` | All weight entries, ascending by date |
| `weight:add` | Upsert (date is unique) |
| `weight:delete` | Delete by id |

### `settings:*`
| Channel | Description |
|---|---|
| `settings:get` | Returns all goals as a flat object with numeric values |
| `settings:save` | Upserts any subset of keys |

---

## Pages & Features

### Dashboard (`dashboard.js`)
- Date header (today)
- **Macro totals**: kcal, protein, carbs, fat with color-coded progress bars (green/yellow/red based on % of goal)
- **Macro pie chart**: Chart.js doughnut (protein=green, carbs=orange, fat=yellow) with center kcal label
- **Favorites row**: one-click log buttons for starred foods (uses `piece_grams` or 100g default)
- **Fuzzy food search**: Fuse.js dropdown (threshold 0.4), supports Arrow/Enter/Escape navigation; shows a "recipe" badge for recipes
- **Log form**: appears on food selection; switches between grams input and piece-count input based on `piece_grams`
- **Meal-grouped entry table**: editable rows (inline expand) with delete; shared with the Day page
- **Water section**: progress bar, +200ml / +500ml / custom buttons; custom amount via `<dialog>`
- **Quick-food dialog**: add a one-off food+log entry in one step; includes macro preset buttons (high-protein, balanced, high-carb) that auto-fill macros from kcal

### Foods (`foods.js`)
- Full food database CRUD: add with name/kcal/protein/carbs/fat/piece_grams, delete
- Toggle favorite star per food
- Macro preset buttons (same as quick-food dialog)

### Recipes (`recipes.js`)
- Recipe card list with aggregated macros + ingredient count
- **Create dialog**: name + description + ingredient builder (FoodSearch per ingredient, grams, live macro total preview)
- **Log dialog**: meal picker + scale multiplier (default 1.0) + macro preview; calls `recipes:log` which expands to N log rows
- Delete recipe

### History (`history.js`)
- Weekly summaries table: week start, days logged / 7, avg kcal/protein/carbs/fat
- Bar chart (last 12 weeks) with dashed calorie goal line
- Click a week row → navigates to Week page

### Week (`week.js`)
- 7-day bar chart + per-day rows showing kcal/protein/carbs/fat
- Click a day row → navigates to Day page

### Day (`day.js`)
- Single-day food log, same meal-grouped entry table as dashboard
- "Add food" button opens Quick-food dialog targeting that day's date
- Back navigation to Week page

### Weight (`weight.js`)
- Add weight entry form (date + value)
- Line chart with: actual weight points, linear regression trend line, optional goal line
- Goal-date prediction based on trend slope
- Entry table with delete

### Settings (`settings.js`)
- Form for all numeric goals: calories, protein, carbs, fat, weight, water
- Saved via `settings:save` on submit

---

## Cross-Cutting Features

**Keyboard shortcuts** (`shortcuts.js`):
- `1–6`: navigate to Dashboard / Foods / Recipes / History / Weight / Settings (blocked when focus is in an input)
- `Escape`: close topmost open `<dialog>`
- `Cmd/Ctrl+N`: global shortcut registered in main process → sends `shortcut:quickAdd` IPC → focuses dashboard food search

**Dev seeding** (`seed_dev.js`):
- Runs once on startup (guarded by `seeded_dev` settings key)
- Populates 3 weeks of log data (~85% of days), weekly weight entries (84.5 → ~82 kg trend), today's partial log (breakfast + lunch), water entries
- Uses deterministic pseudo-RNG (seed=42) for reproducibility

**Migration support**: `initDb()` safely upgrades an imported Flask SQLite DB via `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE` in try/catch blocks.

---

## Known Issues / Notes

- **UTC date bug**: `new Date().toISOString().slice(0, 10)` returns UTC date; if local timezone is ahead of UTC, entries logged at night may land on the wrong date. This affects both the dashboard's "today" query and seed data. Fix: use local date via `new Date().toLocaleDateString('sv')` or manual formatting.
- **DevTools auto-open**: `mainWindow.webContents.openDevTools()` is called unconditionally — should be gated on a dev flag before shipping.
- **No input validation** on the main process side: IPC handlers trust renderer input (acceptable for a local single-user app).
