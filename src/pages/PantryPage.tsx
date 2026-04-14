import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { evalExpr, resolveExpr } from '../lib/evalExpr';
import { today, daysUntil, formatDMY } from '../lib/dateUtil';
import { api } from '../api';
import { useToast } from '../components/Toast';
import { useSettings } from '../hooks/useSettings';
import FoodSearch from '../components/FoodSearch';
import type { SearchItem } from '../components/FoodSearch';
import ConfirmDialog from '../components/ConfirmDialog';
import AddFoodPanel from '../components/AddFoodPanel';
import type { Food, PantryItem, PantryAggregate, ShoppingItem } from '../types';

type Tab = 'pantry' | 'shopping';

// ── Helpers ───────────────────────────────────────────────────────────────────

function compareExpiry(a: string | null, b: string | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a.localeCompare(b);
}

function expiryPillClass(iso: string | null, warn: number, urgent: number): string {
  if (!iso) return 'text-text-sec';
  const d = daysUntil(iso);
  if (d < 0) return 'text-red font-semibold';
  if (d <= urgent) return 'text-red';
  if (d <= warn) return 'text-yellow';
  return 'text-text-sec';
}

function expiryLabel(iso: string | null, warn: number, urgent: number): string {
  if (!iso) return '';
  const d = daysUntil(iso);
  if (d < 0) return `Expired ${Math.abs(d)}d ago`;
  if (d === 0) return 'Expires today';
  if (d <= warn) return `Exp. in ${d}d`;
  return formatDMY(iso);
}

/** On focus of an empty date field, seed it with today so the user only needs to change the day. */
function seedExpiry(current: string): string {
  return current || today();
}

/**
 * After the user finishes typing, if the resulting date is strictly in the past,
 * advance it by one month (so typing "5" when today is the 14th gives next month's 5th).
 */
function resolveExpiry(iso: string): string {
  if (!iso) return iso;
  if (daysUntil(iso) >= 0) return iso; // today or future — keep as-is
  const [y, m, d] = iso.split('-').map(Number);
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear  = m === 12 ? y + 1 : y;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function formatQty(quantity_g: number, piece_grams: number | null): string {
  if (piece_grams && piece_grams > 0) {
    const pcs = Math.round((quantity_g / piece_grams) * 10) / 10;
    return `${pcs} pcs (${Math.round(quantity_g)}g)`;
  }
  return `${Math.round(quantity_g)}g`;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PantryPage() {
  const { showToast } = useToast();
  const { settings } = useSettings();
  const [tab, setTab] = useState<Tab>('pantry');

  // Pantry state
  const [items, setItems]               = useState<PantryItem[]>([]);
  const [foods, setFoods]               = useState<Food[]>([]);
  const [selFood, setSelFood]           = useState<Food | null>(null);
  const [qty, setQty]                   = useState('');
  const [expiry, setExpiry]             = useState(''); // ISO date or ''
  const [usePieces, setUsePieces]       = useState(false);
  const [pantryOpen, setPantryOpen]     = useState(true);
  const [discardId, setDiscardId]       = useState<number | null>(null);
  const [collapsedFoods, setCollapsedFoods] = useState<Set<number>>(new Set());
  const [editingBatch, setEditingBatch] = useState<{ id: number; qty: string; expiry: string; usePieces: boolean } | null>(null);
  const qtyRef = useRef<HTMLInputElement>(null);

  // Shopping state
  const [shopping, setShopping]   = useState<ShoppingItem[]>([]);
  const [shopFood, setShopFood]   = useState<Food | null>(null);
  const [shopQty, setShopQty]     = useState('');
  const [shopOpen, setShopOpen]   = useState(true);

  const loadPantry = useCallback(async () => {
    const [p, f] = await Promise.all([api.pantry.getAll(), api.foods.getAll()]);
    setItems(p);
    setFoods(f);
  }, []);

  const loadShopping = useCallback(async () => {
    setShopping(await api.shopping.getAll());
  }, []);

  useEffect(() => { loadPantry(); loadShopping(); }, [loadPantry, loadShopping]);

  // ── Aggregation ─────────────────────────────────────────────────────────────

  const aggregates: PantryAggregate[] = useMemo(() => {
    const map = new Map<number, PantryAggregate>();
    for (const b of items) {
      if (!map.has(b.food_id)) {
        map.set(b.food_id, {
          food_id: b.food_id,
          food_name: b.food_name,
          piece_grams: b.piece_grams,
          total_g: 0,
          earliest_expiry: null,
          batches: [],
        });
      }
      const agg = map.get(b.food_id)!;
      agg.total_g += b.quantity_g;
      agg.batches.push(b);
    }
    for (const agg of map.values()) {
      agg.batches.sort((a, b) => compareExpiry(a.expiry_date, b.expiry_date));
      agg.earliest_expiry = agg.batches[0]?.expiry_date ?? null;
    }
    return [...map.values()].sort((a, b) => {
      const ec = compareExpiry(a.earliest_expiry, b.earliest_expiry);
      return ec !== 0 ? ec : a.food_name.localeCompare(b.food_name);
    });
  }, [items]);

  const foodMap = useMemo(() => new Map(foods.map(f => [f.id, f])), [foods]);

  const foodSearchItems: SearchItem[] = foods.map(f => ({ ...f, isRecipe: false as const, _freq: 0 }));

  const addGrams = selFood
    ? (usePieces && selFood.piece_grams ? (evalExpr(qty) ?? 0) * selFood.piece_grams : (evalExpr(qty) ?? 0))
    : 0;

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleSelect(item: SearchItem) {
    const food = item as Food;
    setSelFood(food);
    setUsePieces(!!(food.piece_grams));
    setQty('');
    setExpiry('');
    setTimeout(() => qtyRef.current?.focus(), 0);
  }

  async function handleAddBatch() {
    if (!selFood || !qty || addGrams <= 0) return;
    await api.pantry.addBatch({ food_id: selFood.id, quantity_g: addGrams, expiry_date: expiry || null });
    setSelFood(null); setQty(''); setUsePieces(false); setExpiry('');
    loadPantry();
  }

  function startEditBatch(batch: PantryItem) {
    const hasPieces = !!(batch.piece_grams && batch.piece_grams > 0);
    setEditingBatch({
      id: batch.id,
      qty: hasPieces
        ? String(Math.round((batch.quantity_g / batch.piece_grams!) * 10) / 10)
        : String(Math.round(batch.quantity_g)),
      expiry: batch.expiry_date ?? '',
      usePieces: hasPieces,
    });
  }

  async function handleSaveBatch(batch: PantryItem) {
    if (!editingBatch) return;
    const val = evalExpr(editingBatch.qty) ?? 0;
    const grams = editingBatch.usePieces && batch.piece_grams ? val * batch.piece_grams : val;
    await api.pantry.set({ id: editingBatch.id, quantity_g: grams || 0, expiry_date: editingBatch.expiry || null });
    setEditingBatch(null);
    loadPantry();
  }

  async function handleConfirmDiscard() {
    if (discardId === null) return;
    await api.pantry.delete(discardId);
    setDiscardId(null);
    loadPantry();
  }

  function toggleCollapse(food_id: number) {
    setCollapsedFoods(prev => {
      const next = new Set(prev);
      if (next.has(food_id)) next.delete(food_id); else next.add(food_id);
      return next;
    });
  }

  function handleFoodSaved(food: Food) {
    // Called by AddFoodPanel after a new food is created — refresh the foods list.
    loadPantry();
    // Pre-select the new food in the "Add / top up" form.
    setSelFood(food);
    setUsePieces(!!(food.piece_grams));
    setQty(''); setExpiry('');
    setTimeout(() => qtyRef.current?.focus(), 0);
  }

  function handleFoodFound(food: Food) {
    // Called by AddFoodPanel when a barcode scan matches an existing food.
    setSelFood(food);
    setUsePieces(!!(food.piece_grams));
    setQty(''); setExpiry('');
    showToast(`Found: ${food.name}`);
    setTimeout(() => qtyRef.current?.focus(), 0);
  }

  async function handleAddShopping() {
    if (!shopFood) return;
    await api.shopping.add({ food_id: shopFood.id, quantity_g: shopQty ? (evalExpr(shopQty) ?? 0) : 0 });
    setShopFood(null); setShopQty('');
    loadShopping();
  }

  // ── Styles ───────────────────────────────────────────────────────────────────

  const inputCls = "bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

  const tabBtn = (v: Tab) => [
    'px-5 py-2.5 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px',
    tab === v ? 'border-accent text-accent' : 'border-transparent text-text-sec hover:text-text',
  ].join(' ');

  const warn = settings.pantry_warn_days ?? 3;
  const urgent = settings.pantry_urgent_days ?? 1;

  const unchecked = shopping.filter(s => !s.checked);
  const checked   = shopping.filter(s => s.checked);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold text-text">Pantry</h1>

      {/* Add new food (collapsed by default) — 📷 in header scans to create or find existing food */}
      <AddFoodPanel
        knownFoods={foods}
        onFoodFound={handleFoodFound}
        onSaved={handleFoodSaved}
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <button className={tabBtn('pantry')}   onClick={() => setTab('pantry')}>Pantry</button>
        <button className={tabBtn('shopping')} onClick={() => setTab('shopping')}>Shopping list</button>
      </div>

      {/* ── PANTRY TAB ─────────────────────────────────────────────────────── */}
      {tab === 'pantry' && (
        <div className="flex flex-col gap-4">

          {/* Collapsible add form */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setPantryOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-text hover:bg-card-hover cursor-pointer transition-colors"
            >
              <span>Add / top up</span>
              <span className="text-text-sec text-xs">{pantryOpen ? '▲' : '▼'}</span>
            </button>
            {pantryOpen && (
              <div className="px-4 pb-4 pt-3 border-t border-border flex flex-col gap-3">
                <FoodSearch
                  items={foodSearchItems}
                  onSelect={handleSelect}
                  onClear={() => { setSelFood(null); setQty(''); setUsePieces(false); setExpiry(''); }}
                  placeholder="Search food…"
                  clearAfterSelect
                />
                {selFood && (
                  <div className="flex flex-col gap-3">
                    {/* Food info card */}
                    <div className="bg-bg border border-border rounded-xl px-4 py-3 flex flex-col gap-1.5">
                      <p className="font-semibold text-text">{selFood.name}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-text-sec tabular-nums">
                        <span><span className="text-text font-medium">{selFood.calories}</span> kcal</span>
                        <span>Fat <span className="text-text font-medium">{selFood.fat}</span>g</span>
                        <span>Carbs <span className="text-text font-medium">{selFood.carbs}</span>g</span>
                        <span>Fiber <span className="text-text font-medium">{selFood.fiber ?? 0}</span>g</span>
                        <span>Protein <span className="text-text font-medium">{selFood.protein}</span>g</span>
                        <span className="opacity-50">/ 100g</span>
                      </div>
                      {addGrams > 0 && (() => {
                        const r = addGrams / 100;
                        return (
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs tabular-nums border-t border-border pt-1.5 mt-0.5">
                            <span className="text-text-sec">{Math.round(addGrams * 10) / 10}g =</span>
                            <span><span className="text-text font-semibold">{Math.round(selFood.calories * r)}</span> kcal</span>
                            <span>Fat <span className="text-text font-semibold">{Math.round(selFood.fat * r * 10) / 10}</span>g</span>
                            <span>Carbs <span className="text-text font-semibold">{Math.round(selFood.carbs * r * 10) / 10}</span>g</span>
                            <span>Fiber <span className="text-text font-semibold">{Math.round((selFood.fiber ?? 0) * r * 10) / 10}</span>g</span>
                            <span>Protein <span className="text-text font-semibold">{Math.round(selFood.protein * r * 10) / 10}</span>g</span>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {selFood.piece_grams && (
                        <div className="flex rounded-lg border border-border overflow-hidden text-xs">
                          <button
                            onClick={() => { setUsePieces(false); setQty(''); }}
                            className={`px-3 py-1.5 cursor-pointer transition-colors ${!usePieces ? 'bg-accent/15 text-accent font-medium' : 'text-text-sec hover:text-text'}`}
                          >g</button>
                          <button
                            onClick={() => { setUsePieces(true); setQty(''); }}
                            className={`px-3 py-1.5 cursor-pointer transition-colors ${usePieces ? 'bg-accent/15 text-accent font-medium' : 'text-text-sec hover:text-text'}`}
                          >pcs</button>
                        </div>
                      )}
                      <input
                        ref={qtyRef}
                        type="text" inputMode="decimal"
                        value={qty}
                        onChange={e => setQty(e.target.value)}
                        onBlur={() => setQty(v => resolveExpr(v))}
                        placeholder={usePieces ? 'pieces' : 'grams'}
                        className={`w-28 ${inputCls}`}
                        onKeyDown={e => { if (e.key === 'Enter') { setQty(resolveExpr(qty)); handleAddBatch(); } }}
                      />
                      {usePieces && selFood.piece_grams && qty && (evalExpr(qty) ?? 0) > 0 && (
                        <span className="text-xs text-text-sec">= {Math.round((evalExpr(qty) ?? 0) * selFood.piece_grams)}g</span>
                      )}
                      {/* Expiry date */}
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-text-sec shrink-0">Exp:</label>
                        <input
                          type="date"
                          value={expiry}
                          onFocus={() => setExpiry(v => seedExpiry(v))}
                          onChange={e => setExpiry(e.target.value)}
                          onBlur={e => setExpiry(resolveExpiry(e.target.value))}
                          className="bg-bg border border-border rounded-lg px-2 py-1.5 text-xs text-text outline-none focus:border-accent cursor-pointer"
                        />
                        {expiry && (
                          <button onClick={() => setExpiry('')} className="text-xs text-text-sec hover:text-text cursor-pointer">✕</button>
                        )}
                      </div>
                      <button
                        onClick={handleAddBatch}
                        disabled={!qty || addGrams <= 0}
                        className="px-4 py-2 bg-accent text-white text-sm rounded-lg cursor-pointer hover:opacity-90 disabled:opacity-40 font-medium"
                      >Add</button>
                      <button
                        onClick={() => { setSelFood(null); setQty(''); setUsePieces(false); setExpiry(''); }}
                        className="text-sm text-text-sec cursor-pointer hover:text-text"
                      >Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pantry aggregate list */}
          {aggregates.length === 0 ? (
            <p className="text-sm text-text-sec text-center py-10">Pantry is empty. Add ingredients you have at home.</p>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
              {aggregates.map((agg, aggIdx) => {
                const collapsed = collapsedFoods.has(agg.food_id);
                const expiryLbl = expiryLabel(agg.earliest_expiry, warn, urgent);
                const expiryColor = expiryPillClass(agg.earliest_expiry, warn, urgent);
                const foodData = foodMap.get(agg.food_id);
                const totalKcal = foodData ? Math.round(foodData.calories * agg.total_g / 100) : null;
                return (
                  <div key={agg.food_id}>
                    {/* Aggregate header */}
                    <button
                      onClick={() => toggleCollapse(agg.food_id)}
                      className={[
                        'w-full flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors text-left',
                        aggIdx % 2 === 0 ? 'bg-card hover:bg-card-hover' : 'bg-card/60 hover:bg-card-hover',
                      ].join(' ')}
                    >
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm font-medium text-text">{agg.food_name}</span>
                        {foodData && (
                          <span className="text-xs text-text-sec/60 tabular-nums">
                            {foodData.calories} kcal · Protein {foodData.protein}g · Carbs {foodData.carbs}g · Fat {foodData.fat}g · Fiber {foodData.fiber ?? 0}g
                          </span>
                        )}
                      </div>
                      {expiryLbl && (
                        <span className={`text-xs tabular-nums shrink-0 ${expiryColor}`}>{expiryLbl}</span>
                      )}
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-sm text-text tabular-nums font-semibold">
                          {formatQty(agg.total_g, agg.piece_grams)}
                        </span>
                        {totalKcal !== null && (
                          <span className="text-xs text-text-sec/60 tabular-nums">≈ {totalKcal} kcal</span>
                        )}
                      </div>
                      {agg.batches.length > 1 && (
                        <span className="text-xs text-text-sec/50 tabular-nums shrink-0">{agg.batches.length}×</span>
                      )}
                      <span className="text-text-sec/40 text-xs w-3 text-right shrink-0">{collapsed ? '▶' : '▼'}</span>
                    </button>

                    {/* Batch rows */}
                    {!collapsed && (
                      <div className="divide-y divide-border/30">
                        {agg.batches.map((batch, bIdx) => {
                          const isEditing = editingBatch?.id === batch.id;
                          const bExpiryLabel = expiryLabel(batch.expiry_date, warn, urgent);
                          const bExpiryColor = expiryPillClass(batch.expiry_date, warn, urgent);
                          return (
                            <div key={batch.id} className={[
                              'flex items-center gap-3 pl-8 pr-4 py-2 transition-colors',
                              bIdx % 2 === 0 ? 'bg-bg hover:bg-bg/80' : 'bg-bg/60 hover:bg-bg/80',
                            ].join(' ')}>
                              {isEditing ? (
                                <>
                                  <div className="flex items-center gap-1.5 flex-wrap flex-1">
                                    {batch.piece_grams && (
                                      <button
                                        onClick={() => setEditingBatch(b => b ? { ...b, usePieces: !b.usePieces } : b)}
                                        className="text-xs text-text-sec hover:text-accent cursor-pointer border border-border rounded px-1.5 py-0.5"
                                      >
                                        {editingBatch.usePieces ? 'pcs' : 'g'}
                                      </button>
                                    )}
                                    <input
                                      type="text" inputMode="decimal"
                                      value={editingBatch.qty}
                                      onChange={e => setEditingBatch(b => b ? { ...b, qty: e.target.value } : b)}
                                      onBlur={() => setEditingBatch(b => b ? { ...b, qty: resolveExpr(b.qty) } : b)}
                                      autoFocus
                                      onKeyDown={e => {
                                        if (e.key === 'Enter')  { setEditingBatch(b => b ? { ...b, qty: resolveExpr(b.qty) } : b); handleSaveBatch(batch); }
                                        if (e.key === 'Escape') setEditingBatch(null);
                                      }}
                                      className="w-20 bg-bg border border-border rounded-lg px-2 py-1 text-sm text-text text-right focus:outline-none focus:border-accent"
                                    />
                                    <input
                                      type="date"
                                      value={editingBatch.expiry}
                                      onFocus={() => setEditingBatch(b => b ? { ...b, expiry: seedExpiry(b.expiry) } : b)}
                                      onChange={e => setEditingBatch(b => b ? { ...b, expiry: e.target.value } : b)}
                                      onBlur={e => setEditingBatch(b => b ? { ...b, expiry: resolveExpiry(e.target.value) } : b)}
                                      className="bg-bg border border-border rounded-lg px-2 py-1 text-xs text-text outline-none focus:border-accent cursor-pointer"
                                    />
                                    {editingBatch.expiry && (
                                      <button onClick={() => setEditingBatch(b => b ? { ...b, expiry: '' } : b)} className="text-xs text-text-sec hover:text-text cursor-pointer">✕</button>
                                    )}
                                  </div>
                                  <button onClick={() => handleSaveBatch(batch)} className="text-xs text-accent font-medium cursor-pointer hover:opacity-75 px-1">Save</button>
                                  <button onClick={() => setEditingBatch(null)} className="text-xs text-text-sec cursor-pointer hover:text-text px-1">✕</button>
                                </>
                              ) : (
                                <>
                                  <div className="flex-1 flex items-center gap-3">
                                    <span className="text-sm font-semibold tabular-nums text-text">
                                      {formatQty(batch.quantity_g, batch.piece_grams)}
                                    </span>
                                    {batch.expiry_date ? (
                                      <span className={`text-xs tabular-nums ${bExpiryColor}`}>{bExpiryLabel}</span>
                                    ) : (
                                      <span className="text-xs text-text-sec/40">no date</span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => startEditBatch(batch)}
                                    className="text-xs text-text-sec hover:text-accent cursor-pointer transition-colors px-1"
                                  >Edit</button>
                                  <button
                                    onClick={() => setDiscardId(batch.id)}
                                    className="text-xs text-text-sec hover:text-red cursor-pointer transition-colors px-1"
                                    title="Discard this batch"
                                  >Discard</button>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── SHOPPING TAB ───────────────────────────────────────────────────── */}
      {tab === 'shopping' && (
        <div className="flex flex-col gap-4">

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setShopOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-text hover:bg-card-hover cursor-pointer transition-colors"
            >
              <span>Add item</span>
              <span className="text-text-sec text-xs">{shopOpen ? '▲' : '▼'}</span>
            </button>
            {shopOpen && (
              <div className="px-4 pb-4 pt-3 border-t border-border flex flex-col gap-3">
                <FoodSearch
                  items={foodSearchItems}
                  onSelect={item => { setShopFood(item as Food); setShopQty(''); }}
                  onClear={() => { setShopFood(null); setShopQty(''); }}
                  placeholder="Search food…"
                  clearAfterSelect
                />
                {shopFood && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-text flex-1">{shopFood.name}</span>
                    <input
                      type="text" inputMode="decimal"
                      value={shopQty}
                      onChange={e => setShopQty(e.target.value)}
                      onBlur={() => setShopQty(v => resolveExpr(v))}
                      placeholder="Amount (g, optional)"
                      className={`w-40 ${inputCls}`}
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') { setShopQty(resolveExpr(shopQty)); handleAddShopping(); } }}
                    />
                    <button onClick={handleAddShopping} className="px-4 py-2 bg-accent text-white text-sm rounded-lg cursor-pointer hover:opacity-90 font-medium">Add</button>
                    <button onClick={() => setShopFood(null)} className="text-sm text-text-sec cursor-pointer hover:text-text">Cancel</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {shopping.length === 0 ? (
            <p className="text-sm text-text-sec text-center py-10">Shopping list is empty.</p>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {unchecked.length > 0 && (
                <div className="flex flex-col divide-y divide-border/40">
                  {unchecked.map(item => (
                    <ShoppingRow key={item.id} item={item} onToggle={() => api.shopping.toggle(item.id).then(loadShopping)} onDelete={() => api.shopping.delete(item.id).then(loadShopping)} />
                  ))}
                </div>
              )}
              {checked.length > 0 && (
                <>
                  <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-bg/30">
                    <span className="text-xs text-text-sec uppercase tracking-wider font-medium">{checked.length} checked</span>
                    <button onClick={() => api.shopping.clearChecked().then(loadShopping)} className="text-xs text-text-sec hover:text-red cursor-pointer transition-colors">Clear all</button>
                  </div>
                  <div className="flex flex-col divide-y divide-border/40">
                    {checked.map(item => (
                      <ShoppingRow key={item.id} item={item} onToggle={() => api.shopping.toggle(item.id).then(loadShopping)} onDelete={() => api.shopping.delete(item.id).then(loadShopping)} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {discardId !== null && (
        <ConfirmDialog
          message="Discard this batch? The quantity will be removed from the pantry."
          confirmLabel="Discard"
          dangerous
          onConfirm={handleConfirmDiscard}
          onCancel={() => setDiscardId(null)}
        />
      )}
    </div>
  );
}

// ── Module-level sub-components ───────────────────────────────────────────────

interface ShoppingRowProps {
  item: ShoppingItem;
  onToggle: () => void;
  onDelete: () => void;
}

function ShoppingRow({ item, onToggle, onDelete }: ShoppingRowProps) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 transition-colors ${item.checked ? 'bg-bg/20' : 'hover:bg-bg/40'}`}>
      <button
        onClick={onToggle}
        className={[
          'w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors shrink-0',
          item.checked ? 'border-accent bg-accent text-white' : 'border-border hover:border-accent',
        ].join(' ')}
      >
        {item.checked ? <span className="text-[10px] leading-none">✓</span> : null}
      </button>
      <span className={`flex-1 text-sm ${item.checked ? 'line-through text-text-sec' : 'text-text'}`}>
        {item.food_name}
      </span>
      {item.quantity_g > 0 && (
        <span className="text-xs text-text-sec tabular-nums">{item.quantity_g}g</span>
      )}
      <button onClick={onDelete} className="text-text-sec hover:text-red text-sm cursor-pointer transition-colors w-5 text-center">✕</button>
    </div>
  );
}

