import type { ReactNode } from 'react';

interface EmptyStateProps {
  message: ReactNode;
  /** Optional icon/emoji shown above the message. */
  icon?: ReactNode;
  /** Optional CTA, e.g. a button to create the first item. */
  action?: ReactNode;
  className?: string;
}

/** Placeholder block for "No X yet" states. Centred, muted, with optional CTA. */
export default function EmptyState({ message, icon, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center gap-3 py-8 ${className}`}>
      {icon != null && <div className="text-2xl text-text-sec/40">{icon}</div>}
      <p className="text-sm text-text-sec text-center">{message}</p>
      {action}
    </div>
  );
}
