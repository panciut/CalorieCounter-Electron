export function fbBarColor(actual: number, min: number, max: number, rec: number): string {
  if (actual <= 0) return 'var(--fb-text-3)';
  if (max && actual > max) return 'var(--fb-red)';
  if (max && actual > max * 0.95) return 'var(--fb-amber)';
  if (rec && actual >= rec * 0.92 && (!max || actual <= max)) return 'var(--fb-green)';
  if (min && actual >= min) return 'var(--fb-amber)';
  return 'var(--fb-orange)';
}
