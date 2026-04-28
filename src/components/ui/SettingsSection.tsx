import type { ReactNode } from 'react';

interface SettingsSectionProps {
  title: ReactNode;
  /**
   * When `true`, children render directly inside the section (no card wrapper).
   * Default `false` — children get wrapped in a standard card.
   */
  bare?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Settings page section: small uppercase title above either a card-wrapped
 * body (default) or bare children. Used in `SettingsPage` for Language /
 * Theme / Pantry / Scales etc.
 */
export default function SettingsSection({ title, bare = false, children, className = '' }: SettingsSectionProps) {
  return (
    <section className={className}>
      <h2 className="text-sm font-semibold text-text-sec uppercase tracking-wider mb-3">{title}</h2>
      {bare ? children : (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          {children}
        </div>
      )}
    </section>
  );
}
