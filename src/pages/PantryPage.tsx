import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { useToast } from '../components/Toast';
import FoodSearch from '../components/FoodSearch';
import type { SearchItem } from '../components/FoodSearch';
import BarcodeScanner from '../components/BarcodeScanner';
import Modal from '../components/Modal';
import type { Food, PantryItem, ShoppingItem } from '../types';

type Tab = 'pantry' | 'shopping';

function formatPantryQty(item: PantryItem): string {
  if (item.piece_grams && item.piece_grams > 0) {
    const pieces = item.quantity_g / item.piece_grams;
    const wholePieces = Math.round(pieces * 10) / 10;
    return `${wholePieces} pcs (${Math.round(item.quantity_g)}g)`;
  }
  return `${Math.round(item.quantity_g)}g`;
}

export default function PantryPage() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>('pantry');

  // Pantry state
  const [pantry, setPantry]       = useState<PantryItem[]>([]);
  const [foods, setFoods]         = useState<Food[]>([]);
  const [selFood, setSelFood]     = useState<Food | null>(null);
  const [qty, setQty]             = useState('');
  const [usePieces, setUsePieces] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editQty, setEditQty]     = useState('');
  const [editUsePieces, setEditUsePieces] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  // Shopping state
  const [shopping, setShopping]   = useState<ShoppingItem[]>([]);
  const [shopFood, setShopFood]   = useState<Food | null>(null);
  const [shopQty, setShopQty]     = useState('');

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

  // Computed grams for add form
  const addGrams = selFood
    ? (usePieces && selFood.piece_grams ? parseFloat(qty || '0') * selFood.piece_grams : parseFloat(qty || '0'))
    : 0;

  function handleSelect(item: SearchItem) {
    const food = item as Food;
    setSelFood(food);
    setUsePieces(!!(food.piece_grams));
    setQty('');
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
    if (!result) {
      showToast('Product not found');
      return;
    }
    // Find or create food in DB
    let food = foods.find(f => f.name.toLowerCase() === result.name.toLowerCase());
    if (!food) {
      const { id } = await api.foods.add({
        name: result.name,
        calories: result.calories,
        protein: result.protein,
        carbs: result.carbs,
        fat: result.fat,
        fiber: result.fiber,
        piece_grams: null,
        is_liquid: result.is_liquid,
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
    const grams = editUsePieces && item.piece_grams
      ? parseFloat(editQty) * item.piece_grams
      : parseFloat(editQty);
    await api.pantry.set({ food_id: item.food_id, quantity_g: grams || 0 });
    setEditingId(null);
    loadPantry();
  }

  async function handleAddShopping() {
    if (!shopFood) return;
    await api.shopping.add({ food_id: shopFood.id, quantity_g: shopQty ? parseFloat(shopQty) : 0 });
    setShopFood(null); setShopQty('');
    loadShopping();
  }

  const inputCls = "bg-card border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

  const tabBtn = (t: Tab) => [
    'text-sm px-4 py-1.5 rounded-lg font-medium cursor-pointer transition-colors border',
    tab === t ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-sec hover:text-text',
  ].join(' ');

  return (
    <div className="p-6 max-w-3xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">Pantry</h1>
        <div className="flex gap-2">
          <button className={tabBtn('pantry')}   onClick={() => setTab('pantry')}>Pantry</button>
          <button className={tabBtn('shopping')} onClick={() => setTab('shopping')}>Shopping List</button>
        </div>
      </div>

      {/* ── PANTRY TAB ─────────────────────────────────────────────────────── */}
      {tab === 'pantry' && (
        <>
          <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text">Add / top up</h3>
              <button
                onClick={() => setScannerOpen(true)}
                className="text-xs px-2.5 py-1 rounded-lg border border-border text-text-sec hover:border-accent hover:text-accent cursor-pointer transition-colors"
              >
                📷 Scan barcode
              </button>
            </div>
            <FoodSearch
              items={foodSearchItems}
              onSelect={handleSelect}
              onClear={() => { setSelFood(null); setQty(''); setUsePieces(false); }}
              placeholder="Search food…"
              clearAfterSelect
            />
            {selFood && (
              <div className="flex flex-col gap-2">
                <div className="text-xs font-medium text-text">{selFood.name}</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {selFood.piece_grams && (
                    <div className="flex rounded-lg border border-border overflow-hidden text-xs">
                      <button
                        onClick={() => { setUsePieces(false); setQty(''); }}
                        className={`px-3 py-1.5 cursor-pointer transition-colors ${!usePieces ? 'bg-accent/15 text-accent font-medium' : 'text-text-sec hover:text-text'}`}
                      >
                        Grams
                      </button>
                      <button
                        onClick={() => { setUsePieces(true); setQty(''); }}
                        className={`px-3 py-1.5 cursor-pointer transition-colors ${usePieces ? 'bg-accent/15 text-accent font-medium' : 'text-text-sec hover:text-text'}`}
                      >
                        Pieces
                      </button>
                    </div>
                  )}
                  <input
                    type="text" inputMode="decimal"
                    value={qty}
                    onChange={e => setQty(e.target.value)}
                    placeholder={usePieces ? 'pieces' : 'grams'}
                    className={`w-28 ${inputCls}`}
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleAddPantry()}
                  />
                  {usePieces && selFood.piece_grams && qty && (
                    <span className="text-xs text-text-sec">= {Math.round(parseFloat(qty) * selFood.piece_grams)}g</span>
                  )}
                  <button
                    onClick={handleAddPantry}
                    disabled={!qty || addGrams <= 0}
                    className="px-3 py-1.5 bg-accent text-white text-xs rounded-lg cursor-pointer hover:opacity-90 disabled:opacity-40"
                  >
                    Add
                  </button>
                  <button onClick={() => { setSelFood(null); setQty(''); setUsePieces(false); }} className="text-xs text-text-sec cursor-pointer hover:text-text">Cancel</button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {pantry.length === 0 ? (
              <p className="text-sm text-text-sec text-center py-8">Pantry is empty. Add ingredients you have at home.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-text-sec text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3">Food</th>
                    <th className="text-right px-4 py-3">Amount</th>
                    <th className="px-4 py-3 w-24" />
                  </tr>
                </thead>
                <tbody>
                  {pantry.map(item => (
                    <tr key={item.id} className="border-t border-border/50 hover:bg-bg/50 transition-colors">
                      <td className="px-4 py-2.5 text-text">{item.food_name}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {editingId === item.id ? (
                          <div className="flex items-center gap-1.5 justify-end">
                            {item.piece_grams && (
                              <button
                                onClick={() => setEditUsePieces(v => !v)}
                                className="text-xs text-text-sec hover:text-accent cursor-pointer"
                              >
                                {editUsePieces ? 'pcs' : 'g'}
                              </button>
                            )}
                            <input
                              type="text" inputMode="decimal"
                              value={editQty}
                              onChange={e => setEditQty(e.target.value)}
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === 'Enter')  handleSaveEdit(item);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              className="w-20 bg-bg border border-border rounded px-2 py-0.5 text-sm text-text text-right focus:outline-none focus:border-accent"
                            />
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(item)}
                            className="text-text hover:text-accent cursor-pointer transition-colors"
                          >
                            {formatPantryQty(item)}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {editingId === item.id ? (
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => handleSaveEdit(item)} className="text-xs text-accent cursor-pointer">Save</button>
                            <button onClick={() => setEditingId(null)} className="text-xs text-text-sec cursor-pointer">Cancel</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => api.pantry.delete(item.id).then(loadPantry)}
                            className="text-text-sec hover:text-red text-xs cursor-pointer transition-colors"
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ── SHOPPING TAB ───────────────────────────────────────────────────── */}
      {tab === 'shopping' && (
        <>
          <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-text">Add item</h3>
            <FoodSearch
              items={foodSearchItems}
              onSelect={item => { setShopFood(item as Food); setShopQty(''); }}
              onClear={() => { setShopFood(null); setShopQty(''); }}
              placeholder="Search food…"
              clearAfterSelect
            />
            {shopFood && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-text flex-1">{shopFood.name}</span>
                <input
                  type="text" inputMode="decimal"
                  value={shopQty}
                  onChange={e => setShopQty(e.target.value)}
                  placeholder="Amount (g, optional)"
                  className={`w-40 ${inputCls}`}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleAddShopping()}
                />
                <button onClick={handleAddShopping} className="px-3 py-1.5 bg-accent text-white text-xs rounded-lg cursor-pointer hover:opacity-90">Add</button>
                <button onClick={() => setShopFood(null)} className="text-xs text-text-sec cursor-pointer hover:text-text">Cancel</button>
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {shopping.length === 0 ? (
              <p className="text-sm text-text-sec text-center py-8">Shopping list is empty.</p>
            ) : (
              <>
                {shopping.some(s => s.checked) && (
                  <div className="flex justify-end px-4 py-2 border-b border-border">
                    <button
                      onClick={() => api.shopping.clearChecked().then(loadShopping)}
                      className="text-xs text-text-sec hover:text-red cursor-pointer transition-colors"
                    >
                      Clear checked
                    </button>
                  </div>
                )}
                <div className="divide-y divide-border/50">
                  {shopping.map(item => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 px-4 py-3 transition-opacity ${item.checked ? 'opacity-50' : ''}`}
                    >
                      <button
                        onClick={() => api.shopping.toggle(item.id).then(loadShopping)}
                        className={[
                          'w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors shrink-0',
                          item.checked ? 'border-accent bg-accent/20' : 'border-border hover:border-accent',
                        ].join(' ')}
                      >
                        {item.checked ? <span className="text-xs text-accent leading-none">✓</span> : null}
                      </button>
                      <span className={`flex-1 text-sm text-text ${item.checked ? 'line-through text-text-sec' : ''}`}>
                        {item.food_name}
                      </span>
                      {item.quantity_g > 0 && (
                        <span className="text-xs text-text-sec tabular-nums">{item.quantity_g}g</span>
                      )}
                      <button
                        onClick={() => api.shopping.delete(item.id).then(loadShopping)}
                        className="text-text-sec hover:text-red text-xs cursor-pointer transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Barcode scanner modal */}
      <Modal isOpen={scannerOpen} onClose={() => setScannerOpen(false)} title="Scan barcode">
        <BarcodeScanner onResult={handleScanResult} />
      </Modal>
    </div>
  );
}
