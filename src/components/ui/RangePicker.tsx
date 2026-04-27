import type { ReactNode } from 'react';

interface RangePickerProps<T extends number | string> {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  /** Custom label per option. Defaults to `${v}d` for numbers and `String(v)` otherwise. */
  formatLabel?: (v: T) => ReactNode;
  className?: string;
}

/**
 * Pill-row selector for date ranges (7d / 30d / 90d / all). Used across
 * WeightPage, MeasurementsPage, HistoryPage analytics, NetPage.
 */
export default function RangePicker<T extends number | string>({
  value, options, onChange, formatLabel, className = '',
}: RangePickerProps<T>) {
  const fmt = formatLabel ?? ((v: T) => typeof v === 'number' ? `${v}d` : String(v));
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {options.map(opt => (
        <button
          key={String(opt)}
          type="button"
          onClick={() => onChange(opt)}
          className={[
            'text-xs px-3 py-1.5 rounded-lg border cursor-pointer transition-colors',
            opt === value
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-border text-text-sec hover:border-accent/50',
          ].join(' ')}
        >
          {fmt(opt)}
        </button>
      ))}
    </div>
  );
}
