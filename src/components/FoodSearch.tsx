import { useState, useMemo, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import Fuse from 'fuse.js';
import { api } from '../api';
import type { Food, Recipe } from '../types';

export type SearchItem = (Food & { _freq?: number; isRecipe?: false }) | (Recipe & { _freq?: number; isRecipe: true });

interface FoodSearchProps {
  items: SearchItem[];
  onSelect: (item: SearchItem) => void;
  placeholder?: string;
  value?: string;
  onClear?: () => void;
  clearAfterSelect?: boolean;
  showAllWhenEmpty?: boolean;
  /** When set, each food row shows a small badge with the total grams currently in this pantry. */
  pantryId?: number;
}

export default function FoodSearch({ items, onSelect, placeholder = 'Search…', value, onClear, clearAfterSelect = false, showAllWhenEmpty = false, pantryId }: FoodSearchProps) {
  const [query, setQuery] = useState(value ?? '');
  const [activeIdx, setActiveIdx] = useState(-1);
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fuse = useMemo(() => new Fuse(items, { keys: ['name'], threshold: 0.4, includeScore: true }), [items]);

  const allSorted = useMemo(() => [...items].sort((a, b) => a.name.localeCompare(b.name)), [items]);

  const results = useMemo(() => {
    if (!query.trim()) {
      return showAllWhenEmpty ? allSorted : [];
    }
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

  // Pantry stock map (food_id → { total, packs, loose }). Refetched when pantry changes or list opens.
  type Stock = { total_g: number; loose_g: number; packs: { grams: number; count: number }[] };
  const [stockMap, setStockMap] = useState<Record<number, Stock>>({});
  useEffect(() => {
    if (pantryId == null) { setStockMap({}); return; }
    let cancelled = false;
    api.pantry.getStockMap(pantryId).then(m => { if (!cancelled) setStockMap(m ?? {}); });
    return () => { cancelled = true; };
  }, [pantryId, open]);

  function formatStock(s: Stock): string {
    const fmtG = (g: number) => g >= 1000
      ? `${(g / 1000).toFixed(g >= 10000 ? 0 : 1)}kg`
      : `${Math.round(g)}g`;
    const packParts = s.packs.map(p =>
      `${p.count % 1 === 0 ? p.count : p.count.toFixed(1)}×${fmtG(p.grams)}`,
    );
    if (packParts.length === 0) return fmtG(s.loose_g);
    if (s.loose_g <= 0) return packParts.join(' + ');
    return [...packParts, fmtG(s.loose_g)].join(' + ');
  }

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
    setOpen(e.target.value.length > 0 || showAllWhenEmpty);
    setActiveIdx(-1);
    if (!e.target.value && onClear) onClear();
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <div className="absolute left-5 text-text-sec/40 pointer-events-none group-focus-within:text-accent transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => (query || showAllWhenEmpty) && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full bg-card border-2 border-border/40 rounded-[2rem] pl-14 pr-6 py-5 text-lg font-bold text-text placeholder:text-text-sec/30 outline-none focus:border-accent focus:bg-bg/60 transition-all shadow-sm"
        />
        {query && (
          <button onClick={() => { setQuery(''); if(onClear) onClear(); }} className="absolute right-5 p-2 text-text-sec/40 hover:text-text transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>
      {open && results.length > 0 && rect && createPortal(
        <ul
          ref={listRef}
          style={{ position: 'fixed', top: rect.top, left: rect.left, width: rect.width }}
          className="z-[100] bg-card/95 backdrop-blur-xl border border-border/60 rounded-[2rem] shadow-2xl max-h-96 overflow-y-auto mt-2 overflow-hidden animate-spring-up"
        >
          {results.map((item, i) => (
            <li
              key={item.id + (item.isRecipe ? '-r' : '')}
              onMouseDown={() => select(item)}
              onMouseEnter={() => setActiveIdx(i)}
              className={[
                'flex items-center justify-between gap-4 px-6 py-4 cursor-pointer transition-all border-b border-border/10 last:border-0',
                i === activeIdx ? 'bg-accent/10' : 'hover:bg-card-hover/40',
              ].join(' ')}
            >
              <div className="min-w-0 flex-1">
                <div className={`font-black text-lg truncate ${i === activeIdx ? 'text-accent' : 'text-text'} transition-colors tracking-tight`}>{item.name}</div>
                <div className="text-[10px] font-bold text-text-sec/60 uppercase tracking-widest mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="text-text tabular-nums">{Math.round(item.calories)} kcal</span>
                  <span className="opacity-20">/</span>
                  <span>P {Math.round(item.protein * 10) / 10}g</span>
                  <span className="opacity-20">/</span>
                  <span>C {Math.round(item.carbs * 10) / 10}g</span>
                  <span className="opacity-20">/</span>
                  <span>F {Math.round(item.fat * 10) / 10}g</span>
                  {!item.isRecipe && <span className="ml-1 opacity-40 font-normal italic text-[9px] lowercase">(per 100g)</span>}
                </div>
              </div>
              {!item.isRecipe && pantryId != null && stockMap[item.id]?.total_g > 0 && (
                <span
                  className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl bg-green/10 text-green tabular-nums shrink-0 border border-green/20"
                  title={`In pantry: ${Math.round(stockMap[item.id].total_g)}g`}
                >
                  {formatStock(stockMap[item.id])}
                </span>
              )}
              {item.isRecipe && (
                <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl bg-accent/10 text-accent2 shrink-0 border border-accent/20">
                  recipe
                </span>
              )}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  );
}
