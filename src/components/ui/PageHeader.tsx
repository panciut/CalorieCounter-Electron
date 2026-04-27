import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  /** Right-side content: action buttons, range picker, etc. */
  action?: ReactNode;
  /** Subtitle/description rendered below the title. */
  subtitle?: ReactNode;
  className?: string;
}

/**
 * Top-of-page header with title + optional right-aligned action(s).
 * Used in History, Net, Goals, Data, Notifications, Recipes, etc.
 */
export default function PageHeader({ title, action, subtitle, className = '' }: PageHeaderProps) {
  return (
    <div className={`flex items-center justify-between flex-wrap gap-3 ${className}`}>
      <div>
        <h1 className="text-xl font-bold text-text">{title}</h1>
        {subtitle != null && <p className="text-sm text-text-sec mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
