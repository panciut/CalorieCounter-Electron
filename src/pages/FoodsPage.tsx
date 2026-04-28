import { useState, useEffect, useMemo, useRef } from 'react';
import { useT } from '../i18n/useT';
import { useToast } from '../components/Toast';
import { useSettings } from '../hooks/useSettings';
import { api } from '../api';
import ConfirmDialog from '../components/ConfirmDialog';
import FoodSearch from '../components/FoodSearch';
import AddFoodForm from '../components/AddFoodForm';
import type { SearchItem } from '../components/FoodSearch';
import type { Food, FoodPackage } from '../types';

interface FoodFormState {
  name: string; calories: string; protein: string; carbs: string;
  fat: string; fiber: string; piece_grams: string; is_liquid: boolean; is_bulk: boolean; barcode: string;
  opened_days: string; discard_threshold_pct: string; price_per_100g: string; image_url: string;
}

const emptyForm = (): FoodFormState => ({ name:'', calories:'', protein:'', carbs:'', fat:'', fiber:'', piece_grams:'', is_liquid: false, is_bulk: true, barcode: '', opened_days: '7', discard_threshold_pct: '5', price_per_100g: '', image_url: '' });
const foodToForm = (f: Food): FoodFormState => ({ name:f.name, calories:String(f.calories), protein:String(f.protein), carbs:String(f.carbs), fat:String(f.fat), fiber:String(f.fiber), piece_grams:f.piece_grams!=null?String(f.piece_grams):'', is_liquid:f.is_liquid===1, is_bulk: f.is_bulk===1, barcode: f.barcode ?? '', opened_days: f.opened_days != null ? String(f.opened_days) : '', discard_threshold_pct: f.discard_threshold_pct != null ? String(f.discard_threshold_pct) : '5', price_per_100g: f.price_per_100g != null ? String(f.price_per_100g) : '', image_url: f.image_url ?? '' });
const formToData = (f: FoodFormState): Omit<Food,'id'> => ({ name:f.name.trim(), calories:parseFloat(f.calories)||0, protein:parseFloat(f.protein)||0, carbs:parseFloat(f.carbs)||0, fat:parseFloat(f.fat)||0, fiber:parseFloat(f.fiber)||0, piece_grams: f.is_bulk ? null : (f.piece_grams!==''?parseFloat(f.piece_grams):null), is_liquid:f.is_liquid?1:0, is_bulk: f.is_bulk?1:0, barcode: f.barcode.trim() || null, opened_days: f.opened_days !== '' ? parseInt(f.opened_days, 10) : null, discard_threshold_pct: parseFloat(f.discard_threshold_pct) || 5, price_per_100g: f.price_per_100g !== '' ? parseFloat(f.price_per_100g) : null, image_url: f.image_url.trim() || null });

// ── FormFields for table edit row ─────────────────────────────────────────────

interface FormFieldsProps { form: FoodFormState; patch: (p: Partial<FoodFormState>) => void; }

function FormFields({ form, patch }: FormFieldsProps) {
  const { t } = useT();
  const compactInputCls = "w-full bg-bg border border-border/60 rounded-lg px-2 py-1.5 text-sm text-text outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all";

  const macros: { key: keyof FoodFormState; label: string }[] = [
    { key: 'calories', label: 'kcal' },
    { key: 'fat',      label: t('th.fat') },
    { key: 'carbs',    label: t('th.carbs') },
    { key: 'fiber',    label: t('th.fiber') },
    { key: 'protein',  label: t('th.protein') },
    { key: 'piece_grams', label: t('foods.piecePlaceholder') },
  ];
  return (
    <div className="flex flex-col gap-3 p-2">
      <div className="flex gap-3 items-center">
        {form.image_url && (
          <img src={form.image_url} alt="Food" className="w-12 h-12 object-cover rounded-xl border border-border/40 shadow-sm shrink-0" />
        )}
        <input type="text" value={form.name} onChange={e => patch({ name: e.target.value })} placeholder={t('foods.namePlaceholder')} className={`${compactInputCls} font-medium text-base`} />
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {macros.map(({ key, label }) => (
          <div key={key} className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-text-sec/60 font-semibold">{label}</label>
            <input type="text" inputMode="decimal" value={(form as unknown as Record<string,string>)[key]} onChange={e => patch({ [key]: e.target.value })} placeholder="0" className={`${compactInputCls} tabular-nums text-center`} />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-6 mt-1 flex-wrap">
        <label className="flex items-center gap-2 text-sm font-medium text-text-sec cursor-pointer hover:text-text transition-colors">
          <input type="checkbox" checked={form.is_liquid} onChange={e => patch({ is_liquid: e.target.checked })} className="w-4 h-4 accent-accent rounded" />
          {t('foods.liquid')} 💧
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-text-sec cursor-pointer hover:text-text transition-colors" title={t('foods.bulkHelp')}>
          <input type="checkbox" checked={form.is_bulk} onChange={e => patch({ is_bulk: e.target.checked, piece_grams: e.target.checked ? '' : form.piece_grams })} className="w-4 h-4 accent-accent rounded" />
          {t('foods.bulk')} ⚖️
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
  const [editId, setEditId] = useState<number|null>(null);
  const [editForm, setEditForm] = useState<FoodFormState>(emptyForm());
  const [newPackGrams, setNewPackGrams] = useState('');
  const [newPackPrice, setNewPackPrice] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
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

  function patchEdit(p: Partial<FoodFormState>) { setEditForm(f=>({...f,...p})); }

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
      showToast(`${t('import.success').replace('{n}', String(imported)).replace('{s}', String(skipped))}`, 'success');
      loadFoods();
    } catch { showToast(t('import.error'), 'error'); }
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

  const inputCls = "bg-bg border border-border/60 rounded-xl px-4 py-2.5 text-base text-text outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all w-full";
  const numInputCls = "w-full bg-bg border border-border/60 rounded-xl px-3 py-2.5 text-sm text-text outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 tabular-nums transition-all";
  const cardCls = "bg-card border border-border/40 shadow-sm rounded-3xl p-5 flex flex-col gap-4";

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <header className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 md:px-6 py-3 border-b border-border/20 bg-card/40 backdrop-blur-sm">
        <div>
          <span className="text-[10px] uppercase tracking-widest font-semibold text-text-sec/60">
            Database
          </span>
          <h1 className="text-xl font-bold text-text">My Foods</h1>
        </div>

        <div className="flex p-1 bg-bg/50 border border-border/40 rounded-full shrink-0 shadow-sm overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setTab('foods')}
            className={`flex-1 md:flex-none px-6 py-2 text-sm font-bold rounded-full transition-all duration-300 ${tab === 'foods' ? 'bg-card text-text shadow-sm border border-border/40' : 'text-text-sec hover:text-text'}`}
          >{t('foods.tabFoods')}</button>
          <button
            onClick={() => setTab('packs')}
            className={`flex-1 md:flex-none px-6 py-2 text-sm font-bold rounded-full transition-all duration-300 ${tab === 'packs' ? 'bg-card text-text shadow-sm border border-border/40' : 'text-text-sec hover:text-text'}`}
          >{t('foods.tabPacks')}</button>
        </div>
      </header>

      {/* ── BODY ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex overflow-hidden">

        {/* CONTENT */}
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col p-4 md:p-5 gap-5">

      {/* ── FOODS TAB: AddFoodForm + SEARCH & TABLE ───────────────── */}
      {tab === 'foods' && (
        <>
          {/* AddFoodForm above table */}
          <div className="shrink-0">
            <AddFoodForm
              existingFoods={foods}
              onAdded={loadFoods}
              onImport={handleImport}
            />
          </div>

          <section className={`${cardCls} flex-1 min-h-0 pt-4 flex flex-col`}>
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-2 shrink-0">
            <div className="relative w-full">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-sec/50">🔍</span>
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t('foods.searchPlaceholder')} className={`${inputCls} !pl-10 !py-2.5 shadow-sm`} />
            </div>
            <button type="button" onClick={() => setDetailMode(v => !v)} className={`w-full sm:w-auto px-5 py-2.5 rounded-xl border text-sm font-bold transition-colors whitespace-nowrap ${detailMode ? 'border-accent bg-accent/10 text-accent' : 'border-border/60 bg-bg text-text-sec hover:bg-border/40'}`}>
              {t('foods.detailMode')}
            </button>
          </div>

          {filteredFoods.length === 0 ? (
            <div className="flex-1 flex items-center justify-center border border-dashed border-border/60 rounded-2xl bg-bg/30 min-h-[150px]">
               <p className="text-text-sec/60 text-sm font-medium">{t('foods.noFoods')}</p>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto rounded-2xl border border-border/40 bg-bg hide-scrollbar">
              <table className="w-full text-sm min-w-[800px] text-left border-collapse">
                <thead className="sticky top-0 bg-card/95 backdrop-blur-sm z-10 shadow-sm">
                  <tr>
                    <th className="px-3 py-3 w-10 border-b border-border/40"></th>
                    <th className="px-3 py-3 w-14 border-b border-border/40"></th>
                    <th className="px-4 py-3 font-bold text-text-sec uppercase tracking-wider text-xs border-b border-border/40">{t('th.food')}</th>
                    <th className="px-3 py-3 text-right font-bold text-text-sec uppercase tracking-wider text-xs border-b border-border/40">{t('th.kcal')}</th>
                    <th className="px-3 py-3 text-right font-bold text-text-sec uppercase tracking-wider text-xs border-b border-border/40">{t('th.fat')}</th>
                    <th className="px-3 py-3 text-right font-bold text-text-sec uppercase tracking-wider text-xs border-b border-border/40">{t('th.carbs')}</th>
                    <th className="px-3 py-3 text-right font-bold text-text-sec uppercase tracking-wider text-xs border-b border-border/40">{t('th.fiber')}</th>
                    <th className="px-3 py-3 text-right font-bold text-text-sec uppercase tracking-wider text-xs border-b border-border/40">{t('th.protein')}</th>
                    <th className="px-3 py-3 text-right font-bold text-text-sec uppercase tracking-wider text-xs border-b border-border/40">{t('th.piece')}</th>
                    <th className="px-2 py-3 text-center font-bold text-text-sec uppercase tracking-wider text-xs border-b border-border/40">{t('th.liquid')}</th>
                    {detailMode && <th className="px-3 py-3 text-left font-bold text-text-sec uppercase tracking-wider text-xs border-b border-border/40">{t('th.barcode')}</th>}
                    {detailMode && <th className="px-3 py-3 text-right font-bold text-text-sec uppercase tracking-wider text-xs border-b border-border/40">{t('foods.openedDays')}</th>}
                    {detailMode && <th className="px-3 py-3 text-right font-bold text-text-sec uppercase tracking-wider text-xs border-b border-border/40">{t('foods.discardThreshold')}</th>}
                    {detailMode && <th className="px-3 py-3 text-right font-bold text-text-sec uppercase tracking-wider text-xs border-b border-border/40">{t('foods.pricePer100g').replace('{cur}', settings.currency_symbol ?? '€')}</th>}
                    <th className="px-3 py-3 w-16 border-b border-border/40"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {filteredFoods.map(food => (
                    editId === food.id ? (
                      /* EDIT ROW */
                      <tr key={food.id} className="bg-card shadow-sm relative z-0">
                        <td className="px-3 py-4 align-top pt-5 text-center">
                          <button type="button" onClick={() => handleToggleFavorite(food.id)} className="text-lg hover:scale-110 transition-transform">{food.favorite === 1 ? '⭐' : '☆'}</button>
                        </td>
                        <td colSpan={detailMode ? 13 : 9} className="px-3 py-3">
                          <FormFields form={editForm} patch={patchEdit} />
                          {detailMode && (
                            <div className="flex flex-wrap gap-3 mt-4 p-2 bg-bg rounded-xl border border-border/40">
                              {[
                                { label: t('th.barcode'), key: 'barcode', type: 'text', placeholder: 'e.g. 8001234567890', width: 'w-48' },
                                { label: t('foods.openedDays'), key: 'opened_days', type: 'number', placeholder: 'days', width: 'w-24' },
                                { label: t('foods.discardThreshold'), key: 'discard_threshold_pct', type: 'number', placeholder: '%', width: 'w-24' },
                                { label: t('foods.pricePer100g').replace('{cur}', settings.currency_symbol ?? '€'), key: 'price_per_100g', type: 'number', placeholder: '0.00', width: 'w-24' }
                              ].map(({ label, key, type, placeholder, width }) => (
                                <div key={key} className="flex flex-col gap-1">
                                  <label className="text-[10px] font-bold text-text-sec/60 uppercase">{label}</label>
                                  <input type={type} value={(editForm as unknown as Record<string,string>)[key]} onChange={e => patchEdit({ [key]: e.target.value })} placeholder={placeholder} className={`bg-card border border-border/60 rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent ${width} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`} />
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="mt-4 p-3 bg-bg rounded-xl border border-border/40">
                            <h4 className="text-[10px] font-bold text-text-sec/60 uppercase mb-2">{t('foods.packs')}</h4>
                            <div className="flex flex-col gap-2 w-full">
                              {(food.packages ?? []).map(pkg => (
                                <EditablePackRow key={pkg.id} pkg={pkg} currency={settings.currency_symbol ?? '€'} onSaved={loadFoods} onDelete={() => setDeletePackId(pkg.id)} showError={(msg) => showToast(msg, 'error')} tLocked={t('foods.packInUse')} />
                              ))}
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
                                <input type="text" inputMode="decimal" value={newPackGrams} onChange={e => setNewPackGrams(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddPack()} placeholder="+ g" className="w-full sm:w-20 bg-card border border-border/60 rounded-lg px-2 py-1.5 text-sm sm:text-center focus:border-accent outline-none" />
                                <input type="text" inputMode="decimal" value={newPackPrice} onChange={e => setNewPackPrice(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddPack()} placeholder={`${settings.currency_symbol ?? '€'} opt.`} className="w-full sm:w-24 bg-card border border-border/60 rounded-lg px-2 py-1.5 text-sm focus:border-accent outline-none" />
                                <button type="button" onClick={handleAddPack} className="w-full sm:w-auto text-xs px-4 py-2 rounded-lg border border-border/60 bg-bg font-medium text-text-sec hover:text-accent hover:border-accent transition-colors whitespace-nowrap">
                                  + {t('foods.addPack')}
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4 align-top pt-5">
                          <div className="flex flex-col gap-2">
                            <button type="button" onClick={() => handleSaveEdit(food)} className="text-xs font-bold px-3 py-2 rounded-lg bg-accent text-white hover:opacity-90 transition-opacity">Save</button>
                            <button type="button" onClick={cancelEdit} className="text-xs font-bold px-3 py-2 rounded-lg border border-border/60 bg-bg text-text-sec hover:bg-border/40 transition-colors">Cancel</button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      /* VIEW ROW */
                      <tr key={food.id} className="group hover:bg-card/50 transition-colors">
                        <td className="px-3 py-3 text-center">
                          <button type="button" onClick={() => handleToggleFavorite(food.id)} className="text-base hover:scale-110 transition-transform">{food.favorite === 1 ? '⭐' : '☆'}</button>
                        </td>
                        <td className="px-2 py-2">
                          {food.image_url ? (
                            <img src={food.image_url} alt="" className="h-10 w-10 rounded-xl object-cover border border-border/40 shadow-sm bg-white min-w-[2.5rem]" />
                          ) : (
                            <div className="h-10 w-10 rounded-xl bg-bg border border-border/30 flex items-center justify-center text-text-sec/30 text-xs min-w-[2.5rem]">🍽️</div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold text-text truncate max-w-[200px]">{food.name}</td>
                        <td className="px-3 py-3 text-right font-bold text-text tabular-nums">{food.calories}</td>
                        <td className="px-3 py-3 text-right text-text-sec/80 font-medium tabular-nums">{food.fat}</td>
                        <td className="px-3 py-3 text-right text-text-sec/80 font-medium tabular-nums">{food.carbs}</td>
                        <td className="px-3 py-3 text-right text-text-sec/80 font-medium tabular-nums">{food.fiber}</td>
                        <td className="px-3 py-3 text-right text-text-sec/80 font-medium tabular-nums">{food.protein}</td>
                        <td className="px-3 py-3 text-right text-text-sec/60 tabular-nums">{food.piece_grams != null ? `${food.piece_grams}g` : '—'}</td>
                        <td className="px-2 py-3 text-center text-lg">{food.is_liquid === 1 ? '💧' : ''}</td>
                        {detailMode && <td className="px-3 py-3 text-text-sec/50 text-xs tabular-nums">{food.barcode ?? '—'}</td>}
                        {detailMode && <td className="px-3 py-3 text-right text-text-sec/50 text-xs tabular-nums">{food.opened_days != null ? `${food.opened_days}d` : '—'}</td>}
                        {detailMode && <td className="px-3 py-3 text-right text-text-sec/50 text-xs tabular-nums">{food.discard_threshold_pct != null ? `${food.discard_threshold_pct}%` : '—'}</td>}
                        {detailMode && <td className="px-3 py-3 text-right text-text-sec/50 text-xs tabular-nums">{food.price_per_100g != null ? `${settings.currency_symbol ?? '€'}${food.price_per_100g}` : '—'}</td>}
                        <td className="px-3 py-3">
                          <div className="flex gap-2 justify-end opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                            <button type="button" onClick={() => startEdit(food)} className="p-1.5 bg-card border border-border/60 rounded-lg text-text-sec hover:text-accent transition-colors" title="Edit">✎</button>
                            <button type="button" onClick={() => setDeleteId(food.id)} className="p-1.5 bg-card border border-border/60 rounded-lg text-text-sec hover:text-red transition-colors" title="Delete">✕</button>
                          </div>
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        </>
      )}

      {/* ── PACKS TAB ──────────────────────────────────────────────────────── */}
      {tab === 'packs' && (
        <section className={`${cardCls} flex-1 min-h-0 flex flex-col`}>

          <div className="bg-bg/50 p-4 rounded-2xl border border-border/40 shrink-0">
            <h2 className="text-xs font-bold text-text-sec/70 uppercase tracking-wider mb-3">{t('foods.addPackToFood')}</h2>
            <div className="flex flex-col md:flex-row items-center gap-3 w-full">
              <div className="w-full md:flex-1">
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
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto bg-card p-2 rounded-xl border border-border/60">
                  {packFood.piece_grams && (
                    <div className="flex rounded-lg bg-bg border border-border/40 overflow-hidden text-sm w-full sm:w-auto">
                      <button type="button" onClick={() => { setPackUnit('g'); setPackGramsInput(''); }} className={`flex-1 sm:flex-none px-3 py-1.5 font-bold transition-colors ${packUnit === 'g' ? 'bg-accent/15 text-accent' : 'text-text-sec hover:bg-border/30'}`}>g</button>
                      <button type="button" onClick={() => { setPackUnit('pcs'); setPackGramsInput(''); packGramsRef.current?.focus(); }} className={`flex-1 sm:flex-none px-3 py-1.5 font-bold transition-colors ${packUnit === 'pcs' ? 'bg-accent/15 text-accent' : 'text-text-sec hover:bg-border/30'}`}>pcs</button>
                    </div>
                  )}
                  <div className="relative w-full sm:w-auto flex-1">
                     <input ref={packGramsRef} type="text" inputMode="decimal" value={packGramsInput} onChange={e => setPackGramsInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddPackToFood()} placeholder={packUnit === 'pcs' ? 'pieces' : 'grams'} className={`${numInputCls} !py-1.5 w-full sm:w-24`} />
                  </div>
                  {packUnit === 'pcs' && packFood.piece_grams && packGramsInput && parseFloat(packGramsInput) > 0 && (
                    <span className="text-xs font-bold text-text-sec/50 whitespace-nowrap hidden sm:block">= {Math.round(parseFloat(packGramsInput) * packFood.piece_grams)}g</span>
                  )}
                  <button type="button" onClick={handleAddPackToFood} disabled={!parseFloat(packGramsInput)} className="w-full sm:w-auto px-5 py-2 rounded-lg bg-accent text-white text-sm font-bold shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity sm:ml-auto">
                    {t('common.add')}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="relative w-full mt-2 shrink-0">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-sec/50">🔍</span>
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search packs by food name..." className={`${inputCls} !pl-10 !py-2.5 shadow-sm`} />
          </div>

          {packRows.length === 0 ? (
            <div className="flex-1 flex items-center justify-center border border-dashed border-border/60 rounded-2xl bg-bg/30 min-h-[150px]">
               <p className="text-text-sec/60 text-sm font-medium">{t('foods.noPacks')}</p>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto rounded-2xl border border-border/40 bg-bg hide-scrollbar">
              <table className="w-full text-sm min-w-[400px] text-left border-collapse">
                <thead className="sticky top-0 bg-card/95 backdrop-blur-sm z-10 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 font-bold text-text-sec uppercase tracking-wider text-xs border-b border-border/40">{t('th.food')}</th>
                    <th className="px-4 py-3 text-right font-bold text-text-sec uppercase tracking-wider text-xs border-b border-border/40">{t('foods.packSize')}</th>
                    <th className="px-4 py-3 w-16 border-b border-border/40"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {packRows.map(({ food, pkg }) => (
                    <tr key={pkg.id} className="group hover:bg-card/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-text truncate max-w-[200px]">{food.name}</td>
                      <td className="px-4 py-3 text-right font-bold text-text tabular-nums">{pkg.grams}g</td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" onClick={() => setDeletePackId(pkg.id)} className="p-2 bg-card border border-border/60 rounded-lg text-text-sec hover:text-red transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100" title="Delete pack">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

        </div>{/* end right column */}
      </div>{/* end body flex */}

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

  const compactInputCls = "bg-card border border-border/60 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all text-center";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 group w-full">
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <div className="relative w-full sm:w-auto">
          <input type="text" inputMode="decimal" value={grams} onChange={e => setGrams(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} className={`${compactInputCls} w-full sm:w-20 font-medium`} />
          <span className="absolute right-2 top-1.5 text-xs text-text-sec pointer-events-none">g</span>
        </div>
        <input type="text" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} placeholder={`${currency} opt.`} className={`${compactInputCls} w-full sm:w-24`} />
        <button type="button" onClick={onDelete} className="p-2 sm:p-1.5 text-text-sec hover:text-red hover:bg-red/10 rounded-lg transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 shrink-0" title="Delete pack">✕</button>
      </div>
    </div>
  );
}
