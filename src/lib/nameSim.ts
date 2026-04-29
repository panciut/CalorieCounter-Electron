// Token-based name similarity used by the OFF matcher (renderer + main share via IPC).
// Pure functions; no React, no Electron.

const STOPWORDS = new Set([
  // EN
  'and', 'with', 'the', 'for', 'from', 'into', 'sans', 'free', 'low', 'high',
  // IT
  'con', 'senza', 'alla', 'allo', 'agli', 'alle', 'dal', 'del', 'della', 'delle',
  'degli', 'dei', 'gli', 'lo', 'la', 'le', 'il', 'in', 'di', 'da', 'al', 'ai',
  'per', 'una', 'uno', 'sul', 'sulla', 'sugli', 'nel', 'nella',
]);

export function normalizeName(s: string): string {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // strip accents
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ') // strip punctuation, keep letters/digits
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokens(s: string): string[] {
  return normalizeName(s)
    .split(' ')
    .filter(t => t.length >= 3 && !STOPWORDS.has(t));
}

/** Jaccard similarity over token sets, 0..1. Empty input → 0. */
export function nameSimilarity(a: string, b: string): number {
  const A = new Set(tokens(a));
  const B = new Set(tokens(b));
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

export function withinPct(a: number, b: number, pct: number): boolean {
  if (a === 0 && b === 0) return true;
  const max = Math.max(Math.abs(a), Math.abs(b), 1);
  return Math.abs(a - b) / max <= pct;
}

export interface MatchInputs {
  name: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface MatchResult {
  ok: boolean;
  nameScore: number;
  macroDeltas: { calories: number; protein: number; carbs: number; fat: number };
  kcalDeltaPct: number;
}

/**
 * Decides whether a candidate is a confident match for a query.
 * Defaults: name Jaccard ≥ 0.4, every macro within ±5%, candidate's claimed kcal
 * within ±20% of Atwater estimate (avoids accepting OFF rows with broken values).
 */
export function isConfidentMatch(
  query: MatchInputs,
  candidate: MatchInputs,
  opts: { nameMin?: number; macroPct?: number; requireKcalConsistent?: boolean } = {},
): MatchResult {
  const nameMin   = opts.nameMin   ?? 0.4;
  const macroPct  = opts.macroPct  ?? 0.05;
  const reqKcal   = opts.requireKcalConsistent ?? true;
  const nameScore = nameSimilarity(query.name, candidate.name);

  const cQ = query.calories ?? 0, cC = candidate.calories ?? 0;
  const pQ = query.protein  ?? 0, pC = candidate.protein  ?? 0;
  const kQ = query.carbs    ?? 0, kC = candidate.carbs    ?? 0;
  const fQ = query.fat      ?? 0, fC = candidate.fat      ?? 0;

  const macroDeltas = {
    calories: cC - cQ,
    protein:  pC - pQ,
    carbs:    kC - kQ,
    fat:      fC - fQ,
  };

  const macrosClose =
    withinPct(cQ, cC, macroPct) &&
    withinPct(pQ, pC, macroPct) &&
    withinPct(kQ, kC, macroPct) &&
    withinPct(fQ, fC, macroPct);

  const atwater = 4 * pC + 4 * kC + 9 * fC;
  const kcalDeltaPct = atwater > 0 ? Math.abs(cC - atwater) / atwater : 0;
  const kcalConsistent = !reqKcal || kcalDeltaPct <= 0.40;

  return {
    ok: nameScore >= nameMin && macrosClose && kcalConsistent,
    nameScore,
    macroDeltas,
    kcalDeltaPct,
  };
}
