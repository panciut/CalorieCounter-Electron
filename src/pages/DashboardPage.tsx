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

  // Auto-default to plan mode when navigating to a future day
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

  // Apple Watch energy
  const [restingKcal, setRestingKcal] = useState('');
  const [activeKcal, setActiveKcal]   = useState('');
  const [extraKcal, setExtraKcal]     = useState('');
  const [steps, setSteps]             = useState('');
  const [restingFromYest, setRestingFromYest] = useState(false);
  const noteSaveTimer = useRef<ReturnType<typeof setTimeout>|null>(null);

  // Pantry deduction event queue (opened-pack lifecycle prompts)
  const { current: deductionEvent, next: nextDeduction, push: pushDeduction } = useDeductionEvents();

  // Pantry location for deduction
  const [pantries, setPantries] = useState<import('../types').PantryLocation[]>([]);
  const [logPantryId, setLogPantryId] = useState<number | undefined>(undefined);

  // Form state
  const [selectedFood, setSelectedFood]     = useState<Food|null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeEditState|null>(null);
  const [searchKey, setSearchKey]           = useState(0);
  const [amount, setAmount]                 = useState('');
  const [usePieces, setUsePieces]           = useState(false);
  const [selectedPackId, setSelectedPackId] = useState<number | null>(null);
  const [meal, setMeal]                     = useState<Meal>('AfternoonSnack');

  // UI state
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

  // Load pantries once on mount; restore today's selection from localStorage or default
  useEffect(() => {
    api.pantries.getAll().then(ps => {
      setPantries(ps);
      const def = ps.find(p => p.is_default) ?? ps[0];
      if (!def) return;
      try {
        const stored = JSON.parse(localStorage.getItem('dashPantry') || '{}');
        // Use stored id only if it was set today and the pantry still exists
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
    // Load Apple Watch energy for this date
    api.dailyEnergy.get(dateStr).then((rec: DailyEnergy) => {
      if (rec.resting_kcal > 0 || rec.active_kcal > 0 || rec.extra_kcal > 0 || (rec.steps ?? 0) > 0) {
        setRestingKcal(rec.resting_kcal > 0 ? String(rec.resting_kcal) : '');
        setActiveKcal(rec.active_kcal > 0 ? String(rec.active_kcal) : '');
        setExtraKcal(rec.extra_kcal > 0 ? String(rec.extra_kcal) : '');
        setSteps((rec.steps ?? 0) > 0 ? String(rec.steps) : '');
        setRestingFromYest(false);
      } else {
        // No record for today — carry forward resting from yesterday
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

  // ── Totals ──────────────────────────────────────────────────────────────────

  const plannedEntries = entries.filter(e => e.status === 'planned');
  const plannedKcalSum = Math.round(plannedEntries.reduce((s, e) => s + e.calories, 0));

  // ── Food search items ───────────────────────────────────────────────────────

  const freqMap = new Map(frequent.map(f=>[f.id,f.use_count]));
  const searchItems: SearchItem[] = [
    ...foods.map(f=>({ ...f, _freq: freqMap.get(f.id)||0, isRecipe: false as const })),
    ...recipes.map(r=>({ ...r, isRecipe: true as const, _freq: 0 })),
  ];

  // ── Select handlers ─────────────────────────────────────────────────────────

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

  // ── Water ───────────────────────────────────────────────────────────────────

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

  // ── Supplements ─────────────────────────────────────────────────────────────

  async function handleTakeSuppl(id: number) {
    await api.supplements.take({ supplement_id: id, date: dateStr });
    setSupplements(await api.supplements.getDay(dateStr));
  }

  // ── Notes ───────────────────────────────────────────────────────────────────

  function handleNoteChange(val: string) {
    setNote(val);
    if (noteSaveTimer.current) clearTimeout(noteSaveTimer.current);
    noteSaveTimer.current = setTimeout(()=>{ api.notes.save({ date: dateStr, note: val }); }, 1000);
  }

  // ── Apple Watch energy ───────────────────────────────────────────────────────

  function handleEnergySave() {
    const resting   = parseFloat(restingKcal) || 0;
    const active    = parseFloat(activeKcal)  || 0;
    const extra     = parseFloat(extraKcal)   || 0;
    const stepCount = parseInt(steps, 10)     || 0;
    api.dailyEnergy.set({ date: dateStr, resting_kcal: resting, active_kcal: active, extra_kcal: extra, steps: stepCount });
    setRestingFromYest(false);
  }

  // ── Quick-log favorites/frequent ─────────────────────────────────────────────

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
    // Non-bulk foods log by pack size (smallest available); bulk foods fall
    // back to piece_grams, then 100g.
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

  const inputCls = "bg-card border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";
  const numInputCls = "w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm text-text outline-none focus:border-accent text-center tabular-nums";

  const loggedEntries  = entries.filter(e => e.status === 'logged');
  const caloriesIn     = Math.round(loggedEntries.reduce((s, e) => s + e.calories, 0));
  const energyResting  = parseFloat(restingKcal) || 0;
  const energyActive   = parseFloat(activeKcal)  || 0;
  const energyExtra    = parseFloat(extraKcal)   || 0;
  const stepCount      = parseInt(steps, 10)     || 0;
  const energyOut      = energyResting + energyActive + energyExtra;
  const netKcal        = caloriesIn - energyOut;
  const hasEnergyData  = energyOut > 0 || caloriesIn > 0 || stepCount > 0;

  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col gap-7">

      {/* Back */}
      {fromWeek && (
        <button
          className="group flex items-center gap-1.5 text-text-sec hover:text-accent text-sm cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] self-start"
          onClick={() => navigate('week', { weekStart: fromWeek })}
        >
          <span className="transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-x-0.5">‹</span>
          {t('day.back')}
        </button>
      )}

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-text-sec/40">
            {dateStr === today() ? 'Today' : 'Day View'}
          </span>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setDateStr(addDays(dateStr, -1))}
              className="w-8 h-8 flex items-center justify-center rounded-full border border-border text-text-sec hover:border-accent/50 hover:text-accent cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-95"
            >‹</button>
            <h1 className="text-3xl font-black text-text tracking-tight">{fmtDateWithWeekday(dateStr)}</h1>
            <button
              onClick={() => setDateStr(addDays(dateStr, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-full border border-border text-text-sec hover:border-accent/50 hover:text-accent cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-95"
            >›</button>
            <input
              type="date"
              value={dateStr}
              onChange={e => setDateStr(e.target.value)}
              className="text-xs bg-card border border-border rounded-full px-3 py-1.5 text-text-sec focus:outline-none focus:border-accent cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
            />
            {dateStr !== today() && (
              <button
                onClick={() => setDateStr(today())}
                className="text-xs text-accent border border-accent/30 rounded-full px-3 py-1.5 hover:bg-accent/8 cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]"
              >
                {t('week.today')}
              </button>
            )}
          </div>
          {pantries.length > 1 && (
            <div className="flex gap-1.5 mt-0.5">
              {pantries.map(p => (
                <button
                  key={p.id}
                  onClick={() => selectPantry(p.id)}
                  className={[
                    'text-xs px-3 py-1 rounded-full border cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]',
                    logPantryId === p.id
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border text-text-sec hover:border-accent/40',
                  ].join(' ')}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setQuickFoodOpen(true)}
            className="group flex items-center gap-2 text-sm bg-accent text-white rounded-full px-5 py-2 hover:opacity-90 cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97] font-medium"
          >
            {t('dash.quickAdd')}
            <span className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center text-xs transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-px">+</span>
          </button>
          <button
            onClick={() => setPlanMode(v => !v)}
            className={[
              'text-sm border rounded-full px-4 py-2 cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]',
              planMode
                ? 'bg-accent/12 border-accent text-accent font-medium'
                : 'border-border text-text-sec hover:border-accent/40 hover:text-text',
            ].join(' ')}
          >
            {planMode ? t('dash.planned') : t('dash.plan')}
          </button>
          <button
            onClick={handleCopyDay}
            className="text-sm text-text-sec border border-border rounded-full px-4 py-2 hover:border-accent/40 hover:text-text cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]"
          >
            {t('export.copyDay')}
          </button>
          <button
            onClick={() => setSwapOpen(true)}
            className="text-sm text-text-sec border border-border rounded-full px-4 py-2 hover:border-accent/40 hover:text-text cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]"
          >
            {t('dash.swapDays')}
          </button>
        </div>
      </div>

      {/* Planned banner */}
      {plannedEntries.length > 0 && (
        <div className="flex items-center justify-between gap-3 bg-accent/6 border border-accent/20 rounded-2xl px-5 py-3">
          <div className="text-sm text-text">
            <span className="font-semibold text-accent">{plannedEntries.length}</span>{' '}
            {plannedEntries.length === 1 ? 'planned entry' : 'planned entries'} ·{' '}
            <span className="text-text-sec">{plannedKcalSum} kcal {t('dash.planned')}</span>
          </div>
          <button
            onClick={() => setConfirmAllOpen(true)}
            className="text-sm font-medium text-accent border border-accent/30 rounded-full px-4 py-1.5 hover:bg-accent/8 cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]"
          >
            {t('dash.confirmAll')}
          </button>
        </div>
      )}

      {/* ── LOG FOOD — double-bezel ─────────────────────────────────── */}
      <div className="p-1.5 rounded-[1.75rem] ring-1 ring-border/50 bg-card/30">
        <div className="bg-card rounded-[calc(1.75rem-6px)] p-5 flex flex-col gap-4">
          <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-text-sec/40">{t('dash.logFood')}</span>

          <FoodSearch key={searchKey} items={searchItems} onSelect={handleSelect} onClear={handleClear} placeholder={t('dash.searchPlaceholder')} pantryId={logPantryId} />

          <div className="flex flex-wrap gap-1.5">
            {favorites.length > 0 ? (
              favorites.map(f => (
                <button
                  key={f.id}
                  onClick={() => quickLog(f)}
                  className="text-xs px-3 py-1.5 rounded-full bg-bg border border-border text-text-sec hover:border-accent hover:text-accent cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]"
                >
                  ★ {f.name}
                </button>
              ))
            ) : (
              <div className="text-xs text-text-sec/40 italic px-1">
                {t('dash.noFavorites')} — {t('dash.addFromFoods')} ★
              </div>
            )}
            {frequent.slice(0, 4).map(f => (
              <button
                key={f.id}
                onClick={() => quickLog(f)}
                title={`${f.use_count}× · ${f.calories} kcal/100g`}
                className="text-xs px-3 py-1.5 rounded-full bg-bg border border-border text-text-sec hover:border-accent hover:text-accent cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]"
              >
                {f.name}
              </button>
            ))}
          </div>

          {/* Food form */}
          {selectedFood && (
            <div className="flex flex-col gap-3 p-4 bg-bg rounded-2xl ring-1 ring-border/40">
              <div className="flex flex-col gap-1.5 text-xs">
                <div className="flex flex-wrap gap-3 text-text-sec">
                  <span className="text-text font-semibold">{selectedFood.name}</span>
                  <span>{t('common.per100g')}:</span>
                  <span><span className="text-text font-medium">{selectedFood.calories}</span> kcal</span>
                  <span><span className="text-text font-medium">{selectedFood.fat}</span>g {t('macro.fat')}</span>
                  <span><span className="text-text font-medium">{selectedFood.carbs}</span>g {t('macro.carbs')}</span>
                  {selectedFood.fiber > 0 && <span><span className="text-text font-medium">{selectedFood.fiber}</span>g {t('macro.fiber')}</span>}
                  <span><span className="text-text font-medium">{selectedFood.protein}</span>g {t('macro.protein')}</span>
                </div>
                {effectiveGrams > 0 && (() => {
                  const r = effectiveGrams / 100;
                  return (
                    <div className="flex flex-wrap gap-3 text-text-sec border-t border-border/50 pt-1.5">
                      <span className="text-text font-semibold">{Math.round(effectiveGrams * 10) / 10}g =</span>
                      <span><span className="text-text font-semibold">{Math.round(selectedFood.calories * r)}</span> kcal</span>
                      <span><span className="text-text font-semibold">{Math.round(selectedFood.fat * r * 10) / 10}</span>g {t('macro.fat')}</span>
                      <span><span className="text-text font-semibold">{Math.round(selectedFood.carbs * r * 10) / 10}</span>g {t('macro.carbs')}</span>
                      {selectedFood.fiber > 0 && <span><span className="text-text font-semibold">{Math.round(selectedFood.fiber * r * 10) / 10}</span>g {t('macro.fiber')}</span>}
                      <span><span className="text-text font-semibold">{Math.round(selectedFood.protein * r * 10) / 10}</span>g {t('macro.protein')}</span>
                    </div>
                  );
                })()}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text" inputMode="decimal"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  onBlur={() => setAmount(v => resolveExpr(v))}
                  placeholder={
                    usePieces
                      ? (selectedFood.piece_grams
                          ? `${t('common.pieces')} (${selectedFood.piece_grams}g)`
                          : `${t('dash.packsPlaceholder')}${pieceSize != null ? ` (${pieceSize}g)` : ''}`)
                      : t('common.grams')
                  }
                  className={`w-32 ${inputCls}`}
                />
                {(selectedFood.piece_grams || (selectedFood.packages?.length ?? 0) > 0) && (
                  <button type="button" onClick={() => { setUsePieces(v => !v); setAmount(''); }} className="text-xs text-accent underline cursor-pointer">
                    {usePieces ? t('dash.switchToGrams') : (selectedFood.piece_grams ? t('dash.switchToPieces') : t('dash.switchToPacks'))}
                  </button>
                )}
              </div>
              {usePieces && !selectedFood.piece_grams && (selectedFood.packages?.length ?? 0) > 1 && (
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-text-sec">{t('dash.packPicker')}:</span>
                  {selectedFood.packages!.map(pkg => (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => setSelectedPackId(pkg.id)}
                      className={`px-3 py-1 rounded-full border cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97] ${
                        selectedPackId === pkg.id ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-sec hover:text-text'
                      }`}
                    >
                      {Math.round(pkg.grams)}g
                    </button>
                  ))}
                </div>
              )}
              <MealPills selected={meal} onChange={setMeal} />
              <div className="flex gap-2 flex-wrap items-center">
                {(planMode ? ['planned', 'logged'] : ['logged', 'planned'] as const).map((status, i) => (
                  <button
                    key={status}
                    onClick={() => handleLogFood(status as 'logged' | 'planned')}
                    disabled={!effectiveGrams}
                    className={`px-5 py-2 rounded-full text-sm font-medium cursor-pointer disabled:opacity-40 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97] ${
                      i === 0 ? 'bg-accent text-white hover:opacity-90' : 'border border-border text-text-sec hover:text-text'
                    }`}
                  >
                    {status === 'logged' ? t('common.add') : t('dash.addToPlan')}
                  </button>
                ))}
                <button onClick={handleClear} className="border border-border text-text-sec px-5 py-2 rounded-full text-sm cursor-pointer hover:text-text transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]">{t('common.cancel')}</button>
              </div>
            </div>
          )}

          {/* Recipe editor */}
          {selectedRecipe && (() => {
            const recipeTotals = selectedRecipe.ingredients.reduce((acc, ing) => {
              const r = ing.editGrams / ing.grams;
              return { cal: acc.cal + ing.calories * r, protein: acc.protein + ing.protein * r, carbs: acc.carbs + ing.carbs * r, fat: acc.fat + ing.fat * r, fiber: acc.fiber + (ing.fiber || 0) * r };
            }, { cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
            const rt = { cal: Math.round(recipeTotals.cal), protein: Math.round(recipeTotals.protein * 10) / 10, carbs: Math.round(recipeTotals.carbs * 10) / 10, fat: Math.round(recipeTotals.fat * 10) / 10, fiber: Math.round(recipeTotals.fiber * 10) / 10 };
            return (
              <div className="flex flex-col gap-3 p-4 bg-bg rounded-2xl ring-1 ring-border/40">
                <div>
                  <h4 className="text-sm font-semibold text-text">{selectedRecipe.name}</h4>
                  <p className="text-xs text-text-sec tabular-nums mt-0.5">{rt.cal} kcal · F {rt.fat}g · C {rt.carbs}g{rt.fiber > 0 ? ` · Fi ${rt.fiber}g` : ''} · P {rt.protein}g</p>
                </div>
                <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
                  {selectedRecipe.ingredients.map((ing, i) => {
                    const ratio = ing.editGrams / ing.grams;
                    const ingCal = Math.round(ing.calories * ratio);
                    const ingP = Math.round(ing.protein * ratio * 10) / 10;
                    const ingC = Math.round(ing.carbs * ratio * 10) / 10;
                    const ingF = Math.round(ing.fat * ratio * 10) / 10;
                    return (
                      <div key={ing.id} className="flex items-center gap-2 bg-card rounded-xl px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-text truncate">{ing.name}</div>
                          <div className="text-[11px] text-text-sec tabular-nums">{ingCal} kcal · F {ingF} · C {ingC} · P {ingP}</div>
                        </div>
                        <input
                          type="text" inputMode="decimal" value={ing.editGrams} min={0} step={0.1}
                          onChange={e => { const val = parseFloat(e.target.value) || 0; setSelectedRecipe(r => r ? { ...r, ingredients: r.ingredients.map((x, j) => j === i ? { ...x, editGrams: val } : x) } : r); }}
                          className={`w-20 ${inputCls}`}
                        />
                        <span className="text-xs text-text-sec">g</span>
                      </div>
                    );
                  })}
                </div>
                <MealPills selected={meal} onChange={setMeal} />
                <div className="flex gap-2 flex-wrap">
                  {(planMode ? ['planned', 'logged'] : ['logged', 'planned'] as const).map((status, i) => (
                    <button key={status} onClick={() => handleLogRecipe(status as 'logged' | 'planned')}
                      className={`px-5 py-2 rounded-full text-sm font-medium cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97] ${i === 0 ? 'bg-accent text-white hover:opacity-90' : 'border border-border text-text-sec hover:text-text'}`}>
                      {status === 'logged' ? t('dash.logRecipe') : t('dash.addToPlan')}
                    </button>
                  ))}
                  <button onClick={handleClear} className="border border-border text-text-sec px-5 py-2 rounded-full text-sm cursor-pointer hover:text-text transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]">{t('common.cancel')}</button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── ENTRY TABLE — double-bezel ──────────────────────────────── */}
      <div className="p-1.5 rounded-[1.75rem] ring-1 ring-border/50 bg-card/30">
        <div className="bg-card rounded-[calc(1.75rem-6px)] p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-text-sec/40">{t('dash.todayEntries')}</span>
            {plannedEntries.some(e => e.meal === 'Lunch' || e.meal === 'Dinner') && (
              <button
                onClick={handleSwapLunchDinner}
                className="text-xs text-text-sec border border-border rounded-full px-3 py-1.5 hover:border-accent/40 hover:text-text cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]"
              >
                {t('dash.swapLunchDinner')}
              </button>
            )}
          </div>
          {entries.length === 0
            ? <p className="text-text-sec/50 text-sm py-6 text-center">{t('dash.nothingLogged')}</p>
            : <EntryTable entries={entries} foods={foods} onRefresh={load} onConfirm={handleConfirmPlanned} />}
        </div>
      </div>

      {/* ── MACROS ─────────────────────────────────────────────────── */}
      <DayMacrosCard entries={entries} />

      {/* ── ENERGY + WATER — 2-col bento ───────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Energy — double-bezel */}
        <div className="p-1.5 rounded-[1.75rem] ring-1 ring-border/50 bg-card/30">
          <div className="bg-card rounded-[calc(1.75rem-6px)] p-5 flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-text-sec/40">{t('energy.title')}</span>
              <span className="text-[10px] text-text-sec/30">{t('energy.appleWatch')}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-black tabular-nums tracking-tight transition-colors duration-500 ${
                !hasEnergyData ? 'text-text-sec/20' : netKcal < 0 ? 'text-green' : 'text-accent'
              }`}>
                {hasEnergyData ? `${netKcal > 0 ? '+' : ''}${netKcal}` : '—'}
              </span>
              {hasEnergyData && <span className="text-xs text-text-sec/60">kcal {t('energy.net')}</span>}
            </div>
            {hasEnergyData && (
              <div className="flex gap-4 text-xs text-text-sec flex-wrap">
                <span>{t('energy.foodIn')}: <span className="text-text tabular-nums font-medium">{caloriesIn}</span></span>
                <span>{t('energy.out')}: <span className="text-text tabular-nums font-medium">
                  {(() => {
                    const parts = [energyResting > 0 ? String(energyResting) : null, energyActive > 0 ? String(energyActive) : null, energyExtra > 0 ? String(energyExtra) : null].filter(Boolean) as string[];
                    if (parts.length === 0) return '0';
                    if (parts.length === 1) return parts[0];
                    return `${energyOut} (${parts.join(' + ')})`;
                  })()}
                </span></span>
                {stepCount > 0 && <span>{t('energy.steps')}: <span className="text-text tabular-nums font-medium">{stepCount.toLocaleString()}</span></span>}
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-auto">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider text-text-sec/40 text-center">{t('energy.resting')}</label>
                <input type="text" inputMode="decimal" value={restingKcal} onChange={e => { setRestingKcal(e.target.value); setRestingFromYest(false); }} onBlur={handleEnergySave} placeholder="0" className={numInputCls} />
                {restingFromYest && <span className="text-[10px] text-text-sec/40 text-center">{t('energy.fromYest')}</span>}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider text-text-sec/40 text-center">{t('energy.active')}</label>
                <input type="text" inputMode="decimal" value={activeKcal} onChange={e => setActiveKcal(e.target.value)} onBlur={handleEnergySave} placeholder="0" className={numInputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider text-text-sec/40 text-center" title={t('energy.extraHint')}>{t('energy.extra')}</label>
                <input type="text" inputMode="decimal" value={extraKcal} onChange={e => setExtraKcal(e.target.value)} onBlur={handleEnergySave} placeholder="0" className={numInputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider text-text-sec/40 text-center">{t('energy.steps')}</label>
                <input type="text" inputMode="numeric" value={steps} onChange={e => setSteps(e.target.value.replace(/[^0-9]/g, ''))} onBlur={handleEnergySave} placeholder="0" className={numInputCls} />
              </div>
            </div>
          </div>
        </div>

        {/* Water — double-bezel */}
        <div className="p-1.5 rounded-[1.75rem] ring-1 ring-border/50 bg-card/30">
          <div className="bg-card rounded-[calc(1.75rem-6px)] p-5 flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-text-sec/40">{t('dash.water')}</span>
              <span className="text-xs text-text-sec/60 tabular-nums">{Math.round(waterTotal)} / {waterGoal} ml</span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex gap-0.5 h-1.5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${(i + 1) * 10 <= waterPct ? 'bg-accent' : 'bg-border'}`}
                  />
                ))}
              </div>
              <span className="text-xs text-text-sec/50">{waterPct}%{waterPct >= 100 ? ' 🎯' : ''}</span>
            </div>
            <div className="flex gap-2 flex-wrap mt-auto">
              {[250, 500, 1000].map(ml => (
                <button key={ml} onClick={() => addWater(ml)} className="text-xs px-3 py-1.5 rounded-full border border-border text-text-sec hover:border-accent hover:text-accent cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]">
                  +{ml >= 1000 ? '1L' : `${ml}ml`}
                </button>
              ))}
              <button onClick={() => setWaterCustomOpen(true)} className="text-xs px-3 py-1.5 rounded-full border border-border text-text-sec hover:border-accent hover:text-accent cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]">{t('dash.custom')}</button>
              {waterEntries.length > 0 && (
                <button onClick={() => setWaterExpanded(e => !e)} className="text-xs px-3 py-1.5 rounded-full border border-border text-text-sec cursor-pointer ml-auto transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
                  {t('dash.history')} {waterExpanded ? '▲' : '▼'}
                </button>
              )}
            </div>
            {waterExpanded && waterEntries.length > 0 && (
              <div className="flex flex-col gap-1">
                {waterEntries.map(e => (
                  <div key={e.id} className="flex items-center gap-2 text-xs text-text-sec">
                    <span className="tabular-nums">{Math.round(e.ml)}ml</span>
                    <span className="text-text-sec/40">{e.source === 'manual' ? t('water.manual') : `↩ ${e.source}`}</span>
                    <button onClick={() => deleteWater(e.id)} className="ml-auto text-text-sec/40 hover:text-red cursor-pointer transition-colors duration-300">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── SECONDARY SECTIONS — collapsible double-bezel ──────────── */}
      <div className="flex flex-col gap-3">
        {[
          {
            key: 'supplements',
            title: t('suppl.dashTitle'),
            collapsed: supplementsCollapsed,
            toggle: () => setSupplementsCollapsed(v => !v),
            content: supplements.length > 0 ? (
              SUPPLEMENT_TIME_ORDER.map(slot => {
                const group = supplements.filter(s => (s.time_of_day ?? 'breakfast') === slot);
                if (group.length === 0) return null;
                return (
                  <div key={slot} className="flex flex-col gap-1.5">
                    <div className="text-[10px] uppercase tracking-[0.15em] text-text-sec/40">{t(`suppl.time.${slot}`)}</div>
                    {group.map(s => {
                      const done = s.taken >= s.qty;
                      return (
                        <div key={s.id} className="flex items-center justify-between gap-2">
                          <span className={`text-sm ${done ? 'text-text-sec line-through' : 'text-text'}`}>{s.name}</span>
                          <button disabled={done} onClick={() => handleTakeSuppl(s.id)}
                            className={`text-xs px-3 py-1 rounded-full cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97] ${done ? 'text-text-sec/40' : 'text-accent border border-accent/30 hover:bg-accent/8'}`}>
                            {s.taken}/{s.qty}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            ) : (
              <div className="text-xs text-text-sec/40 italic">
                {t('suppl.noSupplements')} — <button onClick={() => navigate('supplements')} className="text-accent underline cursor-pointer">{t('suppl.manage')}</button>
              </div>
            ),
          },
          {
            key: 'exercise',
            title: t('exercise.title'),
            collapsed: exerciseCollapsed,
            toggle: () => setExerciseCollapsed(v => !v),
            content: <ExerciseSection date={dateStr} weightKg={weightKg} onCaloriesChange={() => {}} />,
          },
          {
            key: 'notes',
            title: t('dash.notes'),
            collapsed: notesCollapsed,
            toggle: () => setNotesCollapsed(v => !v),
            content: (
              <textarea
                value={note}
                onChange={e => handleNoteChange(e.target.value)}
                placeholder={t('dash.notesPlaceholder')}
                rows={3}
                className="w-full bg-bg border border-border/40 rounded-2xl px-4 py-3 text-sm text-text outline-none focus:border-accent resize-none placeholder:text-text-sec/30 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
              />
            ),
          },
        ].map(({ key, title, collapsed, toggle, content }) => (
          <div key={key} className="p-1.5 rounded-[1.75rem] ring-1 ring-border/50 bg-card/30">
            <div className="bg-card rounded-[calc(1.75rem-6px)] overflow-hidden">
              <button
                onClick={toggle}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-card-hover transition-colors duration-300 cursor-pointer"
              >
                <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-text-sec/40">{title}</span>
                <span className={`text-text-sec/30 text-xs transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${collapsed ? '' : 'rotate-180'}`}>▼</span>
              </button>
              {!collapsed && (
                <div className="px-5 pb-5 flex flex-col gap-3 border-t border-border/20 pt-4">
                  {content}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── DIALOGS ─────────────────────────────────────────────────── */}
      <QuickFoodDialog isOpen={quickFoodOpen} onClose={() => setQuickFoodOpen(false)} date={dateStr} meal={meal} onLogged={load} />

      <SwapDaysModal
        isOpen={swapOpen}
        initialDate={dateStr}
        onClose={() => setSwapOpen(false)}
        onSwapped={(n) => { showToast(t('swap.toastSwapped').replace('{n}', String(n)), 'success'); load(); }}
      />

      <Modal isOpen={waterCustomOpen} onClose={() => setWaterCustomOpen(false)} title={t('water.addWater')}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-sec">{t('water.amountMl')}</label>
            <input type="text" inputMode="decimal" value={waterCustomMl} onChange={e => setWaterCustomMl(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleWaterCustom()} autoFocus className={`w-full ${inputCls}`} />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setWaterCustomOpen(false)} className="px-4 py-2 text-sm text-text-sec border border-border rounded-full cursor-pointer transition-colors duration-300">{t('common.cancel')}</button>
            <button onClick={handleWaterCustom} disabled={!waterCustomMl} className="px-4 py-2 text-sm bg-accent text-white rounded-full cursor-pointer hover:opacity-90 disabled:opacity-40 font-medium transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]">{t('common.add')}</button>
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
