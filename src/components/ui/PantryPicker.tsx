import { usePantry } from '../../hooks/usePantry';

interface PantryPickerProps {
  /** Render variant: pills (Dashboard) or compact dropdown (Recipes header). */
  variant?: 'pills' | 'dropdown';
  /** Hide entirely when there's only one pantry to choose from. Default true. */
  hideWhenSingle?: boolean;
  className?: string;
}

/**
 * Active-pantry switcher backed by the global PantryContext. Renders nothing
 * (by default) when the user only has one pantry, since there's nothing to
 * pick. Otherwise: pills row (Dashboard) or `<select>` (Recipes header).
 */
export default function PantryPicker({
  variant = 'pills',
  hideWhenSingle = true,
  className = '',
}: PantryPickerProps) {
  const { activeId, setActiveId, pantries } = usePantry();
  if (hideWhenSingle && pantries.length <= 1) return null;
  if (pantries.length === 0) return null;

  if (variant === 'dropdown') {
    return (
      <select
        value={activeId ?? ''}
        onChange={e => setActiveId(Number(e.target.value))}
        className={`bg-bg border border-border rounded-lg px-2 py-1.5 text-xs text-text outline-none focus:border-accent cursor-pointer ${className}`}
      >
        {pantries.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    );
  }

  return (
    <div className={`flex gap-1 flex-wrap ${className}`}>
      {pantries.map(p => (
        <button
          key={p.id}
          type="button"
          onClick={() => setActiveId(p.id)}
          className={[
            'text-xs px-3 py-1.5 rounded-lg border cursor-pointer transition-colors',
            activeId === p.id
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-border text-text-sec hover:border-accent/50',
          ].join(' ')}
        >
          {p.name}
        </button>
      ))}
    </div>
  );
}
