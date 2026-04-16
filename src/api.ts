import type {
  Food, FoodPackage, FrequentFood, LogEntry, Meal, Recipe, ActualRecipe, Exercise, ExerciseType, Settings,
  WeightEntry, WaterDay, WaterEntry, DailyNote, Streak,
  Supplement, SupplementDay, SupplementAdherence,
  SupplementPlanWithItems,
  Measurement,
  WeeklySummary, WeekDayDetail, BarcodeResult,
  PantryItem, PantryAggregate, ShoppingItem, PantryIngredientCheck,
  CalorieTrendPoint, MacroTrendPoint, ExerciseTrendPoint,
  GoalType, TDEEResult, GoalSuggestion, DailyEnergy,
  DeductionEvent,
  AppNotification, DismissedNotification,
} from './types';

// Re-export for consumers that need it
export type { PantryAggregate };

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
    addPackage:     (data: { food_id: number; grams: number; price?: number | null }) => invoke<{ id: number }>('foods:addPackage', data),
    updatePackage:  (data: { id: number; grams: number; price?: number | null }) => invoke<{ ok: boolean; error?: string; batch_count?: number }>('foods:updatePackage', data),
    deletePackage:  (id: number) => invoke<{ ok: boolean; error?: string; batch_count?: number }>('foods:deletePackage', { id }),
  },

  log: {
    getDay:             (date: string) => invoke<LogEntry[]>('log:getDay', { date }),
    add:                (data: { food_id: number; grams: number; meal: Meal; date: string; status?: 'logged' | 'planned' }) =>
                          invoke<{ id: number; shortage: number; shortage_food: string | null; events: DeductionEvent[] }>('log:add', data),
    addQuick:           (data: { food: Omit<Food, 'id'>; grams: number; meal: Meal; date: string }) =>
                          invoke<{ id: number; food_id: number; shortage: number }>('log:addQuick', data),
    update:             (data: { id: number; food_id: number; grams: number; meal: Meal }) =>
                          invoke<{ ok: boolean }>('log:update', data),
    delete:             (id: number) => invoke<{ ok: boolean }>('log:delete', { id }),
    getPlanned:         (date: string) => invoke<LogEntry[]>('log:getPlanned', { date }),
    confirmPlanned:     (id: number) => invoke<{ ok: boolean; shortage: number; shortage_food: string; events: DeductionEvent[] }>('log:confirmPlanned', { id }),
    confirmAllPlanned:  (date: string) => invoke<{ ok: boolean; shortages: { food_name: string; shortage: number }[]; events: DeductionEvent[] }>('log:confirmAllPlanned', { date }),
    swapLunchDinner:    (date: string) => invoke<{ ok: boolean }>('log:swapLunchDinner', { date }),
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

  exercises: {
    getDay:     (date: string) => invoke<Exercise[]>('exercises:getDay', { date }),
    getRange:   (startDate: string, endDate: string) => invoke<Exercise[]>('exercises:getRange', { startDate, endDate }),
    add:        (data: { date: string; type: string; duration_min: number; calories_burned: number; notes?: string; sets?: { reps?: number; weight_kg?: number }[] }) =>
                  invoke<{ id: number }>('exercises:add', data),
    update:     (data: { id: number; type: string; duration_min: number; calories_burned: number; notes?: string }) =>
                  invoke<{ ok: boolean }>('exercises:update', data),
    delete:     (id: number) => invoke<{ ok: boolean }>('exercises:delete', { id }),
    getTypes:   () => invoke<ExerciseType[]>('exercises:getTypes'),
    addType:    (data: { name: string; met_value: number; category: string; muscle_groups?: string; equipment?: string; instructions?: string }) => invoke<{ id: number }>('exercises:addType', data),
    updateType: (data: { id: number; name: string; met_value: number; category: string; muscle_groups: string; equipment: string; instructions?: string }) => invoke<{ ok: boolean }>('exercises:updateType', data),
    deleteType:      (id: number) => invoke<{ ok: boolean; reason?: string }>('exercises:deleteType', { id }),
    estimate:        (data: { type: string; duration_min: number; weight_kg: number }) => invoke<{ calories: number }>('exercises:estimate', data),
    getEquipment:    () => invoke<import('./types').Equipment[]>('exercises:getEquipment'),
    addEquipment:    (data: { name: string }) => invoke<{ id: number }>('exercises:addEquipment', data),
    deleteEquipment: (id: number) => invoke<{ ok: boolean; reason?: string }>('exercises:deleteEquipment', { id }),
  },

  workoutPlans: {
    getAll:    () => invoke<import('./types').WorkoutPlan[]>('workoutPlans:getAll'),
    get:       (id: number) => invoke<import('./types').WorkoutPlan>('workoutPlans:get', { id }),
    create:    (data: { name: string; description?: string; exercises: import('./types').WorkoutPlanExerciseInput[] }) => invoke<{ id: number }>('workoutPlans:create', data),
    update:    (data: { id: number; name: string; description?: string; exercises: import('./types').WorkoutPlanExerciseInput[] }) => invoke<{ ok: boolean }>('workoutPlans:update', data),
    delete:    (id: number) => invoke<{ ok: boolean }>('workoutPlans:delete', { id }),
    duplicate: (id: number) => invoke<{ id: number }>('workoutPlans:duplicate', { id }),
  },

  workoutSchedule: {
    getWeek:   (weekStart: string) => invoke<import('./types').WorkoutScheduleDay[]>('workoutSchedule:getWeek', { weekStart }),
    getDay:    (date: string) => invoke<import('./types').WorkoutScheduleEntry[]>('workoutSchedule:getDay', { date }),
    assign:    (data: { date: string; plan_id: number }) => invoke<{ id: number; ok: boolean }>('workoutSchedule:assign', data),
    setRest:   (date: string) => invoke<{ id: number; ok: boolean }>('workoutSchedule:setRest', { date }),
    clear:     (id: number) => invoke<{ ok: boolean }>('workoutSchedule:clear', { id }),
    setStatus: (data: { id: number; status: string }) => invoke<{ ok: boolean }>('workoutSchedule:setStatus', data),
    move:      (data: { id: number; toDate: string }) => invoke<{ ok: boolean }>('workoutSchedule:move', data),
    swap:      (data: { idA: number; idB: number }) => invoke<{ ok: boolean }>('workoutSchedule:swap', data),
  },

  actualRecipes: {
    getAll:            () => invoke<ActualRecipe[]>('actualRecipes:getAll'),
    get:               (id: number) => invoke<ActualRecipe>('actualRecipes:get', { id }),
    create:            (data: { name: string; description: string; yield_g: number; notes: string; prep_time_min: number; cook_time_min: number; tools: string; procedure: string; ingredients: { food_id: number; grams: number }[] }) =>
                         invoke<{ id: number }>('actualRecipes:create', data),
    update:            (data: { id: number; name: string; description: string; yield_g: number; notes: string; prep_time_min: number; cook_time_min: number; tools: string; procedure: string }) =>
                         invoke<{ ok: boolean }>('actualRecipes:update', data),
    updateIngredients: (data: { id: number; ingredients: { food_id: number; grams: number }[] }) =>
                         invoke<{ ok: boolean }>('actualRecipes:updateIngredients', data),
    delete:            (id: number) => invoke<{ ok: boolean }>('actualRecipes:delete', { id }),
    log:               (data: { recipe_id: number; grams_eaten: number; meal: Meal; date: string }) =>
                         invoke<{ ok: boolean }>('actualRecipes:log', data),
  },

  water: {
    getDay: (date: string) => invoke<WaterDay>('water:getDay', { date }),
    add:    (data: { date: string; ml: number; source: string }) => invoke<{ ok: boolean }>('water:add', data),
    delete: (id: number) => invoke<{ ok: boolean }>('water:delete', { id }),
  },

  weight: {
    getAll: () => invoke<WeightEntry[]>('weight:getAll'),
    add:    (data: { weight: number; date: string; fat_pct?: number | null; muscle_mass?: number | null; water_pct?: number | null; bone_mass?: number | null }) => invoke<{ ok: boolean }>('weight:add', data),
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
    getAll:       () => invoke<Supplement[]>('supplements:getAll'),
    add:          (data: { name: string }) => invoke<{ id: number }>('supplements:add', data),
    delete:       (id: number) => invoke<{ ok: boolean; reason?: string }>('supplements:delete', { id }),
    getDay:       (date: string) => invoke<SupplementDay[]>('supplements:getDay', { date }),
    take:         (data: { supplement_id: number; date: string }) => invoke<{ taken: number }>('supplements:take', data),
    getAdherence: (days: number) => invoke<SupplementAdherence[]>('supplements:getAdherence', { days }),
  },

  supplementPlan: {
    getCurrent: () => invoke<SupplementPlanWithItems | null>('supplementPlan:getCurrent'),
    save:       (data: { items: { supplement_id: number; qty: number; unit: string; notes: string }[] }) =>
                  invoke<{ ok: boolean; plan_id?: number }>('supplementPlan:save', data),
  },

  settings: {
    get:  () => invoke<Settings>('settings:get'),
    save: (data: Partial<Settings>) => invoke<{ ok: boolean }>('settings:save', data),
  },

  import: {
    selectFile: (extensions?: string[]) => invoke<string | null>('import:selectFile', { extensions }),
    foods:          (filePath: string) => invoke<{ imported: number; skipped: number }>('import:foods', { filePath }),
    foodsFromText:  (text: string) => invoke<{ ok: boolean; imported: number; skipped: number; error?: string }>('import:foodsFromText', { text }),
    fullJson:   (filePath: string) => invoke<{ ok: boolean; stats: Record<string, number> }>('import:fullJson', { filePath }),
    backup:     (filePath: string) => invoke<{ ok: boolean; error?: string }>('import:backup', { filePath }),
  },

  export: {
    data:   (format: 'json' | 'csv') => invoke<{ ok: boolean }>('export:data', { format }),
    foods:  () => invoke<{ ok: boolean; count?: number }>('export:foods'),
    pantry: () => invoke<{ ok: boolean; count?: number }>('export:pantry'),
    backup: () => invoke<{ ok: boolean; path?: string }>('export:backup'),
  },

  measurements: {
    getAll: () => invoke<Measurement[]>('measurements:getAll'),
    add:    (data: Omit<Measurement, 'id'>) => invoke<{ id: number }>('measurements:add', data),
    delete: (id: number) => invoke<{ ok: boolean }>('measurements:delete', { id }),
  },

  undo: {
    pop: () => invoke<{ action: string; ok: boolean } | null>('undo:pop'),
  },

  pantry: {
    getAll:       () => invoke<PantryItem[]>('pantry:getAll'),
    addBatch:     (data: { food_id: number; quantity_g: number; expiry_date: string | null; package_id?: number | null }) =>
                    invoke<{ ok: boolean }>('pantry:addBatch', data),
    set:          (data: { id: number; quantity_g: number; expiry_date: string | null; package_id?: number | null }) =>
                    invoke<{ ok: boolean }>('pantry:set', data),
    delete:       (id: number) => invoke<{ ok: boolean }>('pantry:delete', { id }),
    checkStock:   (food_id: number, grams: number) =>
                    invoke<{ have_g: number; shortage: number }>('pantry:checkStock', { food_id, grams }),
    canMake:      (recipe_id: number, recipe_type: 'actual' | 'bundle') =>
      invoke<{ recipe_id: number; can_make: boolean; ingredients: PantryIngredientCheck[]; missing: PantryIngredientCheck[] }>(
        'pantry:canMake', { recipe_id, recipe_type }),
    canMakeAll:   (recipe_type: 'actual' | 'bundle') =>
      invoke<{ recipe_id: number; can_make: boolean; missing_count: number }[]>(
        'pantry:canMakeAll', { recipe_type }),
    deductRecipe:     (recipe_id: number, scale: number, recipe_type: 'actual' | 'bundle') =>
      invoke<{ ok: boolean; shortages: { food_name: string; shortage: number }[]; events: DeductionEvent[] }>('pantry:deductRecipe', { recipe_id, scale, recipe_type }),
    setOpenedDays:    (batch_id: number, days: number) => invoke<{ ok: boolean }>('pantry:setOpenedDays', { batch_id, days }),
    resolveResidual:  (food_id: number, overflow_g: number, mode: 'residual' | 'new_open') =>
      invoke<{ ok: boolean; events: DeductionEvent[] }>('pantry:resolveResidual', { food_id, overflow_g, mode }),
  },

  actionLog: {
    getRecent: (limit?: number) =>
      invoke<{ id: number; kind: string; food_name: string | null; grams: number | null; details: string | null; ts: string }[]>(
        'actionlog:getRecent', { limit }
      ),
  },

  shopping: {
    getAll:       () => invoke<ShoppingItem[]>('shopping:getAll'),
    add:          (data: { food_id: number; quantity_g?: number }) => invoke<{ id: number }>('shopping:add', data),
    toggle:       (id: number) => invoke<{ ok: boolean }>('shopping:toggle', { id }),
    delete:       (id: number) => invoke<{ ok: boolean }>('shopping:delete', { id }),
    clearChecked: () => invoke<{ ok: boolean }>('shopping:clearChecked'),
  },

  analytics: {
    caloriesTrend:  (days: number) => invoke<CalorieTrendPoint[]>('analytics:caloriesTrend', { days }),
    macroTrend:     (days: number) => invoke<MacroTrendPoint[]>('analytics:macroTrend', { days }),
    exerciseTrend:  (days: number) => invoke<ExerciseTrendPoint[]>('analytics:exerciseTrend', { days }),
  },

  goals: {
    calculateTDEE: () => invoke<TDEEResult>('goals:calculateTDEE'),
    suggest: (data: { goal_type: GoalType; tdee: number }) => invoke<GoalSuggestion>('goals:suggest', data),
  },

  dailyEnergy: {
    get:            (date: string) => invoke<DailyEnergy>('dailyEnergy:get', { date }),
    getRange:       (startDate: string, endDate: string) => invoke<DailyEnergy[]>('dailyEnergy:getRange', { startDate, endDate }),
    getPrevResting: (date: string) => invoke<{ resting_kcal: number }>('dailyEnergy:getPrevResting', { date }),
    set:            (data: DailyEnergy) => invoke<{ ok: boolean }>('dailyEnergy:set', data),
  },

  notifications: {
    getAll:          () => invoke<AppNotification[]>('notifications:getAll'),
    dismiss:         (key: string, expires_at?: string | null) =>
                       invoke<{ ok: boolean }>('notifications:dismiss', { key, expires_at }),
    undoDismiss:     (key: string) => invoke<{ ok: boolean }>('notifications:undoDismiss', { key }),
    dismissAll:      (keys?: string[]) => invoke<{ ok: boolean }>('notifications:dismissAll', { keys }),
    recentDismissed: (limit?: number) =>
                       invoke<DismissedNotification[]>('notifications:recentDismissed', { limit }),
  },
} as const;
