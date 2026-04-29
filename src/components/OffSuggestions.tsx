import { useEffect, useState, useRef } from 'react';
import { api } from '../api';
import { useT } from '../i18n/useT';
import type { BarcodeResult } from '../types';

interface OffSuggestionsProps {
  query: string;
  /** When true, the typeahead is disabled (e.g. a barcode is already filled in). */
  disabled?: boolean;
  onSelect: (result: BarcodeResult) => void;
}

/**
 * Debounced live Open Food Facts name search. Renders an inline panel below
 * a name input. Disabled while `query` is shorter than 3 chars or when the
 * caller has already locked in a barcode.
 */
export default function OffSuggestions({ query, disabled = false, onSelect }: OffSuggestionsProps) {
  const { t } = useT();
  const [results, setResults] = useState<BarcodeResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);
  const reqIdRef = useRef(0);

  useEffect(() => {
    if (disabled) { setResults(null); return; }
    const trimmed = query.trim();
    if (trimmed.length < 1) { setResults(null); return; }
    const myId = ++reqIdRef.current;
    setLoading(true);
    const handle = setTimeout(async () => {
      const r = await api.openfoodfacts.searchByName(trimmed, 15);
      if (myId === reqIdRef.current) {
        setResults(r);
        setLoading(false);
        setOpen(true);
      }
    }, 300);
    return () => { clearTimeout(handle); };
  }, [query, disabled]);

  if (disabled || results === null) return null;
  if (!open) return null;
  if (results.length === 0 && !loading) {
    return (
      <div className="text-xs text-text-sec px-2 py-1.5 italic">
        {t('foods.noOffMatch')}
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg bg-bg/95 max-h-72 overflow-y-auto divide-y divide-border/40 shadow-lg">
      <div className="flex items-center justify-between px-2 py-1 bg-card/50">
        <span className="text-[10px] uppercase tracking-wider text-text-sec font-medium">
          {t('foods.searchOff')}{loading ? ' …' : ''}
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-text-sec hover:text-text cursor-pointer px-1"
        >✕</button>
      </div>
      {results.map((r, i) => (
        <button
          key={`${r.barcode || ''}-${i}`}
          type="button"
          onClick={() => { onSelect(r); setOpen(false); }}
          className="w-full text-left px-2 py-1.5 hover:bg-card-hover cursor-pointer flex flex-col gap-0.5"
        >
          <div className="flex items-baseline gap-2">
            <span className="text-sm text-text font-medium truncate">{r.name}</span>
            {r.brand && <span className="text-[11px] text-text-sec/80 truncate">· {r.brand}</span>}
            {r.barcode && <span className="text-[10px] text-text-sec/60 ml-auto tabular-nums">{r.barcode}</span>}
          </div>
          <div className="text-[11px] text-text-sec tabular-nums">
            <span className="text-text">{r.calories}</span> kcal
            <span className="mx-1">·</span>F {r.fat}g
            <span className="mx-1">·</span>C {r.carbs}g
            <span className="mx-1">·</span>P {r.protein}g
            <span className="opacity-60 ml-1">/100g</span>
          </div>
        </button>
      ))}
    </div>
  );
}
