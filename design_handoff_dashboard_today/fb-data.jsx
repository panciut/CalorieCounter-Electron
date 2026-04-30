// Realistic mock data based on actual FoodBuddy schema (LogEntry, Food, etc.)

const FB_TODAY = "Martedì 28 aprile 2026";
const FB_DATE_SHORT = "28/04/2026";

const FB_TARGETS = {
  cal: { min: 1900, max: 2450, rec: 2250 },
  protein: { min: 160, max: 215, rec: 185 },
  carbs: { min: 140, max: 280, rec: 210 },
  fat: { min: 63, max: 95, rec: 75 },
  fiber: { min: 25, max: 45, rec: 35 },
};

// Returns: { cal, protein, carbs, fat, fiber }
const FB_TOTALS = {
  cal: 2526,
  protein: 193.6,
  carbs: 302.7,
  fat: 100.1,
  fiber: 23.2,
};

const FB_PLANNED_TOTALS = {
  cal: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
};

const FB_ENERGY = {
  resting: 1680,
  active: 540,
  extra: 180,
  steps: 8420,
  stepsGoal: 10000,
};

const FB_WATER = {
  total: 2330,
  goal: 2500,
  entries: [
    { id: 1, ml: 250, time: "07:14" },
    { id: 2, ml: 500, time: "09:42" },
    { id: 3, ml: 330, time: "12:30" },
    { id: 4, ml: 250, time: "14:10" },
    { id: 5, ml: 500, time: "17:05" },
    { id: 6, ml: 500, time: "19:48" },
  ],
};

// Diary entries — full day
const FB_ENTRIES = [
  { id: 1, meal: "Breakfast", time: "07:30", name: "Yogurt greco 0%", grams: 200, calories: 118, protein: 20, carbs: 7.4, fat: 0.8 },
  { id: 2, meal: "Breakfast", time: "07:30", name: "Avena", grams: 60, calories: 234, protein: 9.2, carbs: 39.6, fat: 4.1 },
  { id: 3, meal: "Breakfast", time: "07:30", name: "Mirtilli", grams: 100, calories: 57, protein: 0.7, carbs: 14.5, fat: 0.3 },
  { id: 4, meal: "Breakfast", time: "07:30", name: "Miele", grams: 15, calories: 46, protein: 0, carbs: 12.4, fat: 0 },
  { id: 5, meal: "MorningSnack", time: "10:45", name: "Mela Fuji", grams: 180, calories: 94, protein: 0.5, carbs: 25, fat: 0.3 },
  { id: 6, meal: "MorningSnack", time: "10:45", name: "Mandorle", grams: 25, calories: 145, protein: 5.3, carbs: 5.4, fat: 12.5 },
  { id: 7, meal: "Lunch", time: "13:15", name: "Petto di pollo", grams: 200, calories: 330, protein: 62, carbs: 0, fat: 7.2 },
  { id: 8, meal: "Lunch", time: "13:15", name: "Riso basmati", grams: 80, calories: 285, protein: 6.4, carbs: 62.8, fat: 0.7 },
  { id: 9, meal: "Lunch", time: "13:15", name: "Broccoli al vapore", grams: 200, calories: 68, protein: 5.6, carbs: 13.4, fat: 0.7 },
  { id: 10, meal: "Lunch", time: "13:15", name: "Olio EVO", grams: 12, calories: 106, protein: 0, carbs: 0, fat: 12 },
  { id: 11, meal: "AfternoonSnack", time: "16:30", name: "Ricotta", grams: 100, calories: 138, protein: 9.5, carbs: 3, fat: 10 },
  { id: 12, meal: "AfternoonSnack", time: "16:30", name: "Crackers integrali", grams: 30, calories: 122, protein: 3, carbs: 21, fat: 2.7 },
  { id: 13, meal: "Dinner", time: "20:00", name: "Salmone", grams: 180, calories: 374, protein: 36, carbs: 0, fat: 25 },
  { id: 14, meal: "Dinner", time: "20:00", name: "Patate dolci", grams: 200, calories: 172, protein: 3.2, carbs: 40, fat: 0.2 },
  { id: 15, meal: "Dinner", time: "20:00", name: "Spinaci saltati", grams: 150, calories: 35, protein: 4.4, carbs: 5.4, fat: 0.6 },
  { id: 16, meal: "Dinner", time: "20:00", name: "Pane integrale", grams: 40, calories: 102, protein: 4, carbs: 18.4, fat: 1.3 },
];

const FB_MEAL_LABEL = {
  Breakfast: "Colazione",
  MorningSnack: "Spuntino",
  Lunch: "Pranzo",
  AfternoonSnack: "Merenda",
  Dinner: "Cena",
  EveningSnack: "Sera",
};

const FB_MEAL_ORDER = ["Breakfast", "MorningSnack", "Lunch", "AfternoonSnack", "Dinner", "EveningSnack"];

const FB_FAVORITES = [
  { id: 101, name: "Petto di pollo", calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { id: 102, name: "Yogurt greco 0%", calories: 59, protein: 10, carbs: 3.7, fat: 0.4 },
  { id: 103, name: "Avena", calories: 389, protein: 16.9, carbs: 66.3, fat: 6.9 },
  { id: 104, name: "Riso basmati", calories: 356, protein: 7.9, carbs: 78.5, fat: 0.9 },
  { id: 105, name: "Salmone", calories: 208, protein: 20, carbs: 0, fat: 13 },
];

const FB_FREQUENT = [
  { id: 201, name: "Banana" },
  { id: 202, name: "Uova" },
  { id: 203, name: "Pasta integrale" },
  { id: 204, name: "Tonno al naturale" },
  { id: 205, name: "Olio EVO" },
  { id: 206, name: "Mandorle" },
];

const FB_SUPPLEMENTS = [
  { id: 1, name: "Vitamina D3 2000 UI", time: "breakfast", taken: 1, qty: 1 },
  { id: 2, name: "Omega-3 EPA/DHA", time: "breakfast", taken: 1, qty: 1 },
  { id: 3, name: "Magnesio bisglicinato", time: "evening", taken: 0, qty: 1 },
  { id: 4, name: "Creatina monoidrato 5g", time: "afternoon", taken: 0, qty: 1 },
];

const FB_PANTRY_LOW = [
  { name: "Petto di pollo", qty: 320, unit: "g" },
  { name: "Yogurt greco", qty: 1, unit: "vasetti" },
  { name: "Avena", qty: 80, unit: "g" },
];

const FB_BODY = {
  weight: 73.4,
  weightDelta: -0.6,
  weightTrend: [73.9, 74.1, 73.7, 73.6, 73.8, 73.5, 73.4],
};

// Returns hex color based on actual vs target band — semantically distinct
function fbBarColor(actual, min, max, rec) {
  if (actual <= 0) return "#5b554a";
  if (max && actual > max) return "var(--fb-red)";
  if (max && actual > max * 0.95) return "var(--fb-amber)";
  if (rec && actual >= rec * 0.92 && (!max || actual <= max)) return "var(--fb-green)";
  if (min && actual >= min) return "var(--fb-amber)";
  return "var(--fb-orange)";
}

function fbPct(actual, target) {
  if (!target) return 0;
  return Math.min(100, Math.round((actual / target) * 100));
}

window.FB_TODAY = FB_TODAY;
window.FB_DATE_SHORT = FB_DATE_SHORT;
window.FB_TARGETS = FB_TARGETS;
window.FB_TOTALS = FB_TOTALS;
window.FB_PLANNED_TOTALS = FB_PLANNED_TOTALS;
window.FB_ENERGY = FB_ENERGY;
window.FB_WATER = FB_WATER;
window.FB_ENTRIES = FB_ENTRIES;
window.FB_MEAL_LABEL = FB_MEAL_LABEL;
window.FB_MEAL_ORDER = FB_MEAL_ORDER;
window.FB_FAVORITES = FB_FAVORITES;
window.FB_FREQUENT = FB_FREQUENT;
window.FB_SUPPLEMENTS = FB_SUPPLEMENTS;
window.FB_PANTRY_LOW = FB_PANTRY_LOW;
window.FB_BODY = FB_BODY;
window.fbBarColor = fbBarColor;
window.fbPct = fbPct;
