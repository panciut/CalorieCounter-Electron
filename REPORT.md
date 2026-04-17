# CalorieCounter Electron — Application Report

*Last updated: 2026-04-17*

---

## Overview

A personal macOS desktop health OS built with Electron + React. Covers daily food logging, meal planning, exercise tracking, net calories, body composition, pantry management, recipes, supplements, water, measurements, and analytics. All data is stored locally in SQLite — no account or network required.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron 33 |
| Renderer | React 19, TypeScript, Vite 8, Tailwind CSS v4 |
| Database | better-sqlite3 (synchronous SQLite, WAL mode) |
| Charts | Recharts 3 |
| Fuzzy search | Fuse.js 7 |
| Barcode scanning | html5-qrcode |
| i18n | Custom `useT()` hook, EN + IT translations |
| IPC bridge | `contextBridge` + `ipcMain.handle` / `ipcRenderer.invoke` |

---

## Project Structure

```
main/                        Electron main process (Node.js, CommonJS)
├── main.js                  BrowserWindow, IPC registration, Apple Health bridge
├── preload.js               contextBridge: exposes window.electronAPI.{invoke,on,off}
├── db.js                    better-sqlite3 singleton, initDb(), migrations array
├── lib/
│   ├── pantryFefo.js        FEFO deduction engine for pantry batches
│   ├── notifications.js     Notification generation logic
│   └── actionLog.js         Pantry action audit log
└── ipc/                     One file per domain
    ├── log.ipc.js           Food log (add, update, delete, plan/confirm)
    ├── foods.ipc.js         Food database CRUD, barcode lookup
    ├── recipes.ipc.js       Bundle recipes (ratio-based)
    ├── actual_recipes.ipc.js Real recipes (yield_g, procedure)
    ├── pantry.ipc.js        Pantry batches, shopping list, canMake, FEFO deduction
    ├── exercises.ipc.js     Exercise logging, types catalog
    ├── workout_plans.ipc.js Workout plans + schedule
    ├── weight.ipc.js        Weight + body composition entries
    ├── water.ipc.js         Water entries
    ├── supplements.ipc.js   Supplement catalog, daily plan, adherence
    ├── measurements.ipc.js  Body measurements (waist, chest, arms…)
    ├── daily_energy.ipc.js  Resting/active/extra kcal entries
    ├── analytics.ipc.js     Trend queries (calorie, macro, exercise)
    ├── goals_tdee.ipc.js    TDEE estimation, goal suggestions
    ├── notifications.ipc.js Notification generation + dismissal
    ├── settings.ipc.js      App settings (goals, toggles, preferences)
    ├── notes.ipc.js         Daily notes
    ├── streaks.ipc.js       Logging streak (current + best)
    ├── barcode.ipc.js       OpenFoodFacts barcode lookup
    ├── templates.ipc.js     Meal templates / quick-add presets
    ├── undo.ipc.js          Last-action undo
    ├── export.ipc.js        JSON full backup export
    └── import.ipc.js        JSON backup import

src/                         React renderer (TypeScript)
├── api.ts                   Typed wrappers over window.electronAPI.invoke
├── types.ts                 All shared TypeScript interfaces and types
├── pages/                   One file per page (16 pages total)
├── components/              Shared UI components
│   ├── Nav.tsx              Sidebar navigation (draggable order, hideable pages)
│   ├── ConfirmDialog.tsx    Modal confirmation (used for all destructive actions)
│   ├── FoodSearch.tsx       Fuse.js food search dropdown
│   ├── EntryTable.tsx       Meal-grouped log entry table
│   ├── DeductionEventModal  FEFO event handler (opened/residual/near-empty/finished)
│   └── Toast.tsx            Transient toast notifications
├── hooks/
│   ├── useSettings.ts       Settings context + updater
│   ├── useNavigate.ts       Client-side router
│   └── useToast.ts          Toast trigger hook
├── lib/
│   └── macroCalc.ts         Macro range calculator + bar color logic
└── i18n/
    ├── translations.ts      EN + IT string map
    └── useT.ts              Translation hook
```

---

## Database

**Location:** `~/Library/Application Support/caloriecounter/calories.db`
**Mode:** WAL, foreign keys enabled
**Schema:** Managed in `main/db.js` via `CREATE TABLE IF NOT EXISTS` + an `ALTER TABLE` migrations array (each guarded by `PRAGMA table_info` to avoid re-applying).

### Key tables

| Table | Purpose |
|---|---|
| `foods` | Food database: calories/protein/carbs/fat/fiber per 100g, piece_grams, is_liquid, is_bulk, barcode, packages |
| `food_packages` | Package sizes (grams, price) per food |
| `log` | Daily food log: food_id, grams, meal, date, status (logged/planned) |
| `recipes` | Bundle recipes (food ratios) |
| `recipe_ingredients` | Ingredients per bundle recipe |
| `actual_recipes` | Real recipes with yield_g, procedure, prep/cook time |
| `actual_recipe_ingredients` | Ingredients per actual recipe |
| `pantries` | Named pantry locations (multi-pantry, one default) |
| `pantry` | Pantry batches: food_id, quantity_g, expiry_date, opened_at, package_id, pantry_id |
| `shopping_list` | Shopping items per pantry |
| `weight_log` | Weight + body composition entries (fat_pct, muscle_mass, water_pct, bone_mass) |
| `exercises` | Exercise sessions: type, duration, calories_burned, source |
| `exercise_sets` | Sets/reps/weight per exercise session |
| `exercise_types` | Exercise type catalog (MET, muscle groups, equipment) |
| `workout_plans` | Named workout plans |
| `workout_plan_exercises` | Exercises per plan (sets, reps, rest, superset) |
| `workout_schedule` | Planned/done/skipped/rest entries per date |
| `supplements` | Supplement catalog (name, description) |
| `supplement_plans` | Versioned daily supplement plans (effective_from) |
| `supplement_plan_items` | Items per plan (qty, unit, notes) |
| `supplement_log` | Daily supplement take log |
| `water_log` | Water entries per day |
| `measurements` | Body measurements (waist, chest, arms, thighs, hips, neck) |
| `daily_energy` | Resting + active + extra kcal per day |
| `daily_notes` | Free-text notes per day |
| `settings` | Key-value app settings |
| `dismissed_notifications` | Dismissed notification keys + expiry |
| `action_log` | Pantry action audit trail |

---

## Pages

| Page | Key features |
|---|---|
| **Dashboard** | Date navigation, macro totals + bars, pie chart, favorites row, food search + log form, meal-grouped entry table, planned vs actual, water widget, supplement widget, pantry selector (when >1 pantry) |
| **Exercise** | Log exercise sessions (type, duration, sets/reps), calorie burn estimate, workout plan runner, Apple Health import |
| **Net Calories** | Calories in − resting − active − extra = net, trend chart |
| **Foods** | Food database CRUD, barcode scanner, package management, favorite toggle, detail/edit mode |
| **Pantry** | Multi-pantry selector, batch management (add/edit/delete), expiry tracking, shopping list, canMake check, FEFO deduction, action log, pantry management modal |
| **Recipes** | Bundle recipes + actual recipes (with procedure), canMake filter, log to diary, deduct from pantry, add missing to shopping |
| **History** | Weekly summaries table + bar chart (12 weeks) |
| **Week** | 7-day macro breakdown + chart, click-through to day |
| **Day** | Single-day log, same as dashboard entry table |
| **Weight** | Weight + body composition log, trend chart with regression line, goal-date prediction |
| **Supplements** | Catalog (name + description), daily plan editor, adherence history, detail/edit modal |
| **Measurements** | Body measurements log + trend chart |
| **Goals** | TDEE estimation from history, goal-type suggestions (lose/maintain/gain), macro range calculator, full goals form |
| **Notifications** | In-app notification center: pantry expiry, low stock, missing log, missing energy, missing weight |
| **Data** | JSON export/import (full backup) |
| **Settings** | Language, theme, pantry toggles, notification toggles, default pantry, tolerances |

---

## Core Systems

### FEFO Pantry Engine (`main/lib/pantryFefo.js`)
Deducts food from pantry batches in First-Expired-First-Out order. Handles:
- Sealed batch opening (emits `opened` event → user sets opened_days)
- Open batch draining
- Residual detection (near-empty open batch → prompt for new pack)
- Near-empty warning (below discard threshold %)
- Finished batch cleanup
- Multi-pantry: all queries scoped to `pantry_id`

### Macro Range Calculator (`src/lib/macroCalc.ts`)
Given body weight (kg) and calorie target:
- **Protein:** 1.6 / 1.9 / 2.2 g/kg (min / rec / max)
- **Fat:** max(weight×0.6, 45g) / max(weight×0.7, cal×28%÷9) / cal×33%÷9
- **Carbs:** residual after protein + fat fill the calorie budget
- **Fiber:** 25 / 30 / 38g (fixed)

### TDEE Estimation (`main/ipc/goals_tdee.ipc.js`)
Linear regression over logged calorie intake vs weight change history. Returns TDEE estimate + confidence (low/medium/high based on data point count) + goal-type suggestions (lose/maintain/gain).

### Notifications (`main/lib/notifications.js`)
Generated on demand from current app state:
- `pantry_expiry` — batches expiring within warn/urgent threshold days
- `pantry_opened` — opened batches with no opened_days set
- `low_pantry` — foods with total stock below one serving
- `missing_log` — days with no food logged in recent history
- `missing_active_energy` — days with no exercise logged
- `missing_weight` — no weight entry within warn/urgent threshold days

### Multi-Pantry
`pantries` dimension table with `is_default`. `pantry_id` FK on `pantry` and `shopping_list` tables. All FEFO, canMake, stock check, and shopping queries are scoped per pantry. Dashboard persists pantry selection in localStorage, scoped to the current date (resets next day).

---

## i18n

All UI strings live in `src/i18n/translations.ts` as a typed key → `{ en, it }` map. The `useT()` hook reads the current `language` setting and returns the appropriate string. Every new UI text requires both EN and IT entries.

---

## Dev Commands

```bash
npm run dev          # Vite + Electron together (Ctrl+C kills both), port 5199
npm run dev:vite     # Vite renderer only
npm run dev:electron # Electron main only
npm run build && npm run dist  # Production build
npm run rebuild      # Rebuild native modules (after Node/Electron version change)
```
