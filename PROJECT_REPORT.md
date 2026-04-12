# CalorieCounter — Project Report

A self-contained overview of what this app is, how it's built, and what it does. Intended both as local documentation and as context you can paste into a fresh Claude chat.

---

## 1. What it is

CalorieCounter is a **personal daily health OS** packaged as an Electron desktop app (macOS-first, Windows/Linux buildable). It goes beyond calorie tracking to cover planning, exercise, body composition, water, supplements, measurements, pantry, recipes, shopping lists, goal targets, and analytics — the goal is an app you open every morning for 2 minutes to plan the day and adjust through it, deep enough to give real insight when you dig in.

The author's use-case: lose weight now, switch to maintenance/muscle preservation later. Home workouts (dumbbells, bands, calisthenics). Apple Watch + Renpho smart scale via Apple Health (planned sync). Logs food at home, repeats meals often. Wants to plan the day the night before or in the morning, then adjust reality as it happens.

There is **no test suite** — changes are verified by running the app manually.

---

## 2. Tech stack

| Layer | Tech |
|---|---|
| Desktop shell | **Electron 33** (main process in Node, renderer is Chromium) |
| Renderer | **React 19** + **TypeScript** + **Vite 8** |
| Styling | **Tailwind CSS v4** (via `@tailwindcss/vite`) |
| Database | **better-sqlite3 11** (synchronous, embedded SQLite) |
| Charts | **Recharts 3** (donut, line, bar) |
| Food search | **Fuse.js 7** (fuzzy, threshold 0.4, on food name) |
| Barcode scanning | **html5-qrcode 2.3** (camera, EAN/UPC/Code128/Code39) |
| Food data source | **OpenFoodFacts** public API for barcode → nutrition |
| Packaging | **electron-builder 26** (DMG on mac, NSIS on Windows, AppImage on Linux) |
| i18n | Custom `useT()` hook with EN + IT maps in `src/i18n/translations.ts` |
| Dev runner | `concurrently` + `wait-on` (single-command `npm run dev`) |

---

## 3. Repository layout

```
main/                      Electron main process (Node side)
  main.js                  Entry — creates BrowserWindow, registers IPC
  db.js                    SQLite initialization, schema, migrations, seeds
  ipc/                     One file per domain; each exports a register fn
    log.ipc.js             food entries (planned + logged), water auto-log
    foods.ipc.js           foods CRUD + frequency-ranked list
    recipes.ipc.js         bundle recipes (fixed-portion)
    actual_recipes.ipc.js  actual recipes (with yield_g, scale by grams eaten)
    pantry.ipc.js          pantry upsert/set/delete, canMake, deductRecipe,
                           shopping_list CRUD
    water.ipc.js           water_log CRUD
    weight.ipc.js          weight + body composition
    exercises.ipc.js       exercise log + sets + MET-based kcal estimate
    supplements.ipc.js     supplements + daily tick
    measurements.ipc.js    body circumference measurements
    goals_tdee.ipc.js      TDEE / suggested calorie targets
    analytics.ipc.js       aggregated stats, charts data
    barcode.ipc.js         OpenFoodFacts lookup + local cache
    templates.ipc.js       meal templates
    notes.ipc.js           daily notes
    streaks.ipc.js         logging streak tracking
    import.ipc.js          JSON/CSV food import, full DB restore
    export.ipc.js          JSON/CSV exports, full DB backup
    settings.ipc.js        settings k/v
    undo.ipc.js            generic undo stack for reversible operations
  preload.js               contextBridge exposing window.electronAPI.invoke

src/                       React renderer
  api.ts                   Typed wrappers over window.electronAPI.invoke
  types.ts                 Shared TS types (LogEntry, Recipe, Food, Settings, …)
  pages/                   One file per page / nav item
    DashboardPage.tsx      Today — macros, food log, plan, water, streaks, etc.
    PlanPage.tsx           Day plan (draft) — defaults to tomorrow
    ExercisePage.tsx       Workout log (duration / sets / reps / kcal)
    NetPage.tsx            Net calories (intake − burned)
    WeekPage.tsx           Weekly rollups
    DayPage.tsx            Single day detail (from history)
    FoodsPage.tsx          Foods DB manager
    PantryPage.tsx         Pantry + shopping list (tabbed)
    RecipesPage.tsx        Bundles tab + Recipes tab
    HistoryPage.tsx        Calendar-style past day browser
    WeightPage.tsx         Weight + fat % / muscle / water / bone over time
    GoalsPage.tsx          Calorie/macro targets, tolerances, TDEE
    SupplementsPage.tsx    Supplement schedule + daily check-off
    MeasurementsPage.tsx   Waist/chest/arms/thighs/hips/neck
    DataPage.tsx           Import/export/backup/restore
    SettingsPage.tsx       Language, theme, goals, tolerances
  components/              Shared UI
    Nav.tsx                Sidebar with reorder + hide (Edit mode)
    Modal.tsx              Base modal shell
    ConfirmDialog.tsx      Mandatory replacement for window.confirm
    Toast.tsx              useToast() provider
    FoodSearch.tsx         Fuse.js autocomplete for foods + recipes
    EntryTable.tsx         Log entry list with inline edit, meal grouping
    MealPills.tsx          Meal selector (Breakfast/Lunch/Dinner/Snack)
    MacroChart.tsx         Donut — macros + translucent planned outer ring
    MacroBars.tsx          5 horizontal progress bars with dual fill (actual + planned)
    BarChartCard.tsx       Recharts bar card wrapper
    LineChartCard.tsx      Recharts line card wrapper
    ExerciseSection.tsx    Dashboard exercise summary
    BarcodeScanner.tsx     html5-qrcode modal
  hooks/
    useSettings.ts         Settings context + hook
    useNavigate.ts         Page router (not React Router — custom)
    useT.ts                i18n hook
    useToast.ts            Toast display
    useUndo.ts             Keyboard Cmd+Z → undo IPC
  i18n/translations.ts     EN + IT strings
  lib/                     Pure helpers (dateUtil, macroCalc, …)

CLAUDE.md                  Project instructions for Claude Code
package.json               Scripts + electron-builder config
vite.config.ts             Vite config (strictPort 5173 for Electron loadURL)
```

---

## 4. Architecture

### Process model

Standard Electron two-process split:

- **Main process** (`main/main.js`) — Node.js. Owns the SQLite database (via `better-sqlite3`, which is synchronous — no async handlers needed). Registers all IPC handlers. Manages the BrowserWindow, native menu, dialogs.
- **Renderer** (React app in `src/`) — Chromium. No direct Node access. Talks to main via a single bridged method: `window.electronAPI.invoke(channel, data)`, exposed by `main/preload.js` using `contextBridge`.

### IPC contract

Every renderer→main call goes through **`src/api.ts`**, which wraps `window.electronAPI.invoke` in typed methods per domain:

```ts
// Renderer call
await api.log.getDay(dateStr);
// becomes
await window.electronAPI.invoke('log:getDay', { date: dateStr });
```

Conventions:
- Channel names are `domain:verb` (`log:getDay`, `pantry:upsert`, `foods:toggleFavorite`).
- `main/ipc/<domain>.ipc.js` exports a `register*Ipc()` function that registers all its channels; `main/main.js` calls every registrar at startup.
- The renderer never builds channel strings by hand — always goes through the typed wrapper.

### Database

SQLite file lives in Electron's `app.getPath('userData')` (macOS: `~/Library/Application Support/CalorieCounter/`). `main/db.js` creates tables with `CREATE TABLE IF NOT EXISTS`, then runs an idempotent migration array (`ALTER TABLE … ADD COLUMN`, wrapped in try/catch so re-running is safe), then seeds default settings and exercise types.

**20 tables:**

| Table | Purpose |
|---|---|
| `foods` | Food DB. `name`, `calories`, `protein/carbs/fat/fiber`, `piece_grams`, `favorite`, `is_liquid` |
| `log` | Food entries. `date`, `food_id`, `grams`, `meal`, **`status` = `'logged'` \| `'planned'`** |
| `settings` | Key/value preferences (goals, tolerances, theme, language) |
| `weight_log` | `date`, `weight`, `fat_pct`, `muscle_mass`, `water_pct`, `bone_mass` (one per day) |
| `recipes` | Bundle recipes — fixed-portion shortcut, no yield concept |
| `recipe_ingredients` | Join: `recipe_id`, `food_id`, `grams` |
| `actual_recipes` | Recipes with `yield_g` + `notes`. Logged by grams eaten, scaled automatically |
| `actual_recipe_ingredients` | Join table for actual recipes |
| `exercises` | Workout log: `type`, `duration_min`, `calories_burned`, `source` |
| `exercise_sets` | Sets/reps/weight per exercise |
| `exercise_types` | Seed: Running/Cycling/HIIT/… with MET values for kcal estimation |
| `water_log` | `date`, `ml`, `source`, `log_id` (nullable FK — populated when auto-derived from a liquid food log) |
| `daily_notes` | One free-form note per date |
| `supplements` | Supplement schedule (name + daily qty target) |
| `supplement_log` | Daily count (unique on `supplement_id, date`) |
| `meal_templates` | Named sets of food entries for quick-log |
| `template_items` | Foods inside a template |
| `body_measurements` | Waist/chest/arms/thighs/hips/neck per date |
| `undo_stack` | Generic undo trail for reversible ops |
| `pantry` | `food_id` (unique), `quantity_g`. One pantry row per food |
| `shopping_list` | `food_id`, `quantity_g`, `checked` |

### Planning model (important)

There is **no separate plan table**. Planned and logged entries share the `log` table, distinguished only by `status` (`'logged'` vs `'planned'`). Implications:

- `log:getDay` returns both statuses; the renderer splits them.
- Confirming a planned entry is a status flip — not a row insert.
- Water auto-log from liquid foods is **deferred**: `log:add` skips `water_log` insertion when `status='planned'`, and `log:confirmPlanned` / `log:confirmAllPlanned` do the water insert on confirm (fixed in a recent patch — transactional, with a duplicate guard on `water_log.log_id`).
- Weekly summaries and other aggregates filter `WHERE status='logged'` so plans don't pollute historical stats.

### Planning in the UI

- **PlanPage**: dedicated page defaulting to *tomorrow*, for building the next day's plan.
- **DashboardPage**: if today has planned entries, shows a "Confirm All" banner, an EntryTable row with a "confirm" action per planned item, and (in the latest patch) visualises planned additions in the macro bars/donut/remaining calories.
- A "planMode" toggle on DashboardPage makes the food-search add-entry form write planned entries instead of logged.

### i18n

`src/i18n/translations.ts` has two flat maps (`en` and `it`). `useT()` returns `t(key)` against the active language from Settings. **Every new string must be added to both maps** — this is enforced as a convention in `CLAUDE.md`. There is no lazy loading; both languages ship in the bundle (tiny).

---

## 5. Features page by page

- **Dashboard (Today)** — The daily command center. Macros donut + 5 bars (kcal, protein, carbs, fat, fiber) with color-coded tolerance zones, "kcal remaining" headline (optionally "N after plan" if planned entries exist), food search + quick-log form, meal-grouped entry table, plan banner + "Confirm All", water progress bar, exercise summary + net calories, streak card, supplements check-off, daily note, recent/frequent/favorite foods. Handles "plan mode" toggle to log to plan instead of actual.

- **Plan** — Same visual vocabulary as Dashboard but scoped to building a future day (defaults to tomorrow). Entries are written as `status='planned'`. Confirming moves them to `'logged'`.

- **Exercise** — Log workouts by type + duration + optional sets/reps/weight. Kcal burned computed from MET × duration × user weight, user-overridable. Exercise types are seeded but user-extensible.

- **Net** — Dedicated view for intake − burned = net calories over time.

- **Week** — Rolling weekly summary page: avg calories, macros, deficit/surplus, days logged, anchored on this Monday. Uses `log:getWeeklySummaries` and `log:getWeekDetail`.

- **Foods** — Manage the foods database: add/edit/delete, mark favorites, see frequency-ranked list, import from CSV/JSON.

- **Pantry** (two tabs)
  - **Pantry tab**: add quantities by food + grams (or pieces when `piece_grams` is set). Barcode scan (html5-qrcode → OpenFoodFacts → auto-create food → prompt for quantity). Inline edit.
  - **Shopping List tab**: add items, check/uncheck, clear checked, bulk-add "missing ingredients" from a recipe.

- **Recipes** (two tabs)
  - **Bundles tab**: fixed-portion recipes (the `recipes` table). Logging adds all ingredient lines to the food log scaled by a `logScale` multiplier. Now has an **opt-in "Use from pantry" checkbox** that calls `pantry:deductRecipe` on confirm, with missing-ingredients warning.
  - **Recipes tab** (actual recipes): recipes with `yield_g`. User logs by "how much did you eat in grams", which derives scale = grams_eaten / yield_g and both logs food entries AND optionally deducts from pantry at that scale. Shows a live macro preview.
  - Both tabs: "Can make" filter (badge per card: ✓/N missing), "+ shopping list" button to bulk-add missing ingredients.

- **History** — Calendar-style past day browser.

- **Weight** — Weight trend chart + body composition (fat %, muscle mass, water %, bone mass — manual entry for now). One row per day, upserted.

- **Goals** — Calorie/macro targets (min/rec/max), tolerances for bar color thresholds (`tol_1/2/3`), TDEE helper, weight goal.

- **Supplements** — Schedule (supplement + daily target) + per-day check-off. Dashboard shows "all taken" / remaining summary.

- **Measurements** — Body circumferences over time (waist/chest/arms/thighs/hips/neck).

- **Data** — Import/export/backup/restore. JSON + CSV. Can restore a full SQLite backup.

- **Settings** — Language (EN/IT), theme (light/dark), daily goals, bar tolerances, water goal, import/export shortcuts.

---

## 6. Navigation

Custom router (not React Router). `useNavigate()` from `src/hooks/useNavigate.ts` holds the active page in context; `Nav.tsx` renders the sidebar and drives the active state.

The sidebar has an **Edit mode** (toggled by a button in the nav header):
- Drag-and-drop reordering (order persisted to `localStorage` under `nav_order`).
- Per-item eye toggle to **hide** pages you don't use (persisted under `nav_hidden`). Dashboard and Settings are marked unhideable so the user can always reach them.
- Normal mode filters out hidden pages automatically.

No keyboard-shortcut navigation currently (a hard-coded 1–0 shortcut hook was removed because it conflicted with the reorder/hide feature).

---

## 7. Conventions & guardrails

These are enforced in `CLAUDE.md` and have bitten real bugs in the past:

1. **IPC only through `src/api.ts`.** Never call `window.electronAPI.invoke` directly from a page/component. This keeps types honest and refactors tractable.
2. **Both languages, always.** Every new UI string must exist in both `en` and `it` in `src/i18n/translations.ts`. Hardcoded English in JSX is a bug.
3. **No native dialogs.** Never use `window.confirm/alert/prompt` — they cause Electron focus bugs. Use `src/components/ConfirmDialog.tsx` with a matching `useState` trigger.
4. **Define components at module level.** Never define a React component inside another component — re-renders create new component identities, unmounting inputs and causing focus loss. This is the single most common class of bug in this stack.
5. **Restart Electron after changes** to `main/**` — the main process isn't hot-reloaded. Vite HMR handles the renderer.
6. **Destructive actions need confirmation.** Always go through `ConfirmDialog` before deleting, restoring, clearing.
7. **No speculative abstractions.** The project deliberately keeps two similar 20-line blocks rather than building a premature shared helper. YAGNI is explicit.

---

## 8. Dev & build

```bash
# One-command dev — Vite + Electron, Ctrl+C kills both
npm run dev

# Split version (two terminals)
npm run dev:vite
npm run dev:electron

# Production bundle (renderer only)
npm run build

# Full distributable (DMG on mac)
npm run dist      # -> dist/mac-arm64/CalorieCounter.app + dist/*.dmg

# Rebuild native modules after Node/Electron version change
npm run rebuild   # electron-rebuild for better-sqlite3
```

Vite is pinned to port **5173** with `strictPort: true` because `main/main.js` hard-codes `loadURL('http://localhost:5173')`. If another project is on 5173, `npm run dev` will fail loudly — that's intentional (previously it silently loaded the wrong project's code into Electron).

---

## 9. Roadmap status (vs. the author's vision)

The roadmap (from user discovery) in priority order, with current state:

| # | Feature | Status |
|---|---|---|
| 1 | Day planning (draft/plan mode, confirm flow) | ✅ **Done** — PlanPage + plan-mode toggle on Dashboard, confirm single/all |
| 2 | Exercise logging (type, duration, sets/reps, kcal estimate) | ✅ **Done** — ExercisePage + MET-based estimator |
| 3 | Net calories on dashboard | ✅ **Done** — NetPage + dashboard exercise summary |
| 4 | Body composition tracking (fat/muscle/water/bone) | ✅ **Done** — WeightPage extended |
| 5 | **Apple Health sync (HealthKit)** | ❌ **Missing** — would need Swift helper / native node addon. Biggest gap. |
| 6 | Pantry + recipe integration + shopping list | ✅ **Mostly done** — pantry, canMake filter, shopping list, deduction for actual recipes AND bundles (latest patch), add-missing-to-shopping button |
| 7 | **Goal intelligence** (suggest target on goal change, nudge to maintenance) | ⚠️ **Partial** — GoalsPage + TDEE helper exist; suggestion logic is thin |
| 8 | Better analytics (weekly deficit chart, weight vs calories, workout frequency) | ⚠️ **Partial** — Week page + some charts; specific roadmap items not all built |
| 9 | Mobile companion (iOS) | ❌ **Not started** — explicitly "later" |

Recent notable changes (this session):
- Nav Edit mode now supports hiding pages (not just reordering).
- Bundle recipes now deduct from pantry on log (was actual-recipes-only).
- Dashboard visualises planned entries: striped translucent overlay in macro bars, outer translucent ring on the donut, "+N planned" subtitle, "N after plan" annotation on remaining kcal.
- Water counter now correctly updates when a planned liquid entry is confirmed (was broken — `confirmPlanned` flipped status but never inserted the deferred `water_log` row).
- Single-command dev (`npm run dev`) via `concurrently` + `wait-on`.
- Removed stale `useKeyboardShortcuts` hook (was hardcoded to the old static nav order).

---

## 10. Known caveats / things to watch

- **No automated tests.** Every behavior change must be verified in-app. There is no safety net beyond TypeScript + Vite build.
- **Better-sqlite3 is synchronous.** IPC handlers look sync — don't wrap in promises unless actually doing async work. This simplifies code a lot but surprises devs coming from `sqlite3` (callback-based) or Drizzle/Prisma.
- **The log table mixes planned and logged entries.** Any new read query touching `log` should explicitly decide whether it wants `WHERE status='logged'` (historical/analytics) or both (today views).
- **Water auto-log is tied to liquid foods.** A food is "liquid" if `is_liquid=1` in the `foods` table. Logging a liquid food inserts a `water_log` row with the same `log_id`; deleting the food log cascades the water deletion. Confirmation from plan → logged also triggers the water insert (recent fix).
- **Nav order and hidden pages live in `localStorage`**, not the SQLite DB. If you reinstall the app, the db persists but nav prefs reset.
- **Recipes vs ActualRecipes is a real semantic split, not a refactor artifact.** Bundles are "eat a fixed set". Actual recipes are "eat N grams of a dish with known total yield". Keep them separate — collapsing them has been considered and rejected.
- **i18n is incomplete inside `RecipesPage.tsx`** — much of its inline text is still English. Not a blocker, but if you add new strings there, consider whether to start i18n-ising or to match the existing style.

---

## 11. Useful entry points for a new Claude session

If you're sharing this report to get help, these are the highest-leverage files to also share depending on the task:

| Task | Files |
|---|---|
| Add a field to food/log/recipe | `main/db.js` (schema + migrations), `main/ipc/<domain>.ipc.js`, `src/types.ts`, `src/api.ts` |
| New page | `src/pages/NewPage.tsx`, add to nav in `src/components/Nav.tsx`, wire in `src/App.tsx`, add icon + translations |
| New shared UI element | `src/components/` + the consumer page |
| Change dashboard visuals | `src/pages/DashboardPage.tsx`, `src/components/MacroBars.tsx`, `src/components/MacroChart.tsx` |
| Pantry/recipe behavior | `main/ipc/pantry.ipc.js`, `src/pages/PantryPage.tsx`, `src/pages/RecipesPage.tsx` |
| Planning / confirm flow | `main/ipc/log.ipc.js` (especially `log:confirmPlanned` / `log:confirmAllPlanned`), `src/pages/PlanPage.tsx`, `src/pages/DashboardPage.tsx` |
| i18n / new strings | `src/i18n/translations.ts` (both `en` and `it`) |
| Settings / goals / tolerances | `main/ipc/settings.ipc.js`, `src/hooks/useSettings.ts`, `src/pages/SettingsPage.tsx`, `src/pages/GoalsPage.tsx`, `src/lib/macroCalc.ts` |
