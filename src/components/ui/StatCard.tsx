import type { ReactNode } from 'react';

interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  /** Optional second line below the value (e.g. unit, sub-label). */
  detail?: ReactNode;
  /** Tailwind classes appended to the value text (e.g. `text-accent`, `text-green`). */
  valueClass?: string;
  className?: string;
}

/**
 * Compact stat tile: small uppercase label + bold value. Used in the History
 * weekly tab, NetPage averages, GoalsPage TDEE, etc.
 */
export default function StatCard({ label, value, detail, valueClass = '', className = '' }: StatCardProps) {
  return (
    <div className={`bg-card border border-border rounded-xl p-4 flex flex-col gap-1 ${className}`}>
      <span className="text-xs text-text-sec">{label}</span>
      <span className={`font-semibold text-sm text-text tabular-nums ${valueClass}`}>{value}</span>
      {detail != null && <span className="text-xs text-text-sec/70">{detail}</span>}
    </div>
  );
}
