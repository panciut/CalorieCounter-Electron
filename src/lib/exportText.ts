import type { LogEntry, WeekDayDetail, Settings, Meal } from '../types';

const MEAL_ORDER: Meal[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

const r = (n: number, d = 0) => {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
};

function macroLine(label: string, actual: number, target?: number, unit = 'g'): string {
  const a = r(actual, 1);
  if (!target) return `- ${label}: ${a}${unit}`;
  const pct = target ? Math.round((actual / target) * 100) : 0;
  return `- ${label}: ${a}${unit} / ${target}${unit} (${pct}%)`;
}

function sumEntries(es: LogEntry[]) {
  return es.reduce(
    (acc, e) => ({
      cal: acc.cal + e.calories,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
      fiber: acc.fiber + (e.fiber || 0),
    }),
    { cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );
}

function entryLine(e: LogEntry): string {
  const parts = [
    `${r(e.calories)} kcal`,
    `P ${r(e.protein, 1)}`,
    `C ${r(e.carbs, 1)}`,
    `F ${r(e.fat, 1)}`,
  ];
  if (e.fiber) parts.push(`Fi ${r(e.fiber, 1)}`);
  return `  - ${e.name} — ${r(e.grams, 1)}g — ${parts.join(' · ')}`;
}

function groupByMeal(entries: LogEntry[]): Record<Meal, LogEntry[]> {
  const out: Record<Meal, LogEntry[]> = { Breakfast: [], Lunch: [], Dinner: [], Snack: [] };
  for (const e of entries) out[e.meal]?.push(e);
  return out;
}

export interface DayExportInput {
  date: string;
  entries: LogEntry[];
  settings: Settings;
  waterMl?: number;
  waterGoalMl?: number;
  restingKcal?: number;
  activeKcal?: number;
  extraKcal?: number;
  note?: string;
}

export function buildDayMarkdown(input: DayExportInput): string {
  const { date, entries, settings, waterMl, waterGoalMl, restingKcal, activeKcal, extraKcal, note } = input;
  const exerciseKcal = (restingKcal ?? 0) + (activeKcal ?? 0) + (extraKcal ?? 0);
  const logged = entries.filter(e => e.status === 'logged');
  const planned = entries.filter(e => e.status === 'planned');
  const t = sumEntries(logged);

  const lines: string[] = [];
  lines.push(`# Day — ${date}`);
  lines.push('');
  lines.push('## Targets');
  if (settings.cal_rec) lines.push(`- Calories goal: ${settings.cal_rec} kcal (range ${settings.cal_min}–${settings.cal_max})`);
  if (settings.protein_rec) lines.push(`- Protein goal: ${settings.protein_rec}g (range ${settings.protein_min}–${settings.protein_max}g)`);
  if (settings.carbs_rec) lines.push(`- Carbs goal: ${settings.carbs_rec}g (range ${settings.carbs_min}–${settings.carbs_max}g)`);
  if (settings.fat_rec) lines.push(`- Fat goal: ${settings.fat_rec}g (range ${settings.fat_min}–${settings.fat_max}g)`);
  if (settings.fiber_rec) lines.push(`- Fiber goal: ${settings.fiber_rec}g (range ${settings.fiber_min}–${settings.fiber_max}g)`);
  if (settings.water_goal) lines.push(`- Water goal: ${settings.water_goal} ml`);
  lines.push('');

  lines.push('## Totals (logged)');
  lines.push(macroLine('Calories', t.cal, settings.cal_rec, ' kcal'));
  lines.push(macroLine('Protein', t.protein, settings.protein_rec));
  lines.push(macroLine('Carbs', t.carbs, settings.carbs_rec));
  lines.push(macroLine('Fat', t.fat, settings.fat_rec));
  lines.push(macroLine('Fiber', t.fiber, settings.fiber_rec));
  if (exerciseKcal > 0) {
    const parts: string[] = [];
    if (restingKcal) parts.push(`resting ${r(restingKcal)}`);
    if (activeKcal)  parts.push(`active ${r(activeKcal)}`);
    if (extraKcal)   parts.push(`extra ${r(extraKcal)}`);
    lines.push(`- Energy out: ${r(exerciseKcal)} kcal${parts.length ? ` (${parts.join(' + ')})` : ''}`);
    lines.push(`- Net calories: ${r(t.cal - exerciseKcal)} kcal`);
  }
  if (waterMl != null) {
    lines.push(`- Water: ${r(waterMl)} ml${waterGoalMl ? ` / ${waterGoalMl} ml` : ''}`);
  }
  lines.push('');

  lines.push('## Meals');
  const byMealLogged  = groupByMeal(logged);
  const byMealPlanned = groupByMeal(planned);
  for (const m of MEAL_ORDER) {
    const loggedEs  = byMealLogged[m];
    const plannedEs = byMealPlanned[m];
    const mealCal   = loggedEs.length ? r(sumEntries(loggedEs).cal) : 0;
    lines.push(`### ${m}${mealCal ? ` — ${mealCal} kcal` : ''}`);
    for (const e of loggedEs)  lines.push(entryLine(e));
    for (const e of plannedEs) lines.push(entryLine(e) + ' *(plan)*');
    if (!loggedEs.length && !plannedEs.length) lines.push('  *(empty)*');
  }
  lines.push('');

  if (note && note.trim()) {
    lines.push('## Notes');
    lines.push(note.trim());
    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}

export function buildPlanMarkdown(date: string, entries: LogEntry[], settings: Settings): string {
  const planned = entries.filter(e => e.status === 'planned');
  const logged = entries.filter(e => e.status === 'logged');
  const combined = sumEntries(entries);
  const pt = sumEntries(planned);
  const lt = sumEntries(logged);

  const lines: string[] = [];
  lines.push(`# Plan — ${date}`);
  lines.push('');
  lines.push('## Targets');
  if (settings.cal_rec) lines.push(`- Calories goal: ${settings.cal_rec} kcal (range ${settings.cal_min}–${settings.cal_max})`);
  if (settings.protein_rec) lines.push(`- Protein goal: ${settings.protein_rec}g (range ${settings.protein_min}–${settings.protein_max}g)`);
  if (settings.carbs_rec) lines.push(`- Carbs goal: ${settings.carbs_rec}g (range ${settings.carbs_min}–${settings.carbs_max}g)`);
  if (settings.fat_rec) lines.push(`- Fat goal: ${settings.fat_rec}g (range ${settings.fat_min}–${settings.fat_max}g)`);
  if (settings.fiber_rec) lines.push(`- Fiber goal: ${settings.fiber_rec}g (range ${settings.fiber_min}–${settings.fiber_max}g)`);
  lines.push('');

  lines.push('## Projected totals (logged + planned)');
  lines.push(macroLine('Calories', combined.cal, settings.cal_rec, ' kcal'));
  lines.push(macroLine('Protein', combined.protein, settings.protein_rec));
  lines.push(macroLine('Carbs', combined.carbs, settings.carbs_rec));
  lines.push(macroLine('Fat', combined.fat, settings.fat_rec));
  lines.push(macroLine('Fiber', combined.fiber, settings.fiber_rec));
  lines.push('');

  if (logged.length > 0) {
    lines.push(`## Already logged — ${r(lt.cal)} kcal`);
    const byMeal = groupByMeal(logged);
    for (const m of MEAL_ORDER) {
      const es = byMeal[m];
      if (!es.length) continue;
      lines.push(`### ${m}`);
      for (const e of es) lines.push(entryLine(e));
    }
    lines.push('');
  }

  if (planned.length > 0) {
    lines.push(`## Planned — ${r(pt.cal)} kcal`);
    const byMeal = groupByMeal(planned);
    for (const m of MEAL_ORDER) {
      const es = byMeal[m];
      if (!es.length) continue;
      lines.push(`### ${m}`);
      for (const e of es) lines.push(entryLine(e));
    }
    lines.push('');
  }

  if (entries.length === 0) {
    lines.push('_Nothing planned or logged._');
  }

  return lines.join('\n').trimEnd() + '\n';
}

export function buildWeekMarkdown(weekStart: string, weekEnd: string, rows: WeekDayDetail[], settings: Settings): string {
  const logged = rows.filter(d => d.calories > 0);
  const count = logged.length || 1;
  const avg = (k: keyof WeekDayDetail) => logged.reduce((s, d) => s + (d[k] as number), 0) / count;

  const lines: string[] = [];
  lines.push(`# Week — ${weekStart} → ${weekEnd}`);
  lines.push('');
  lines.push('## Targets');
  if (settings.cal_rec) lines.push(`- Calories goal: ${settings.cal_rec} kcal/day (range ${settings.cal_min}–${settings.cal_max})`);
  if (settings.protein_rec) lines.push(`- Protein goal: ${settings.protein_rec}g/day (range ${settings.protein_min}–${settings.protein_max}g)`);
  if (settings.carbs_rec) lines.push(`- Carbs goal: ${settings.carbs_rec}g/day (range ${settings.carbs_min}–${settings.carbs_max}g)`);
  if (settings.fat_rec) lines.push(`- Fat goal: ${settings.fat_rec}g/day (range ${settings.fat_min}–${settings.fat_max}g)`);
  if (settings.fiber_rec) lines.push(`- Fiber goal: ${settings.fiber_rec}g/day (range ${settings.fiber_min}–${settings.fiber_max}g)`);
  lines.push('');

  lines.push(`## Averages (${logged.length} logged day${logged.length === 1 ? '' : 's'})`);
  lines.push(macroLine('Calories', avg('calories'), settings.cal_rec, ' kcal'));
  lines.push(macroLine('Protein', avg('protein'), settings.protein_rec));
  lines.push(macroLine('Carbs', avg('carbs'), settings.carbs_rec));
  lines.push(macroLine('Fat', avg('fat'), settings.fat_rec));
  lines.push(macroLine('Fiber', avg('fiber'), settings.fiber_rec));
  lines.push('');

  lines.push('## Daily breakdown');
  lines.push('| Date | kcal | P | C | F | Fi |');
  lines.push('|---|---:|---:|---:|---:|---:|');
  for (const d of rows) {
    const mark = d.calories > 0
      ? `| ${d.date} | ${r(d.calories)} | ${r(d.protein, 1)} | ${r(d.carbs, 1)} | ${r(d.fat, 1)} | ${r(d.fiber, 1)} |`
      : `| ${d.date} | — | — | — | — | — |`;
    lines.push(mark);
  }
  lines.push('');

  return lines.join('\n').trimEnd() + '\n';
}

export interface HistoryExportInput {
  summaries: { week_start: string; days_logged: number; avg_calories: number; avg_protein: number; avg_carbs: number; avg_fat: number; avg_fiber: number }[];
  settings: Settings;
  weightEntries?: { date: string; weight: number; fat_pct: number | null }[];
  currentStreak?: number;
  bestStreak?: number;
}

export function buildHistoryMarkdown(input: HistoryExportInput): string {
  const { summaries, settings, weightEntries, currentStreak, bestStreak } = input;
  const lines: string[] = [];
  lines.push(`# History overview — ${new Date().toISOString().slice(0, 10)}`);
  lines.push('');

  lines.push('## Targets');
  if (settings.cal_rec) lines.push(`- Calories: ${settings.cal_rec} kcal/day (range ${settings.cal_min}–${settings.cal_max})`);
  if (settings.protein_rec) lines.push(`- Protein: ${settings.protein_rec}g/day (range ${settings.protein_min}–${settings.protein_max}g)`);
  if (settings.carbs_rec) lines.push(`- Carbs: ${settings.carbs_rec}g/day (range ${settings.carbs_min}–${settings.carbs_max}g)`);
  if (settings.fat_rec) lines.push(`- Fat: ${settings.fat_rec}g/day (range ${settings.fat_min}–${settings.fat_max}g)`);
  if (settings.fiber_rec) lines.push(`- Fiber: ${settings.fiber_rec}g/day (range ${settings.fiber_min}–${settings.fiber_max}g)`);
  if (settings.weight_goal) lines.push(`- Weight goal: ${settings.weight_goal} kg`);
  lines.push('');

  if (currentStreak != null || bestStreak != null) {
    lines.push('## Streaks');
    if (currentStreak != null) lines.push(`- Current: ${currentStreak} days`);
    if (bestStreak != null) lines.push(`- Best: ${bestStreak} days`);
    lines.push('');
  }

  if (summaries.length > 0) {
    const sorted = [...summaries].sort((a, b) => a.week_start.localeCompare(b.week_start));
    const totalDays = sorted.reduce((s, w) => s + w.days_logged, 0) || 1;
    const wAvg = (k: 'avg_calories' | 'avg_protein' | 'avg_carbs' | 'avg_fat' | 'avg_fiber') =>
      sorted.reduce((s, w) => s + w[k] * w.days_logged, 0) / totalDays;

    lines.push(`## Overall averages (${totalDays} logged days across ${sorted.length} weeks)`);
    lines.push(macroLine('Calories', wAvg('avg_calories'), settings.cal_rec, ' kcal'));
    lines.push(macroLine('Protein', wAvg('avg_protein'), settings.protein_rec));
    lines.push(macroLine('Carbs', wAvg('avg_carbs'), settings.carbs_rec));
    lines.push(macroLine('Fat', wAvg('avg_fat'), settings.fat_rec));
    lines.push(macroLine('Fiber', wAvg('avg_fiber'), settings.fiber_rec));
    lines.push('');

    lines.push('## Weekly summaries');
    lines.push('| Week of | Days | kcal | P | C | F | Fi |');
    lines.push('|---|---:|---:|---:|---:|---:|---:|');
    for (const w of sorted) {
      lines.push(`| ${w.week_start} | ${w.days_logged} | ${r(w.avg_calories)} | ${r(w.avg_protein, 1)} | ${r(w.avg_carbs, 1)} | ${r(w.avg_fat, 1)} | ${r(w.avg_fiber, 1)} |`);
    }
    lines.push('');
  } else {
    lines.push('_No weekly history yet._');
    lines.push('');
  }

  if (weightEntries && weightEntries.length > 0) {
    const sorted = [...weightEntries].sort((a, b) => a.date.localeCompare(b.date));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const delta = last.weight - first.weight;
    lines.push('## Weight');
    lines.push(`- First: ${first.weight} kg (${first.date})`);
    lines.push(`- Latest: ${last.weight} kg (${last.date})`);
    lines.push(`- Change: ${delta >= 0 ? '+' : ''}${r(delta, 1)} kg over ${sorted.length} entries`);
    if (last.fat_pct != null) lines.push(`- Latest body fat: ${last.fat_pct}%`);
    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy path
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '0';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
