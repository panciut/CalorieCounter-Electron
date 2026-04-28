import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { evalExpr, resolveExpr } from '../lib/evalExpr';
import { today, daysUntil, formatDMY } from '../lib/dateUtil';
import { api } from '../api';
import { useToast } from '../components/Toast';
import { useSettings } from '../hooks/useSettings';
import { useT } from '../i18n/useT';
import FoodSearch from '../components/FoodSearch';
import type { SearchItem } from '../components/FoodSearch';
import ConfirmDialog from '../components/ConfirmDialog';
import AddFoodForm from '../components/AddFoodForm';
import type { Food, PantryItem, PantryAggregate, PantryLocation, ShoppingItem } from '../types';

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
  if (d < 0) return 'text-red font-bold';
  if (d <= urgent) return 'text-red font-semibold';
  if (d <= warn) return 'text-yellow-600 font-medium';
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

function openedLabel(batch: PantryItem): string | null {
  if (!batch.opened_at || !batch.opened_days) return null;
  const dueMs = new Date(batch.opened_at).getTime() + batch.opened_days * 86400_000;
  const daysLeft = Math.ceil((dueMs - Date.now()) / 86400_000);
  if (daysLeft < 0)   return `Opened, ${-daysLeft}d past`;
  if (daysLeft === 0) return 'Opened, today';
  return `Opened, ${daysLeft}d left`;
}

function openedPillClass(batch: PantryItem): string {
  if (!batch.opened_at || !batch.opened_days) return 'text-text-sec';
  const dueMs = new Date(batch.opened_at).getTime() + batch.opened_days * 86400_000;
  const daysLeft = Math.ceil((dueMs - Date.now()) / 86400_000);
  if (daysLeft < 0)  return 'text-red font-bold bg-red/10 px-2 py-0.5 rounded';
  if (daysLeft <= 1) return 'text-red font-semibold';
  if (daysLeft <= 3) return 'text-yellow-600 font-medium';
  return 'text-text-sec';
}

function seedExpiry(current: string): string {
  return current || today();
}

function resolveExpiry(iso: string): string {
  if (!iso) return iso;
  if (daysUntil(iso) >= 0) return iso;
  const [y, m, d] = iso.split('-').map(Number);
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear  = m === 12 ? y + 1 : y;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

type PantryUnit = 'g' | 'pcs' | `pkg-${number}`;

function formatQty(quantity_g: number, piece_grams: number | null, package_grams: number | null, count = 1): string {
  const totalG = Math.round(quantity_g * count);
  if (piece_grams && piece_grams > 0) {
    const pcs = Math.round(totalG / piece_grams);
    if (package_grams && package_grams > 0 && count === 1) {
      const pkgG = Math.round(package_grams);
      const pkgPcs = Math.round(pkgG / piece_grams);
      if (Math.abs(totalG - pkgG) < 1) return `${pcs} pcs · ${pkgG}g`;
      return `${pcs}/${pkgPcs} pcs · ${totalG}/${pkgG}g`;
    }
    return `${pcs} pcs (${totalG}g)`;
  }
  if (package_grams && package_grams > 0) {
    const pkgG = Math.round(package_grams);
    if (count > 1) return `${count} × ${pkgG}g (${totalG}g)`;
    if (Math.abs(totalG - pkgG) < 1) return `${pkgG}g`;
    return `${totalG}g / ${pkgG}g`;
  }
  return `${totalG}g`;
}

interface BatchGroup { batches: PantryItem[]; }

function groupBatches(batches: PantryItem[]): BatchGroup[] {
  const groups: BatchGroup[] = [];
  for (const batch of batches) {
    const isSealed = !batch.opened_at;
    const last = groups[groups.length - 1];
    const rep = last?.batches[0];
    const canMerge = last && isSealed && rep && !rep.opened_at &&
      rep.package_id != null && rep.package_id === batch.package_id &&
      rep.expiry_date === batch.expiry_date;
    if (canMerge) last.batches.push(batch);
    else groups.push({ batches: [batch] });
  }
  return groups;
}

function defaultUnit(food: Food): PantryUnit {
  if ((food.packages?.length ?? 0) > 0) return `pkg-${food.packages![0].id}`;
  if (food.piece_grams) return 'pcs';
  return 'g';
}

function unitToGrams(unit: PantryUnit, val: number, food: Food): number {
  if (unit === 'pcs' && food.piece_grams) return val * food.piece_grams;
  if (unit.startsWith('pkg-')) {
    const id = Number(unit.slice(4));
    const pkg = food.packages?.find(p => p.id === id);
    return pkg ? val * pkg.grams : val;
  }
  return val;
}

function unitToPackageId(unit: PantryUnit): number | null {
  return unit.startsWith('pkg-') ? Number(unit.slice(4)) : null;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PantryPage() {
  const { showToast } = useToast();
  const { settings } = useSettings();
  const { t } = useT();
  const [tab, setTab] = useState<Tab>('pantry');

  const [pantries, setPantries]             = useState<PantryLocation[]>([]);
  const [activePantryId, setActivePantryId] = useState<number | undefined>(undefined);
  const [showManageModal, setShowManageModal] = useState(false);

  const [items, setItems]               = useState<PantryItem[]>([]);
  const [foods, setFoods]               = useState<Food[]>([]);
  const [selFood, setSelFood]           = useState<Food | null>(null);
  const [qty, setQty]                   = useState('');
  const [expiry, setExpiry]             = useState('');
  const [unit, setUnit]                 = useState<PantryUnit>('g');
  
  const [pantryOpen, setPantryOpen]     = useState(false);
  const [shopOpen, setShopOpen]         = useState(false);

  const [discardId, setDiscardId]       = useState<number | null>(null);
  const [discardAllIds, setDiscardAllIds] = useState<number[] | null>(null);
  const [collapsedFoods, setCollapsedFoods] = useState<Set<number>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [editingBatch, setEditingBatch] = useState<{ id: number; qty: string; expiry: string; unit: PantryUnit } | null>(null);
  const [pantrySearch, setPantrySearch] = useState('');
  const qtyRef = useRef<HTMLInputElement>(null);

  const [shopping, setShopping]   = useState<ShoppingItem[]>([]);
  const [shopFood, setShopFood]   = useState<Food | null>(null);
  const [shopQty, setShopQty]     = useState('');

  const loadPantry = useCallback(async (pid?: number) => {
    const [p, f] = await Promise.all([api.pantry.getAll(pid), api.foods.getAll()]);
    setItems(p);
    setFoods(f);
  }, []);

  const loadShopping = useCallback(async (pid?: number) => {
    setShopping(await api.shopping.getAll(pid));
  }, []);

  const loadPantries = useCallback(async () => {
    const ps = await api.pantries.getAll();
    setPantries(ps);
    return ps;
  }, []);

  useEffect(() => {
    async function init() {
      const ps = await api.pantries.getAll();
      setPantries(ps);
      const def = ps.find(p => p.is_default) ?? ps[0];
      const pid = def?.id;
      setActivePantryId(pid);
      await Promise.all([loadPantry(pid), loadShopping(pid)]);
    }
    init();
  }, [loadPantry, loadShopping]);

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
          pack_breakdown: [],
        });
      }
      const agg = map.get(b.food_id)!;
      agg.total_g += b.quantity_g;
      agg.batches.push(b);
    }
    for (const agg of map.values()) {
      agg.batches.sort((a, b) => compareExpiry(a.expiry_date, b.expiry_date));
      agg.earliest_expiry = agg.batches[0]?.expiry_date ?? null;
      const packMap = new Map<number, number>();
      for (const b of agg.batches) {
        if (b.package_id && b.package_grams && b.package_grams > 0) {
          const count = b.quantity_g / b.package_grams;
          packMap.set(b.package_grams, (packMap.get(b.package_grams) ?? 0) + count);
        }
      }
      agg.pack_breakdown = [...packMap.entries()]
        .map(([grams, count]) => ({ grams, count: Math.round(count * 10) / 10 }))
        .sort((a, b) => a.grams - b.grams);
    }
    return [...map.values()].sort((a, b) => {
      const ec = compareExpiry(a.earliest_expiry, b.earliest_expiry);
      return ec !== 0 ? ec : a.food_name.localeCompare(b.food_name);
    });
  }, [items]);

  const foodMap = useMemo(() => new Map(foods.map(f => [f.id, f])), [foods]);
  const foodSearchItems: SearchItem[] = foods.map(f => ({ ...f, isRecipe: false as const, _freq: 0 }));

  const addGrams = selFood ? unitToGrams(unit, evalExpr(qty) ?? 0, selFood) : 0;

  function handleSelect(item: SearchItem) {
    const food = item as Food;
    setSelFood(food);
    setUnit(defaultUnit(food));
    setQty('');
    setExpiry('');
    setTimeout(() => qtyRef.current?.focus(), 0);
  }

  async function handleAddBatch() {
    if (!selFood || !qty || addGrams <= 0) return;
    const pkgId = unitToPackageId(unit);
    if (pkgId !== null) {
      const pkgGrams = selFood.packages?.find(p => p.id === pkgId)?.grams ?? addGrams;
      const count = Math.round(addGrams / pkgGrams);
      for (let i = 0; i < count; i++) {
        await api.pantry.addBatch({ food_id: selFood.id, quantity_g: pkgGrams, expiry_date: expiry || null, package_id: pkgId, pantry_id: activePantryId });
      }
    } else {
      await api.pantry.addBatch({ food_id: selFood.id, quantity_g: addGrams, expiry_date: expiry || null, package_id: null, pantry_id: activePantryId });
    }
    setSelFood(null); setQty(''); setUnit('g'); setExpiry('');
    setPantryOpen(false);
    loadPantry(activePantryId);
  }

  function startEditBatch(batch: PantryItem) {
    const food = foods.find(f => f.id === batch.food_id);
    const isBulk = food?.is_bulk === 1;
    let batchUnit: PantryUnit = 'g';
    let qtyStr = String(Math.round(batch.quantity_g));
    if (!isBulk && batch.piece_grams && batch.piece_grams > 0) {
      batchUnit = 'pcs';
      qtyStr = String(Math.round((batch.quantity_g / batch.piece_grams) * 10) / 10);
    }
    setEditingBatch({ id: batch.id, qty: qtyStr, expiry: batch.expiry_date ?? '', unit: batchUnit });
  }

  async function handleSaveBatch(batch: PantryItem) {
    if (!editingBatch) return;
    const val = evalExpr(editingBatch.qty) ?? 0;
    const food = foods.find(f => f.id === batch.food_id);
    const grams = food ? unitToGrams(editingBatch.unit, val, food) : val;
    await api.pantry.set({
      id: editingBatch.id,
      quantity_g: grams || 0,
      expiry_date: editingBatch.expiry || null,
      package_id: batch.package_id,
    });
    setEditingBatch(null);
    loadPantry(activePantryId);
  }

  async function handleConfirmDiscard() {
    if (discardId === null) return;
    await api.pantry.delete(discardId);
    setDiscardId(null);
    loadPantry(activePantryId);
  }

  async function handleConfirmDiscardAll() {
    if (!discardAllIds) return;
    for (const id of discardAllIds) await api.pantry.delete(id);
    setDiscardAllIds(null);
    loadPantry(activePantryId);
  }

  function toggleCollapse(food_id: number) {
    setCollapsedFoods(prev => {
      const next = new Set(prev);
      if (next.has(food_id)) next.delete(food_id); else next.add(food_id);
      return next;
    });
  }

  function handleFoodSaved(food: Food) {
    loadPantry(activePantryId);
    setSelFood(food);
    setUnit(defaultUnit(food));
    setQty(''); setExpiry('');
    setPantryOpen(true);
    setTimeout(() => qtyRef.current?.focus(), 0);
  }

  function handleFoodFound(food: Food) {
    setSelFood(food);
    setUnit(defaultUnit(food));
    setQty(''); setExpiry('');
    setPantryOpen(true);
    showToast(`Found: ${food.name}`, 'success');
    setTimeout(() => qtyRef.current?.focus(), 0);
  }

  async function handleAddShopping() {
    if (!shopFood) return;
    await api.shopping.add({ food_id: shopFood.id, quantity_g: shopQty ? (evalExpr(shopQty) ?? 0) : 0, pantry_id: activePantryId });
    setShopFood(null); setShopQty('');
    setShopOpen(false);
    loadShopping(activePantryId);
  }

  function handleSwitchPantry(id: number) {
    setActivePantryId(id);
    loadPantry(id);
    loadShopping(id);
  }

  const inputCls = "bg-bg border border-border/60 rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all w-full";
  const numInputCls = "w-full bg-bg border border-border/60 rounded-xl px-3 py-2.5 text-sm text-text outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 tabular-nums transition-all";
  const cardCls = "bg-card border border-border/40 shadow-sm rounded-3xl p-5 flex flex-col gap-4";

  const warn = settings.pantry_warn_days ?? 3;
  const urgent = settings.pantry_urgent_days ?? 1;
  const unchecked = shopping.filter(s => !s.checked);
  const checked   = shopping.filter(s => s.checked);

  const q = pantrySearch.toLowerCase();
  const visible = q ? aggregates.filter(a => a.food_name.toLowerCase().includes(q)) : aggregates;
  const allCollapsed = visible.length > 0 && visible.every(agg => collapsedFoods.has(agg.food_id));

  function toggleAllBatches() {
    if (allCollapsed) {
      setCollapsedFoods(new Set());
    } else {
      setCollapsedFoods(new Set(visible.map(a => a.food_id)));
    }
  }

  return (
    <div className="flex flex-col h-[100dvh] md:h-full overflow-hidden bg-bg text-text">
      
      {/* ── HEADER FISSO ──────────────────────────────────────────────────────── */}
      <header className="px-4 py-4 md:px-6 md:py-6 shrink-0 bg-card border-b border-border z-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold">Pantry</h1>
            <div className="flex items-center gap-2">
              {pantries.length > 1 && (
                <select
                  value={activePantryId ?? ''}
                  onChange={e => handleSwitchPantry(Number(e.target.value))}
                  className="bg-bg border border-border/60 rounded-lg px-3 py-1.5 text-sm font-medium text-text outline-none focus:border-accent cursor-pointer shadow-sm"
                >
                  {pantries.map(p => (
                    <option key={p.id} value={p.id}>{p.name}{p.is_default ? ` (${t('pantry.defaultBadge')})` : ''}</option>
                  ))}
                </select>
              )}
              <button
                onClick={() => setShowManageModal(true)}
                className="text-xs font-medium text-text-sec hover:text-text cursor-pointer transition-colors px-3 py-1.5 rounded-lg border border-border/60 bg-card hover:bg-border/30"
              >{t('pantry.managePantries')}</button>
            </div>
          </div>

          <div className="flex p-1 bg-bg border border-border rounded-lg shrink-0 shadow-sm overflow-x-auto hide-scrollbar w-full md:w-auto">
            <button onClick={() => setTab('pantry')} className={`flex-1 md:flex-none px-6 py-2 text-sm font-bold rounded-md transition-colors ${tab === 'pantry' ? 'bg-card shadow-sm border border-border text-text' : 'text-text-sec hover:text-text'}`}>
              Pantry
            </button>
            <button onClick={() => setTab('shopping')} className={`flex-1 md:flex-none px-6 py-2 text-sm font-bold rounded-md transition-colors ${tab === 'shopping' ? 'bg-card shadow-sm border border-border text-text' : 'text-text-sec hover:text-text'}`}>
              Shopping list
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN SCROLLABLE AREA ─────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto w-full relative">
        <div className="p-4 md:p-6 pb-24">

          {/* ── PANTRY TAB ────────────────────────────────────────────────── */}
          {tab === 'pantry' && (
            <div className="flex flex-col gap-6">

              {/* Accordion "Add to Pantry" */}
              <section className={`${cardCls} shrink-0 !p-0 overflow-hidden`}>
                <button onClick={() => setPantryOpen(v => !v)} className="w-full flex items-center justify-between p-5 group hover:bg-bg/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold transition-colors ${pantryOpen ? 'bg-text-sec' : 'bg-accent group-hover:bg-accent/90'}`}>
                      {pantryOpen ? '−' : '+'}
                    </div>
                    <h2 className="text-base font-bold text-text group-hover:text-accent transition-colors">Add to Pantry</h2>
                  </div>
                </button>

                {pantryOpen && (
                  <div className="px-5 pb-5 flex flex-col gap-4 border-t border-border/20 pt-4 animate-slide-down">

                    {!selFood ? (
                      <div className="flex flex-col gap-4">
                        <FoodSearch items={foodSearchItems} onSelect={handleSelect} onClear={() => { setSelFood(null); setQty(''); setUnit('g'); setExpiry(''); }} placeholder="Search existing food..." pantryId={activePantryId} clearAfterSelect />

                        <div className="relative flex py-2 items-center">
                          <div className="flex-grow border-t border-border/60"></div>
                          <span className="flex-shrink-0 mx-4 text-text-sec text-[10px] font-bold uppercase tracking-wider">or scan / create new</span>
                          <div className="flex-grow border-t border-border/60"></div>
                        </div>

                        <AddFoodForm existingFoods={foods} onFoodFound={handleFoodFound} onAdded={handleFoodSaved} />
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3 bg-bg border border-border/40 rounded-xl p-3 shadow-inner">
                          {selFood.image_url && <img src={selFood.image_url} alt="" className="w-12 h-12 rounded-lg object-cover bg-white" />}
                          <div className="flex flex-col">
                            <span className="font-bold text-text">{selFood.name}</span>
                            <span className="text-xs text-text-sec">{selFood.calories} kcal / 100g</span>
                          </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 items-end">
                          <div className="flex flex-col gap-2 w-full md:flex-1">
                            <label className="text-[10px] font-bold text-text-sec/60 uppercase tracking-wider">Quantity</label>
                            <div className="flex items-center gap-2 w-full">
                              {(selFood.piece_grams || (selFood.packages?.length ?? 0) > 0) && (
                                <select
                                  value={unit}
                                  onChange={(e) => { setUnit(e.target.value as PantryUnit); setQty(''); }}
                                  className="bg-bg border border-border/60 rounded-xl p-2.5 text-sm font-medium outline-none w-1/3"
                                >
                                  <option value="g">g</option>
                                  {selFood.piece_grams && <option value="pcs">pcs</option>}
                                  {selFood.packages?.map(pkg => (
                                    <option key={pkg.id} value={`pkg-${pkg.id}`}>{pkg.grams}g pack</option>
                                  ))}
                                </select>
                              )}
                              <div className="relative flex-1">
                                <input ref={qtyRef} type="text" inputMode="decimal" value={qty} onChange={e => setQty(e.target.value)} onBlur={() => setQty(v => resolveExpr(v))} onKeyDown={e => { if (e.key === 'Enter') { setQty(resolveExpr(qty)); handleAddBatch(); } }} placeholder={unit === 'pcs' ? 'pieces' : unit === 'g' ? 'grams' : 'packs'} className={numInputCls} autoFocus />
                                {unit !== 'g' && qty && (evalExpr(qty) ?? 0) > 0 && addGrams > 0 && (
                                  <span className="absolute right-3 top-2.5 text-xs font-bold text-text-sec/60 pointer-events-none">= {Math.round(addGrams)}g</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 w-full md:w-auto">
                            <label className="text-[10px] font-bold text-text-sec/60 uppercase tracking-wider">Expiry Date (Opt.)</label>
                            <div className="flex items-center gap-2">
                              <input type="date" value={expiry} onFocus={() => setExpiry(v => seedExpiry(v))} onChange={e => setExpiry(e.target.value)} onBlur={e => setExpiry(resolveExpiry(e.target.value))} className={`${inputCls} w-full md:w-40`} />
                              {expiry && <button onClick={() => setExpiry('')} className="p-2.5 text-text-sec hover:text-red transition-colors bg-bg border border-border/60 rounded-xl">✕</button>}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                          <button onClick={() => setSelFood(null)} className="px-5 py-2.5 bg-bg border border-border/60 rounded-xl text-text-sec font-bold hover:bg-border/30 transition-colors w-1/3 text-center">Back</button>
                          <button onClick={handleAddBatch} disabled={!qty || addGrams <= 0} className="px-5 py-2.5 bg-accent text-white rounded-xl font-bold hover:opacity-90 disabled:opacity-50 transition-opacity w-2/3 shadow-sm text-center">Add</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* LISTA INVENTARIO */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                  <div className="relative w-full">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-sec/50">🔍</span>
                    <input type="text" value={pantrySearch} onChange={e => setPantrySearch(e.target.value)} placeholder="Search pantry..." className={`${inputCls} !pl-10 !py-2.5 shadow-sm`} />
                  </div>
                  <button 
                    onClick={toggleAllBatches} 
                    className={`w-full sm:w-auto px-5 py-2.5 rounded-xl border text-sm font-bold transition-colors whitespace-nowrap ${!allCollapsed ? 'border-border/60 bg-card text-text-sec hover:bg-border/40' : 'border-accent bg-accent/10 text-accent'}`}
                  >
                    {!allCollapsed ? 'Hide batches' : 'Show batches'}
                  </button>
                </div>
                
                {(() => {
                  if (visible.length === 0) return <div className="text-center text-text-sec py-10 border border-dashed border-border rounded-xl">Pantry is empty or no matches found.</div>;

                  return (
                    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
                      {visible.map((agg, idx) => {
                        const foodData = foodMap.get(agg.food_id);
                        const collapsed = collapsedFoods.has(agg.food_id);

                        return (
                          <div key={agg.food_id} className={`flex flex-col ${idx !== 0 ? 'border-t border-border/60' : ''}`}>
                            
                            {/* Group Header (Food Name & Totals) */}
                            <div onClick={() => toggleCollapse(agg.food_id)} className="bg-bg/40 px-4 py-3 flex items-center justify-between sticky top-0 backdrop-blur-md z-10 cursor-pointer hover:bg-bg/80 transition-colors group">
                              <div className="flex items-center gap-3">
                                {foodData?.image_url ? (
                                  <img src={foodData.image_url} alt="" className="w-8 h-8 rounded-md object-cover border border-border bg-white" />
                                ) : (
                                  <div className="w-8 h-8 rounded-md bg-bg border border-border/30 flex items-center justify-center text-text-sec/30 text-[10px]">🍽️</div>
                                )}
                                <span className="font-semibold text-text group-hover:text-accent transition-colors">{agg.food_name}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-sm font-bold text-text bg-card border border-border px-2 py-0.5 rounded shadow-sm">
                                  {formatQty(agg.total_g, agg.piece_grams, agg.pack_breakdown.length === 1 ? agg.pack_breakdown[0].grams : null)}
                                </div>
                                <span className={`text-text-sec/40 text-xs w-4 text-center shrink-0 transform transition-transform duration-300 ${collapsed ? '-rotate-90' : ''}`}>▼</span>
                              </div>
                            </div>

                            {/* Group Rows (Batches) */}
                            {!collapsed && (
                              <div className="flex flex-col divide-y divide-border/40">
                                {groupBatches(agg.batches).map(group => {
                                  const rep = group.batches[0];
                                  const count = group.batches.length;
                                  return group.batches.map((batch, bIdx) => {
                                    const isEditing = editingBatch?.id === batch.id;
                                    const expLbl = expiryLabel(batch.expiry_date, warn, urgent);
                                    const expCls = expiryPillClass(batch.expiry_date, warn, urgent);
                                    const opnLbl = openedLabel(batch);

                                    return (
                                      <div key={`${batch.id}-${bIdx}`} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-bg/30 transition-colors group/row">
                                        {isEditing ? (
                                          // Edit Mode
                                          <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
                                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                              {batch.piece_grams && foodData?.is_bulk !== 1 && (
                                                <select value={editingBatch.unit} onChange={e => setEditingBatch(b => b ? { ...b, unit: e.target.value as PantryUnit } : b)} className="bg-card border border-border rounded p-1.5 text-sm outline-none">
                                                  <option value="g">g</option>
                                                  <option value="pcs">pcs</option>
                                                </select>
                                              )}
                                              <input type="text" inputMode="decimal" value={editingBatch.qty} onChange={e => setEditingBatch(b => b ? { ...b, qty: e.target.value } : b)} onBlur={() => setEditingBatch(b => b ? { ...b, qty: resolveExpr(b.qty) } : b)} className="bg-card border border-border rounded px-2 py-1.5 text-sm outline-none focus:border-accent w-full sm:w-20" autoFocus />
                                            </div>
                                            <input type="date" value={editingBatch.expiry} onChange={e => setEditingBatch(b => b ? { ...b, expiry: e.target.value } : b)} className="bg-card border border-border rounded px-2 py-1.5 text-sm outline-none focus:border-accent w-full sm:w-auto flex-1" />
                                            <div className="flex gap-2 w-full sm:w-auto justify-end">
                                              <button onClick={() => setEditingBatch(null)} className="px-3 py-1.5 text-sm text-text-sec bg-card border border-border rounded hover:bg-bg">Cancel</button>
                                              <button onClick={() => handleSaveBatch(batch)} className="px-3 py-1.5 text-sm text-white bg-accent rounded font-medium hover:opacity-90">Save</button>
                                            </div>
                                          </div>
                                        ) : (
                                          // View Mode
                                          <>
                                            <div className="flex items-center gap-4 flex-1">
                                              <span className="text-sm font-medium tabular-nums min-w-[60px]">
                                                {formatQty(batch.quantity_g, batch.piece_grams, batch.package_grams ?? (foodData?.packages?.length === 1 ? foodData.packages[0].grams : null), 1)}
                                              </span>
                                              <div className="flex items-center gap-3 flex-wrap">
                                                {expLbl ? <span className={`text-xs tabular-nums ${expCls}`}>{expLbl}</span> : <span className="text-xs text-text-sec/50">No Date</span>}
                                                {opnLbl && <span className={`text-xs tabular-nums ${openedPillClass(batch)}`}>{opnLbl}</span>}
                                              </div>
                                            </div>
                                            
                                            {/* Actions - visible on hover on desktop, always on mobile */}
                                            <div className="flex items-center gap-2 justify-end opacity-100 sm:opacity-0 sm:group-hover/row:opacity-100 transition-opacity">
                                              <button onClick={() => startEditBatch(batch)} className="px-3 py-1.5 text-xs font-medium text-text-sec bg-card border border-border rounded hover:text-accent hover:border-accent/50">Edit</button>
                                              <button onClick={() => setDiscardId(batch.id)} className="px-3 py-1.5 text-xs font-medium text-red bg-red/10 rounded hover:bg-red/20">Discard</button>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    );
                                  });
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ── SHOPPING TAB ───────────────────────────────────────────────────── */}
          {tab === 'shopping' && (
            <div className="flex flex-col gap-6">
              
              {/* Accordion "Add to Shopping List" in stile FoodsPage */}
              <section className={`${cardCls} shrink-0 !p-0 overflow-hidden`}>
                <button onClick={() => setShopOpen(v => !v)} className="w-full flex items-center justify-between p-5 group hover:bg-bg/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold transition-colors ${shopOpen ? 'bg-text-sec' : 'bg-accent group-hover:bg-accent/90'}`}>
                      {shopOpen ? '−' : '+'}
                    </div>
                    <h2 className="text-base font-bold text-text group-hover:text-accent transition-colors">Add to Shopping List</h2>
                  </div>
                </button>

                {shopOpen && (
                  <div className="px-5 pb-5 flex flex-col gap-4 border-t border-border/20 pt-4 animate-slide-down">
                    {!shopFood ? (
                      <div className="flex flex-col gap-4">
                        <FoodSearch items={foodSearchItems} onSelect={item => { setShopFood(item as Food); setShopQty(''); }} onClear={() => { setShopFood(null); setShopQty(''); }} placeholder="Search food to add..." pantryId={activePantryId} clearAfterSelect />
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3 bg-bg border border-border/40 rounded-xl p-3 shadow-inner">
                          {shopFood.image_url && <img src={shopFood.image_url} alt="" className="w-12 h-12 rounded-lg object-cover bg-white" />}
                          <span className="font-bold text-text text-lg truncate">{shopFood.name}</span>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-bold text-text-sec/60 uppercase tracking-wider">Amount (Optional)</label>
                          <input type="text" inputMode="decimal" value={shopQty} onChange={e => setShopQty(e.target.value)} onBlur={() => setShopQty(v => resolveExpr(v))} onKeyDown={e => { if (e.key === 'Enter') { setShopQty(resolveExpr(shopQty)); handleAddShopping(); } }} placeholder="e.g. 500g" className={numInputCls} autoFocus />
                        </div>

                        <div className="flex gap-3 pt-2">
                          <button onClick={() => setShopFood(null)} className="px-5 py-2.5 bg-bg border border-border/60 rounded-xl text-text-sec font-bold hover:bg-border/30 transition-colors w-1/3 text-center">Back</button>
                          <button onClick={handleAddShopping} className="px-5 py-2.5 bg-accent text-white rounded-xl font-bold hover:opacity-90 transition-opacity w-2/3 shadow-sm text-center">Add to List</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>

              {shopping.length === 0 ? (
                <div className="text-center text-text-sec py-10 border border-dashed border-border rounded-xl">Shopping list is empty.</div>
              ) : (
                <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
                  {unchecked.length > 0 && (
                    <div className="flex flex-col divide-y divide-border/40">
                      {unchecked.map(item => (
                        <ShoppingRow key={item.id} item={item} onToggle={() => api.shopping.toggle(item.id).then(loadShopping)} onDelete={() => api.shopping.delete(item.id).then(loadShopping)} />
                      ))}
                    </div>
                  )}
                  {checked.length > 0 && (
                    <div className="flex flex-col">
                      <div className="bg-bg/60 px-4 py-2 border-y border-border flex items-center justify-between">
                        <span className="text-xs font-semibold text-text-sec uppercase tracking-wider">{checked.length} Completed</span>
                        <button onClick={() => api.shopping.clearChecked(activePantryId).then(() => loadShopping(activePantryId))} className="text-xs font-medium text-red hover:underline">Clear all</button>
                      </div>
                      <div className="flex flex-col divide-y divide-border/40">
                        {checked.map(item => (
                          <ShoppingRow key={item.id} item={item} onToggle={() => api.shopping.toggle(item.id).then(loadShopping)} onDelete={() => api.shopping.delete(item.id).then(loadShopping)} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── MODALS DI GESTIONE ────────────────────────────────────────── */}

      {discardId !== null && (
        <ConfirmDialog message="Discard this batch? The quantity will be removed from the pantry." confirmLabel="Discard" dangerous onConfirm={handleConfirmDiscard} onCancel={() => setDiscardId(null)} />
      )}
      {discardAllIds !== null && (
        <ConfirmDialog message={`Discard all ${discardAllIds.length} packs? This cannot be undone.`} confirmLabel="Discard all" dangerous onConfirm={handleConfirmDiscardAll} onCancel={() => setDiscardAllIds(null)} />
      )}
      {showManageModal && (
        <ManagePantriesModal
          pantries={pantries}
          activePantryId={activePantryId}
          onClose={() => setShowManageModal(false)}
          onChanged={async () => {
            const ps = await loadPantries();
            const stillActive = ps.find(p => p.id === activePantryId);
            const def = ps.find(p => p.is_default) ?? ps[0];
            const pid = stillActive ? activePantryId : def?.id;
            if (pid !== activePantryId) {
              setActivePantryId(pid);
              loadPantry(pid);
              loadShopping(pid);
            }
          }}
        />
      )}
    </div>
  );
}

// ── Module-level sub-components ───────────────────────────────────────────────

interface ManagePantriesModalProps {
  pantries: PantryLocation[];
  activePantryId: number | undefined;
  onClose: () => void;
  onChanged: () => void;
}

function ManagePantriesModal({ pantries, activePantryId: _activePantryId, onClose, onChanged }: ManagePantriesModalProps) {
  const { t } = useT();
  const { showToast } = useToast();
  const [newName, setNewName]           = useState('');
  const [renamingId, setRenamingId]     = useState<number | null>(null);
  const [renameVal, setRenameVal]       = useState('');
  const [deleteTarget, setDeleteTarget] = useState<PantryLocation | null>(null);

  async function handleCreate() {
    if (!newName.trim()) return;
    await api.pantries.create(newName.trim());
    setNewName('');
    onChanged();
  }

  async function handleRename(id: number) {
    if (!renameVal.trim()) return;
    await api.pantries.rename(id, renameVal.trim());
    setRenamingId(null);
    onChanged();
  }

  async function handleDelete(p: PantryLocation) {
    if (p.is_default) { showToast(t('pantry.cannotDeleteDefault'), 'error'); return; }
    setDeleteTarget(p);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    const res = await api.pantries.delete(deleteTarget.id);
    if (!res.ok && res.reason === 'is_default') {
      showToast(t('pantry.cannotDeleteDefault'), 'error');
    }
    setDeleteTarget(null);
    onChanged();
  }

  async function handleSetDefault(id: number) {
    await api.pantries.setDefault(id);
    onChanged();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-md flex flex-col p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text">{t('pantry.managePantries')}</h2>
          <button onClick={onClose} className="text-text-sec hover:text-text cursor-pointer">✕</button>
        </div>

        <div className="flex flex-col border border-border rounded-lg divide-y divide-border overflow-hidden mb-4">
          {pantries.map(p => (
            <div key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-bg">
              {renamingId === p.id ? (
                <div className="flex items-center gap-2 w-full">
                  <input type="text" value={renameVal} onChange={e => setRenameVal(e.target.value)} autoFocus onKeyDown={e => { if (e.key === 'Enter') handleRename(p.id); if (e.key === 'Escape') setRenamingId(null); }} className="flex-1 bg-card border border-border rounded px-2 py-1.5 text-sm outline-none focus:border-accent" />
                  <button onClick={() => handleRename(p.id)} className="px-3 py-1.5 rounded bg-accent text-white text-xs font-medium">Save</button>
                  <button onClick={() => setRenamingId(null)} className="px-2 py-1.5 rounded bg-card border border-border text-text-sec text-xs">✕</button>
                </div>
              ) : (
                <>
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-sm font-medium">{p.name}</span>
                    {p.is_default && <span className="text-[10px] font-bold uppercase bg-accent/15 text-accent px-1.5 py-0.5 rounded">{t('pantry.defaultBadge')}</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-2 sm:mt-0">
                    {!p.is_default && <button onClick={() => handleSetDefault(p.id)} className="text-xs text-text-sec hover:text-accent bg-card border border-border px-2 py-1 rounded">Set Default</button>}
                    <button onClick={() => { setRenamingId(p.id); setRenameVal(p.name); }} className="p-1.5 bg-card border border-border rounded text-text-sec hover:text-accent">✎</button>
                    {!p.is_default && <button onClick={() => handleDelete(p)} className="p-1.5 bg-card border border-border rounded text-text-sec hover:text-red">✕</button>}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }} placeholder={t('pantry.pantryName')} className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent" />
          <button onClick={handleCreate} disabled={!newName.trim()} className="px-4 py-2 bg-accent text-white text-sm rounded-lg font-medium hover:opacity-90 disabled:opacity-50">Add</button>
        </div>
      </div>
      
      {deleteTarget && (
        <ConfirmDialog message={t('pantry.deletePantryConfirm').replace('{name}', deleteTarget.name)} confirmLabel={t('pantry.deletePantry')} dangerous onConfirm={handleConfirmDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}

interface ShoppingRowProps {
  item: ShoppingItem;
  onToggle: () => void;
  onDelete: () => void;
}

function ShoppingRow({ item, onToggle, onDelete }: ShoppingRowProps) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors group ${item.checked ? 'bg-bg/40' : 'hover:bg-bg/40'}`} onClick={onToggle}>
      <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${item.checked ? 'bg-accent border-accent text-white' : 'border-text-sec/40 group-hover:border-accent'}`}>
        {item.checked && <span className="text-xs">✓</span>}
      </div>
      <span className={`flex-1 text-sm font-medium truncate ${item.checked ? 'text-text-sec/60 line-through' : 'text-text'}`}>
        {item.food_name}
      </span>
      {item.quantity_g > 0 && (
        <span className={`text-xs tabular-nums ${item.checked ? 'text-text-sec/40' : 'text-text-sec font-medium'}`}>{item.quantity_g}g</span>
      )}
      <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="w-8 h-8 flex items-center justify-center rounded-full text-text-sec/40 hover:text-red hover:bg-red/10 transition-colors shrink-0">✕</button>
    </div>
  );
}