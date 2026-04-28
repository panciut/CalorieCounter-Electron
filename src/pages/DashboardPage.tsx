import { useState, useEffect, useCallback, useRef } from 'react';
import { evalExpr, resolveExpr } from '../lib/evalExpr';
import { useSettings } from '../hooks/useSettings';
import { useT } from '../i18n/useT';
import { useToast } from '../components/Toast';
import { useNavigate } from '../hooks/useNavigate';
import { api } from '../api';
import FoodSearch from '../components/FoodSearch';
import type { SearchItem } from '../components/FoodSearch';
import MealPills from '../components/MealPills';
import DayMacrosCard from '../components/DayMacrosCard';
import EntryTable from '../components/EntryTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import QuickFoodDialog from '../components/QuickFoodDialog';
import { today, fmtDateWithWeekday, addDays } from '../lib/dateUtil';
import { buildDayMarkdown, copyToClipboard } from '../lib/exportText';
import ExerciseSection from '../components/ExerciseSection';
import {
  SUPPLEMENT_TIME_ORDER,
  type LogEntry, type Food, type Recipe, type RecipeIngredient, type Meal,
  type WaterEntry, type SupplementDay, type FrequentFood, type WeightEntry, type DailyEnergy,
} from '../types';
import { useDeductionEvents } from '../hooks/useDeductionEvents';
import DeductionEventModal from '../components/DeductionEventModal';

// ── Swap-days dialog ─────────────────────────────────────────────────────────

interface SwapDaysModalProps {
  isOpen: boolean;
  initialDate: string;
  onClose: () => void;
  onSwapped: (swapped: number) => void;
}

function SwapDaysModal({ isOpen, initialDate, onClose, onSwapped }: SwapDaysModalProps) {
  const { t } = useT();
  const [dateA, setDateA] = useState(initialDate);
  const [dateB, setDateB] = useState(addDays(initialDate, 1));
  const [countA, setCountA] = useState(0);
  const [countB, setCountB] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Reset dates to the current context when the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    setDateA(initialDate);
    setDateB(addDays(initialDate, 1));
  }, [isOpen, initialDate]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    async function fetchCounts() {
      const [a, b] = await Promise.all([
        dateA ? api.log.getDay(dateA) : Promise.resolve([]),
        dateB ? api.log.getDay(dateB) : Promise.resolve([]),
      ]);
      if (cancelled) return;
      setCountA(a.filter(e => e.status === 'planned').length);
      setCountB(b.filter(e => e.status === 'planned').length);
    }
    fetchCounts();
    return () => { cancelled = true; };
  }, [isOpen, dateA, dateB]);

  const sameDate = !!dateA && !!dateB && dateA === dateB;
  const bothEmpty = countA === 0 && countB === 0;
  const canSwap = !!dateA && !!dateB && !sameDate && !bothEmpty;

  const inputCls = "w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent";

  async function handleConfirm() {
    const { swapped } = await api.log.swapDays({ dateA, dateB });
    setConfirmOpen(false);
    onSwapped(swapped);
    onClose();
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={t('swap.title')}>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-sec">{t('swap.dateA')}</label>
              <input type="date" value={dateA} onChange={e=>setDateA(e.target.value)} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-sec">{t('swap.dateB')}</label>
              <input type="date" value={dateB} onChange={e=>setDateB(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="text-xs bg-bg rounded-lg px-3 py-2 text-text-sec text-center">
            {sameDate
              ? <span className="text-yellow">{t('swap.sameDate')}</span>
              : <span><span className="text-text font-medium">{countA}</span> {t('dash.planned')} ↔ <span className="text-text font-medium">{countB}</span> {t('dash.planned')}</span>
            }
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="px-4 py-2 text-sm text-text-sec border border-border rounded-lg cursor-pointer hover:text-text">{t('common.cancel')}</button>
            <button onClick={()=>setConfirmOpen(true)} disabled={!canSwap} className="px-4 py-2 text-sm bg-accent text-white rounded-lg cursor-pointer hover:opacity-90 disabled:opacity-40 font-medium">{t('swap.submit')}</button>
          </div>
        </div>
      </Modal>
      {confirmOpen && (
        <ConfirmDialog
          message={t('swap.confirmMsg')
            .replace('{a}', String(countA))
            .replace('{dateA}', dateA)
            .replace('{b}', String(countB))
            .replace('{dateB}', dateB)}
          confirmLabel={t('swap.submit')}
          cancelLabel={t('common.cancel')}
          onConfirm={handleConfirm}
          onCancel={()=>setConfirmOpen(false)}
        />
      )}
    </>
  );
}

// ── Recipe editor (inline on dashboard) ──────────────────────────────────────

interface RecipeEditState {
  id: number;
  name: string;
  ingredients: (RecipeIngredient & { editGrams: number })[];
}

// ── DashboardPage ─────────────────────────────────────────────────────────────

interface DashboardPageProps {
  initialDate?: string;
  fromWeek?: string;
}

export default function DashboardPage({ initialDate, fromWeek }: DashboardPageProps = {}) {
  const { settings } = useSettings();
  const { t } = useT();
  const { showToast } = useToast();
  const { navigate } = useNavigate();

  const [dateStr, setDateStr]       = useState(initialDate || today());
  const [planMode, setPlanMode]     = useState((initialDate || today()) > today());

  useEffect(() => {
    setPlanMode(dateStr > today());
  }, [dateStr]);

  const [entries, setEntries]       = useState<LogEntry[]>([]);
  const [foods, setFoods]           = useState<Food[]>([]);
  const [recipes, setRecipes]       = useState<Recipe[]>([]);
  const [frequent, setFrequent]     = useState<FrequentFood[]>([]);
  const [favorites, setFavorites]   = useState<Food[]>([]);
  const [waterTotal, setWaterTotal] = useState(0);
  const [waterEntries, setWaterEntries] = useState<WaterEntry[]>([]);
  const [supplements, setSupplements] = useState<SupplementDay[]>([]);
  const [weightKg, setWeightKg]     = useState(0);
  const [note, setNote]             = useState('');

  const [restingKcal, setRestingKcal] = useState('');
  const [activeKcal, setActiveKcal]   = useState('');
  const [extraKcal, setExtraKcal]     = useState('');
  const [steps, setSteps]             = useState('');
  const [restingFromYest, setRestingFromYest] = useState(false);
  const noteSaveTimer = useRef<ReturnType<typeof setTimeout>|null>(null);

  const { current: deductionEvent, next: nextDeduction, push: pushDeduction } = useDeductionEvents();

  const [pantries, setPantries] = useState<import('../types').PantryLocation[]>([]);
  const [logPantryId, setLogPantryId] = useState<number | undefined>(undefined);

  const [selectedFood, setSelectedFood]     = useState<Food|null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeEditState|null>(null);
  const [searchKey, setSearchKey]           = useState(0);
  const [amount, setAmount]                 = useState('');
  const [usePieces, setUsePieces]           = useState(false);
  const [selectedPackId, setSelectedPackId] = useState<number | null>(null);
  const [meal, setMeal]                     = useState<Meal>('AfternoonSnack');

  const [quickFoodOpen, setQuickFoodOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [waterCustomOpen, setWaterCustomOpen] = useState(false);
  const [waterCustomMl, setWaterCustomMl] = useState('');
  const [waterExpanded, setWaterExpanded] = useState(false);

  const [supplementsCollapsed, setSupplementsCollapsed] = useState(true);
  const [exerciseCollapsed, setExerciseCollapsed] = useState(true);
  const [notesCollapsed, setNotesCollapsed] = useState(true);
  const [confirmAllOpen, setConfirmAllOpen] = useState(false);

  const load = useCallback(async () => {
    const [ent, fav, fds, wd, rcs, nd, freq] = await Promise.all([
      api.log.getDay(dateStr),
      api.foods.getFavorites(),
      api.foods.getAll(),
      api.water.getDay(dateStr),
      api.recipes.getAll(),
      api.notes.get(dateStr),
      api.foods.getFrequent(10),
    ]);
    setEntries(ent);
    setFavorites(fav);
    setFoods(fds);
    setWaterTotal(wd.total_ml);
    setWaterEntries(wd.entries);
    setRecipes(rcs);
    setNote(nd.note || '');
    setFrequent(freq);
  }, [dateStr]);

  useEffect(() => {
    api.pantries.getAll().then(ps => {
      setPantries(ps);
      const def = ps.find(p => p.is_default) ?? ps[0];
      if (!def) return;
      try {
        const stored = JSON.parse(localStorage.getItem('dashPantry') || '{}');
        if (stored.date === today() && ps.some(p => p.id === stored.id)) {
          setLogPantryId(stored.id);
        } else {
          setLogPantryId(def.id);
        }
      } catch {
        setLogPantryId(def.id);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    api.supplements.getDay(dateStr).then(setSupplements);
    api.weight.getAll().then((entries: WeightEntry[]) => {
      if (entries.length > 0) setWeightKg(entries[entries.length - 1].weight);
    });
    api.dailyEnergy.get(dateStr).then((rec: DailyEnergy) => {
      if (rec.resting_kcal > 0 || rec.active_kcal > 0 || rec.extra_kcal > 0 || (rec.steps ?? 0) > 0) {
        setRestingKcal(rec.resting_kcal > 0 ? String(rec.resting_kcal) : '');
        setActiveKcal(rec.active_kcal > 0 ? String(rec.active_kcal) : '');
        setExtraKcal(rec.extra_kcal > 0 ? String(rec.extra_kcal) : '');
        setSteps((rec.steps ?? 0) > 0 ? String(rec.steps) : '');
        setRestingFromYest(false);
      } else {
        api.dailyEnergy.getPrevResting(dateStr).then(({ resting_kcal }) => {
          if (resting_kcal > 0) {
            setRestingKcal(String(resting_kcal));
            setRestingFromYest(true);
          } else {
            setRestingKcal('');
            setRestingFromYest(false);
          }
        });
        setActiveKcal('');
        setExtraKcal('');
        setSteps('');
      }
    });
  }, [load, dateStr]);

  const plannedEntries = entries.filter(e => e.status === 'planned');
  const plannedKcalSum = Math.round(plannedEntries.reduce((s, e) => s + e.calories, 0));

  const freqMap = new Map(frequent.map(f=>[f.id,f.use_count]));
  const searchItems: SearchItem[] = [
    ...foods.map(f=>({ ...f, _freq: freqMap.get(f.id)||0, isRecipe: false as const })),
    ...recipes.map(r=>({ ...r, isRecipe: true as const, _freq: 0 })),
  ];

  async function handleSelect(item: SearchItem) {
    if (item.isRecipe) {
      const full = await api.recipes.get((item as Recipe).id);
      setSelectedRecipe({ id: full.id, name: full.name, ingredients: (full.ingredients||[]).map(ing=>({...ing, editGrams: ing.grams})) });
      setSelectedFood(null);
      setAmount('');
    } else {
      const food = item as Food;
      const isBulk = food.is_bulk === 1;
      const hasPieces = !!food.piece_grams;
      const hasPackages = (food.packages?.length ?? 0) > 0;
      const defaultPieces = !isBulk && (hasPieces || hasPackages);
      setSelectedFood(food);
      setSelectedRecipe(null);
      setUsePieces(defaultPieces);
      setSelectedPackId(defaultPieces && !hasPieces && hasPackages ? food.packages![0].id : null);
      setAmount(defaultPieces ? '1' : '');
    }
  }

  function handleClear() { setSelectedFood(null); setSelectedRecipe(null); setAmount(''); setSelectedPackId(null); setSearchKey(k => k + 1); }

  const selectedPack = selectedFood?.packages?.find(p => p.id === selectedPackId) ?? null;
  const pieceSize: number | null = selectedFood?.piece_grams ?? selectedPack?.grams ?? null;
  const effectiveGrams = selectedFood
    ? (usePieces && pieceSize != null ? Math.round((evalExpr(amount) ?? 0) * pieceSize * 100)/100 : (evalExpr(amount) ?? 0))
    : 0;

  const logStatus = planMode ? 'planned' : 'logged';

  async function handleLogFood(status: 'logged' | 'planned') {
    if (!selectedFood || !effectiveGrams) return;
    const result = await api.log.add({ food_id: selectedFood.id, grams: effectiveGrams, meal, date: dateStr, status, pantry_id: logPantryId });
    if (result.shortage > 0 && result.shortage_food) {
      showToast(t('pantry.shortage').replace('{n}', String(Math.round(result.shortage))).replace('{food}', result.shortage_food), 'warning');
    } else if (status === 'planned') {
      const stock = await api.pantry.checkStock(selectedFood.id, effectiveGrams, logPantryId);
      if (stock.shortage > 0) showToast(t('pantry.shortage').replace('{n}', String(Math.round(stock.shortage))).replace('{food}', selectedFood.name), 'warning');
    }
    if (result.events?.length) pushDeduction(result.events);
    setSelectedFood(null); setAmount(''); setSelectedPackId(null); setSearchKey(k => k + 1); load();
  }

  async function handleLogRecipe(status: 'logged' | 'planned') {
    if (!selectedRecipe) return;
    const shortages: string[] = [];
    const allEvents: import('../types').DeductionEvent[] = [];
    for (const ing of selectedRecipe.ingredients) {
      if (ing.editGrams > 0) {
        const result = await api.log.add({ food_id: ing.food_id, grams: ing.editGrams, meal, date: dateStr, status, pantry_id: logPantryId });
        if (result.shortage > 0 && result.shortage_food) {
          shortages.push(`${Math.round(result.shortage)}g of ${result.shortage_food}`);
        } else if (status === 'planned' && result.shortage === 0) {
          const stock = await api.pantry.checkStock(ing.food_id, ing.editGrams, logPantryId);
          if (stock.shortage > 0) shortages.push(`${Math.round(stock.shortage)}g of ${ing.name}`);
        }
        if (result.events?.length) allEvents.push(...result.events);
      }
    }
    if (shortages.length > 0) showToast(t('pantry.shortageMulti').replace('{list}', shortages.join(', ')), 'warning');
    if (allEvents.length) pushDeduction(allEvents);
    setSelectedRecipe(null); setSearchKey(k => k + 1); load();
  }

  async function handleConfirmPlanned(id: number) {
    const result = await api.log.confirmPlanned({ id, pantry_id: logPantryId });
    if (result.shortage > 0 && result.shortage_food) {
      showToast(t('pantry.shortage').replace('{n}', String(Math.round(result.shortage))).replace('{food}', result.shortage_food), 'warning');
    }
    if (result.events?.length) pushDeduction(result.events);
    load();
  }

  async function handleConfirmAll() {
    const result = await api.log.confirmAllPlanned({ date: dateStr, pantry_id: logPantryId });
    if (result.shortages?.length > 0) {
      const list = result.shortages.map(s => `${s.shortage}g of ${s.food_name}`).join(', ');
      showToast(t('pantry.shortageMulti').replace('{list}', list), 'warning');
    }
    if (result.events?.length) pushDeduction(result.events);
    setConfirmAllOpen(false);
    load();
  }

  async function handleSwapLunchDinner() {
    await api.log.swapLunchDinner(dateStr);
    load();
  }

  async function addWater(ml: number) {
    await api.water.add({ date: dateStr, ml, source: 'manual' });
    const wd = await api.water.getDay(dateStr);
    setWaterTotal(wd.total_ml); setWaterEntries(wd.entries);
  }

  async function deleteWater(id: number) {
    await api.water.delete(id);
    const wd = await api.water.getDay(dateStr);
    setWaterTotal(wd.total_ml); setWaterEntries(wd.entries);
  }

  async function handleWaterCustom() {
    const ml = parseFloat(waterCustomMl);
    if (!ml) return;
    await addWater(ml);
    setWaterCustomMl(''); setWaterCustomOpen(false);
  }

  const waterGoal = settings.water_goal || 2000;
  const waterPct  = Math.min(100, Math.round(waterTotal / waterGoal * 100));

  async function handleTakeSuppl(id: number) {
    await api.supplements.take({ supplement_id: id, date: dateStr });
    setSupplements(await api.supplements.getDay(dateStr));
  }

  function handleNoteChange(val: string) {
    setNote(val);
    if (noteSaveTimer.current) clearTimeout(noteSaveTimer.current);
    noteSaveTimer.current = setTimeout(()=>{ api.notes.save({ date: dateStr, note: val }); }, 1000);
  }

  function handleEnergySave() {
    const resting   = parseFloat(restingKcal) || 0;
    const active    = parseFloat(activeKcal)  || 0;
    const extra     = parseFloat(extraKcal)   || 0;
    const stepCount = parseInt(steps, 10)     || 0;
    api.dailyEnergy.set({ date: dateStr, resting_kcal: resting, active_kcal: active, extra_kcal: extra, steps: stepCount });
    setRestingFromYest(false);
  }

  async function handleCopyDay() {
    const md = buildDayMarkdown({
      date: dateStr,
      entries,
      settings,
      waterMl: waterTotal,
      waterGoalMl: settings.water_goal,
      restingKcal: energyResting || undefined,
      activeKcal:  energyActive  || undefined,
      extraKcal:   energyExtra   || undefined,
      note,
    });
    const ok = await copyToClipboard(md);
    showToast(ok ? t('export.copied') : t('export.copyFailed'), ok ? 'success' : 'error');
  }

  function selectPantry(id: number) {
    setLogPantryId(id);
    localStorage.setItem('dashPantry', JSON.stringify({ id, date: today() }));
  }

  async function quickLog(food: Food) {
    const smallestPack = (food.packages ?? []).reduce<number | null>(
      (min, p) => (min == null || p.grams < min ? p.grams : min), null,
    );
    const grams = (food.is_bulk !== 1 && smallestPack != null)
      ? smallestPack
      : (food.piece_grams || 100);
    const result = await api.log.add({ food_id: food.id, grams, meal: 'AfternoonSnack', date: dateStr, status: logStatus, pantry_id: logPantryId });
    
    showToast(`${food.name} ${t('dash.logged')}! (Ctrl+Z to undo)`, 'success');
    
    if (result.events?.length) pushDeduction(result.events);
    load();
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const inputCls = "bg-bg border border-border/60 rounded-xl px-4 py-3 text-base text-text outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all w-full";
  const numInputCls = "w-full bg-bg border border-border/60 rounded-xl px-2 py-2.5 text-sm text-text outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 text-center tabular-nums transition-all";
  const cardCls = "bg-card border border-border/40 shadow-sm rounded-3xl p-5 flex flex-col gap-4";

  const loggedEntries  = entries.filter(e => e.status === 'logged');
  const caloriesIn     = Math.round(loggedEntries.reduce((s, e) => s + e.calories, 0));
  const energyResting  = parseFloat(restingKcal) || 0;
  const energyActive   = parseFloat(activeKcal)  || 0;
  const energyExtra    = parseFloat(extraKcal)   || 0;
  const stepCount      = parseInt(steps, 10)     || 0;
  const energyOut      = energyResting + energyActive + energyExtra;
  const netKcal        = caloriesIn - energyOut;
  const hasEnergyData  = energyOut > 0 || caloriesIn > 0 || stepCount > 0;

  // JSX vars reused in both mobile inline and desktop sidebar
  const plannedBanner = plannedEntries.length > 0 ? (
    <div className="flex items-center justify-between gap-4 bg-accent/5 border border-accent/20 rounded-3xl p-5 animate-fade-in">
      <div className="text-sm font-bold text-text/80">
        <span className="text-accent text-xl font-black">{plannedEntries.length}</span> {t('dash.plannedItems')}
        <span className="block text-[10px] uppercase tracking-widest text-text-sec mt-1">Total: {plannedKcalSum} kcal</span>
      </div>
      <button onClick={() => setConfirmAllOpen(true)} className="bg-accent text-white text-[10px] font-black uppercase tracking-widest rounded-xl px-4 py-2.5 hover:scale-105 active:scale-95 transition-all">
        {t('dash.confirmAll')}
      </button>
    </div>
  ) : null;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-bg/20">

      {/* ── STICKY HEADER ───────────────────────────────────────────── */}
      <header className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 md:px-6 py-4 border-b border-border/10 bg-bg/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-4">
          {fromWeek && (
            <button
              className="flex items-center justify-center w-8 h-8 rounded-full bg-card border border-border text-text-sec hover:text-accent transition-colors"
              onClick={() => navigate('week', { weekStart: fromWeek })}
              title={t('day.back')}
            >
              ←
            </button>
          )}
          <div className="flex items-center gap-1">
            <button onClick={() => setDateStr(addDays(dateStr, -1))} className="p-2 rounded-xl text-text-sec hover:text-text hover:bg-card transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="flex flex-col items-center px-2 min-w-35 relative">
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-accent/80 mb-0.5">
                {dateStr === today() ? t('dash.today') : t('dash.diary')}
              </span>
              <h1 className="text-lg font-black text-text tracking-tight flex items-center gap-2">
                {fmtDateWithWeekday(dateStr)}
                <input
                  type="date" value={dateStr} onChange={e => setDateStr(e.target.value)}
                  className="w-full h-full opacity-0 absolute inset-0 cursor-pointer"
                />
              </h1>
            </div>
            <button onClick={() => setDateStr(addDays(dateStr, 1))} className="p-2 rounded-xl text-text-sec hover:text-text hover:bg-card transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
          <button onClick={() => setQuickFoodOpen(true)} className="flex items-center gap-2 text-sm bg-accent text-white rounded-xl px-5 py-2.5 font-bold shadow-lg shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
            {t('dash.quickAdd')}
          </button>
          <button onClick={() => setPlanMode(v => !v)} className={`text-sm rounded-xl px-5 py-2.5 font-bold transition-all whitespace-nowrap border ${planMode ? 'bg-accent/10 border-accent text-accent' : 'bg-card border-border text-text-sec hover:border-text-sec/40'}`}>
            {planMode ? t('dash.planned') : t('dash.plan')}
          </button>
          <div className="h-6 w-px bg-border/20 mx-1 hidden md:block" />
          <button onClick={() => setSwapOpen(true)} className="p-2.5 bg-card border border-border rounded-xl text-text-sec hover:text-text hover:border-text-sec/40 transition-all" title={t('dash.swapDays')}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
          </button>
          <button onClick={handleCopyDay} className="p-2.5 bg-card border border-border rounded-xl text-text-sec hover:text-text hover:border-text-sec/40 transition-all" title={t('export.copyDay')}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
          </button>
        </div>
      </header>

      {/* ── BODY (scrollable content area) ─────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto w-full">
        <div className="flex flex-col gap-6 md:gap-8 px-4 md:px-6 py-6 pb-24 max-w-5xl mx-auto">

          {/* ── MACROS & CALORIES ZONE (FRONT & CENTER) ── */}
          <div className="flex flex-col gap-6 md:gap-8">
            <div className="animate-fade-in w-full">
              <DayMacrosCard entries={entries} />
            </div>

            {plannedBanner}
            
            {/* ── HIGH-END BENTO GRID: ENERGY & WATER (APPLE HEALTH STYLE) ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
              
              {/* NET ENERGY */}
              <div className="bg-card shadow-sm sm:rounded-3xl lg:rounded-[32px] p-6 lg:p-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">🔥</div>
                    <span className="text-[11px] font-bold text-text-sec/60 uppercase tracking-widest">{t('energy.title')}</span>
                  </div>
                  
                  <div className="flex items-baseline gap-2 mb-1">
                    <span 
                      className={`text-5xl lg:text-6xl font-bold tracking-tight ${
                        !hasEnergyData ? 'text-text-sec/20' 
                        : netKcal < 0 ? 'text-green' : 'text-orange-500'
                      }`}
                    >
                      {hasEnergyData ? `${netKcal > 0 ? '+' : ''}${netKcal}` : '—'}
                    </span>
                    <span className="text-sm font-semibold text-text-sec/60 tracking-wide uppercase">kcal {t('energy.net')}</span>
                  </div>
                </div>

                {hasEnergyData ? (
                  <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-border/10">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-text-sec/60">{t('energy.foodIn')}</span>
                      <span className="text-xl font-bold text-text">{caloriesIn}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-text-sec/60">{t('energy.out')}</span>
                      <span className="text-xl font-bold text-text tracking-tight">{energyOut}</span>
                    </div>
                    {stepCount > 0 && (
                      <div className="flex flex-col gap-1 mt-2 col-span-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-text-sec/60 uppercase tracking-wider">{t('energy.steps')}</span>
                          <span className="text-sm font-bold text-orange-500">{stepCount.toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 w-full bg-border/20 rounded-full mt-1 overflow-hidden">
                          <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min(100, (stepCount/10000)*100)}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs font-medium text-text-sec/40 mt-8 uppercase tracking-widest">{t('energy.appleWatch')}</div>
                )}
              </div>

              {/* WATER */}
              <div className="bg-card shadow-sm sm:rounded-3xl lg:rounded-[32px] p-6 lg:p-8 flex flex-col relative overflow-hidden group">
                <div className="absolute -right-16 -top-16 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all duration-700 pointer-events-none" />
                
                <div className="flex items-start justify-between mb-6 relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">💧</div>
                    <span className="text-[11px] font-bold text-text-sec/60 uppercase tracking-widest">{t('dash.water')}</span>
                  </div>
                  <div className="text-sm font-bold text-blue-500 bg-blue-500/10 px-3 py-1 rounded-full tabular-nums">{Math.round(waterTotal)} ml</div>
                </div>
                
                <div className="flex items-center justify-between flex-1 gap-6 relative z-10">
                  {/* Apple Watch Style Activity Ring for Water */}
                  <div className="relative w-32 h-32 flex-shrink-0 flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="12" className="text-border/30" />
                      <circle
                        cx="50" cy="50" r="42" fill="none" strokeWidth="12"
                        stroke={waterPct >= 100 ? 'var(--green)' : 'var(--color-blue-500)'}
                        strokeLinecap="round"
                        strokeDasharray="263.89"
                        strokeDashoffset={263.89 * (1 - Math.min(1, waterPct / 100))}
                        className="transition-all duration-1000 ease-[cubic-bezier(0.32,0.72,0,1)]"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-2xl font-bold tabular-nums tracking-tight ${waterPct >= 100 ? 'text-green' : 'text-blue-500'}`}>{waterPct}%</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 w-full max-w-[120px]">
                    {[250, 500].map(ml => (
                      <button key={ml} onClick={() => addWater(ml)} className="py-2.5 flex items-center justify-center rounded-xl bg-blue-500/5 text-blue-600 text-xs font-bold hover:bg-blue-500/15 active:scale-95 transition-all">
                        + {ml} ml
                      </button>
                    ))}
                    <button onClick={() => setWaterCustomOpen(true)} className="py-2.5 flex items-center justify-center rounded-xl bg-bg border border-border/40 text-text-sec text-xs font-bold hover:bg-card hover:text-text active:scale-95 transition-all">
                      {t('dash.custom')}
                    </button>
                  </div>
                </div>
                
                {waterEntries.length > 0 && (
                   <div className="mt-6 pt-4 border-t border-border/10 flex flex-col gap-2 relative z-10 w-full">
                     <button onClick={() => setWaterExpanded(e => !e)} className="text-[10px] uppercase font-bold tracking-widest text-text-sec/50 w-full text-left flex items-center justify-between group-hover:text-text-sec transition-colors">
                       <span>{t('dash.history')}</span>
                       <span className={`transition-transform duration-300 ${waterExpanded ? 'rotate-180' : ''}`}>▼</span>
                     </button>
                     {waterExpanded && (
                       <div className="flex flex-col gap-1 mt-2 max-h-24 overflow-y-auto">
                         {waterEntries.map(e => (
                           <div key={e.id} className="flex items-center justify-between text-xs text-text-sec bg-bg/60 rounded-lg px-3 py-2">
                             <span className="font-medium text-text">{Math.round(e.ml)} ml</span>
                             <button onClick={() => deleteWater(e.id)} className="text-text-sec/40 hover:text-red transition-colors">✕</button>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>
                )}
              </div>

              {/* ENERGY INPUTS STRIP */}
              <div className="md:col-span-2 bg-card shadow-sm sm:rounded-3xl lg:rounded-[32px] p-6 lg:p-8 flex flex-col gap-6 relative overflow-hidden group">
                <div className="flex lg:hidden items-center gap-2 mb-2">
                    <div className="text-xs uppercase tracking-widest font-semibold text-text-sec/60">{t('energy.appleWatch')} Inputs</div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                  {[
                    { label: t('energy.resting'), value: restingKcal, setter: setRestingKcal, sub: restingFromYest ? t('energy.fromYest') : null, mode: 'decimal' as const },
                    { label: t('energy.active'), value: activeKcal, setter: setActiveKcal, mode: 'decimal' as const },
                    { label: t('energy.extra'), value: extraKcal, setter: setExtraKcal, mode: 'decimal' as const },
                    { label: t('energy.steps'), value: steps, setter: (v:string)=>setSteps(v.replace(/[^0-9]/g, '')), mode: 'numeric' as const },
                  ].map((input, idx) => (
                    <div key={idx} className="flex flex-col gap-2 relative">
                      <label className="text-[10px] uppercase tracking-widest font-semibold text-text-sec/60">{input.label}</label>
                      <input
                        type="text" inputMode={input.mode} value={input.value}
                        onChange={e => { input.setter(e.target.value); if (idx===0) setRestingFromYest(false); }}
                        onBlur={handleEnergySave}
                        className="w-full bg-bg border border-border/40 rounded-xl py-3 px-4 text-sm font-medium text-text outline-none focus:border-border/80 transition-all font-mono"
                        placeholder="0"
                      />
                      {input.sub && <span className="absolute -bottom-5 left-1 text-[9px] uppercase font-medium text-accent/70 tracking-wider">{input.sub}</span>}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Log food section — OPEN AREA, no card */}
          <section className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-text tracking-tight">{t('dash.logFood')}</h2>
                {pantries.length > 1 && (
                  <select
                    value={logPantryId || ''}
                    onChange={(e) => selectPantry(Number(e.target.value))}
                    className="text-xs bg-card border border-border rounded-lg px-3 py-1.5 text-text-sec outline-none focus:border-accent transition-colors"
                  >
                    {pantries.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
              </div>

              <div className="relative group">
                <FoodSearch key={searchKey} items={searchItems} onSelect={handleSelect} onClear={handleClear} placeholder={t('dash.searchPlaceholder')} pantryId={logPantryId} />
              </div>

              {!selectedFood && !selectedRecipe && (
                <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                  {favorites.length > 0 && (
                    <div className="flex gap-2 pr-4 border-r border-border/20">
                      {favorites.map(f => (
                        <button key={f.id} onClick={() => quickLog(f)} className="flex-shrink-0 text-xs px-4 py-2.5 rounded-xl bg-accent/5 border border-accent/20 text-accent hover:bg-accent/10 active:scale-95 transition-all font-bold">
                          ★ {f.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    {frequent.slice(0, 6).map(f => (
                      <button key={f.id} onClick={() => quickLog(f)} className="flex-shrink-0 text-xs px-4 py-2.5 rounded-xl bg-card/40 border border-border/40 text-text-sec hover:border-text-sec/60 hover:text-text active:scale-95 transition-all font-medium">
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedFood && (
                <div className="bg-card border border-accent/20 shadow-xl shadow-accent/5 rounded-3xl p-6 mt-2 animate-spring-up overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-4">
                    <button onClick={handleClear} className="text-text-sec hover:text-text transition-colors">✕</button>
                  </div>
                  <h3 className="font-black text-2xl text-text mb-6 tracking-tight">{selectedFood.name}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-text-sec/60 ml-1">{usePieces ? (selectedFood.piece_grams ? t('common.pieces') : t('dash.packsPlaceholder')) : t('common.grams')}</label>
                        <input
                          type="text" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} onBlur={() => setAmount(v => resolveExpr(v))}
                          placeholder="0"
                          className="bg-bg border-2 border-border/40 rounded-2xl px-5 py-4 text-2xl font-black text-text outline-none focus:border-accent transition-all w-full tabular-nums" autoFocus
                        />
                      </div>
                      <MealPills selected={meal} onChange={setMeal} />
                    </div>
                    
                    <div className="bg-bg/40 rounded-2xl border border-border/40 p-5 flex flex-col justify-center gap-4">
                      {effectiveGrams > 0 ? (() => {
                        const r = effectiveGrams / 100;
                        return (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col">
                              <span className="text-3xl font-black text-text tabular-nums leading-none">{Math.round(selectedFood.calories * r)}</span>
                              <span className="text-[10px] uppercase tracking-wider font-bold text-text-sec/60 mt-1">kcal</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xl font-bold text-text tabular-nums leading-none">{Math.round(selectedFood.protein * r * 10)/10}g</span>
                              <span className="text-[10px] uppercase tracking-wider font-bold text-text-sec/60 mt-1">Proteine</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xl font-bold text-text tabular-nums leading-none">{Math.round(selectedFood.carbs * r * 10)/10}g</span>
                              <span className="text-[10px] uppercase tracking-wider font-bold text-text-sec/60 mt-1">Carboidrati</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xl font-bold text-text tabular-nums leading-none">{Math.round(selectedFood.fat * r * 10)/10}g</span>
                              <span className="text-[10px] uppercase tracking-wider font-bold text-text-sec/60 mt-1">Grassi</span>
                            </div>
                          </div>
                        );
                      })() : (
                        <div className="text-center py-4">
                          <span className="text-sm text-text-sec/60 italic">{t('common.per100g')}: <span className="text-text font-bold">{selectedFood.calories}</span> kcal</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button onClick={() => handleLogFood(planMode ? 'planned' : 'logged')} disabled={!effectiveGrams} className="w-full bg-accent text-white py-4 rounded-2xl font-black text-lg shadow-lg shadow-accent/20 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition-all">
                    {planMode ? t('dash.addToPlan') : t('common.add')}
                  </button>
                </div>
              )}

              {selectedRecipe && (() => {
                const recipeTotals = selectedRecipe.ingredients.reduce((acc, ing) => {
                  const r = ing.editGrams / ing.grams;
                  return { cal: acc.cal + ing.calories * r, protein: acc.protein + ing.protein * r, carbs: acc.carbs + ing.carbs * r, fat: acc.fat + ing.fat * r, fiber: acc.fiber + (ing.fiber || 0) * r };
                }, { cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
                const rt = { cal: Math.round(recipeTotals.cal), protein: Math.round(recipeTotals.protein * 10) / 10, carbs: Math.round(recipeTotals.carbs * 10) / 10, fat: Math.round(recipeTotals.fat * 10) / 10, fiber: Math.round(recipeTotals.fiber * 10) / 10 };
                return (
                  <div className="bg-card border border-accent/20 shadow-xl shadow-accent/5 rounded-3xl p-6 mt-2 animate-spring-up flex flex-col gap-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-black text-2xl text-text tracking-tight">{selectedRecipe.name}</h4>
                        <div className="flex gap-3 text-xs text-text-sec tabular-nums mt-2 font-bold uppercase tracking-wider">
                          <span className="text-text">{rt.cal} kcal</span>
                          <span>F {rt.fat}g</span>
                          <span>C {rt.carbs}g</span>
                          <span>P {rt.protein}g</span>
                        </div>
                      </div>
                      <button onClick={handleClear} className="text-text-sec hover:text-text transition-colors">✕</button>
                    </div>
                    
                    <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                      {selectedRecipe.ingredients.map((ing, i) => {
                        const ratio = ing.editGrams / ing.grams;
                        const ingCal = Math.round(ing.calories * ratio);
                        return (
                          <div key={ing.id} className="flex items-center gap-4 bg-bg/40 rounded-2xl border border-border/40 p-4 hover:border-border transition-colors">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-text truncate">{ing.name}</div>
                              <div className="text-[10px] uppercase tracking-widest font-bold text-text-sec/60 mt-1">{ingCal} kcal</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="text" inputMode="decimal" value={ing.editGrams} min={0} step={0.1}
                                onChange={e => { const val = parseFloat(e.target.value) || 0; setSelectedRecipe(r => r ? { ...r, ingredients: r.ingredients.map((x, j) => j === i ? { ...x, editGrams: val } : x) } : r); }}
                                className="w-20 bg-bg border-2 border-border/40 rounded-xl py-2 px-3 text-sm font-black text-center focus:border-accent transition-all tabular-nums"
                              />
                              <span className="text-[10px] font-black text-text-sec">G</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-2">
                      <MealPills selected={meal} onChange={setMeal} />
                    </div>

                    <button onClick={() => handleLogRecipe(planMode ? 'planned' : 'logged')} className="w-full bg-accent text-white py-4 rounded-2xl font-black text-lg shadow-lg shadow-accent/20 hover:scale-[1.01] active:scale-[0.99] transition-all">
                      {planMode ? t('dash.addToPlan') : t('dash.logRecipe')}
                    </button>
                  </div>
                );
              })()}
            </section>

            {/* Diary / Entry Table — Subtle background, no heavy card */}
            <section className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-text tracking-tight">{t('dash.todayEntries')}</h2>
                {plannedEntries.some(e => e.meal === 'Lunch' || e.meal === 'Dinner') && (
                  <button onClick={handleSwapLunchDinner} className="text-[10px] uppercase tracking-[0.15em] font-bold text-text-sec hover:text-accent transition-colors">
                    {t('dash.swapLunchDinner')}
                  </button>
                )}
              </div>
              
              <div className="bg-card/30 border border-border/30 rounded-3xl p-2 md:p-4">
                {entries.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="text-4xl mb-4 opacity-20">🍽️</div>
                    <p className="text-sm font-medium text-text-sec/50">{t('dash.nothingLogged')}</p>
                  </div>
                ) : (
                  <EntryTable entries={entries} foods={foods} onRefresh={load} onConfirm={handleConfirmPlanned} />
                )}
              </div>
            </section>

            {/* Accordions — Grouped and cleaner */}
            <div className="flex flex-col gap-4 mt-4">
              {[
                {
                  key: 'supplements', icon: '💊', title: t('suppl.dashTitle'), collapsed: supplementsCollapsed, toggle: () => setSupplementsCollapsed(!supplementsCollapsed),
                  content: supplements.length > 0 ? (
                    <div className="space-y-6">
                      {SUPPLEMENT_TIME_ORDER.map(slot => {
                        const group = supplements.filter(s => (s.time_of_day ?? 'breakfast') === slot);
                        if (group.length === 0) return null;
                        return (
                          <div key={slot} className="flex flex-col gap-3">
                            <div className="text-[10px] uppercase tracking-[0.2em] font-black text-accent/60">{t(`suppl.time.${slot}`)}</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {group.map(s => {
                                const done = s.taken >= s.qty;
                                return (
                                  <div key={s.id} className={`flex items-center justify-between gap-4 p-4 rounded-2xl border transition-all ${done ? 'bg-bg/40 border-border/20 opacity-50' : 'bg-card border-border/60 hover:border-accent/40'}`}>
                                    <span className={`text-sm font-bold ${done ? 'text-text-sec line-through' : 'text-text'}`}>{s.name}</span>
                                    <button disabled={done} onClick={() => handleTakeSuppl(s.id)}
                                      className={`text-xs px-4 py-2 rounded-xl font-black transition-all ${done ? 'text-text-sec/40 bg-border/20' : 'text-accent bg-accent/10 hover:bg-accent/20 active:scale-95'}`}>
                                      {s.taken} / {s.qty}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-text-sec/50 italic text-center py-8">
                      {t('suppl.noSupplements')} — <button onClick={() => navigate('supplements')} className="text-accent font-bold hover:underline">{t('suppl.manage')}</button>
                    </div>
                  )
                },
                {
                  key: 'exercise', icon: '🏋️', title: t('exercise.title'), collapsed: exerciseCollapsed, toggle: () => setExerciseCollapsed(!exerciseCollapsed),
                  content: <ExerciseSection date={dateStr} weightKg={weightKg} onCaloriesChange={() => {}} />
                },
                {
                  key: 'notes', icon: '📝', title: t('dash.notes'), collapsed: notesCollapsed, toggle: () => setNotesCollapsed(!notesCollapsed),
                  content: (
                    <textarea value={note} onChange={e => handleNoteChange(e.target.value)} placeholder={t('dash.notesPlaceholder')} rows={5}
                      className="w-full bg-bg border-2 border-border/40 rounded-2xl px-5 py-4 text-sm font-medium text-text outline-none focus:border-accent transition-all placeholder:text-text-sec/30 resize-none"
                    />
                  )
                },
              ].map(({ key, icon, title, collapsed, toggle, content }) => (
                <div key={key} className={`bg-card/40 border rounded-3xl overflow-hidden transition-all ${collapsed ? 'border-border/20' : 'border-border/60 shadow-lg'}`}>
                  <button onClick={toggle} className="w-full flex items-center justify-between px-6 py-5 hover:bg-card/60 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className="text-xl filter grayscale contrast-125">{icon}</span>
                      <span className="text-sm font-black text-text uppercase tracking-wider">{title}</span>
                    </div>
                    <svg className={`w-4 h-4 text-text-sec transition-transform duration-500 ${collapsed ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {!collapsed && <div className="px-6 pb-6 pt-2 border-t border-border/10 animate-fade-in">{content}</div>}
                </div>
              ))}
            </div>

          </div>
      </div>

      {/* ── DIALOGS E MODALS ────────────────────────────────────────── */}
      <QuickFoodDialog isOpen={quickFoodOpen} onClose={() => setQuickFoodOpen(false)} date={dateStr} meal={meal} onLogged={load} />

      <SwapDaysModal
        isOpen={swapOpen}
        initialDate={dateStr}
        onClose={() => setSwapOpen(false)}
        onSwapped={(n) => { showToast(t('swap.toastSwapped').replace('{n}', String(n)), 'success'); load(); }}
      />

      <Modal isOpen={waterCustomOpen} onClose={() => setWaterCustomOpen(false)} title={t('water.addWater')}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-text-sec">{t('water.amountMl')}</label>
            <input type="text" inputMode="decimal" value={waterCustomMl} onChange={e => setWaterCustomMl(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleWaterCustom()} autoFocus className={inputCls} placeholder="es. 330" />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setWaterCustomOpen(false)} className="px-5 py-2.5 text-sm text-text-sec border border-border bg-card rounded-xl font-medium transition-colors hover:bg-border/30">{t('common.cancel')}</button>
            <button onClick={handleWaterCustom} disabled={!waterCustomMl} className="px-5 py-2.5 text-sm bg-accent text-white rounded-xl hover:opacity-90 disabled:opacity-40 font-bold transition-opacity">{t('common.add')}</button>
          </div>
        </div>
      </Modal>

      <DeductionEventModal event={deductionEvent} onDone={nextDeduction} pushMore={pushDeduction} onPantryChanged={load} />

      {confirmAllOpen && (
        <ConfirmDialog
          message={t('dash.confirmAllMsg').replace('{n}', String(plannedEntries.length))}
          confirmLabel={t('dash.confirmAll')}
          cancelLabel={t('common.cancel')}
          onConfirm={handleConfirmAll}
          onCancel={() => setConfirmAllOpen(false)}
        />
      )}
    </div>
  );
}