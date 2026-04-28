import type { ReactNode } from 'react';

export interface TabItem<T extends string> {
  id: T;
  label: ReactNode;
}

interface TabsProps<T extends string> {
  items: readonly TabItem<T>[];
  active: T;
  onChange: (id: T) => void;
  /** Use `compact` for inline tabs inside a page section (less padding). */
  size?: 'default' | 'compact';
  /** Allow horizontal overflow scrolling — used by pages with many tabs. */
  scrollable?: boolean;
  className?: string;
}

/**
 * Underlined tab bar — the canonical pattern for switching between sub-views
 * inside a page (History weekly/analytics, Recipes bundles/recipes, …).
 */
export default function Tabs<T extends string>({
  items, active, onChange, size = 'default', scrollable = false, className = '',
}: TabsProps<T>) {
  const padding = size === 'compact' ? 'px-4 py-2' : 'px-5 py-2.5';
  return (
    <div className={[
      'flex gap-1 border-b border-border shrink-0',
      scrollable ? 'overflow-x-auto' : '',
      className,
    ].join(' ')}>
      {items.map(t => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={[
            padding,
            'text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px whitespace-nowrap',
            t.id === active
              ? 'border-accent text-accent'
              : 'border-transparent text-text-sec hover:text-text',
          ].join(' ')}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
