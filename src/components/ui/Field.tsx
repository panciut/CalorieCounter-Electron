import type { ReactNode } from 'react';

interface FieldProps {
  label: ReactNode;
  /** Optional inline content rendered next to the label (e.g. a unit tag, an info icon). */
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Vertical label-on-top form field wrapper. Pairs a small uppercase-able label
 * with whatever input/control sits underneath. Children render as-is so any
 * input variant works (text, select, custom toggle, etc.).
 */
export default function Field({ label, hint, children, className = '' }: FieldProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs text-text-sec">{label}</label>
        {hint != null && <span className="text-xs text-text-sec/60">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
