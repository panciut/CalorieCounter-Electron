import { useState, useEffect, useCallback, useRef } from 'react';
import { evalExpr, resolveExpr } from '../lib/evalExpr';
import { api } from '../api';
import { useToast } from '../components/Toast';
import FoodSearch from '../components/FoodSearch';
import type { SearchItem } from '../components/FoodSearch';
import BarcodeScanner from '../components/BarcodeScanner';
import Modal from '../components/Modal';
import type { Food, PantryItem, ShoppingItem } from '../types';

type Tab = 'pantry' | 'shopping';

function formatQty(item: PantryItem): string {
  if (item.piece_grams && item.piece_grams > 0) {
    const pcs = Math.round((item.quantity_g / item.piece_grams) * 10) / 10;
    return `${pcs} pcs`;
  }
  return `${Math.round(item.quantity_g)}g`;
}

function formatQtyFull(item: PantryItem): string {
  if (item.piece_grams && item.piece_grams > 0) {
    const pcs = Math.round((item.quantity_g / item.piece_grams) * 10) / 10;
    return `${pcs} pcs (${Math.round(item.quantity_g)}g)`;
  }
  return `${Math.round(item.quantity_g)}g`;
}

export default function PantryPage() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>('pantry');

  // Pantry state
  const [pantry, setPantry]           = useState<PantryItem[]>([]);
  const [foods, setFoods]             = useState<Food[]>([]);
  const [selFood, setSelFood]         = useState<Food | null>(null);
  const [qty, setQty]                 = useState('');
  const [usePieces, setUsePieces]     = useState(false);
  const [editingId, setEditingId]     = useState<number | null>(null);
  const [editQty, setEditQty]         = useState('');
  const [editUsePieces, setEditUsePieces] = useState(false);
  const [pantryOpen, setPantryOpen]   = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);
  const qtyRef = useRef<HTMLInputElement>(null);

  // Shopping state
  const [shopping, setShopping]       = useState<ShoppingItem[]>([]);
  const [shopFood, setShopFood]       = useState<Food | null>(null);
  const [shopQty, setShopQty]         = useState('');
  const [shopOpen, setShopOpen]       = useState(true);

  const loadPantry = useCallback(async () => {
    const [p, f] = await Promise.all([api.pantry.getAll(), api.foods.getAll()]);
    setPantry(p);
    setFoods(f);
  }, []);

  const loadShopping = useCallback(async () => {
    setShopping(await api.shopping.getAll());
  }, []);

  useEffect(() => { loadPantry(); loadShopping(); }, [loadPantry, loadShopping]);

  const foodSearchItems: SearchItem[] = foods.map(f => ({ ...f, isRecipe: false as const, _freq: 0 }));

  const addGrams = selFood
    ? (usePieces && selFood.piece_grams ? (evalExpr(qty) ?? 0) * selFood.piece_grams : (evalExpr(qty) ?? 0))
    : 0;

  function handleSelect(item: SearchItem) {
    const food = item as Food;
    setSelFood(food);
    setUsePieces(!!(food.piece_grams));
    setQty('');
    setTimeout(() => qtyRef.current?.focus(), 0);
  }

  async function handleAddPantry() {
    if (!selFood || !qty || addGrams <= 0) return;
    await api.pantry.upsert({ food_id: selFood.id, quantity_g: addGrams });
    setSelFood(null); setQty(''); setUsePieces(false);
    loadPantry();
  }

  async function handleScanResult(barcode: string) {
    setScannerOpen(false);
    const result = await api.barcode.lookup(barcode);
    if (!result) { showToast('Product not found'); return; }
    let food = foods.find(f => f.name.toLowerCase() === result.name.toLowerCase());
    if (!food) {
      const { id } = await api.foods.add({
        name: result.name, calories: result.calories, protein: result.protein,
        carbs: result.carbs, fat: result.fat, fiber: result.fiber,
        piece_grams: null, is_liquid: result.is_liquid,
      });
      const allFoods = await api.foods.getAll();
      setFoods(allFoods);
      food = allFoods.find(f => f.id === id) ?? null;
    }
    if (food) {
      setSelFood(food);
      setUsePieces(!!(food.piece_grams));
      setQty('');
      showToast(`Found: ${food.name}`);
    }
  }

  function startEdit(item: PantryItem) {
    setEditingId(item.id);
    const hasPieces = !!(item.piece_grams && item.piece_grams > 0);
    setEditUsePieces(hasPieces);
    setEditQty(hasPieces
      ? String(Math.round((item.quantity_g / item.piece_grams!) * 10) / 10)
      : String(Math.round(item.quantity_g))
    );
  }

  async function handleSaveEdit(item: PantryItem) {
    const val = evalExpr(editQty) ?? 0;
    const grams = editUsePieces && item.piece_grams ? val * item.piece_grams : val;
    await api.pantry.set({ food_id: item.food_id, quantity_g: grams || 0 });
    setEditingId(null);
    loadPantry();
  }

  async function handleAddShopping() {
    if (!shopFood) return;
    await api.shopping.add({ food_id: shopFood.id, quantity_g: shopQty ? (evalExpr(shopQty) ?? 0) : 0 });
    setShopFood(null); setShopQty('');
    loadShopping();
  }

  const inputCls = "bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

  const tabBtn = (v: Tab) => [
    'px-5 py-2.5 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px',
    tab === v ? 'border-accent text-accent' : 'border-transparent text-text-sec hover:text-text',
  ].join(' ');

  const unchecked = shopping.filter(s => !s.checked);
  const checked   = shopping.filter(s => s.checked);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">Pantry</h1>
        <button
          onClick={() => setScannerOpen(true)}
          className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-sec hover:border-accent hover:text-accent cursor-pointer transition-colors"
        >
          📷 Scan barcode
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <button className={tabBtn('pantry')}   onClick={() => setTab('pantry')}>Pantry</button>
        <button className={tabBtn('shopping')} onClick={() => setTab('shopping')}>Shopping list</button>
      </div>

      {/* ── PANTRY TAB ─────────────────────────────────────────────────────── */}
      {tab === 'pantry' && (
        <div className="flex flex-col gap-4">

          {/* Collapsible add form */}
          <div className="border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setPantryOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-text hover:bg-card-hover/40 cursor-pointer transition-colors"
            >
              <span>Add / top up</span>
              <span className="text-text-sec text-xs">{pantryOpen ? '▲' : '▼'}</span>
            </button>
            {pantryOpen && (
              <div className="px-4 pb-4 pt-1 border-t border-border bg-card-hover/10 flex flex-col gap-3">
                <FoodSearch
                  items={foodSearchItems}
                  onSelect={handleSelect}
                  onClear={() => { setSelFood(null); setQty(''); setUsePieces(false); }}
                  placeholder="Search food…"
                  clearAfterSelect
                />
                {selFood && (
                  <div className="flex flex-col gap-3">
                    {/* Food info card */}
                    <div className="bg-bg rounded-xl px-4 py-3 flex flex-col gap-1.5">
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
                        onKeyDown={e => { if (e.key === 'Enter') { setQty(resolveExpr(qty)); handleAddPantry(); } }}
                      />
                      {usePieces && selFood.piece_grams && qty && (evalExpr(qty) ?? 0) > 0 && (
                        <span className="text-xs text-text-sec">= {Math.round((evalExpr(qty) ?? 0) * selFood.piece_grams)}g</span>
                      )}
                      <button
                        onClick={handleAddPantry}
                        disabled={!qty || addGrams <= 0}
                        className="px-4 py-2 bg-accent text-white text-sm rounded-lg cursor-pointer hover:opacity-90 disabled:opacity-40 font-medium"
                      >Add</button>
                      <button
                        onClick={() => { setSelFood(null); setQty(''); setUsePieces(false); }}
                        className="text-sm text-text-sec cursor-pointer hover:text-text"
                      >Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pantry list */}
          {pantry.length === 0 ? (
            <p className="text-sm text-text-sec text-center py-10">Pantry is empty. Add ingredients you have at home.</p>
          ) : (() => {
            const foodMap = new Map(foods.map(f => [f.id, f]));
            return (
              <div className="overflow-auto rounded-xl border border-border">
                <table className="w-full text-sm min-w-[640px]">
                  <thead className="sticky top-0 bg-card">
                    <tr className="text-text-sec text-xs uppercase tracking-wider border-b border-border">
                      <th className="px-3 py-3 text-left">Food</th>
                      <th className="px-3 py-3 text-right">kcal</th>
                      <th className="px-3 py-3 text-right">Fat</th>
                      <th className="px-3 py-3 text-right">Carbs</th>
                      <th className="px-3 py-3 text-right">Fiber</th>
                      <th className="px-3 py-3 text-right">Protein</th>
                      <th className="px-3 py-3 text-right">In stock</th>
                      <th className="px-2 py-3 w-16" />
                    </tr>
                  </thead>
                  <tbody>
                    {pantry.map(item => {
                      const food = foodMap.get(item.food_id);
                      return (
                        <tr key={item.id} className="border-t border-border/50 hover:bg-card/30 transition-colors">
                          <td className="px-3 py-2.5 text-text font-medium">{item.food_name}</td>
                          <td className="px-3 py-2.5 text-right text-text tabular-nums">{food?.calories ?? '—'}</td>
                          <td className="px-3 py-2.5 text-right text-text-sec tabular-nums">{food?.fat ?? '—'}</td>
                          <td className="px-3 py-2.5 text-right text-text-sec tabular-nums">{food?.carbs ?? '—'}</td>
                          <td className="px-3 py-2.5 text-right text-text-sec tabular-nums">{food?.fiber ?? '—'}</td>
                          <td className="px-3 py-2.5 text-right text-text-sec tabular-nums">{food?.protein ?? '—'}</td>
                          <td className="px-3 py-2.5 text-right">
                            {editingId === item.id ? (
                              <div className="flex items-center gap-1.5 justify-end">
                                {item.piece_grams && (
                                  <button
                                    onClick={() => setEditUsePieces(v => !v)}
                                    className="text-xs text-text-sec hover:text-accent cursor-pointer border border-border rounded px-1.5 py-0.5"
                                  >
                                    {editUsePieces ? 'pcs' : 'g'}
                                  </button>
                                )}
                                <input
                                  type="text" inputMode="decimal"
                                  value={editQty}
                                  onChange={e => setEditQty(e.target.value)}
                                  onBlur={() => setEditQty(v => resolveExpr(v))}
                                  autoFocus
                                  onKeyDown={e => {
                                    if (e.key === 'Enter')  { setEditQty(resolveExpr(editQty)); handleSaveEdit(item); }
                                    if (e.key === 'Escape') setEditingId(null);
                                  }}
                                  className="w-20 bg-bg border border-border rounded-lg px-2 py-1 text-sm text-text text-right focus:outline-none focus:border-accent"
                                />
                              </div>
                            ) : (
                              <button
                                onClick={() => startEdit(item)}
                                className="text-sm font-semibold tabular-nums px-2.5 py-1 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 cursor-pointer transition-colors"
                                title="Click to edit"
                              >
                                {formatQtyFull(item)}
                              </button>
                            )}
                          </td>
                          <td className="px-2 py-2.5">
                            <div className="flex gap-1 justify-end">
                              {editingId === item.id ? (
                                <>
                                  <button onClick={() => handleSaveEdit(item)} className="text-xs text-accent font-medium cursor-pointer hover:opacity-75 px-1">Save</button>
                                  <button onClick={() => setEditingId(null)} className="text-xs text-text-sec cursor-pointer hover:text-text px-1">✕</button>
                                </>
                              ) : (
                                <button
                                  onClick={() => api.pantry.delete(item.id).then(loadPantry)}
                                  className="text-text-sec hover:text-red cursor-pointer transition-colors px-1"
                                >✕</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── SHOPPING TAB ───────────────────────────────────────────────────── */}
      {tab === 'shopping' && (
        <div className="flex flex-col gap-4">

          {/* Collapsible add form */}
          <div className="border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setShopOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-text hover:bg-card-hover/40 cursor-pointer transition-colors"
            >
              <span>Add item</span>
              <span className="text-text-sec text-xs">{shopOpen ? '▲' : '▼'}</span>
            </button>
            {shopOpen && (
              <div className="px-4 pb-4 pt-1 border-t border-border bg-card-hover/10 flex flex-col gap-3">
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

          {/* Shopping list */}
          {shopping.length === 0 ? (
            <p className="text-sm text-text-sec text-center py-10">Shopping list is empty.</p>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Unchecked items */}
              {unchecked.length > 0 && (
                <div className="flex flex-col divide-y divide-border/40">
                  {unchecked.map(item => (
                    <ShoppingRow key={item.id} item={item} onToggle={() => api.shopping.toggle(item.id).then(loadShopping)} onDelete={() => api.shopping.delete(item.id).then(loadShopping)} />
                  ))}
                </div>
              )}

              {/* Checked items */}
              {checked.length > 0 && (
                <>
                  <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-bg/30">
                    <span className="text-xs text-text-sec uppercase tracking-wider font-medium">{checked.length} checked</span>
                    <button
                      onClick={() => api.shopping.clearChecked().then(loadShopping)}
                      className="text-xs text-text-sec hover:text-red cursor-pointer transition-colors"
                    >
                      Clear all
                    </button>
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

      <Modal isOpen={scannerOpen} onClose={() => setScannerOpen(false)} title="Scan barcode">
        <BarcodeScanner onResult={handleScanResult} />
      </Modal>
    </div>
  );
}

// Module-level to avoid remount on re-render
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
      <button
        onClick={onDelete}
        className="text-text-sec hover:text-red text-sm cursor-pointer transition-colors w-5 text-center"
      >
        ✕
      </button>
    </div>
  );
}
