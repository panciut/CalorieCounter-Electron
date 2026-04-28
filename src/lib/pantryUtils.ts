import { today, daysUntil, formatDMY, MS_PER_DAY } from './dateUtil';
import type { Food, PantryItem } from '../types';

// ── Expiry helpers ────────────────────────────────────────────────────────────

export function compareExpiry(a: string | null, b: string | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a.localeCompare(b);
}

export function expiryPillClass(iso: string | null, warn: number, urgent: number): string {
  if (!iso) return 'text-text-sec';
  const d = daysUntil(iso);
  if (d < 0) return 'text-red font-semibold';
  if (d <= urgent) return 'text-red';
  if (d <= warn) return 'text-yellow';
  return 'text-text-sec';
}

export function expiryLabel(iso: string | null, warn: number): string {
  if (!iso) return '';
  const d = daysUntil(iso);
  if (d < 0) return `Expired ${Math.abs(d)}d ago`;
  if (d === 0) return 'Expires today';
  if (d <= warn) return `Exp. in ${d}d`;
  return formatDMY(iso);
}

// ── Opened-pack tracking ──────────────────────────────────────────────────────

export function openedLabel(batch: PantryItem): string | null {
  if (!batch.opened_at || !batch.opened_days) return null;
  const dueMs = new Date(batch.opened_at).getTime() + batch.opened_days * MS_PER_DAY;
  const daysLeft = Math.ceil((dueMs - Date.now()) / MS_PER_DAY);
  if (daysLeft < 0)   return `Opened, ${-daysLeft}d past`;
  if (daysLeft === 0) return 'Opened, today';
  return `Opened, ${daysLeft}d left`;
}

export function openedPillClass(batch: PantryItem): string {
  if (!batch.opened_at || !batch.opened_days) return 'text-text-sec';
  const dueMs = new Date(batch.opened_at).getTime() + batch.opened_days * MS_PER_DAY;
  const daysLeft = Math.ceil((dueMs - Date.now()) / MS_PER_DAY);
  if (daysLeft < 0)  return 'text-red font-semibold';
  if (daysLeft <= 1) return 'text-red';
  if (daysLeft <= 3) return 'text-yellow';
  return 'text-text-sec';
}

// ── Expiry-input ergonomics ───────────────────────────────────────────────────

/** On focus of an empty date field, seed it with today so the user only needs to change the day. */
export function seedExpiry(current: string): string {
  return current || today();
}

/**
 * After the user finishes typing, if the resulting date is strictly in the past,
 * advance it by one month (so typing "5" when today is the 14th gives next month's 5th).
 */
export function resolveExpiry(iso: string): string {
  if (!iso) return iso;
  if (daysUntil(iso) >= 0) return iso; // today or future — keep as-is
  const [y, m, d] = iso.split('-').map(Number);
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear  = m === 12 ? y + 1 : y;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// ── Unit / quantity formatting ────────────────────────────────────────────────

export type PantryUnit = 'g' | 'pcs' | `pkg-${number}`;

export function formatQty(quantity_g: number, piece_grams: number | null, package_grams: number | null, count = 1): string {
  const totalG = Math.round(quantity_g * count);
  // Shape B — pieces inside a container pack: show pcs and grams, each as remaining/total when partial
  if (piece_grams && piece_grams > 0) {
    const pcs = Math.round(totalG / piece_grams);
    if (package_grams && package_grams > 0 && count === 1) {
      const pkgG = Math.round(package_grams);
      const pkgPcs = Math.round(pkgG / piece_grams);
      if (Math.abs(totalG - pkgG) < 1) return `${pcs} pcs · ${pkgG}g`;
      return `${pcs}/${pkgPcs} pcs · ${totalG}/${pkgG}g`;
    }
    return `${pcs} pcs (${totalG}g)`;
  }
  // Shape A — sealed pack, no pieces
  if (package_grams && package_grams > 0) {
    const pkgG = Math.round(package_grams);
    if (count > 1) return `${count} × ${pkgG}g (${totalG}g)`;
    if (Math.abs(totalG - pkgG) < 1) return `${pkgG}g`;
    return `${totalG}g / ${pkgG}g`;
  }
  return `${totalG}g`;
}

// Group consecutive sealed batches with the same package + expiry into one display row
export interface BatchGroup { batches: PantryItem[]; }

export function groupBatches(batches: PantryItem[]): BatchGroup[] {
  const groups: BatchGroup[] = [];
  for (const batch of batches) {
    const isSealed = !batch.opened_at;
    const last = groups[groups.length - 1];
    const rep = last?.batches[0];
    const canMerge = last && isSealed && rep && !rep.opened_at &&
      rep.package_id != null && rep.package_id === batch.package_id &&
      rep.expiry_date === batch.expiry_date;
    if (canMerge) last.batches.push(batch);
    else groups.push({ batches: [batch] });
  }
  return groups;
}

export function defaultUnit(food: Food): PantryUnit {
  if ((food.packages?.length ?? 0) > 0) return `pkg-${food.packages![0].id}`;
  if (food.piece_grams) return 'pcs';
  return 'g';
}

export function unitToGrams(unit: PantryUnit, val: number, food: Food): number {
  if (unit === 'pcs' && food.piece_grams) return val * food.piece_grams;
  if (unit.startsWith('pkg-')) {
    const id = Number(unit.slice(4));
    const pkg = food.packages?.find(p => p.id === id);
    return pkg ? val * pkg.grams : val;
  }
  return val;
}

export function unitToPackageId(unit: PantryUnit): number | null {
  return unit.startsWith('pkg-') ? Number(unit.slice(4)) : null;
}

// ── Packed display ────────────────────────────────────────────────────────────
// Canonical "show grams in the user's stocking units" used everywhere we display
// pantry totals, planned amounts, remaining-after-plan, shortages, etc.

export interface PackedStock {
  total_g: number;
  loose_g: number;
  packs: { grams: number; count: number }[];
  pieces?: number;
}

/**
 * Greedy-decompose raw grams into whole packs (largest first) + loose remainder.
 * Falls back to pieces when the food has piece_grams but no packages, so a
 * piece-based food reads as "3 pcs" rather than "120g".
 */
export function decomposeGrams(
  grams: number,
  food: { packages?: { grams: number }[] | null; piece_grams?: number | null } | null | undefined,
): PackedStock {
  if (grams <= 0) return { total_g: 0, loose_g: 0, packs: [] };
  const sizes = [...new Set((food?.packages ?? []).map(p => p.grams))].sort((a, b) => b - a);
  let rem = grams;
  const packs: { grams: number; count: number }[] = [];
  for (const size of sizes) {
    if (rem >= size) {
      const count = Math.floor(rem / size);
      packs.push({ grams: size, count });
      rem -= count * size;
    }
  }
  if (packs.length === 0 && food?.piece_grams && food.piece_grams > 0) {
    const pieces = Math.round((rem / food.piece_grams) * 10) / 10;
    return { total_g: grams, loose_g: 0, packs: [], pieces };
  }
  return { total_g: grams, loose_g: Math.round(rem * 10) / 10, packs };
}

export function formatStock(s: PackedStock): string {
  const fmtG = (g: number) => g >= 1000
    ? `${(g / 1000).toFixed(g >= 10000 ? 0 : 1)}kg`
    : `${Math.round(g)}g`;
  if (s.pieces && s.pieces > 0 && s.packs.length === 0) {
    const pcs = `${s.pieces} pcs`;
    return s.loose_g > 0 ? `${pcs} + ${fmtG(s.loose_g)}` : pcs;
  }
  const packParts = s.packs.map(p =>
    p.count === 1 ? fmtG(p.grams) : `${p.count}×${fmtG(p.grams)}`,
  );
  if (packParts.length === 0) return fmtG(s.loose_g);
  if (s.loose_g <= 0) return packParts.join(' + ');
  return [fmtG(s.loose_g), ...packParts].join(' + ');
}

/** Convenience: decompose + format in one call. */
export function formatPacked(
  grams: number,
  food: { packages?: { grams: number }[] | null; piece_grams?: number | null } | null | undefined,
): string {
  return formatStock(decomposeGrams(grams, food));
}
