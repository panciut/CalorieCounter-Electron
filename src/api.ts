import type {
  Food, FrequentFood, LogEntry, Meal, Recipe, Settings,
  WeightEntry, WaterDay, WaterEntry, DailyNote, Streak,
  Supplement, SupplementDay, Measurement,
  WeeklySummary, WeekDayDetail, BarcodeResult,
} from './types';

// ── Electron IPC bridge ──────────────────────────────────────────────────────

declare global {
  interface Window {
    electronAPI: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
      on:     (channel: string, cb: (...args: unknown[]) => void) => void;
      off:    (channel: string) => void;
    };
  }
}

function invoke<T>(channel: string, data?: unknown): Promise<T> {
  return window.electronAPI.invoke(channel, data) as Promise<T>;
}

// ── API ──────────────────────────────────────────────────────────────────────

export const api = {
  foods: {
    getAll:         () => invoke<Food[]>('foods:getAll'),
    getFavorites:   () => invoke<Food[]>('foods:getFavorites'),
    add:            (data: Omit<Food, 'id'>) => invoke<{ id: number }>('foods:add', data),
    delete:         (id: number) => invoke<{ ok: boolean }>('foods:delete', { id }),
    update:         (data: Food) => invoke<{ ok: boolean }>('foods:update', data),
    getFrequent:    (limit: number) => invoke<FrequentFood[]>('foods:getFrequent', { limit }),
    toggleFavorite: (id: number) => invoke<{ favorite: boolean }>('foods:toggleFavorite', { id }),
  },

  log: {
    getDay:             (date: string) => invoke<LogEntry[]>('log:getDay', { date }),
    add:                (data: { food_id: number; grams: number; meal: Meal; date: string }) =>
                          invoke<{ ok: boolean }>('log:add', data),
    addQuick:           (data: { food: Omit<Food, 'id'>; grams: number; meal: Meal; date: string }) =>
                          invoke<{ ok: boolean }>('log:addQuick', data),
    update:             (data: { id: number; food_id: number; grams: number; meal: Meal }) =>
                          invoke<{ ok: boolean }>('log:update', data),
    delete:             (id: number) => invoke<{ ok: boolean }>('log:delete', { id }),
    getWeeklySummaries: () => invoke<WeeklySummary[]>('log:getWeeklySummaries'),
    getWeekDetail:      (weekStart: string) => invoke<WeekDayDetail[]>('log:getWeekDetail', { weekStart }),
  },

  recipes: {
    getAll:            () => invoke<Recipe[]>('recipes:getAll'),
    get:               (id: number) => invoke<Recipe>('recipes:get', { id }),
    create:            (data: { name: string; description: string; ingredients: { food_id: number; grams: number }[] }) =>
                         invoke<{ id: number }>('recipes:create', data),
    delete:            (id: number) => invoke<{ ok: boolean }>('recipes:delete', { id }),
    log:               (data: { recipe_id: number; date: string; meal: Meal; scale?: number }) =>
                         invoke<{ ok: boolean }>('recipes:log', data),
    updateIngredients: (data: { id: number; ingredients: { food_id: number; grams: number }[] }) =>
                         invoke<{ ok: boolean }>('recipes:updateIngredients', data),
  },

  water: {
    getDay: (date: string) => invoke<WaterDay>('water:getDay', { date }),
    add:    (data: { date: string; ml: number; source: string }) => invoke<{ ok: boolean }>('water:add', data),
    delete: (id: number) => invoke<{ ok: boolean }>('water:delete', { id }),
  },

  weight: {
    getAll: () => invoke<WeightEntry[]>('weight:getAll'),
    add:    (data: { weight: number; date: string }) => invoke<{ ok: boolean }>('weight:add', data),
    delete: (id: number) => invoke<{ ok: boolean }>('weight:delete', { id }),
  },

  barcode: {
    lookup: (barcode: string) => invoke<BarcodeResult | null>('barcode:lookup', { barcode }),
  },

  streaks: {
    get: () => invoke<Streak>('streaks:get'),
  },

  notes: {
    get:  (date: string) => invoke<DailyNote>('notes:get', { date }),
    save: (data: { date: string; note: string }) => invoke<{ ok: boolean }>('notes:save', data),
  },

  supplements: {
    getAll:  () => invoke<Supplement[]>('supplements:getAll'),
    add:     (data: { name: string; qty: number }) => invoke<{ id: number }>('supplements:add', data),
    update:  (data: { id: number; name: string; qty: number }) => invoke<{ ok: boolean }>('supplements:update', data),
    delete:  (id: number) => invoke<{ ok: boolean }>('supplements:delete', { id }),
    getDay:  (date: string) => invoke<SupplementDay[]>('supplements:getDay', { date }),
    take:    (data: { supplement_id: number; date: string }) => invoke<{ ok: boolean }>('supplements:take', data),
  },

  settings: {
    get:  () => invoke<Settings>('settings:get'),
    save: (data: Partial<Settings>) => invoke<{ ok: boolean }>('settings:save', data),
  },

  import: {
    selectFile: () => invoke<string | null>('import:selectFile'),
    foods:      (data: { filePath: string }) => invoke<{ count: number }>('import:foods', data),
  },

  export: {
    data: (format: 'json' | 'csv') => invoke<{ ok: boolean }>('export:data', { format }),
  },

  measurements: {
    getAll: () => invoke<Measurement[]>('measurements:getAll'),
    add:    (data: Omit<Measurement, 'id'>) => invoke<{ id: number }>('measurements:add', data),
    delete: (id: number) => invoke<{ ok: boolean }>('measurements:delete', { id }),
  },

  undo: {
    pop: () => invoke<{ action: string; ok: boolean } | null>('undo:pop'),
  },
} as const;
