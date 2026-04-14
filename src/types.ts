// ── Core data types ──────────────────────────────────────────────────────────

export type Meal = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export interface Food {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  piece_grams: number | null;
  is_liquid: number; // 0 or 1
  favorite?: number; // 0 or 1
  barcode?: string | null;
}

export interface FrequentFood extends Food {
  use_count: number;
}

export interface LogEntry {
  id: number;
  food_id: number;
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  meal: Meal;
  date: string;
  status: 'logged' | 'planned';
}

export interface Recipe {
  id: number;
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  ingredient_count: number;
  ingredients?: RecipeIngredient[];
}

export interface RecipeIngredient {
  id: number;
  food_id: number;
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  editGrams?: number;
}

export interface Exercise {
  id: number;
  date: string;
  type: string;
  duration_min: number;
  calories_burned: number;
  notes: string | null;
  source: 'manual' | 'apple_health';
  sets?: ExerciseSet[];
}

export interface ExerciseSet {
  id: number;
  exercise_id: number;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
}

export interface ExerciseType {
  id: number;
  name: string;
  met_value: number;
  category: string;
}

export interface ActualRecipe {
  id: number;
  name: string;
  description: string | null;
  yield_g: number;
  notes: string | null;
  created_at: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  total_fiber: number;
  ingredient_count: number;
  ingredients?: ActualRecipeIngredient[];
}

export interface ActualRecipeIngredient {
  id: number;
  food_id: number;
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface Settings {
  cal_min: number;
  cal_max: number;
  cal_rec: number;
  protein_min: number;
  protein_max: number;
  protein_rec: number;
  carbs_min: number;
  carbs_max: number;
  carbs_rec: number;
  fat_min: number;
  fat_max: number;
  fat_rec: number;
  fiber_min: number;
  fiber_max: number;
  fiber_rec: number;
  weight_goal: number;
  water_goal: number;
  tol_1: number;
  tol_2: number;
  tol_3: number;
  language: 'en' | 'it';
  theme: 'dark' | 'light';
}

export interface WeightEntry {
  id: number;
  date: string;
  weight: number;
  fat_pct: number | null;
  muscle_mass: number | null;
  water_pct: number | null;
  bone_mass: number | null;
}

export interface WaterEntry {
  id: number;
  date: string;
  ml: number;
  source: string;
  log_id: number | null;
}

export interface WaterDay {
  total_ml: number;
  entries: WaterEntry[];
}

export interface DailyNote {
  date: string;
  note: string;
}

export interface Streak {
  current: number;
  best: number;
}

export interface Supplement {
  id: number;
  name: string;
  qty: number;
  unit: string;
  notes: string;
  created_at: string;
}

export interface SupplementDay extends Supplement {
  taken: number;
}

export interface SupplementAdherence {
  id: number;
  name: string;
  qty: number;
  unit: string;
  created_at: string;
  daysExpected: number;
  daysTaken: number;
  adherencePct: number;
  logs: { date: string; count: number }[];
}

export interface Measurement {
  id: number;
  date: string;
  waist: number | null;
  chest: number | null;
  arms: number | null;
  thighs: number | null;
  hips: number | null;
  neck: number | null;
}

export interface WeeklySummary {
  week_start: string;
  avg_calories: number;
  avg_protein: number;
  avg_carbs: number;
  avg_fat: number;
  avg_fiber: number;
  days_logged: number;
}

export interface WeekDayDetail {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  planned_calories: number;
  planned_protein: number;
  planned_carbs: number;
  planned_fat: number;
  planned_fiber: number;
}

export interface PantryItem {
  id: number;
  food_id: number;
  food_name: string;
  piece_grams: number | null;
  quantity_g: number;
  updated_at: string;
}

export interface PantryIngredientCheck {
  food_id: number;
  food_name: string;
  need_g: number;
  have_g: number;
}

export interface ShoppingItem {
  id: number;
  food_id: number;
  food_name: string;
  quantity_g: number;
  checked: number; // 0 or 1
}

export interface DailyEnergy {
  date: string;
  resting_kcal: number;
  active_kcal: number;
  extra_kcal: number;
}

export interface CalorieTrendPoint {
  date: string;
  calories_in: number;
  calories_out: number;
  resting_kcal: number;
  active_kcal: number;
  extra_kcal: number;
  net: number;
}

export interface MacroTrendPoint {
  date: string;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface ExerciseTrendPoint {
  date: string;
  count: number;
  total_min: number;
  total_burned: number;
}

export type GoalType = 'lose' | 'maintain' | 'gain';

export interface TDEEResult {
  tdee: number | null;
  confidence: 'low' | 'medium' | 'high';
  data_points: number;
}

export interface GoalSuggestion {
  cal_rec: number;
  cal_min: number;
  cal_max: number;
  protein_rec: number;
  rate_per_week_kg: number;
}

export interface BarcodeResult {
  name: string;
  name_en?: string;
  name_it?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  is_liquid: number;
}

// ── Page navigation ──────────────────────────────────────────────────────────

export type PageName =
  | 'dashboard'
  | 'exercise'
  | 'net'
  | 'foods'
  | 'pantry'
  | 'recipes'
  | 'history'
  | 'week'
  | 'day'
  | 'weight'
  | 'supplements'
  | 'measurements'
  | 'goals'
  | 'data'
  | 'settings';

export interface NavParam {
  weekStart?: string;
  date?: string;
  fromWeek?: string;
}
