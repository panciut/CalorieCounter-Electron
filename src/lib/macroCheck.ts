// Atwater consistency check. Catches data-entry mistakes like "10g fat / 5 kcal"
// for both user-typed values and Open Food Facts payloads.

export function atwaterKcal(protein: number, carbs: number, fat: number, fiber = 0): number {
  // Atwater general factors: protein 4, carbs 4, fat 9. Fiber subtracted at 2 kcal/g
  // because many EU labels report carbs INCLUDING fiber while the kcal value excludes it.
  // This makes high-fiber foods (oats, beans) line up with their label kcal.
  const usableCarbs = Math.max(0, carbs - (fiber || 0));
  return 4 * (protein || 0) + 4 * usableCarbs + 9 * (fat || 0) + 2 * (fiber || 0);
}

export type MacroLevel = 'ok' | 'warn' | 'fail';

export interface MacroCheck {
  expected: number;     // calories from atwater
  actual: number;       // claimed calories
  deltaKcal: number;    // actual - expected (signed)
  deltaPct: number;     // |delta| / max(expected, 1)
  level: MacroLevel;
}

/**
 * Checks whether claimed `calories` are plausible given the macro breakdown.
 * Thresholds: ≤20% ok · ≤40% warn · >40% fail.
 */
export function checkMacroConsistency(
  calories: number,
  protein: number,
  carbs: number,
  fat: number,
  fiber?: number,
): MacroCheck {
  const expected = atwaterKcal(protein, carbs, fat, fiber);
  const actual = calories || 0;
  const deltaKcal = actual - expected;
  const deltaPct = Math.abs(deltaKcal) / Math.max(expected, 1);
  let level: MacroLevel = 'ok';
  if (deltaPct > 0.40) level = 'fail';
  else if (deltaPct > 0.20) level = 'warn';
  return { expected, actual, deltaKcal, deltaPct, level };
}
