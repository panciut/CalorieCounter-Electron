import { useState, useEffect, useMemo } from 'react';
import { useT } from '../i18n/useT';
import { useToast } from '../components/Toast';
import { api } from '../api';
import BarcodeScanner from '../components/BarcodeScanner';
import Modal from '../components/Modal';
import type { Food, BarcodeResult } from '../types';

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
  fat: string; fiber: string; piece_grams: string; is_liquid: boolean;
}

const emptyForm = (): FoodFormState => ({ name:'', calories:'', protein:'', carbs:'', fat:'', fiber:'', piece_grams:'', is_liquid: false });
const foodToForm = (f: Food): FoodFormState => ({ name:f.name, calories:String(f.calories), protein:String(f.protein), carbs:String(f.carbs), fat:String(f.fat), fiber:String(f.fiber), piece_grams:f.piece_grams!=null?String(f.piece_grams):'', is_liquid:f.is_liquid===1 });
const barcodeToForm = (r: BarcodeResult): FoodFormState => ({ name:r.name, calories:String(r.calories), protein:String(r.protein), carbs:String(r.carbs), fat:String(r.fat), fiber:String(r.fiber), piece_grams:'', is_liquid:r.is_liquid===1 });
const formToData = (f: FoodFormState): Omit<Food,'id'> => ({ name:f.name.trim(), calories:parseFloat(f.calories)||0, protein:parseFloat(f.protein)||0, carbs:parseFloat(f.carbs)||0, fat:parseFloat(f.fat)||0, fiber:parseFloat(f.fiber)||0, piece_grams:f.piece_grams!==''?parseFloat(f.piece_grams):null, is_liquid:f.is_liquid?1:0 });

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

export default function FoodsPage() {
  const { t } = useT();
  const { showToast } = useToast();

  const [foods, setFoods] = useState<Food[]>([]);
  const [addForm, setAddForm] = useState<FoodFormState>(emptyForm());
  const [editId, setEditId] = useState<number|null>(null);
  const [editForm, setEditForm] = useState<FoodFormState>(emptyForm());
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeStatus, setBarcodeStatus] = useState<'found'|'notFound'|null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(true);

  useEffect(() => { loadFoods(); }, []);

  async function loadFoods() { setFoods(await api.foods.getAll()); }

  function patchAdd(p: Partial<FoodFormState>) { setAddForm(f=>({...f,...p})); }
  function patchEdit(p: Partial<FoodFormState>) { setEditForm(f=>({...f,...p})); }

  async function handleAdd() {
    if (!addForm.name.trim() || !addForm.calories) return;
    await api.foods.add(formToData(addForm));
    setAddForm(emptyForm()); showToast(t('common.saved')); loadFoods();
  }

  async function handleBarcodeLookup() {
    if (!barcodeInput.trim()) return;
    setBarcodeStatus(null);
    const r = await api.barcode.lookup(barcodeInput.trim());
    if (r) { setAddForm(barcodeToForm(r)); setBarcodeStatus('found'); }
    else setBarcodeStatus('notFound');
  }

  async function handleScanResult(barcode: string) {
    setScannerOpen(false); setBarcodeInput(barcode); setBarcodeStatus(null);
    const r = await api.barcode.lookup(barcode);
    if (r) { setAddForm(barcodeToForm(r)); setBarcodeStatus('found'); }
    else setBarcodeStatus('notFound');
  }

  function startEdit(food: Food) { setEditId(food.id); setEditForm(foodToForm(food)); }
  function cancelEdit() { setEditId(null); }

  async function handleSaveEdit(food: Food) {
    await api.foods.update({ ...formToData(editForm), id: food.id, favorite: food.favorite });
    showToast(t('common.saved')); cancelEdit(); loadFoods();
  }

  async function handleDelete(id: number) { await api.foods.delete(id); loadFoods(); }
  async function handleToggleFavorite(id: number) { await api.foods.toggleFavorite(id); loadFoods(); }

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
            </div>

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
          </div>
        )}
      </div>

      {/* ── Database ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 flex-1 min-h-0">
        <div className="flex items-center gap-3 shrink-0">
          <h2 className="text-sm font-semibold text-text-sec uppercase tracking-wider shrink-0">{t('foods.title')}</h2>
          <input
            type="text"
            value={searchQuery}
            onChange={e=>setSearchQuery(e.target.value)}
            placeholder={t('foods.searchPlaceholder')}
            className="bg-bg border border-border rounded-lg px-3 py-2 text-text text-sm outline-none focus:border-accent flex-1"
          />
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
                      <td colSpan={8} className="px-3 py-2">
                        <FormFields form={editForm} patch={patchEdit} />
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
                      <td className="px-2 py-2.5">
                        <div className="flex gap-1 justify-end">
                          <button type="button" onClick={()=>startEdit(food)} className="text-text-sec hover:text-text px-1 cursor-pointer"><span style={{ display: 'inline-block', transform: 'scaleX(-1) rotate(15deg)' }}>✎</span></button>
                          <button type="button" onClick={()=>handleDelete(food.id)} className="text-text-sec hover:text-red px-1 cursor-pointer transition-colors">✕</button>
                        </div>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={scannerOpen} onClose={()=>setScannerOpen(false)} title={t('barcode.scanTitle')}>
        <BarcodeScanner onResult={handleScanResult} />
      </Modal>
    </div>
  );
}
