import { useState, useEffect, useMemo, useRef } from 'react';
import { useT } from '../i18n/useT';
import { useToast } from '../components/Toast';
import { api } from '../api';
import BarcodeScanner from '../components/BarcodeScanner';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import FoodSearch from '../components/FoodSearch';
import type { SearchItem } from '../components/FoodSearch';
import type { Food, BarcodeResult, FoodPackage } from '../types';

const INPUT_CLASS =
  'bg-bg border border-border rounded-lg px-2 py-1.5 text-text text-sm outline-none focus:border-accent w-full';

// Calorie share per macro (must sum to 1.0); fiber added as g/100kcal
const PRESETS = {
  balanced:    { proteinPct: 0.25, carbsPct: 0.50, fatPct: 0.25, fiberPer100: 2.5 },
  highProtein: { proteinPct: 0.40, carbsPct: 0.20, fatPct: 0.40, fiberPer100: 1.0 },
  highCarb:    { proteinPct: 0.10, carbsPct: 0.80, fatPct: 0.10, fiberPer100: 3.0 },
  highFat:     { proteinPct: 0.20, carbsPct: 0.05, fatPct: 0.75, fiberPer100: 1.0 },
  vegetable:   { proteinPct: 0.15, carbsPct: 0.65, fatPct: 0.20, fiberPer100: 6.0 },
} as const;
type PresetKey = keyof typeof PRESETS;

interface FoodFormState {
  name: string; calories: string; protein: string; carbs: string;
  fat: string; fiber: string; piece_grams: string; is_liquid: boolean; barcode: string;
  opened_days: string; discard_threshold_pct: string;
}

const emptyForm = (): FoodFormState => ({ name:'', calories:'', protein:'', carbs:'', fat:'', fiber:'', piece_grams:'', is_liquid: false, barcode: '', opened_days: '', discard_threshold_pct: '10' });
const foodToForm = (f: Food): FoodFormState => ({ name:f.name, calories:String(f.calories), protein:String(f.protein), carbs:String(f.carbs), fat:String(f.fat), fiber:String(f.fiber), piece_grams:f.piece_grams!=null?String(f.piece_grams):'', is_liquid:f.is_liquid===1, barcode: f.barcode ?? '', opened_days: f.opened_days != null ? String(f.opened_days) : '', discard_threshold_pct: f.discard_threshold_pct != null ? String(f.discard_threshold_pct) : '10' });
const barcodeToForm = (r: BarcodeResult, barcode: string): FoodFormState => ({ name:r.name, calories:String(r.calories), protein:String(r.protein), carbs:String(r.carbs), fat:String(r.fat), fiber:String(r.fiber), piece_grams:'', is_liquid:r.is_liquid===1, barcode, opened_days: '', discard_threshold_pct: '10' });
const formToData = (f: FoodFormState): Omit<Food,'id'> => ({ name:f.name.trim(), calories:parseFloat(f.calories)||0, protein:parseFloat(f.protein)||0, carbs:parseFloat(f.carbs)||0, fat:parseFloat(f.fat)||0, fiber:parseFloat(f.fiber)||0, piece_grams:f.piece_grams!==''?parseFloat(f.piece_grams):null, is_liquid:f.is_liquid?1:0, barcode: f.barcode.trim() || null, opened_days: f.opened_days !== '' ? parseInt(f.opened_days, 10) : null, discard_threshold_pct: parseFloat(f.discard_threshold_pct) || 10 });

// ── FormFields for table edit row (multi-line) ────────────────────────────────

interface FormFieldsProps { form: FoodFormState; patch: (p: Partial<FoodFormState>) => void; }

function FormFields({ form, patch }: FormFieldsProps) {
  const { t } = useT();
  const FIELD_CLS = 'bg-bg border border-border rounded-lg px-2 py-1.5 text-text text-sm outline-none focus:border-accent w-full';
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
      <input type="text" value={form.name} onChange={e => patch({ name: e.target.value })} placeholder={t('foods.namePlaceholder')} className={FIELD_CLS} />
      <div className="grid grid-cols-6 gap-2">
        {macros.map(({ key, label }) => (
          <div key={key} className="flex flex-col gap-0.5">
            <label className="text-xs text-text-sec">{label}</label>
            <input type="text" inputMode="decimal" value={(form as Record<string,string>)[key]} onChange={e => patch({ [key]: e.target.value })} placeholder="0" className={FIELD_CLS} />
          </div>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm text-text-sec cursor-pointer">
        <input type="checkbox" checked={form.is_liquid} onChange={e => patch({ is_liquid: e.target.checked })} />
        {t('foods.liquid')}
      </label>
    </div>
  );
}

// ── FoodsPage ─────────────────────────────────────────────────────────────────

type FoodsTab = 'foods' | 'packs';

export default function FoodsPage() {
  const { t } = useT();
  const { showToast } = useToast();

  const [foods, setFoods] = useState<Food[]>([]);
  const [addForm, setAddForm] = useState<FoodFormState>(emptyForm());
  const [addPacks, setAddPacks] = useState<{ grams: string }[]>([]);
  const [editId, setEditId] = useState<number|null>(null);
  const [editForm, setEditForm] = useState<FoodFormState>(emptyForm());
  const [newPackGrams, setNewPackGrams] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeStatus, setBarcodeStatus] = useState<'found'|'notFound'|null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
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
    setAddForm(emptyForm()); setAddPacks([]); showToast(t('common.saved')); loadFoods();
  }

  async function handleAddPack() {
    const g = parseFloat(newPackGrams);
    if (!g || g <= 0 || !editId) return;
    await api.foods.addPackage({ food_id: editId, grams: g });
    setNewPackGrams('');
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
    const r = await api.barcode.lookup(barcodeInput.trim());
    if (r) { setAddForm(barcodeToForm(r, barcodeInput.trim())); setBarcodeStatus('found'); }
    else setBarcodeStatus('notFound');
  }

  async function handleScanResult(barcode: string) {
    setScannerOpen(false); setBarcodeInput(barcode); setBarcodeStatus(null);
    const r = await api.barcode.lookup(barcode);
    if (r) { setAddForm(barcodeToForm(r, barcode)); setBarcodeStatus('found'); }
    else setBarcodeStatus('notFound');
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
      const { count } = await api.import.foods({ filePath });
      showToast(`${t('import.success').replace('{n}', String(count)).replace('{s}','0')}`);
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

  const presetLabels: Record<PresetKey, string> = {
    balanced:    'foods.balanced',
    highProtein: 'foods.highProtein',
    highCarb:    'foods.highCarb',
    highFat:     'foods.highFat',
    vegetable:   'foods.vegetable',
  };

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
    { key: 'calories',    label: 'kcal'         },
    { key: 'fat',         label: t('th.fat')    },
    { key: 'carbs',       label: t('th.carbs')  },
    { key: 'fiber',       label: t('th.fiber')  },
    { key: 'protein',     label: t('th.protein')},
    { key: 'piece_grams', label: 'g/piece'      },
  ];

  return (
    <div className="p-6 flex flex-col gap-4 h-full overflow-hidden">

      {/* ── Collapsible add form ──────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl shrink-0">
        {/* Header — always visible */}
        <button
          type="button"
          onClick={() => setFormOpen(v => !v)}
          className="w-full flex items-center gap-2 px-4 py-3 text-left cursor-pointer hover:bg-card-hover rounded-xl transition-colors"
        >
          <span className="text-xs text-text-sec select-none">{formOpen ? '▴' : '▾'}</span>
          <span className="text-sm font-semibold text-text">{t('foods.addTitle')}</span>
          <span className="text-xs text-text-sec ml-1">{t('foods.valuesPerLabel')}</span>
        </button>

        {formOpen && (
          <div className="px-4 pb-4 flex flex-col gap-3 border-t border-border pt-3">
            {/* Barcode row */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-sec shrink-0">{t('barcode.addByBarcode')}:</span>
              <input
                type="text"
                value={barcodeInput}
                onChange={e=>{setBarcodeInput(e.target.value);setBarcodeStatus(null);}}
                onKeyDown={e=>e.key==='Enter'&&handleBarcodeLookup()}
                placeholder={t('barcode.placeholder')}
                className="bg-bg border border-border rounded-lg px-2 py-1.5 text-text text-sm outline-none focus:border-accent w-40"
              />
              <button type="button" onClick={handleBarcodeLookup} className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:opacity-90 cursor-pointer shrink-0">{t('barcode.lookup')}</button>
              <button type="button" onClick={()=>setScannerOpen(true)} className="px-2 py-1.5 rounded-lg border border-border text-text-sec hover:border-accent cursor-pointer shrink-0 text-sm">📷</button>
              {barcodeStatus==='found' && <span className="text-xs text-accent">{t('barcode.found')}</span>}
              {barcodeStatus==='notFound' && <span className="text-xs text-red">{t('barcode.notFound')}</span>}
              {/* Presets */}
              <div className="ml-auto flex gap-1 flex-wrap justify-end">
                {(Object.keys(PRESETS) as PresetKey[]).map(key => (
                  <button key={key} type="button"
                    onClick={() => applyPreset(key)}
                    className="text-xs px-2 py-1 rounded border border-border text-text-sec hover:border-accent hover:text-accent transition-colors cursor-pointer"
                  >{t(presetLabels[key])}</button>
                ))}
              </div>
            </div>

            {/* Name row */}
            {(() => {
              const dupMatch = addForm.name.trim()
                ? foods.find(f => f.name.toLowerCase() === addForm.name.trim().toLowerCase())
                : null;
              return (
                <div className="flex flex-col gap-0.5">
                  <label className="text-xs text-text-sec">{t('common.name')}</label>
                  <input
                    type="text"
                    value={addForm.name}
                    onChange={e => patchAdd({ name: e.target.value })}
                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    placeholder={t('foods.namePlaceholder')}
                    className={INPUT_CLASS}
                  />
                  {dupMatch && (
                    <span className="text-xs text-yellow">⚠ "{dupMatch.name}" already exists</span>
                  )}
                </div>
              );
            })()}

            {/* Macros + actions row */}
            <div className="flex items-end gap-2">
              {/* Macro fields */}
              {macroFields.map(({ key, label }) => (
                <div key={key} className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <label className="text-xs text-text-sec truncate">{label}</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={(addForm as Record<string,string>)[key]}
                    onChange={e => patchAdd({ [key]: e.target.value })}
                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    placeholder="0"
                    className={INPUT_CLASS}
                  />
                </div>
              ))}

              {/* Liquid checkbox */}
              <div className="flex flex-col gap-0.5 items-center shrink-0 pb-1.5">
                <label className="text-xs text-text-sec">💧</label>
                <input type="checkbox" checked={addForm.is_liquid} onChange={e => patchAdd({ is_liquid: e.target.checked })} className="cursor-pointer accent-accent w-4 h-4" />
              </div>

              {/* Actions */}
              <div className="flex gap-1 shrink-0 pb-0.5 ml-auto">
                <button type="button" onClick={handleImport} className="px-3 py-1.5 rounded-lg border border-border text-text-sec text-sm hover:border-accent hover:text-accent transition-colors cursor-pointer">{t('import.foods')}</button>
                <button type="button" onClick={handleAdd} disabled={!addForm.name.trim()||!addForm.calories} className="px-4 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 cursor-pointer">{t('common.add')}</button>
              </div>
            </div>

            {/* Opened-lifecycle fields */}
            <div className="flex items-center gap-4 flex-wrap border-t border-border pt-2">
              <div className="flex flex-col gap-0.5">
                <label className="text-xs text-text-sec">{t('foods.openedDays')}</label>
                <input
                  type="number" inputMode="numeric" min={1}
                  value={addForm.opened_days}
                  onChange={e => patchAdd({ opened_days: e.target.value })}
                  placeholder="days"
                  className="w-24 bg-bg border border-border rounded-lg px-2 py-1 text-xs text-text outline-none focus:border-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-xs text-text-sec">{t('foods.discardThreshold')}</label>
                <input
                  type="number" inputMode="numeric" min={1} max={100}
                  value={addForm.discard_threshold_pct}
                  onChange={e => patchAdd({ discard_threshold_pct: e.target.value })}
                  placeholder="10"
                  className="w-20 bg-bg border border-border rounded-lg px-2 py-1 text-xs text-text outline-none focus:border-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            {/* Pack sizes */}
            <div className="flex items-center gap-2 flex-wrap border-t border-border pt-2">
              <label className="text-xs text-text-sec shrink-0">{t('foods.packs')}:</label>
              {addPacks.map((p, i) => (
                <div key={i} className="flex items-center gap-1">
                  <input
                    type="text" inputMode="decimal"
                    value={p.grams}
                    onChange={e => setAddPacks(prev => prev.map((x, idx) => idx === i ? { grams: e.target.value } : x))}
                    placeholder="g"
                    className="w-16 bg-bg border border-border rounded-lg px-2 py-1 text-xs text-text outline-none focus:border-accent"
                  />
                  <span className="text-xs text-text-sec">g</span>
                  <button type="button" onClick={() => setAddPacks(prev => prev.filter((_, idx) => idx !== i))} className="text-xs text-text-sec hover:text-red cursor-pointer px-0.5">✕</button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setAddPacks(prev => [...prev, { grams: '' }])}
                className="text-xs px-2 py-1 rounded border border-dashed border-border text-text-sec hover:border-accent hover:text-accent cursor-pointer">
                + {t('foods.addPack')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Tab bar ───────────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-border shrink-0">
        <button
          onClick={() => setTab('foods')}
          className={`px-5 py-2.5 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px ${tab === 'foods' ? 'border-accent text-accent' : 'border-transparent text-text-sec hover:text-text'}`}
        >{t('foods.tabFoods')}</button>
        <button
          onClick={() => setTab('packs')}
          className={`px-5 py-2.5 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px ${tab === 'packs' ? 'border-accent text-accent' : 'border-transparent text-text-sec hover:text-text'}`}
        >{t('foods.tabPacks')}</button>
      </div>

      {/* ── Foods tab ─────────────────────────────────────────────────────── */}
      {tab === 'foods' && <div className="flex flex-col gap-3 flex-1 min-h-0">
        <div className="flex items-center gap-3 shrink-0">
          <h2 className="text-sm font-semibold text-text-sec uppercase tracking-wider shrink-0">{t('foods.title')}</h2>
          <input
            type="text"
            value={searchQuery}
            onChange={e=>setSearchQuery(e.target.value)}
            placeholder={t('foods.searchPlaceholder')}
            className="bg-bg border border-border rounded-lg px-3 py-2 text-text text-sm outline-none focus:border-accent flex-1"
          />
          <button
            type="button"
            onClick={() => setDetailMode(v => !v)}
            className={['text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer shrink-0', detailMode ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-sec hover:border-accent hover:text-accent'].join(' ')}
          >{t('foods.detailMode')}</button>
        </div>

        {filteredFoods.length === 0 ? (
          <p className="text-text-sec text-sm py-4">{t('foods.noFoods')}</p>
        ) : (
          <div className="overflow-auto flex-1 rounded-xl border border-border">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="sticky top-0 bg-card">
                <tr className="text-text-sec text-xs uppercase tracking-wider border-b border-border">
                  <th className="px-2 py-3 w-8"></th>
                  <th className="px-3 py-3 text-left">{t('th.food')}</th>
                  <th className="px-3 py-3 text-right">{t('th.kcal')}</th>
                  <th className="px-3 py-3 text-right">{t('th.fat')}</th>
                  <th className="px-3 py-3 text-right">{t('th.carbs')}</th>
                  <th className="px-3 py-3 text-right">{t('th.fiber')}</th>
                  <th className="px-3 py-3 text-right">{t('th.protein')}</th>
                  <th className="px-3 py-3 text-right">{t('th.piece')}</th>
                  <th className="px-2 py-3 text-center">{t('th.liquid')}</th>
                  {detailMode && <th className="px-3 py-3 text-left">{t('th.barcode')}</th>}
                  {detailMode && <th className="px-3 py-3 text-right">{t('foods.openedDays')}</th>}
                  {detailMode && <th className="px-3 py-3 text-right">{t('foods.discardThreshold')}</th>}
                  <th className="px-2 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filteredFoods.map(food => (
                  editId === food.id ? (
                    <tr key={food.id} className="bg-bg border-t border-border">
                      <td className="px-2 py-2">
                        <button type="button" onClick={()=>handleToggleFavorite(food.id)} className="text-base cursor-pointer">{food.favorite===1?'⭐':'☆'}</button>
                      </td>
                      <td colSpan={detailMode ? 9 : 8} className="px-3 py-2">
                        <FormFields form={editForm} patch={patchEdit} />
                        {detailMode && (
                          <div className="flex flex-wrap gap-3 mt-2">
                            <div className="flex flex-col gap-0.5">
                              <label className="text-xs text-text-sec">{t('th.barcode')}</label>
                              <input
                                type="text"
                                value={editForm.barcode}
                                onChange={e => patchEdit({ barcode: e.target.value })}
                                placeholder="e.g. 8001234567890"
                                className="bg-bg border border-border rounded-lg px-2 py-1.5 text-text text-sm outline-none focus:border-accent w-48"
                              />
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <label className="text-xs text-text-sec">{t('foods.openedDays')}</label>
                              <input
                                type="number"
                                inputMode="numeric"
                                min={1}
                                value={editForm.opened_days}
                                onChange={e => patchEdit({ opened_days: e.target.value })}
                                placeholder="days"
                                className="bg-bg border border-border rounded-lg px-2 py-1.5 text-text text-sm outline-none focus:border-accent w-24 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <label className="text-xs text-text-sec">{t('foods.discardThreshold')}</label>
                              <input
                                type="number"
                                inputMode="numeric"
                                min={1}
                                max={100}
                                value={editForm.discard_threshold_pct}
                                onChange={e => patchEdit({ discard_threshold_pct: e.target.value })}
                                placeholder="10"
                                className="bg-bg border border-border rounded-lg px-2 py-1.5 text-text text-sm outline-none focus:border-accent w-20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>
                          </div>
                        )}
                        {/* Pack sizes — live add/remove */}
                        <div className="flex items-center gap-2 flex-wrap border-t border-border pt-2 mt-2">
                          <label className="text-xs text-text-sec shrink-0">{t('foods.packs')}:</label>
                          {(food.packages ?? []).map(pkg => (
                            <div key={pkg.id} className="flex items-center gap-1 bg-bg border border-border rounded px-2 py-0.5">
                              <span className="text-xs tabular-nums">{pkg.grams}g</span>
                              <button type="button" onClick={() => setDeletePackId(pkg.id)} className="text-xs text-text-sec hover:text-red cursor-pointer">✕</button>
                            </div>
                          ))}
                          <input
                            type="text" inputMode="decimal"
                            value={newPackGrams}
                            onChange={e => setNewPackGrams(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddPack()}
                            placeholder="+ g"
                            className="w-16 text-xs bg-bg border border-dashed border-border rounded px-2 py-0.5 focus:border-accent outline-none"
                          />
                        </div>
                      </td>
                      <td className="px-2 py-2 align-top">
                        <div className="flex flex-col gap-1 pt-1">
                          <button type="button" onClick={()=>handleSaveEdit(food)} className="text-xs px-2 py-1 rounded bg-accent text-white hover:opacity-90 cursor-pointer">{t('common.save')}</button>
                          <button type="button" onClick={cancelEdit} className="text-xs px-2 py-1 rounded border border-border text-text-sec cursor-pointer">{t('common.cancel')}</button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={food.id} className="border-t border-border/50 hover:bg-card/30 transition-colors">
                      <td className="px-2 py-2.5">
                        <button type="button" onClick={()=>handleToggleFavorite(food.id)} className="text-base cursor-pointer hover:scale-110 transition-transform">{food.favorite===1?'⭐':'☆'}</button>
                      </td>
                      <td className="px-3 py-2.5 text-text font-medium">{food.name}</td>
                      <td className="px-3 py-2.5 text-right text-text tabular-nums">{food.calories}</td>
                      <td className="px-3 py-2.5 text-right text-text-sec tabular-nums">{food.fat}</td>
                      <td className="px-3 py-2.5 text-right text-text-sec tabular-nums">{food.carbs}</td>
                      <td className="px-3 py-2.5 text-right text-text-sec tabular-nums">{food.fiber}</td>
                      <td className="px-3 py-2.5 text-right text-text-sec tabular-nums">{food.protein}</td>
                      <td className="px-3 py-2.5 text-right text-text-sec tabular-nums">{food.piece_grams!=null?`${food.piece_grams}g`:'—'}</td>
                      <td className="px-2 py-2.5 text-center">{food.is_liquid===1?'💧':''}</td>
                      {detailMode && <td className="px-3 py-2.5 text-text-sec tabular-nums text-xs">{food.barcode ?? '—'}</td>}
                      {detailMode && <td className="px-3 py-2.5 text-right text-text-sec tabular-nums text-xs">{food.opened_days != null ? `${food.opened_days}d` : '—'}</td>}
                      {detailMode && <td className="px-3 py-2.5 text-right text-text-sec tabular-nums text-xs">{food.discard_threshold_pct != null ? `${food.discard_threshold_pct}%` : '—'}</td>}
                      <td className="px-2 py-2.5">
                        <div className="flex gap-1 justify-end">
                          <button type="button" onClick={()=>startEdit(food)} className="text-text-sec hover:text-text px-1 cursor-pointer"><span style={{ display: 'inline-block', transform: 'scaleX(-1) rotate(15deg)' }}>✎</span></button>
                          <button type="button" onClick={() => setDeleteId(food.id)} className="text-text-sec hover:text-red px-1 cursor-pointer transition-colors">✕</button>
                        </div>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>}

      {/* ── Packs tab ─────────────────────────────────────────────────────── */}
      {tab === 'packs' && (
        <div className="flex flex-col gap-3 flex-1 min-h-0">
          {/* Add pack to existing food */}
          <div className="bg-card border border-border rounded-xl px-4 py-3 flex flex-col gap-2 shrink-0">
            <label className="text-xs text-text-sec">{t('foods.addPackToFood')}</label>
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
                    <div className="flex rounded-lg border border-border overflow-hidden text-xs">
                      <button
                        type="button"
                        onClick={() => { setPackUnit('g'); setPackGramsInput(''); }}
                        className={`px-3 py-1.5 cursor-pointer transition-colors ${packUnit === 'g' ? 'bg-accent/15 text-accent font-medium' : 'text-text-sec hover:text-text'}`}
                      >g</button>
                      <button
                        type="button"
                        onClick={() => { setPackUnit('pcs'); setPackGramsInput(''); packGramsRef.current?.focus(); }}
                        className={`px-3 py-1.5 cursor-pointer transition-colors ${packUnit === 'pcs' ? 'bg-accent/15 text-accent font-medium' : 'text-text-sec hover:text-text'}`}
                      >pcs</button>
                    </div>
                  )}
                  <input
                    ref={packGramsRef}
                    type="text" inputMode="decimal"
                    value={packGramsInput}
                    onChange={e => setPackGramsInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddPackToFood()}
                    placeholder={packUnit === 'pcs' ? 'pieces' : 'grams'}
                    className="w-24 bg-bg border border-border rounded-lg px-2 py-1.5 text-text text-sm outline-none focus:border-accent"
                  />
                  {packUnit === 'pcs' && packFood.piece_grams && packGramsInput && parseFloat(packGramsInput) > 0 && (
                    <span className="text-xs text-text-sec">= {Math.round(parseFloat(packGramsInput) * packFood.piece_grams)}g</span>
                  )}
                  <button
                    type="button"
                    onClick={handleAddPackToFood}
                    disabled={!parseFloat(packGramsInput)}
                    className="px-4 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 cursor-pointer"
                  >{t('common.add')}</button>
                </>
              )}
            </div>
          </div>

          {/* Pack list */}
          <div className="flex items-center gap-3 shrink-0">
            <h2 className="text-sm font-semibold text-text-sec uppercase tracking-wider shrink-0">{t('foods.tabPacks')}</h2>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('foods.searchPlaceholder')}
              className="bg-bg border border-border rounded-lg px-3 py-2 text-text text-sm outline-none focus:border-accent flex-1"
            />
          </div>
          {packRows.length === 0 ? (
            <p className="text-text-sec text-sm py-4">{t('foods.noPacks')}</p>
          ) : (
            <div className="overflow-auto flex-1 rounded-xl border border-border">
              <table className="w-full text-sm min-w-[400px]">
                <thead className="sticky top-0 bg-card">
                  <tr className="text-text-sec text-xs uppercase tracking-wider border-b border-border">
                    <th className="px-3 py-3 text-left">{t('th.food')}</th>
                    <th className="px-3 py-3 text-right">{t('foods.packSize')}</th>
                    <th className="px-2 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {packRows.map(({ food, pkg }) => (
                    <tr key={pkg.id} className="border-t border-border/50 hover:bg-card/30 transition-colors">
                      <td className="px-3 py-2.5 text-text font-medium">{food.name}</td>
                      <td className="px-3 py-2.5 text-right text-text tabular-nums">{pkg.grams}g</td>
                      <td className="px-2 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => setDeletePackId(pkg.id)}
                          className="text-text-sec hover:text-red px-1 cursor-pointer transition-colors"
                        >✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={scannerOpen} onClose={()=>setScannerOpen(false)} title={t('barcode.scanTitle')}>
        <BarcodeScanner onResult={handleScanResult} />
      </Modal>

      {deleteId !== null && (
        <ConfirmDialog
          message={t('foods.confirmDelete')}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          dangerous
          onConfirm={() => handleDelete(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {deletePackId !== null && (
        <ConfirmDialog
          message={t('foods.confirmDeletePack')}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          dangerous
          onConfirm={() => handleDeletePack(deletePackId)}
          onCancel={() => setDeletePackId(null)}
        />
      )}
    </div>
  );
}
