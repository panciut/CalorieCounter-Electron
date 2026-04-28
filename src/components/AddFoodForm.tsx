import { useState } from 'react';
import { useT } from '../i18n/useT';
import { useToast } from './Toast';
import { useSettings } from '../hooks/useSettings';
import { api } from '../api';
import BarcodeScanner from './BarcodeScanner';
import FoodNameSearch from './FoodNameSearch';
import Modal from './Modal';
import type { Food, BarcodeResult, BarcodeSearchResult } from '../types';
import { PRESETS, PresetKey, PRESET_LABELS } from '../lib/foodPresets';

interface FoodFormState {
  name: string; calories: string; protein: string; carbs: string;
  fat: string; fiber: string; piece_grams: string; is_liquid: boolean; is_bulk: boolean; barcode: string;
  opened_days: string; discard_threshold_pct: string; price_per_100g: string; image_url: string;
}

const emptyForm = (): FoodFormState => ({
  name: '', calories: '', protein: '', carbs: '', fat: '', fiber: '',
  piece_grams: '', is_liquid: false, is_bulk: true, barcode: '',
  opened_days: '7', discard_threshold_pct: '5', price_per_100g: '', image_url: '',
});

const barcodeToForm = (r: BarcodeResult, barcode: string): FoodFormState => ({
  name: r.name, calories: String(r.calories), protein: String(r.protein),
  carbs: String(r.carbs), fat: String(r.fat), fiber: String(r.fiber),
  piece_grams: '', is_liquid: r.is_liquid === 1, is_bulk: false, barcode,
  opened_days: '7', discard_threshold_pct: '5', price_per_100g: '', image_url: r.image_url ?? '',
});

const formToData = (f: FoodFormState): Omit<Food, 'id'> => ({
  name: f.name.trim(),
  calories: parseFloat(f.calories) || 0,
  protein: parseFloat(f.protein) || 0,
  carbs: parseFloat(f.carbs) || 0,
  fat: parseFloat(f.fat) || 0,
  fiber: parseFloat(f.fiber) || 0,
  piece_grams: f.is_bulk ? null : (f.piece_grams !== '' ? parseFloat(f.piece_grams) : null),
  is_liquid: f.is_liquid ? 1 : 0,
  is_bulk: f.is_bulk ? 1 : 0,
  barcode: f.barcode.trim() || null,
  opened_days: f.opened_days !== '' ? parseInt(f.opened_days, 10) : null,
  discard_threshold_pct: parseFloat(f.discard_threshold_pct) || 5,
  price_per_100g: f.price_per_100g !== '' ? parseFloat(f.price_per_100g) : null,
  image_url: f.image_url.trim() || null,
});

interface AddFoodFormProps {
  existingFoods?: Food[];
  onAdded?: (food: Food) => void;
  onFoodFound?: (food: Food) => void;
  onImport?: () => void;
  defaultOpen?: boolean;
}

export default function AddFoodForm({
  existingFoods = [],
  onAdded,
  onFoodFound,
  onImport,
  defaultOpen = false,
}: AddFoodFormProps) {
  const { t } = useT();
  const { showToast } = useToast();
  const { settings } = useSettings();

  const [formOpen, setFormOpen] = useState(defaultOpen);
  const [addForm, setAddForm] = useState<FoodFormState>(emptyForm());
  const [addPacks, setAddPacks] = useState<{ grams: string }[]>([{ grams: '' }]);
  const [packFromBarcode, setPackFromBarcode] = useState<number | null>(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeStatus, setBarcodeStatus] = useState<'found' | 'notFound' | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerTab, setScannerTab] = useState<'scan' | 'search'>('scan');

  function patch(p: Partial<FoodFormState>) { setAddForm(f => ({ ...f, ...p })); }
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

  async function handleBarcodeLookup() {
    if (!barcodeInput.trim()) return;
    setBarcodeStatus(null);
    setPackFromBarcode(null);
    const r = await api.barcode.lookup(barcodeInput.trim());
    if (r) applyBarcodeResult(r, barcodeInput.trim());
    else setBarcodeStatus('notFound');
  }

  async function handleScanResult(barcode: string) {
    setScannerOpen(false);
    setScannerTab('scan');
    setBarcodeInput(barcode);
    setBarcodeStatus(null);
    setPackFromBarcode(null);
    if (existingFoods.length > 0 && onFoodFound) {
      const existing = existingFoods.find(f => f.barcode && f.barcode === barcode);
      if (existing) { onFoodFound(existing); return; }
    }
    const r = await api.barcode.lookup(barcode);
    if (r) applyBarcodeResult(r, barcode);
    else setBarcodeStatus('notFound');
  }

  function handleNameSearchResult(r: BarcodeSearchResult) {
    setScannerOpen(false);
    setScannerTab('scan');
    applyBarcodeResult(r, r.barcode ?? '');
  }

  function applyPreset(key: PresetKey) {
    const kcal = parseFloat(addForm.calories);
    if (!kcal) { showToast(t('foods.presetNeedsKcal'), 'error'); return; }
    const p = PRESETS[key];
    patch({
      fat:     String(Math.round(kcal * p.fatPct     / 9 * 10) / 10),
      carbs:   String(Math.round(kcal * p.carbsPct   / 4 * 10) / 10),
      fiber:   String(Math.round(kcal * p.fiberPer100 / 100 * 10) / 10),
      protein: String(Math.round(kcal * p.proteinPct / 4 * 10) / 10),
    });
  }

  async function handleAdd() {
    if (!addForm.name.trim() || !addForm.calories) return;
    const { id } = await api.foods.add(formToData(addForm));
    for (const p of addPacks) {
      const g = parseFloat(p.grams);
      if (g > 0) await api.foods.addPackage({ food_id: id, grams: g });
    }
    showToast(t('common.saved'));
    if (onAdded) {
      const allFoods = await api.foods.getAll();
      const saved = allFoods.find(f => f.id === id);
      if (saved) onAdded(saved);
    }
    setAddForm(emptyForm());
    setAddPacks([{ grams: '' }]);
    setPackFromBarcode(null);
    setBarcodeInput('');
    setBarcodeStatus(null);
    setFormOpen(false);
  }

  const macroFields: { key: keyof FoodFormState; label: string }[] = [
    { key: 'calories', label: 'kcal'          },
    { key: 'fat',      label: t('th.fat')     },
    { key: 'carbs',    label: t('th.carbs')   },
    { key: 'fiber',    label: t('th.fiber')   },
    { key: 'protein',  label: t('th.protein') },
  ];

  const inputCls = "bg-bg border border-border/60 rounded-xl px-4 py-2.5 text-base text-text outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all w-full";
  const numInputCls = "w-full bg-bg border border-border/60 rounded-xl px-3 py-2.5 text-sm text-text outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 tabular-nums transition-all";
  const cardCls = "bg-card border border-border/40 shadow-sm rounded-3xl p-5 flex flex-col gap-4";

  return (
    <>
      <section className={`${cardCls} shrink-0`}>
        <button onClick={() => setFormOpen(v => !v)} className="w-full flex items-center justify-between group">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold transition-colors ${formOpen ? 'bg-text-sec' : 'bg-accent group-hover:bg-accent/90'}`}>
              {formOpen ? '−' : '+'}
            </div>
            <h2 className="text-base font-bold text-text group-hover:text-accent transition-colors">{t('foods.addTitle')}</h2>
          </div>
          <span className="text-xs font-medium text-text-sec/50 bg-bg px-3 py-1 rounded-full">{t('foods.valuesPerLabel')}</span>
        </button>

        {formOpen && (
          <div className="flex flex-col gap-5 pt-4 border-t border-border/20 animate-slide-down">

            {/* Barcode */}
            <div className="flex flex-col sm:flex-row items-center gap-3 bg-bg/50 p-3 rounded-2xl border border-border/30 w-full">
              <span className="text-xs font-bold text-text-sec/70 uppercase tracking-wider whitespace-nowrap">{t('barcode.addByBarcode')}</span>
              <div className="flex flex-col sm:flex-row items-center gap-2 flex-1 w-full">
                <input
                  type="text" value={barcodeInput}
                  onChange={e => { setBarcodeInput(e.target.value); setBarcodeStatus(null); }}
                  onKeyDown={e => e.key === 'Enter' && handleBarcodeLookup()}
                  placeholder={t('barcode.placeholder')}
                  className="bg-card border border-border/60 rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all flex-1 w-full"
                />
                <div className="flex gap-2 w-full sm:w-auto">
                  <button type="button" onClick={handleBarcodeLookup} className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-bold shadow-sm hover:opacity-90 transition-opacity whitespace-nowrap">
                    {t('barcode.lookup')}
                  </button>
                  <button type="button" onClick={() => setScannerOpen(true)} className="p-2.5 rounded-xl border border-border/60 bg-card text-text-sec hover:text-accent hover:border-accent/40 transition-colors shrink-0" title="Scan Barcode">
                    📷
                  </button>
                </div>
              </div>
              {barcodeStatus === 'found' && <span className="text-xs font-bold text-accent py-2 px-3 bg-accent/10 rounded-lg">{t('barcode.found')} ✓</span>}
              {barcodeStatus === 'notFound' && <span className="text-xs font-bold text-red py-2 px-3 bg-red/10 rounded-lg">{t('barcode.notFound')} ✕</span>}
            </div>

            {/* Name */}
            <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
              {addForm.image_url && (
                <div className="shrink-0 animate-fade-in pt-1">
                  <img src={addForm.image_url} alt="Food" className="w-16 h-16 md:w-20 md:h-20 object-cover rounded-2xl border-2 border-border/40 shadow-sm bg-white" />
                </div>
              )}
              <div className="flex-1 flex flex-col gap-1.5 w-full">
                <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-2">
                  <label className="text-xs font-bold text-text-sec/70 uppercase tracking-wider">{t('common.name')}</label>
                  <div className="flex gap-1.5 overflow-x-auto hide-scrollbar w-full md:w-auto pb-1 md:pb-0">
                    {(Object.keys(PRESETS) as PresetKey[]).map(key => (
                      <button key={key} type="button" onClick={() => applyPreset(key)} className="text-[10px] px-3 py-1 rounded-full border border-border/60 bg-bg text-text-sec hover:border-accent hover:text-accent font-medium transition-colors whitespace-nowrap">
                        {t(PRESET_LABELS[key])}
                      </button>
                    ))}
                  </div>
                </div>
                <input type="text" value={addForm.name} onChange={e => patch({ name: e.target.value })} onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder={t('foods.namePlaceholder')} className={`${inputCls} font-bold text-lg`} />
                {existingFoods.some(f => f.name.toLowerCase() === addForm.name.trim().toLowerCase() && addForm.name.trim() !== '') && (
                  <span className="text-xs font-medium text-yellow-600 bg-yellow-500/10 px-2 py-1 rounded-md inline-block mt-1">⚠ A food with this name already exists</span>
                )}
              </div>
            </div>

            {/* Macros */}
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3 md:gap-4 w-full">
              {macroFields.map(({ key, label }) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <label className="text-[10px] md:text-xs font-bold text-text-sec/70 uppercase tracking-wider text-center">{label}</label>
                  <input type="text" inputMode="decimal" value={(addForm as unknown as Record<string, string>)[key]} onChange={e => patch({ [key]: e.target.value })} onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder="0" className={`${numInputCls} text-center font-bold`} />
                </div>
              ))}
            </div>

            {/* Flags + Packs */}
            <div className="flex flex-col md:flex-row gap-6 pt-4 border-t border-border/20 w-full">
              <div className="flex flex-wrap gap-4 md:flex-col shrink-0">
                <label className="flex items-center gap-2 text-sm font-medium text-text-sec cursor-pointer hover:text-text transition-colors">
                  <input type="checkbox" checked={addForm.is_liquid} onChange={e => patch({ is_liquid: e.target.checked })} className="w-5 h-5 accent-accent rounded" />
                  {t('foods.liquid')} 💧
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-text-sec cursor-pointer hover:text-text transition-colors" title={t('foods.bulkHelp')}>
                  <input type="checkbox" checked={addForm.is_bulk} onChange={e => patch({ is_bulk: e.target.checked, piece_grams: e.target.checked ? '' : addForm.piece_grams })} className="w-5 h-5 accent-accent rounded" />
                  {t('foods.bulk')} ⚖️
                </label>
              </div>

              <div className="flex-1 flex flex-col gap-3 w-full">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-text-sec/70 uppercase tracking-wider">{t('foods.packsSection')}</span>
                  {packFromBarcode != null && <span className="text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">{t('foods.packFromBarcode').replace('{g}', String(packFromBarcode))}</span>}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {addPacks.map((p, i) => (
                    <div key={i} className="flex items-center gap-1 relative group">
                      <input type="text" inputMode="decimal" value={p.grams} onChange={e => updateAddPackGrams(i, e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (i === addPacks.length - 1 && parseFloat(p.grams) > 0) addBlankAddPack(); } }} placeholder="0" className={`${numInputCls} !py-2 !w-20 pr-6`} />
                      <span className="absolute right-3 text-text-sec/50 text-sm pointer-events-none">g</span>
                      {addPacks.length > 1 && (
                        <button type="button" onClick={() => removeAddPack(i)} className="absolute -top-2 -right-2 bg-card border border-border text-red rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-sm">✕</button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={addBlankAddPack} className="px-4 py-2 rounded-xl border border-dashed border-border/60 text-text-sec text-sm font-medium hover:border-accent hover:text-accent transition-colors bg-bg/50 whitespace-nowrap">
                    + {t('foods.addPack')}
                  </button>
                </div>

                {!addForm.is_bulk && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-1 bg-bg p-3 rounded-xl border border-border/40">
                    <label className="text-xs font-medium text-text-sec shrink-0">{t('foods.pieceInPack')}:</label>
                    <div className="relative w-full sm:w-auto">
                      <input type="text" inputMode="decimal" value={addForm.piece_grams} onChange={e => patch({ piece_grams: e.target.value })} onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder="0" className={`${numInputCls} !py-1.5 w-full sm:w-24 pr-6`} />
                      <span className="absolute right-3 top-1.5 text-text-sec/50 text-sm pointer-events-none">g</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Advanced + Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-4 border-t border-border/20 w-full">
              <div className="flex items-center gap-3 flex-wrap w-full md:w-auto">
                <div className="flex flex-col gap-1 flex-1 sm:flex-none">
                  <label className="text-[10px] font-bold text-text-sec/60 uppercase">{t('foods.openedDays')}</label>
                  <input type="number" inputMode="numeric" min={1} value={addForm.opened_days} onChange={e => patch({ opened_days: e.target.value })} className={`${numInputCls} !py-1.5 w-full sm:w-20`} placeholder="days" />
                </div>
                <div className="flex flex-col gap-1 flex-1 sm:flex-none">
                  <label className="text-[10px] font-bold text-text-sec/60 uppercase">{t('foods.discardThreshold')} (%)</label>
                  <input type="number" inputMode="numeric" min={1} max={100} value={addForm.discard_threshold_pct} onChange={e => patch({ discard_threshold_pct: e.target.value })} className={`${numInputCls} !py-1.5 w-full sm:w-20`} placeholder="5" />
                </div>
                <div className="flex flex-col gap-1 flex-1 sm:flex-none">
                  <label className="text-[10px] font-bold text-text-sec/60 uppercase">{t('foods.pricePer100g').replace('{cur}', settings.currency_symbol ?? '€')}</label>
                  <input type="number" inputMode="decimal" min={0} value={addForm.price_per_100g} onChange={e => patch({ price_per_100g: e.target.value })} className={`${numInputCls} !py-1.5 w-full sm:w-24`} placeholder="0.00" />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                {onImport && (
                  <button type="button" onClick={onImport} className="w-full sm:w-auto px-5 py-3 rounded-xl border border-border/60 bg-card text-text-sec text-sm font-bold hover:bg-border/30 transition-colors text-center">
                    {t('import.foods')}
                  </button>
                )}
                <button type="button" onClick={handleAdd} disabled={!addForm.name.trim() || !addForm.calories} className="w-full md:w-auto px-8 py-3 rounded-xl bg-accent text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm text-center">
                  {t('common.add')}
                </button>
              </div>
            </div>

          </div>
        )}
      </section>

      <Modal isOpen={scannerOpen} onClose={() => { setScannerOpen(false); setScannerTab('scan'); }} title={t('barcode.scanTitle')}>
        <div className="flex flex-col sm:flex-row p-1 bg-bg/50 border border-border/40 rounded-3xl sm:rounded-full mb-4 shadow-sm gap-1 sm:gap-0">
          <button type="button" onClick={() => setScannerTab('scan')} className={`flex-1 py-3 sm:py-2 text-sm font-bold rounded-full transition-all duration-300 ${scannerTab === 'scan' ? 'bg-card text-text shadow-sm border border-border/40' : 'text-text-sec hover:text-text'}`}>
            📷 Scan
          </button>
          <button type="button" onClick={() => setScannerTab('search')} className={`flex-1 py-3 sm:py-2 text-sm font-bold rounded-full transition-all duration-300 ${scannerTab === 'search' ? 'bg-card text-text shadow-sm border border-border/40' : 'text-text-sec hover:text-text'}`}>
            🔍 Search by name
          </button>
        </div>
        <div className="bg-bg p-4 rounded-3xl border border-border/40 shadow-inner">
          {scannerTab === 'scan' && <BarcodeScanner onResult={handleScanResult} />}
          {scannerTab === 'search' && <FoodNameSearch onResult={handleNameSearchResult} />}
        </div>
      </Modal>
    </>
  );
}
