import { useState, useEffect, useMemo, useRef } from 'react';
import { useT } from '../i18n/useT';
import { useToast } from '../components/Toast';
import { useSettings } from '../hooks/useSettings';
import { api } from '../api';
import BarcodeScanner from '../components/BarcodeScanner';
import FoodNameSearch from '../components/FoodNameSearch';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import FoodSearch from '../components/FoodSearch';
import type { SearchItem } from '../components/FoodSearch';
import type { Food, BarcodeResult, BarcodeSearchResult, FoodPackage } from '../types';
import { PRESETS, PresetKey, INPUT_CLASS, PRESET_LABELS } from '../lib/foodPresets';

interface FoodFormState {
  name: string; calories: string; protein: string; carbs: string;
  fat: string; fiber: string; piece_grams: string; is_liquid: boolean; is_bulk: boolean; barcode: string;
  opened_days: string; discard_threshold_pct: string; price_per_100g: string; image_url: string;
}

const emptyForm = (): FoodFormState => ({ name:'', calories:'', protein:'', carbs:'', fat:'', fiber:'', piece_grams:'', is_liquid: false, is_bulk: true, barcode: '', opened_days: '7', discard_threshold_pct: '5', price_per_100g: '', image_url: '' });
const foodToForm = (f: Food): FoodFormState => ({ name:f.name, calories:String(f.calories), protein:String(f.protein), carbs:String(f.carbs), fat:String(f.fat), fiber:String(f.fiber), piece_grams:f.piece_grams!=null?String(f.piece_grams):'', is_liquid:f.is_liquid===1, is_bulk: f.is_bulk===1, barcode: f.barcode ?? '', opened_days: f.opened_days != null ? String(f.opened_days) : '', discard_threshold_pct: f.discard_threshold_pct != null ? String(f.discard_threshold_pct) : '5', price_per_100g: f.price_per_100g != null ? String(f.price_per_100g) : '', image_url: f.image_url ?? '' });
const barcodeToForm = (r: BarcodeResult, barcode: string): FoodFormState => ({ name:r.name, calories:String(r.calories), protein:String(r.protein), carbs:String(r.carbs), fat:String(r.fat), fiber:String(r.fiber), piece_grams:'', is_liquid:r.is_liquid===1, is_bulk: false, barcode, opened_days: '7', discard_threshold_pct: '5', price_per_100g: '', image_url: r.image_url ?? '' });
const formToData = (f: FoodFormState): Omit<Food,'id'> => ({ name:f.name.trim(), calories:parseFloat(f.calories)||0, protein:parseFloat(f.protein)||0, carbs:parseFloat(f.carbs)||0, fat:parseFloat(f.fat)||0, fiber:parseFloat(f.fiber)||0, piece_grams: f.is_bulk ? null : (f.piece_grams!==''?parseFloat(f.piece_grams):null), is_liquid:f.is_liquid?1:0, is_bulk: f.is_bulk?1:0, barcode: f.barcode.trim() || null, opened_days: f.opened_days !== '' ? parseInt(f.opened_days, 10) : null, discard_threshold_pct: parseFloat(f.discard_threshold_pct) || 5, price_per_100g: f.price_per_100g !== '' ? parseFloat(f.price_per_100g) : null, image_url: f.image_url.trim() || null });

// ── FormFields for table edit row (multi-line) ────────────────────────────────

interface FormFieldsProps { form: FoodFormState; patch: (p: Partial<FoodFormState>) => void; }

function FormFields({ form, patch }: FormFieldsProps) {
  const { t } = useT();
  const macros: { key: keyof FoodFormState; label: string }[] = [
    { key: 'calories', label: 'kcal' },
    { key: 'fat',      label: t('th.fat') },
    { key: 'carbs',    label: t('th.carbs') },
    { key: 'fiber',    label: t('th.fiber') },
    { key: 'protein',  label: t('th.protein') },
    { key: 'piece_grams', label: t('foods.piecePlaceholder') },
  ];
  return (
    <div className="flex flex-col gap-2">
      <input type="text" value={form.name} onChange={e => patch({ name: e.target.value })} placeholder={t('foods.namePlaceholder')} className={INPUT_CLASS} />
      <div className="grid grid-cols-6 gap-2">
        {macros.map(({ key, label }) => (
          <div key={key} className="flex flex-col gap-0.5">
            <label className="text-xs text-text-sec">{label}</label>
            <input type="text" inputMode="decimal" value={(form as unknown as Record<string,string>)[key]} onChange={e => patch({ [key]: e.target.value })} placeholder="0" className={INPUT_CLASS} />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-text-sec cursor-pointer">
          <input type="checkbox" checked={form.is_liquid} onChange={e => patch({ is_liquid: e.target.checked })} />
          {t('foods.liquid')}
        </label>
        <label className="flex items-center gap-2 text-sm text-text-sec cursor-pointer" title={t('foods.bulkHelp')}>
          <input type="checkbox" checked={form.is_bulk} onChange={e => patch({ is_bulk: e.target.checked, piece_grams: e.target.checked ? '' : form.piece_grams })} />
          {t('foods.bulk')}
        </label>
      </div>
    </div>
  );
}

// ── FoodsPage ─────────────────────────────────────────────────────────────────

type FoodsTab = 'foods' | 'packs';

export default function FoodsPage() {
  const { t } = useT();
  const { showToast } = useToast();
  const { settings } = useSettings();

  const [foods, setFoods] = useState<Food[]>([]);
  const [addForm, setAddForm] = useState<FoodFormState>(emptyForm());
  const [addPacks, setAddPacks] = useState<{ grams: string }[]>([{ grams: '' }]);
  const [packFromBarcode, setPackFromBarcode] = useState<number | null>(null);
  const [editId, setEditId] = useState<number|null>(null);
  const [editForm, setEditForm] = useState<FoodFormState>(emptyForm());
  const [newPackGrams, setNewPackGrams] = useState('');
  const [newPackPrice, setNewPackPrice] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeStatus, setBarcodeStatus] = useState<'found'|'notFound'|null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerTab, setScannerTab] = useState<'scan' | 'search'>('scan');
  const [formOpen, setFormOpen] = useState(true);
  const [detailMode, setDetailMode] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deletePackId, setDeletePackId] = useState<number | null>(null);
  const [tab, setTab] = useState<FoodsTab>('foods');
  const [packFood, setPackFood] = useState<Food | null>(null);
  const [packGramsInput, setPackGramsInput] = useState('');
  const [packUnit, setPackUnit] = useState<'g' | 'pcs'>('g');
  const [packSearchKey, setPackSearchKey] = useState(0);
  const packGramsRef = useRef<HTMLInputElement>(null);


  useEffect(() => { loadFoods(); }, []);

  async function loadFoods() { setFoods(await api.foods.getAll()); }

  function patchAdd(p: Partial<FoodFormState>) { setAddForm(f=>({...f,...p})); }
  function patchEdit(p: Partial<FoodFormState>) { setEditForm(f=>({...f,...p})); }

  async function handleAdd() {
    if (!addForm.name.trim() || !addForm.calories) return;
    const { id } = await api.foods.add(formToData(addForm));
    for (const p of addPacks) {
      const g = parseFloat(p.grams);
      if (g > 0) await api.foods.addPackage({ food_id: id, grams: g });
    }
    setAddForm(emptyForm()); setAddPacks([{ grams: '' }]); setPackFromBarcode(null); setBarcodeInput(''); setBarcodeStatus(null); showToast(t('common.saved')); loadFoods();
  }

  function updateAddPackGrams(i: number, grams: string) { setAddPacks(p => p.map((x, idx) => idx === i ? { grams } : x)); }
  function removeAddPack(i: number) { setAddPacks(p => p.filter((_, idx) => idx !== i)); }
  function addBlankAddPack() { setAddPacks(p => [...p, { grams: '' }]); }

  function applyBarcodeResult(r: BarcodeResult, barcode: string) {
    setAddForm(barcodeToForm(r, barcode));
    setBarcodeStatus('found');
    setFormOpen(true);
    const allBlank = addPacks.every(p => !p.grams);
    if (r.pack_grams && allBlank) {
      const g = Math.round(r.pack_grams);
      setAddPacks([{ grams: String(g) }]);
      setPackFromBarcode(g);
    } else {
      setPackFromBarcode(null);
    }
  }

  async function handleAddPack() {
    const g = parseFloat(newPackGrams);
    if (!g || g <= 0 || !editId) return;
    const price = newPackPrice !== '' ? parseFloat(newPackPrice) : null;
    await api.foods.addPackage({ food_id: editId, grams: g, price: price && price > 0 ? price : null });
    setNewPackGrams('');
    setNewPackPrice('');
    loadFoods();
  }

  async function handleDeletePack(id: number) {
    const res = await api.foods.deletePackage(id);
    setDeletePackId(null);
    if (!res.ok && res.error === 'pack_in_use') {
      showToast(t('foods.packInUse').replace('{n}', String(res.batch_count ?? 0)), 'error');
      return;
    }
    loadFoods();
  }

  async function handleBarcodeLookup() {
    if (!barcodeInput.trim()) return;
    setBarcodeStatus(null);
    setPackFromBarcode(null);
    const r = await api.barcode.lookup(barcodeInput.trim());
    if (r) applyBarcodeResult(r, barcodeInput.trim());
    else setBarcodeStatus('notFound');
  }

  async function handleScanResult(barcode: string) {
    setScannerOpen(false); setScannerTab('scan'); setBarcodeInput(barcode); setBarcodeStatus(null); setPackFromBarcode(null);
    const r = await api.barcode.lookup(barcode);
    if (r) applyBarcodeResult(r, barcode);
    else setBarcodeStatus('notFound');
  }

  function handleNameSearchResult(r: BarcodeSearchResult) {
    setScannerOpen(false);
    setScannerTab('scan');
    applyBarcodeResult(r, r.barcode ?? '');
  }

  function startEdit(food: Food) { setEditId(food.id); setEditForm(foodToForm(food)); }
  function cancelEdit() { setEditId(null); }

  async function handleSaveEdit(food: Food) {
    await api.foods.update({ ...formToData(editForm), id: food.id, favorite: food.favorite });
    showToast(t('common.saved')); cancelEdit(); loadFoods();
  }

  async function handleDelete(id: number) { await api.foods.delete(id); setDeleteId(null); loadFoods(); }
  async function handleToggleFavorite(id: number) { await api.foods.toggleFavorite(id); loadFoods(); }

  async function handleAddPackToFood() {
    const v = parseFloat(packGramsInput);
    if (!packFood || !v || v <= 0) return;
    const grams = packUnit === 'pcs' && packFood.piece_grams ? v * packFood.piece_grams : v;
    await api.foods.addPackage({ food_id: packFood.id, grams });
    setPackGramsInput('');
    setPackFood(null);
    setPackSearchKey(k => k + 1);
    loadFoods();
  }

  async function handleImport() {
    const filePath = await api.import.selectFile();
    if (!filePath) return;
    try {
      const { imported, skipped } = await api.import.foods(filePath);
      showToast(`${t('import.success').replace('{n}', String(imported)).replace('{s}', String(skipped))}`);
      loadFoods();
    } catch { showToast(t('import.error')); }
  }

  const filteredFoods = useMemo(()=>{
    const q = searchQuery.toLowerCase();
    return q ? foods.filter(f=>f.name.toLowerCase().includes(q)) : foods;
  },[foods, searchQuery]);

  const foodSearchItems: SearchItem[] = useMemo(
    () => foods.map(f => ({ ...f, isRecipe: false as const, _freq: 0 })),
    [foods]
  );

  const packRows = useMemo(() => {
    const rows: { food: Food; pkg: FoodPackage }[] = [];
    for (const f of foods) {
      for (const p of f.packages ?? []) rows.push({ food: f, pkg: p });
    }
    const q = searchQuery.toLowerCase();
    const filtered = q ? rows.filter(r => r.food.name.toLowerCase().includes(q)) : rows;
    return filtered.sort((a, b) => a.food.name.localeCompare(b.food.name) || a.pkg.grams - b.pkg.grams);
  }, [foods, searchQuery]);

  const presetLabels = PRESET_LABELS;

  function applyPreset(key: PresetKey) {
    const kcal = parseFloat(addForm.calories);
    if (!kcal) { showToast(t('foods.presetNeedsKcal'), 'error'); return; }
    const p = PRESETS[key];
    patchAdd({
      fat:    String(Math.round(kcal * p.fatPct     / 9 * 10) / 10),
      carbs:  String(Math.round(kcal * p.carbsPct   / 4 * 10) / 10),
      fiber:  String(Math.round(kcal * p.fiberPer100 / 100 * 10) / 10),
      protein:String(Math.round(kcal * p.proteinPct / 4 * 10) / 10),
    });
  }

  // Macro fields for the single-line add form
  const macroFields: { key: keyof FoodFormState; label: string }[] = [
    { key: 'calories', label: 'kcal'          },
    { key: 'fat',      label: t('th.fat')     },
    { key: 'carbs',    label: t('th.carbs')   },
    { key: 'fiber',    label: t('th.fiber')   },
    { key: 'protein',  label: t('th.protein') },
  ];

  return (
    <div className="p-6 flex flex-col gap-5 h-full overflow-hidden">

      {/* ── Add form — double-bezel, collapsible ───────────────────────── */}
      <div className="p-1.5 rounded-[1.75rem] ring-1 ring-border/50 bg-card/30 shrink-0">
        <div className="bg-card rounded-[calc(1.75rem-6px)] overflow-hidden">
          {/* Header */}
          <button
            type="button"
            onClick={() => setFormOpen(v => !v)}
            className="w-full flex items-center gap-3 px-5 py-3.5 text-left cursor-pointer hover:bg-card-hover transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
          >
            <span className={`text-text-sec/40 text-xs transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${formOpen ? 'rotate-180' : ''}`}>▼</span>
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-text-sec/40">{t('foods.addTitle')}</span>
            <span className="text-[10px] text-text-sec/30 ml-1">{t('foods.valuesPerLabel')}</span>
          </button>

          {formOpen && (
            <div className="px-5 pb-5 flex flex-col gap-4 border-t border-border/20 pt-4">

              {/* Barcode row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase tracking-[0.15em] font-semibold text-text-sec/40 shrink-0">{t('barcode.addByBarcode')}</span>
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={e => { setBarcodeInput(e.target.value); setBarcodeStatus(null); }}
                  onKeyDown={e => e.key === 'Enter' && handleBarcodeLookup()}
                  placeholder={t('barcode.placeholder')}
                  className="bg-bg border border-border/50 rounded-full px-3 py-1.5 text-text text-sm outline-none focus:border-accent w-40 transition-colors duration-300"
                />
                <button type="button" onClick={handleBarcodeLookup}
                  className="px-4 py-1.5 rounded-full bg-accent text-white text-xs font-medium hover:opacity-90 cursor-pointer shrink-0 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]">
                  {t('barcode.lookup')}
                </button>
                <button type="button" onClick={() => setScannerOpen(true)}
                  className="px-3 py-1.5 rounded-full border border-border/50 text-text-sec hover:border-accent/50 hover:text-accent cursor-pointer shrink-0 text-sm transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]">
                  📷
                </button>
                {barcodeStatus === 'found' && (
                  <span className="flex items-center gap-2">
                    {addForm.image_url && (
                      <img src={addForm.image_url} alt="product" className="h-8 w-8 rounded-lg object-contain border border-border/40 bg-bg shrink-0" />
                    )}
                    <span className="text-xs text-accent">{t('barcode.found')}</span>
                  </span>
                )}
                {barcodeStatus === 'notFound' && <span className="text-xs text-red">{t('barcode.notFound')}</span>}
                <div className="ml-auto flex gap-1 flex-wrap justify-end">
                  {(Object.keys(PRESETS) as PresetKey[]).map(key => (
                    <button key={key} type="button" onClick={() => applyPreset(key)}
                      className="text-xs px-2.5 py-1 rounded-full border border-border/50 text-text-sec hover:border-accent/50 hover:text-accent transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer active:scale-[0.97]">
                      {t(presetLabels[key])}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              {(() => {
                const dupMatch = addForm.name.trim()
                  ? foods.find(f => f.name.toLowerCase() === addForm.name.trim().toLowerCase())
                  : null;
                return (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-[0.15em] font-semibold text-text-sec/40">{t('common.name')}</label>
                    <input
                      type="text"
                      value={addForm.name}
                      onChange={e => patchAdd({ name: e.target.value })}
                      onKeyDown={e => e.key === 'Enter' && handleAdd()}
                      placeholder={t('foods.namePlaceholder')}
                      className={INPUT_CLASS}
                    />
                    {dupMatch && <span className="text-xs text-yellow">⚠ "{dupMatch.name}" already exists</span>}
                  </div>
                );
              })()}

              {/* Macros + flags */}
              <div className="flex items-end gap-2">
                {macroFields.map(({ key, label }) => (
                  <div key={key} className="flex flex-col gap-1 flex-1 min-w-0">
                    <label className="text-[10px] uppercase tracking-[0.12em] font-semibold text-text-sec/40 truncate">{label}</label>
                    <input
                      type="text" inputMode="decimal"
                      value={(addForm as unknown as Record<string, string>)[key]}
                      onChange={e => patchAdd({ [key]: e.target.value })}
                      onKeyDown={e => e.key === 'Enter' && handleAdd()}
                      placeholder="0"
                      className={INPUT_CLASS}
                    />
                  </div>
                ))}
                <div className="flex flex-col gap-1 items-center shrink-0 pb-1.5">
                  <label className="text-[10px] text-text-sec/40">💧</label>
                  <input type="checkbox" checked={addForm.is_liquid} onChange={e => patchAdd({ is_liquid: e.target.checked })} className="cursor-pointer accent-accent w-4 h-4" />
                </div>
                <div className="flex flex-col gap-1 items-center shrink-0 pb-1.5" title={t('foods.bulkHelp')}>
                  <label className="text-[10px] uppercase tracking-[0.1em] text-text-sec/40">{t('foods.bulk')}</label>
                  <input type="checkbox" checked={addForm.is_bulk} onChange={e => patchAdd({ is_bulk: e.target.checked, piece_grams: e.target.checked ? '' : addForm.piece_grams })} className="cursor-pointer accent-accent w-4 h-4" />
                </div>
              </div>

              {/* Packs */}
              <div className="border-t border-border/20 pt-3 flex flex-col gap-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] uppercase tracking-[0.15em] font-semibold text-text-sec/40">{t('foods.packsSection')}</span>
                  <span className="text-[10px] text-text-sec/30">{t('foods.packsHelp')}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {addPacks.map((p, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <input
                        type="text" inputMode="decimal"
                        value={p.grams}
                        onChange={e => updateAddPackGrams(i, e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (i === addPacks.length - 1 && parseFloat(p.grams) > 0) addBlankAddPack(); } }}
                        placeholder="0"
                        className="w-20 bg-bg border border-border/50 rounded-full px-3 py-1.5 text-text text-sm outline-none focus:border-accent tabular-nums transition-colors duration-300"
                      />
                      <span className="text-xs text-text-sec/50">g</span>
                      {addPacks.length > 1 && (
                        <button type="button" onClick={() => removeAddPack(i)} className="text-xs text-text-sec/40 hover:text-red cursor-pointer px-1 transition-colors duration-300">✕</button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={addBlankAddPack}
                    className="px-3 py-1.5 rounded-full border border-dashed border-border/50 text-text-sec/50 text-xs hover:border-accent/50 hover:text-accent transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer active:scale-[0.97]">
                    + {t('foods.addPack')}
                  </button>
                </div>
                {packFromBarcode != null && (
                  <p className="text-[10px] text-accent">{t('foods.packFromBarcode').replace('{g}', String(packFromBarcode))} ✓</p>
                )}
                {addPacks.length > 0 && !addForm.is_bulk && (
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-text-sec/40 shrink-0">{t('foods.pieceInPack')}:</label>
                    <input
                      type="text" inputMode="decimal"
                      value={addForm.piece_grams}
                      onChange={e => patchAdd({ piece_grams: e.target.value })}
                      onKeyDown={e => e.key === 'Enter' && handleAdd()}
                      placeholder="g"
                      className="w-20 bg-bg border border-border/50 rounded-full px-3 py-1 text-xs text-text outline-none focus:border-accent transition-colors duration-300"
                    />
                    <span className="text-[10px] text-text-sec/30">{t('foods.pieceHelp')}</span>
                  </div>
                )}
              </div>

              {/* Shelf life + price */}
              <div className="border-t border-border/20 pt-3 flex items-center gap-3 flex-wrap">
                <span className="text-[10px] uppercase tracking-[0.15em] font-semibold text-text-sec/40 shrink-0">{t('foods.shelfPriceSection')}</span>
                <label className="text-[10px] text-text-sec/40 shrink-0">{t('foods.openedDays')}</label>
                <input type="number" inputMode="numeric" min={1} value={addForm.opened_days} onChange={e => patchAdd({ opened_days: e.target.value })} placeholder="days"
                  className="w-20 bg-bg border border-border/50 rounded-full px-3 py-1 text-xs text-text outline-none focus:border-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none transition-colors duration-300" />
                <span className="text-xs text-border/40 mx-0.5">·</span>
                <label className="text-[10px] text-text-sec/40 shrink-0">{t('foods.discardThreshold')}</label>
                <input type="number" inputMode="numeric" min={1} max={100} value={addForm.discard_threshold_pct} onChange={e => patchAdd({ discard_threshold_pct: e.target.value })} placeholder="5"
                  className="w-16 bg-bg border border-border/50 rounded-full px-3 py-1 text-xs text-text outline-none focus:border-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none transition-colors duration-300" />
                <span className="text-xs text-border/40 mx-0.5">·</span>
                <label className="text-[10px] text-text-sec/40 shrink-0">{t('foods.pricePer100g').replace('{cur}', settings.currency_symbol ?? '€')}</label>
                <input type="number" inputMode="decimal" min={0} value={addForm.price_per_100g} onChange={e => patchAdd({ price_per_100g: e.target.value })} placeholder="0.00"
                  className="w-20 bg-bg border border-border/50 rounded-full px-3 py-1 text-xs text-text outline-none focus:border-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none transition-colors duration-300" />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 border-t border-border/20 pt-3">
                <button type="button" onClick={handleImport}
                  className="px-4 py-2 rounded-full border border-border/50 text-text-sec text-sm hover:border-accent/50 hover:text-accent transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer active:scale-[0.97]">
                  {t('import.foods')}
                </button>
                <button type="button" onClick={handleAdd} disabled={!addForm.name.trim() || !addForm.calories}
                  className="group flex items-center gap-2 px-5 py-2 rounded-full bg-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]">
                  {t('common.add')}
                  <span className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center text-xs transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-px">+</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Tab bar — floating pill ─────────────────────────────────────── */}
      <div className="flex shrink-0">
        <div className="flex gap-1 bg-bg/60 rounded-full p-1 ring-1 ring-border/40">
          <button
            onClick={() => setTab('foods')}
            className={[
              'px-5 py-1.5 text-sm font-medium rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer active:scale-[0.97]',
              tab === 'foods' ? 'bg-card text-text shadow-sm ring-1 ring-border/30' : 'text-text-sec hover:text-text',
            ].join(' ')}
          >{t('foods.tabFoods')}</button>
          <button
            onClick={() => setTab('packs')}
            className={[
              'px-5 py-1.5 text-sm font-medium rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer active:scale-[0.97]',
              tab === 'packs' ? 'bg-card text-text shadow-sm ring-1 ring-border/30' : 'text-text-sec hover:text-text',
            ].join(' ')}
          >{t('foods.tabPacks')}</button>
        </div>
      </div>

      {/* ── Foods tab ──────────────────────────────────────────────────── */}
      {tab === 'foods' && (
        <div className="flex flex-col gap-3 flex-1 min-h-0">
          {/* Search + controls */}
          <div className="flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('foods.searchPlaceholder')}
              className="bg-bg border border-border/50 rounded-full px-4 py-2 text-text text-sm outline-none focus:border-accent flex-1 transition-colors duration-300"
            />
            <button
              type="button"
              onClick={() => setDetailMode(v => !v)}
              className={[
                'text-xs px-4 py-2 rounded-full border transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer shrink-0 active:scale-[0.97]',
                detailMode ? 'border-accent text-accent bg-accent/10' : 'border-border/50 text-text-sec hover:border-accent/50 hover:text-accent',
              ].join(' ')}
            >{t('foods.detailMode')}</button>
          </div>

          {filteredFoods.length === 0 ? (
            <p className="text-text-sec/50 text-sm py-6 text-center">{t('foods.noFoods')}</p>
          ) : (
            <div className="p-1.5 rounded-[1.75rem] ring-1 ring-border/50 bg-card/30 flex-1 min-h-0 flex flex-col">
              <div className="overflow-auto flex-1 rounded-[calc(1.75rem-6px)] bg-card">
                <table className="w-full text-sm min-w-[700px]">
                  <thead className="sticky top-0 bg-card z-10">
                    <tr className="border-b border-border/20">
                      <th className="px-2 py-3 w-8"></th>
                      <th className="px-2 py-3 w-10"></th>
                      <th className="px-3 py-3 text-left text-[10px] uppercase tracking-[0.15em] font-semibold text-text-sec/40">{t('th.food')}</th>
                      <th className="px-3 py-3 text-right text-[10px] uppercase tracking-[0.15em] font-semibold text-text-sec/40">{t('th.kcal')}</th>
                      <th className="px-3 py-3 text-right text-[10px] uppercase tracking-[0.15em] font-semibold text-text-sec/40">{t('th.fat')}</th>
                      <th className="px-3 py-3 text-right text-[10px] uppercase tracking-[0.15em] font-semibold text-text-sec/40">{t('th.carbs')}</th>
                      <th className="px-3 py-3 text-right text-[10px] uppercase tracking-[0.15em] font-semibold text-text-sec/40">{t('th.fiber')}</th>
                      <th className="px-3 py-3 text-right text-[10px] uppercase tracking-[0.15em] font-semibold text-text-sec/40">{t('th.protein')}</th>
                      <th className="px-3 py-3 text-right text-[10px] uppercase tracking-[0.15em] font-semibold text-text-sec/40">{t('th.piece')}</th>
                      <th className="px-2 py-3 text-center text-[10px] uppercase tracking-[0.15em] font-semibold text-text-sec/40">{t('th.liquid')}</th>
                      {detailMode && <th className="px-3 py-3 text-left text-[10px] uppercase tracking-[0.15em] font-semibold text-text-sec/40">{t('th.barcode')}</th>}
                      {detailMode && <th className="px-3 py-3 text-right text-[10px] uppercase tracking-[0.15em] font-semibold text-text-sec/40">{t('foods.openedDays')}</th>}
                      {detailMode && <th className="px-3 py-3 text-right text-[10px] uppercase tracking-[0.15em] font-semibold text-text-sec/40">{t('foods.discardThreshold')}</th>}
                      {detailMode && <th className="px-3 py-3 text-right text-[10px] uppercase tracking-[0.15em] font-semibold text-text-sec/40">{t('foods.pricePer100g').replace('{cur}', settings.currency_symbol ?? '€')}</th>}
                      <th className="px-2 py-3 w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFoods.map(food => (
                      editId === food.id ? (
                        <tr key={food.id} className="bg-bg/60 border-t border-border/20">
                          <td className="px-2 py-3">
                            <button type="button" onClick={() => handleToggleFavorite(food.id)} className="text-base cursor-pointer transition-transform duration-300 hover:scale-110">{food.favorite === 1 ? '⭐' : '☆'}</button>
                          </td>
                          <td colSpan={detailMode ? 13 : 9} className="px-3 py-3">
                            <FormFields form={editForm} patch={patchEdit} />
                            {detailMode && (
                              <div className="flex flex-wrap gap-3 mt-3">
                                {[
                                  { label: t('th.barcode'), key: 'barcode', type: 'text', placeholder: 'e.g. 8001234567890', className: 'w-48' },
                                ].map(({ label, key, type, placeholder, className }) => (
                                  <div key={key} className="flex flex-col gap-1">
                                    <label className="text-[10px] uppercase tracking-[0.12em] font-semibold text-text-sec/40">{label}</label>
                                    <input type={type} value={(editForm as unknown as Record<string,string>)[key]} onChange={e => patchEdit({ [key]: e.target.value })} placeholder={placeholder}
                                      className={`${className} bg-bg border border-border/50 rounded-lg px-2 py-1.5 text-text text-sm outline-none focus:border-accent`} />
                                  </div>
                                ))}
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] uppercase tracking-[0.12em] font-semibold text-text-sec/40">{t('foods.openedDays')}</label>
                                  <input type="number" inputMode="numeric" min={1} value={editForm.opened_days} onChange={e => patchEdit({ opened_days: e.target.value })} placeholder="days"
                                    className="bg-bg border border-border/50 rounded-lg px-2 py-1.5 text-text text-sm outline-none focus:border-accent w-24 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] uppercase tracking-[0.12em] font-semibold text-text-sec/40">{t('foods.discardThreshold')}</label>
                                  <input type="number" inputMode="numeric" min={1} max={100} value={editForm.discard_threshold_pct} onChange={e => patchEdit({ discard_threshold_pct: e.target.value })} placeholder="5"
                                    className="bg-bg border border-border/50 rounded-lg px-2 py-1.5 text-text text-sm outline-none focus:border-accent w-20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] uppercase tracking-[0.12em] font-semibold text-text-sec/40">{t('foods.pricePer100g').replace('{cur}', settings.currency_symbol ?? '€')}</label>
                                  <input type="number" inputMode="decimal" min={0} value={editForm.price_per_100g} onChange={e => patchEdit({ price_per_100g: e.target.value })} placeholder="0.00"
                                    className="bg-bg border border-border/50 rounded-lg px-2 py-1.5 text-text text-sm outline-none focus:border-accent w-24 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                                </div>
                              </div>
                            )}
                            <div className="border-t border-border/20 pt-2 mt-3">
                              <p className="text-[10px] text-text-sec/30 mb-2">{t('foods.packsHelp')}</p>
                              <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] uppercase tracking-[0.12em] font-semibold text-text-sec/40">{t('foods.packs')}</label>
                                {(food.packages ?? []).map(pkg => (
                                  <EditablePackRow key={pkg.id} pkg={pkg} currency={settings.currency_symbol ?? '€'} onSaved={loadFoods} onDelete={() => setDeletePackId(pkg.id)} showError={(msg) => showToast(msg, 'error')} tLocked={t('foods.packInUse')} />
                                ))}
                                <div className="flex items-center gap-2">
                                  <input type="text" inputMode="decimal" value={newPackGrams} onChange={e => setNewPackGrams(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddPack()} placeholder="+ g"
                                    className="w-20 text-xs bg-bg border border-dashed border-border/50 rounded-full px-3 py-1 focus:border-accent outline-none transition-colors duration-300" />
                                  <input type="text" inputMode="decimal" value={newPackPrice} onChange={e => setNewPackPrice(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddPack()} placeholder={`${settings.currency_symbol ?? '€'} opt.`}
                                    className="w-24 text-xs bg-bg border border-dashed border-border/50 rounded-full px-3 py-1 focus:border-accent outline-none transition-colors duration-300" />
                                  <button type="button" onClick={handleAddPack}
                                    className="text-xs px-3 py-1 rounded-full border border-dashed border-border/50 text-text-sec/50 hover:border-accent/50 hover:text-accent cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]">
                                    + {t('foods.addPack')}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-3 align-top">
                            <div className="flex flex-col gap-1.5 pt-1">
                              <button type="button" onClick={() => handleSaveEdit(food)}
                                className="text-xs px-3 py-1.5 rounded-full bg-accent text-white hover:opacity-90 cursor-pointer transition-all duration-300 active:scale-[0.97]">{t('common.save')}</button>
                              <button type="button" onClick={cancelEdit}
                                className="text-xs px-3 py-1.5 rounded-full border border-border/50 text-text-sec cursor-pointer hover:text-text transition-all duration-300 active:scale-[0.97]">{t('common.cancel')}</button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={food.id} className="border-t border-border/15 hover:bg-card-hover/50 transition-colors duration-300">
                          <td className="px-2 py-3">
                            <button type="button" onClick={() => handleToggleFavorite(food.id)} className="text-base cursor-pointer hover:scale-110 transition-transform duration-300">{food.favorite === 1 ? '⭐' : '☆'}</button>
                          </td>
                          <td className="px-2 py-3">
                            {food.image_url
                              ? <img src={food.image_url} alt="" className="h-8 w-8 rounded-lg object-contain" />
                              : <div className="h-8 w-8" />}
                          </td>
                          <td className="px-3 py-3 text-text font-medium">{food.name}</td>
                          <td className="px-3 py-3 text-right text-text tabular-nums font-medium">{food.calories}</td>
                          <td className="px-3 py-3 text-right text-text-sec/70 tabular-nums">{food.fat}</td>
                          <td className="px-3 py-3 text-right text-text-sec/70 tabular-nums">{food.carbs}</td>
                          <td className="px-3 py-3 text-right text-text-sec/70 tabular-nums">{food.fiber}</td>
                          <td className="px-3 py-3 text-right text-text-sec/70 tabular-nums">{food.protein}</td>
                          <td className="px-3 py-3 text-right text-text-sec/70 tabular-nums">{food.piece_grams != null ? `${food.piece_grams}g` : '—'}</td>
                          <td className="px-2 py-3 text-center">{food.is_liquid === 1 ? '💧' : ''}</td>
                          {detailMode && <td className="px-3 py-3 text-text-sec/50 tabular-nums text-xs">{food.barcode ?? '—'}</td>}
                          {detailMode && <td className="px-3 py-3 text-right text-text-sec/50 tabular-nums text-xs">{food.opened_days != null ? `${food.opened_days}d` : '—'}</td>}
                          {detailMode && <td className="px-3 py-3 text-right text-text-sec/50 tabular-nums text-xs">{food.discard_threshold_pct != null ? `${food.discard_threshold_pct}%` : '—'}</td>}
                          {detailMode && <td className="px-3 py-3 text-right text-text-sec/50 tabular-nums text-xs">{food.price_per_100g != null ? `${settings.currency_symbol ?? '€'}${food.price_per_100g}` : '—'}</td>}
                          <td className="px-2 py-3">
                            <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <button type="button" onClick={() => startEdit(food)} className="text-text-sec/50 hover:text-text px-1 cursor-pointer transition-colors duration-300"><span style={{ display: 'inline-block', transform: 'scaleX(-1) rotate(15deg)' }}>✎</span></button>
                              <button type="button" onClick={() => setDeleteId(food.id)} className="text-text-sec/50 hover:text-red px-1 cursor-pointer transition-colors duration-300">✕</button>
                            </div>
                          </td>
                        </tr>
                      )
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Packs tab ──────────────────────────────────────────────────── */}
      {tab === 'packs' && (
        <div className="flex flex-col gap-4 flex-1 min-h-0">
          {/* Add pack — double-bezel */}
          <div className="p-1.5 rounded-[1.75rem] ring-1 ring-border/50 bg-card/30 shrink-0">
            <div className="bg-card rounded-[calc(1.75rem-6px)] px-5 py-4 flex flex-col gap-3">
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-text-sec/40">{t('foods.addPackToFood')}</span>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex-1 min-w-[240px]">
                  <FoodSearch
                    key={packSearchKey}
                    items={foodSearchItems}
                    onSelect={item => {
                      const food = foods.find(f => f.id === item.id) ?? null;
                      setPackFood(food);
                      setPackUnit(food?.piece_grams ? 'pcs' : 'g');
                      setPackGramsInput('');
                      setTimeout(() => packGramsRef.current?.focus(), 0);
                    }}
                    onClear={() => setPackFood(null)}
                    placeholder={t('foods.searchPlaceholder')}
                  />
                </div>
                {packFood && (
                  <>
                    {packFood.piece_grams && (
                      <div className="flex rounded-full border border-border/50 overflow-hidden text-xs">
                        <button type="button" onClick={() => { setPackUnit('g'); setPackGramsInput(''); }}
                          className={`px-3 py-1.5 cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${packUnit === 'g' ? 'bg-accent/15 text-accent font-medium' : 'text-text-sec hover:text-text'}`}>g</button>
                        <button type="button" onClick={() => { setPackUnit('pcs'); setPackGramsInput(''); packGramsRef.current?.focus(); }}
                          className={`px-3 py-1.5 cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${packUnit === 'pcs' ? 'bg-accent/15 text-accent font-medium' : 'text-text-sec hover:text-text'}`}>pcs</button>
                      </div>
                    )}
                    <input ref={packGramsRef} type="text" inputMode="decimal" value={packGramsInput} onChange={e => setPackGramsInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddPackToFood()} placeholder={packUnit === 'pcs' ? 'pieces' : 'grams'}
                      className="w-24 bg-bg border border-border/50 rounded-full px-3 py-1.5 text-text text-sm outline-none focus:border-accent transition-colors duration-300" />
                    {packUnit === 'pcs' && packFood.piece_grams && packGramsInput && parseFloat(packGramsInput) > 0 && (
                      <span className="text-xs text-text-sec/50">= {Math.round(parseFloat(packGramsInput) * packFood.piece_grams)}g</span>
                    )}
                    <button type="button" onClick={handleAddPackToFood} disabled={!parseFloat(packGramsInput)}
                      className="px-4 py-1.5 rounded-full bg-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]">
                      {t('common.add')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 shrink-0">
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t('foods.searchPlaceholder')}
              className="bg-bg border border-border/50 rounded-full px-4 py-2 text-text text-sm outline-none focus:border-accent flex-1 transition-colors duration-300" />
          </div>

          {packRows.length === 0 ? (
            <p className="text-text-sec/50 text-sm py-6 text-center">{t('foods.noPacks')}</p>
          ) : (
            <div className="p-1.5 rounded-[1.75rem] ring-1 ring-border/50 bg-card/30 flex-1 min-h-0 flex flex-col">
              <div className="overflow-auto flex-1 rounded-[calc(1.75rem-6px)] bg-card">
                <table className="w-full text-sm min-w-[400px]">
                  <thead className="sticky top-0 bg-card z-10">
                    <tr className="border-b border-border/20">
                      <th className="px-3 py-3 text-left text-[10px] uppercase tracking-[0.15em] font-semibold text-text-sec/40">{t('th.food')}</th>
                      <th className="px-3 py-3 text-right text-[10px] uppercase tracking-[0.15em] font-semibold text-text-sec/40">{t('foods.packSize')}</th>
                      <th className="px-2 py-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {packRows.map(({ food, pkg }) => (
                      <tr key={pkg.id} className="border-t border-border/15 hover:bg-card-hover/50 transition-colors duration-300">
                        <td className="px-3 py-3 text-text font-medium">{food.name}</td>
                        <td className="px-3 py-3 text-right text-text tabular-nums font-medium">{pkg.grams}g</td>
                        <td className="px-2 py-3 text-right">
                          <button type="button" onClick={() => setDeletePackId(pkg.id)} className="text-text-sec/40 hover:text-red px-1 cursor-pointer transition-colors duration-300">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Scanner modal ────────────────────────────────────────────── */}
      <Modal isOpen={scannerOpen} onClose={() => { setScannerOpen(false); setScannerTab('scan'); }} title={t('barcode.scanTitle')}>
        <div className="flex gap-1 mb-4 bg-bg rounded-full p-1">
          <button type="button" onClick={() => setScannerTab('scan')}
            className={['flex-1 flex items-center justify-center gap-1.5 text-sm py-1.5 rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer',
              scannerTab === 'scan' ? 'bg-card text-text font-medium shadow-sm' : 'text-text-sec hover:text-text'].join(' ')}>
            📷 Scansiona
          </button>
          <button type="button" onClick={() => setScannerTab('search')}
            className={['flex-1 flex items-center justify-center gap-1.5 text-sm py-1.5 rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer',
              scannerTab === 'search' ? 'bg-card text-text font-medium shadow-sm' : 'text-text-sec hover:text-text'].join(' ')}>
            🔍 Cerca per nome
          </button>
        </div>
        {scannerTab === 'scan' && <BarcodeScanner onResult={handleScanResult} />}
        {scannerTab === 'search' && <FoodNameSearch onResult={handleNameSearchResult} />}
      </Modal>

      {deleteId !== null && (
        <ConfirmDialog message={t('foods.confirmDelete')} confirmLabel={t('common.delete')} cancelLabel={t('common.cancel')} dangerous onConfirm={() => handleDelete(deleteId)} onCancel={() => setDeleteId(null)} />
      )}
      {deletePackId !== null && (
        <ConfirmDialog message={t('foods.confirmDeletePack')} confirmLabel={t('common.delete')} cancelLabel={t('common.cancel')} dangerous onConfirm={() => handleDeletePack(deletePackId)} onCancel={() => setDeletePackId(null)} />
      )}
    </div>
  );
}

// ── EditablePackRow ───────────────────────────────────────────────────────────

interface EditablePackRowProps {
  pkg: FoodPackage;
  currency: string;
  onSaved: () => void;
  onDelete: () => void;
  showError: (msg: string) => void;
  tLocked: string;
}

function EditablePackRow({ pkg, currency, onSaved, onDelete, showError, tLocked }: EditablePackRowProps) {
  const [grams, setGrams] = useState(String(pkg.grams));
  const [price, setPrice] = useState(pkg.price != null ? String(pkg.price) : '');

  useEffect(() => { setGrams(String(pkg.grams)); }, [pkg.grams]);
  useEffect(() => { setPrice(pkg.price != null ? String(pkg.price) : ''); }, [pkg.price]);

  async function commit() {
    const g = parseFloat(grams);
    const p = price !== '' ? parseFloat(price) : null;
    if (!g || g <= 0) { setGrams(String(pkg.grams)); return; }
    const samePrice = (p ?? null) === (pkg.price ?? null);
    if (g === pkg.grams && samePrice) return;
    const res = await api.foods.updatePackage({ id: pkg.id, grams: g, price: p });
    if (!res.ok && res.error === 'pack_in_use') {
      showError(tLocked.replace('{n}', String(res.batch_count ?? 0)));
      setGrams(String(pkg.grams));
      setPrice(pkg.price != null ? String(pkg.price) : '');
      return;
    }
    onSaved();
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text" inputMode="decimal"
        value={grams}
        onChange={e => setGrams(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        className="w-20 text-xs bg-bg border border-border rounded px-2 py-1 text-text outline-none focus:border-accent tabular-nums"
      />
      <span className="text-xs text-text-sec">g</span>
      <input
        type="text" inputMode="decimal"
        value={price}
        onChange={e => setPrice(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        placeholder={`${currency} opt.`}
        className="w-24 text-xs bg-bg border border-border rounded px-2 py-1 text-text outline-none focus:border-accent"
      />
      <button type="button" onClick={onDelete} className="text-xs text-text-sec hover:text-red cursor-pointer px-1">✕</button>
    </div>
  );
}
