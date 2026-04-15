# CalorieCounter

A macOS desktop app for tracking calories, macros, exercise, body composition, water, supplements, and more. Built with Electron + React.

## Features

### Daily tracking
- Log food by meal (Breakfast, Lunch, Dinner, Snack) with gram-level precision
- Calorie and macro totals (protein, carbs, fat, fiber) with configurable min/rec/max ranges
- Plan meals ahead and confirm them as logged
- Quick-log one-off foods without saving them to the database
- Copy the day (or week, or full history) to clipboard as structured Markdown — includes targets with ranges, per-meal breakdown, energy balance, and notes

### Food database
- Searchable food library with fuzzy search (Fuse.js)
- Barcode scanning via camera (html5-qrcode) with automatic nutrition lookup
- Per-food package sizes, piece weights, liquid flag
- Mark favorites; view frequently used foods
- Configurable opened shelf life (`opened_days`) and discard threshold per food
- Import foods from CSV or JSON; export to CSV

### Pantry
- Track pantry stock by batch, with optional expiry dates
- FEFO (First-Expired-First-Out) deduction whenever food is logged or a recipe is cooked
- **Opened pack lifecycle:**
  - First deduction from a sealed batch shows a corner toast (if shelf life is already set) or a modal to input it
  - When a batch is opened, `expiry_date` is updated to `MIN(sealed expiry, opened_at + opened_days)`
  - Small overflows (≤ max(15g, 5% of pack)) prompt "residuals or new pack?" instead of silently opening the next batch
  - Near-empty prompt (configurable %, default 10%) offers to discard the remainder
  - Finished batch suggests adding to shopping list
- Shopping list with check-off and bulk clear

### Recipes & bundles
- Simple bundles (fixed ingredient sets, no yield)
- Actual recipes with yield, prep/cook time, tools, procedure notes, and ingredients
- Check pantry availability before cooking; deduct stock on cook

### Exercise & energy
- Log workouts by type with duration and calories burned
- Built-in exercise type library with MET values; add custom types
- Strength sets (reps × weight) per exercise
- Net calories view: intake vs. resting + active + extra energy out
- Daily energy entries (resting, active, extra kcal)

### Body & health
- Weight log with body fat %, muscle mass, water %, bone mass
- Body measurements (waist, chest, arms, thighs, hips, neck)
- Supplement tracker with daily adherence and history
- Water intake log with per-source tracking

### Goal intelligence
- TDEE estimation from weight and calorie history
- Goal suggestions (lose / maintain / gain) with recommended calorie and protein targets

### History & analytics
- Week view with daily breakdown table and averages
- Full history with weekly summaries
- Calorie, macro, and exercise trend charts (Recharts)
- Logging streaks (current and best)

### Data
- Full JSON export and backup/restore
- Import from JSON backup or CSV foods file
- Copy foods list or AI-prompt context to clipboard

### General
- Dark and light themes
- English and Italian UI
- Configurable navigation: drag-and-drop page order, hide/show pages
- Daily notes
- Undo stack for log actions

## Tech stack

| Layer | Library |
|---|---|
| Shell | Electron |
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS v4 |
| Database | better-sqlite3 (SQLite) |
| Charts | Recharts |
| Search | Fuse.js |
| Barcode | html5-qrcode |

## Dev setup

```bash
npm install
npm run rebuild   # rebuild native modules for Electron's Node version
npm run dev       # Vite + Electron together — Ctrl+C kills both
```

Or run the two halves separately:

```bash
npm run dev:vite      # renderer only
npm run dev:electron  # main process only
```

Build a distributable:

```bash
npm run build && npm run dist
```

## Project structure

```
main/
  main.js           Electron entry — registers all IPC handlers
  db.js             SQLite init, schema, migrations
  ipc/              One file per domain (log, foods, pantry, recipes, …)
  lib/              Shared helpers (pantryFefo.js, …)
src/
  pages/            One component per page
  components/       Shared UI (Nav, Modal, ConfirmDialog, Toast, …)
  hooks/            useSettings, useNavigate, useT, useToast, useDeductionEvents, …
  api.ts            Typed IPC wrappers
  types.ts          All shared TypeScript types
  i18n/             translations.ts (EN + IT)
  lib/              exportText.ts (Markdown builders for clipboard/export)
```

## Coding notes

- All renderer → main communication goes through `src/api.ts` typed wrappers.
- Every UI string must have both `en` and `it` entries in `src/i18n/translations.ts`.
- Never use `window.confirm` / `window.alert` — use `src/components/ConfirmDialog.tsx`.
- Never define React components inside other components (causes remount on every render).
- Restart Electron after any main-process change (`npm run dev:electron`).
