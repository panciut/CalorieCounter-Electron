import { useState, useMemo, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import Fuse from 'fuse.js';
import type { Food, Recipe } from '../types';

export type SearchItem = (Food & { _freq?: number; isRecipe?: false }) | (Recipe & { _freq?: number; isRecipe: true });

interface FoodSearchProps {
  items: SearchItem[];
  onSelect: (item: SearchItem) => void;
  placeholder?: string;
  value?: string;
  onClear?: () => void;
  clearAfterSelect?: boolean;
}

export default function FoodSearch({ items, onSelect, placeholder = 'Search…', value, onClear, clearAfterSelect = false }: FoodSearchProps) {
  const [query, setQuery] = useState(value ?? '');
  const [activeIdx, setActiveIdx] = useState(-1);
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fuse = useMemo(() => new Fuse(items, { keys: ['name'], threshold: 0.4, includeScore: true }), [items]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const raw = fuse.search(query).slice(0, 20);
    // Sort: exact prefix match first, then by frequency, then fuse score
    return raw
      .sort((a, b) => {
        const aFreq = (a.item as SearchItem & { _freq?: number })._freq ?? 0;
        const bFreq = (b.item as SearchItem & { _freq?: number })._freq ?? 0;
        if (bFreq !== aFreq) return bFreq - aFreq;
        return (a.score ?? 1) - (b.score ?? 1);
      })
      .slice(0, 10)
      .map(r => r.item);
  }, [query, fuse]);

  // Sync controlled value
  useEffect(() => {
    if (value !== undefined) setQuery(value);
  }, [value]);

  // Click outside closes
  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      if (containerRef.current && containerRef.current.contains(target)) return;
      if (listRef.current && listRef.current.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Track input position for portaled dropdown
  useLayoutEffect(() => {
    if (!open) return;
    function update() {
      const el = inputRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, query]);

  const select = useCallback((item: SearchItem) => {
    setQuery(clearAfterSelect ? '' : item.name);
    setOpen(false);
    setActiveIdx(-1);
    onSelect(item);
  }, [onSelect, clearAfterSelect]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || !results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      select(results[activeIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setOpen(true);
    setActiveIdx(-1);
    if (!e.target.value && onClear) onClear();
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => query && setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full bg-bg border border-border rounded-md px-3 py-2 text-md text-text placeholder:text-text-sec outline-none focus:border-accent transition-colors"
      />
      {open && results.length > 0 && rect && createPortal(
        <ul
          ref={listRef}
          style={{ position: 'fixed', top: rect.top, left: rect.left, width: rect.width }}
          className="z-[100] bg-card border border-border rounded-md shadow-lg max-h-72 overflow-y-auto"
        >
          {results.map((item, i) => (
            <li
              key={item.id + (item.isRecipe ? '-r' : '')}
              onMouseDown={() => select(item)}
              onMouseEnter={() => setActiveIdx(i)}
              className={[
                'flex items-center justify-between gap-2 px-3 py-2 text-md cursor-pointer transition-colors',
                i === activeIdx ? 'bg-accent/15 text-text' : 'text-text hover:bg-card-hover',
              ].join(' ')}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate">{item.name}</div>
                <div className="text-[11px] text-text-sec tabular-nums">
                  {Math.round(item.calories)} kcal
                  <span className="mx-1">·</span>F {Math.round(item.fat * 10) / 10}
                  <span className="mx-1">·</span>C {Math.round(item.carbs * 10) / 10}
                  {(item.fiber ?? 0) > 0 && <><span className="mx-1">·</span>Fi {Math.round((item.fiber ?? 0) * 10) / 10}</>}
                  <span className="mx-1">·</span>P {Math.round(item.protein * 10) / 10}
                  {!item.isRecipe && <span className="ml-1 opacity-60">/100g</span>}
                </div>
              </div>
              {item.isRecipe && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-accent/20 text-accent2 shrink-0">recipe</span>
              )}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  );
}
