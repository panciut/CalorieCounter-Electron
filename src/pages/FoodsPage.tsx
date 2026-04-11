import { useState, useEffect, useMemo } from 'react';
import { useT } from '../i18n/useT';
import { useToast } from '../components/Toast';
import { api } from '../api';
import FoodSearch from '../components/FoodSearch';
import type { SearchItem } from '../components/FoodSearch';
import BarcodeScanner from '../components/BarcodeScanner';
import Modal from '../components/Modal';
import type { Food, BarcodeResult } from '../types';

// ── FormFields must live OUTSIDE FoodsPage so its identity is stable across
// re-renders — otherwise every keystroke unmounts/remounts it and kills focus.

interface FormFieldsProps {
  form: FoodFormState;
  patch: (p: Partial<FoodFormState>) => void;
}

function FormFields({ form, patch }: FormFieldsProps) {
  const { t } = useT();
  const presetLabels: Record<PresetKey, string> = {
    balanced: 'foods.balanced', highProtein: 'foods.highProtein',
    highCarb: 'foods.highCarb', keto: 'foods.keto',
  };
  return (
    <div className="flex flex-col gap-2">
      <input type="text" value={form.name} onChange={e => patch({ name: e.target.value })} placeholder={t('foods.namePlaceholder')} className={`${INPUT_CLASS} w-full`} />
      <div className="flex gap-1 flex-wrap">
        {(Object.keys(PRESETS) as PresetKey[]).map(key => (
          <button key={key} type="button"
            onClick={() => { const p = PRESETS[key]; patch({ calories: String(p.calories), protein: String(p.protein), carbs: String(p.carbs), fat: String(p.fat), fiber: String(p.fiber) }); }}
            className="text-xs px-2 py-1 rounded border border-border text-text-sec hover:border-accent hover:text-accent transition-colors cursor-pointer"
          >{t(presetLabels[key])}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {([['calories','foods.kcalPlaceholder'],['protein','foods.proteinPlaceholder'],['carbs','foods.carbsPlaceholder'],['fat','foods.fatPlaceholder'],['fiber','foods.fiberPlaceholder'],['piece_grams','foods.piecePlaceholder']] as [string,string][]).map(([field, ph]) => (
          <input key={field} type="number" step="any" value={(form as Record<string, string>)[field]} onChange={e => patch({ [field]: e.target.value })} placeholder={t(ph)} className={`${INPUT_CLASS} w-full`} />
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm text-text-sec cursor-pointer">
        <input type="checkbox" checked={form.is_liquid} onChange={e => patch({ is_liquid: e.target.checked })} />
        {t('foods.liquid')}
      </label>
    </div>
  );
}

const INPUT_CLASS =
  'bg-bg border border-border rounded-lg px-3 py-2 text-text text-sm outline-none focus:border-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

const PRESETS = {
  balanced:    { calories: 180, protein: 15, carbs: 20, fat: 5,  fiber: 2 },
  highProtein: { calories: 150, protein: 25, carbs: 5,  fat: 3,  fiber: 0 },
  highCarb:    { calories: 340, protein: 8,  carbs: 70, fat: 2,  fiber: 3 },
  keto:        { calories: 450, protein: 20, carbs: 3,  fat: 40, fiber: 2 },
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

  useEffect(() => { loadFoods(); }, []);

  async function loadFoods() { setFoods(await api.foods.getAll()); }

  function patchAdd(p: Partial<FoodFormState>) { setAddForm(f=>({...f,...p})); }
  function patchEdit(p: Partial<FoodFormState>) { setEditForm(f=>({...f,...p})); }
  function applyPreset(key: PresetKey, patch: (p: Partial<FoodFormState>)=>void) {
    const p = PRESETS[key]; patch({ calories:String(p.calories), protein:String(p.protein), carbs:String(p.carbs), fat:String(p.fat), fiber:String(p.fiber) });
  }

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

  const searchItems = useMemo<SearchItem[]>(()=>foods.map(f=>({...f,isRecipe:false as const})),[foods]);
  const filteredFoods = useMemo(()=>{
    const q = searchQuery.toLowerCase();
    return q ? foods.filter(f=>f.name.toLowerCase().includes(q)) : foods;
  },[foods, searchQuery]);

  return (
    <div className="flex gap-6 p-6 h-full overflow-hidden">
      {/* Left panel */}
      <div className="w-72 shrink-0 flex flex-col gap-4 overflow-y-auto">
        {/* Barcode */}
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-text">{t('barcode.addByBarcode')}</h3>
          <div className="flex gap-2">
            <input type="text" value={barcodeInput} onChange={e=>{setBarcodeInput(e.target.value);setBarcodeStatus(null);}} onKeyDown={e=>e.key==='Enter'&&handleBarcodeLookup()} placeholder={t('barcode.placeholder')} className={`${INPUT_CLASS} flex-1 min-w-0`} />
            <button type="button" onClick={handleBarcodeLookup} className="px-3 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer shrink-0">{t('barcode.lookup')}</button>
            <button type="button" onClick={()=>setScannerOpen(true)} className="px-2 py-2 rounded-lg border border-border text-text-sec hover:border-accent cursor-pointer shrink-0">📷</button>
          </div>
          {barcodeStatus==='found' && <p className="text-xs text-accent">{t('barcode.found')}</p>}
          {barcodeStatus==='notFound' && <p className="text-xs text-red">{t('barcode.notFound')}</p>}
        </div>

        {/* Add form */}
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
          <div>
            <span className="text-sm font-semibold text-text">{t('foods.addTitle')}</span>
            <span className="text-xs text-text-sec ml-2">{t('foods.valuesPerLabel')}</span>
          </div>
          <FormFields form={addForm} patch={patchAdd} />
          <button type="button" onClick={handleAdd} disabled={!addForm.name.trim()||!addForm.calories} className="w-full py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 cursor-pointer">{t('common.add')}</button>
        </div>

        <button type="button" onClick={handleImport} className="w-full py-2 rounded-lg border border-border text-text-sec text-sm hover:border-accent hover:text-accent transition-colors cursor-pointer">{t('import.foods')}</button>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col gap-4 min-w-0 overflow-hidden">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-text shrink-0">{t('foods.title')}</h2>
          <input type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder={t('foods.searchPlaceholder')} className={`${INPUT_CLASS} flex-1`} />
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
                  <th className="px-3 py-3 text-right">{t('th.protein')}</th>
                  <th className="px-3 py-3 text-right">{t('th.carbs')}</th>
                  <th className="px-3 py-3 text-right">{t('th.fat')}</th>
                  <th className="px-3 py-3 text-right">{t('th.fiber')}</th>
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
                      <td className="px-3 py-2.5 text-right text-text-sec tabular-nums">{food.protein}</td>
                      <td className="px-3 py-2.5 text-right text-text-sec tabular-nums">{food.carbs}</td>
                      <td className="px-3 py-2.5 text-right text-text-sec tabular-nums">{food.fat}</td>
                      <td className="px-3 py-2.5 text-right text-text-sec tabular-nums">{food.fiber}</td>
                      <td className="px-3 py-2.5 text-right text-text-sec tabular-nums">{food.piece_grams!=null?`${food.piece_grams}g`:'—'}</td>
                      <td className="px-2 py-2.5 text-center">{food.is_liquid===1?'💧':''}</td>
                      <td className="px-2 py-2.5">
                        <div className="flex gap-1 justify-end">
                          <button type="button" onClick={()=>startEdit(food)} className="text-text-sec hover:text-text px-1 cursor-pointer">✎</button>
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
