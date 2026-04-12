import { useState, useEffect, useCallback, useRef } from 'react';
import { useSettings } from '../hooks/useSettings';
import { useT } from '../i18n/useT';
import { useToast } from '../components/Toast';
import { api } from '../api';
import FoodSearch from '../components/FoodSearch';
import type { SearchItem } from '../components/FoodSearch';
import MealPills from '../components/MealPills';
import MacroChart from '../components/MacroChart';
import MacroBars from '../components/MacroBars';
import type { BarDef } from '../components/MacroBars';
import EntryTable from '../components/EntryTable';
import Modal from '../components/Modal';
import { today, fmtDate } from '../lib/dateUtil';
import { getBarColor } from '../lib/macroCalc';
import ExerciseSection from '../components/ExerciseSection';
import type {
  LogEntry, Food, Recipe, RecipeIngredient, Meal,
  WaterEntry, Streak, SupplementDay, FrequentFood, WeightEntry,
} from '../types';

// ── Quick-food dialog ─────────────────────────────────────────────────────────

interface QuickFoodDialogProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  meal: Meal;
  onLogged: () => void;
}

function QuickFoodDialog({ isOpen, onClose, date, meal, onLogged }: QuickFoodDialogProps) {
  const { t } = useT();
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [grams, setGrams] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [pieceG, setPieceG] = useState('');

  const inputCls = "w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

  async function handleSubmit() {
    if (!name.trim() || !kcal || !grams) return;
    await api.log.addQuick({
      food: {
        name: name.trim(),
        calories: parseFloat(kcal) || 0,
        protein: parseFloat(protein) || 0,
        carbs: parseFloat(carbs) || 0,
        fat: parseFloat(fat) || 0,
        fiber: 0,
        piece_grams: pieceG ? parseFloat(pieceG) : null,
        is_liquid: 0,
      },
      grams: parseFloat(grams),
      meal,
      date,
    });
    setName(''); setKcal(''); setGrams(''); setProtein(''); setCarbs(''); setFat(''); setPieceG('');
    onLogged();
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('qf.title')}>
      <div className="flex flex-col gap-3">
        <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder={t('qf.foodNamePlaceholder')} className={inputCls} />
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-sec">{t('qf.kcalPer100')}</label>
            <input type="number" value={kcal} onChange={e=>setKcal(e.target.value)} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-sec">{t('qf.gramsToLog')}</label>
            <input type="number" value={grams} onChange={e=>setGrams(e.target.value)} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-sec">{t('th.protein')} g/100g ({t('common.opt')})</label>
            <input type="number" value={protein} onChange={e=>setProtein(e.target.value)} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-sec">{t('th.carbs')} g/100g ({t('common.opt')})</label>
            <input type="number" value={carbs} onChange={e=>setCarbs(e.target.value)} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-sec">{t('th.fat')} g/100g ({t('common.opt')})</label>
            <input type="number" value={fat} onChange={e=>setFat(e.target.value)} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-sec">{t('qf.gPerPiece')} ({t('common.opt')})</label>
            <input type="number" value={pieceG} onChange={e=>setPieceG(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-sec border border-border rounded-lg cursor-pointer hover:text-text">{t('common.cancel')}</button>
          <button onClick={handleSubmit} disabled={!name.trim()||!kcal||!grams} className="px-4 py-2 text-sm bg-accent text-white rounded-lg cursor-pointer hover:opacity-90 disabled:opacity-40 font-medium">{t('qf.addAndLog')}</button>
        </div>
      </div>
    </Modal>
  );
}

// ── Recipe editor (inline on dashboard) ──────────────────────────────────────

interface RecipeEditState {
  id: number;
  name: string;
  ingredients: (RecipeIngredient & { editGrams: number })[];
}

// ── DashboardPage ─────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { settings } = useSettings();
  const { t } = useT();
  const { showToast } = useToast();

  const [dateStr, setDateStr]       = useState(today());
  const [planMode, setPlanMode]     = useState(false);

  const [entries, setEntries]       = useState<LogEntry[]>([]);
  const [foods, setFoods]           = useState<Food[]>([]);
  const [recipes, setRecipes]       = useState<Recipe[]>([]);
  const [frequent, setFrequent]     = useState<FrequentFood[]>([]);
  const [favorites, setFavorites]   = useState<Food[]>([]);
  const [waterTotal, setWaterTotal] = useState(0);
  const [waterEntries, setWaterEntries] = useState<WaterEntry[]>([]);
  const [supplements, setSupplements] = useState<SupplementDay[]>([]);
  const [streak, setStreak]         = useState<Streak>({ current: 0, best: 0 });
  const [weightKg, setWeightKg]     = useState(0);
  const [exerciseKcal, setExerciseKcal] = useState(0);
  const [note, setNote]             = useState('');
  const noteSaveTimer = useRef<ReturnType<typeof setTimeout>|null>(null);

  // Form state
  const [selectedFood, setSelectedFood]     = useState<Food|null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeEditState|null>(null);
  const [amount, setAmount]                 = useState('');
  const [usePieces, setUsePieces]           = useState(false);
  const [meal, setMeal]                     = useState<Meal>('Snack');

  // UI state
  const [quickFoodOpen, setQuickFoodOpen] = useState(false);
  const [waterCustomMl, setWaterCustomMl] = useState('');
  const [waterCustomOpen, setWaterCustomOpen] = useState(false);
  const [waterExpanded, setWaterExpanded] = useState(false);

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
    load();
    api.streaks.get().then(setStreak);
    api.supplements.getDay(dateStr).then(setSupplements);
    api.weight.getAll().then((entries: WeightEntry[]) => {
      if (entries.length > 0) setWeightKg(entries[entries.length - 1].weight);
    });
  }, [load, dateStr]);

  // ── Totals ──────────────────────────────────────────────────────────────────

  const loggedEntries  = entries.filter(e => e.status === 'logged');
  const plannedEntries = entries.filter(e => e.status === 'planned');

  const sumEntries = (es: LogEntry[]) => es.reduce(
    (acc, e) => ({ cal: acc.cal + e.calories, protein: acc.protein + e.protein, carbs: acc.carbs + e.carbs, fat: acc.fat + e.fat, fiber: acc.fiber + (e.fiber||0) }),
    { cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );

  const totals  = sumEntries(loggedEntries);
  const planned = sumEntries(plannedEntries);

  const cal    = Math.round(totals.cal * 100) / 100;
  const pro    = Math.round(totals.protein * 100) / 100;
  const carbs  = Math.round(totals.carbs * 100) / 100;
  const fat    = Math.round(totals.fat * 100) / 100;
  const fiber  = Math.round(totals.fiber * 100) / 100;

  const plCal    = Math.round(planned.cal * 100) / 100;
  const plPro    = Math.round(planned.protein * 100) / 100;
  const plCarbs  = Math.round(planned.carbs * 100) / 100;
  const plFat    = Math.round(planned.fat * 100) / 100;
  const plFiber  = Math.round(planned.fiber * 100) / 100;

  const calRec = settings.cal_rec || Math.round(((settings.cal_min||1800)+(settings.cal_max||2200))/2);
  const netCal = cal - exerciseKcal;
  const remaining = calRec - netCal;
  const remainingAbs = Math.abs(Math.round(remaining));
  const remainingAfterPlan = Math.round(remaining - plCal);
  const remColor = getBarColor(netCal, settings.cal_min||1800, settings.cal_max||2200, settings);
  const remColorMap: Record<string, string> = { 'bar-green':'text-green','bar-yellow':'text-yellow','bar-orange':'text-orange-400','bar-red':'text-red' };

  const bars: BarDef[] = [
    { id:'cal',     label:t('macro.kcal'),    actual:netCal, planned:plCal,   min:settings.cal_min||1800, max:settings.cal_max||2200, rec:settings.cal_rec||0,     unit:'kcal' },
    { id:'protein', label:t('macro.protein'), actual:pro,    planned:plPro,   min:settings.protein_min||0, max:settings.protein_max||0, rec:settings.protein_rec||0, unit:'g' },
    { id:'carbs',   label:t('macro.carbs'),   actual:carbs,  planned:plCarbs, min:settings.carbs_min||0, max:settings.carbs_max||0, rec:settings.carbs_rec||0, unit:'g' },
    { id:'fat',     label:t('macro.fat'),     actual:fat,    planned:plFat,   min:settings.fat_min||0,   max:settings.fat_max||0,   rec:settings.fat_rec||0,   unit:'g' },
    { id:'fiber',   label:t('macro.fiber'),   actual:fiber,  planned:plFiber, min:settings.fiber_min||0, max:settings.fiber_max||0, rec:settings.fiber_rec||0, unit:'g' },
  ];

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
      setSelectedFood(food);
      setSelectedRecipe(null);
      setUsePieces(!!(food.piece_grams));
      setAmount(food.piece_grams ? '1' : '');
    }
  }

  function handleClear() { setSelectedFood(null); setSelectedRecipe(null); setAmount(''); }

  const effectiveGrams = selectedFood
    ? (usePieces && selectedFood.piece_grams ? Math.round(parseFloat(amount||'0') * selectedFood.piece_grams * 100)/100 : parseFloat(amount||'0'))
    : 0;

  const logStatus = planMode ? 'planned' : 'logged';

  async function handleLogFood() {
    if (!selectedFood || !effectiveGrams) return;
    await api.log.add({ food_id: selectedFood.id, grams: effectiveGrams, meal, date: dateStr, status: logStatus });
    setSelectedFood(null); setAmount(''); load();
  }

  async function handleLogRecipe() {
    if (!selectedRecipe) return;
    for (const ing of selectedRecipe.ingredients) {
      if (ing.editGrams > 0) {
        await api.log.add({ food_id: ing.food_id, grams: ing.editGrams, meal, date: dateStr, status: logStatus });
      }
    }
    setSelectedRecipe(null); load();
  }

  async function handleConfirmPlanned(id: number) {
    await api.log.confirmPlanned(id);
    load();
  }

  async function handleConfirmAll() {
    await api.log.confirmAllPlanned(dateStr);
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

  // ── Quick-log favorites/frequent ─────────────────────────────────────────────

  async function quickLog(food: Food) {
    await api.log.add({ food_id: food.id, grams: food.piece_grams || 100, meal, date: dateStr });
    load();
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const inputCls = "bg-card border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-text">{fmtDate(dateStr)}</h1>
          <input
            type="date"
            value={dateStr}
            onChange={e => setDateStr(e.target.value)}
            className="text-xs bg-card border border-border rounded-lg px-2 py-1 text-text-sec focus:outline-none focus:border-accent cursor-pointer"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* Plan mode toggle */}
          <button
            onClick={() => setPlanMode(v => !v)}
            className={[
              'text-sm border rounded-lg px-3 py-1.5 cursor-pointer transition-colors',
              planMode
                ? 'bg-accent/15 border-accent text-accent font-medium'
                : 'border-border text-text-sec hover:border-accent/50 hover:text-text',
            ].join(' ')}
          >
            {planMode ? '📋 Planning' : '📋 Plan'}
          </button>
          <button onClick={()=>setQuickFoodOpen(true)} className="text-sm text-accent border border-accent/40 rounded-lg px-3 py-1.5 hover:bg-accent/10 cursor-pointer transition-colors">
            {t('dash.quickAdd')}
          </button>
        </div>
      </div>

      {/* Confirm all planned banner */}
      {plannedEntries.length > 0 && (
        <div className="flex items-center justify-between gap-3 bg-accent/8 border border-accent/25 rounded-xl px-4 py-2.5">
          <div className="text-sm text-text">
            <span className="font-medium text-accent">{plannedEntries.length}</span> planned {plannedEntries.length === 1 ? 'entry' : 'entries'} ·{' '}
            <span className="text-text-sec">{Math.round(planned.cal)} kcal planned</span>
          </div>
          <button
            onClick={handleConfirmAll}
            className="text-sm font-medium text-accent border border-accent/40 rounded-lg px-3 py-1 hover:bg-accent/10 cursor-pointer transition-colors"
          >
            Confirm All
          </button>
        </div>
      )}

      {/* Macros summary card */}
      <div className="bg-card border border-border rounded-xl p-5 flex gap-4 items-start">
        <MacroChart
          protein={pro} carbs={carbs} fat={fat} calories={cal}
          plannedProtein={plPro} plannedCarbs={plCarbs} plannedFat={plFat} plannedCalories={plCal}
          plannedLabel={t('dash.planned')}
        />
        <div className="flex-1 flex flex-col gap-3">
          {/* Budget */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`text-sm font-semibold ${remColorMap[remColor]||'text-text'}`}>
              {remaining >= 0
                ? `${remainingAbs} ${t('macro.kcal')} ${t('dash.remaining')}`
                : `${t('dash.overBy')} ${remainingAbs} ${t('macro.kcal')}`}
            </div>
            {plCal > 0 && (
              <div className="text-xs text-accent tabular-nums">
                {remainingAfterPlan >= 0
                  ? `${remainingAfterPlan} ${t('dash.afterPlan')}`
                  : `${Math.abs(remainingAfterPlan)} ${t('dash.overAfterPlan')}`}
              </div>
            )}
            {exerciseKcal > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-text-sec">
                <span className="tabular-nums">{Math.round(cal)} in</span>
                <span>−</span>
                <span className="text-green tabular-nums">{Math.round(exerciseKcal)} burned</span>
                <span>=</span>
                <span className="font-medium text-text tabular-nums">{Math.round(netCal)} net</span>
              </div>
            )}
          </div>
          {/* Macro bars */}
          <MacroBars bars={bars} settings={settings} />
        </div>
      </div>

      {/* Streak + supplements */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Streak */}
        <div className="bg-card border border-border rounded-xl p-4 flex gap-6">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-text-sec">{t('streak.current')}</span>
            <span className="text-2xl font-bold text-accent tabular-nums">{streak.current}</span>
            <span className="text-xs text-text-sec">{t('streak.days')}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-text-sec">{t('streak.best')}</span>
            <span className="text-2xl font-bold text-text tabular-nums">{streak.best}</span>
            <span className="text-xs text-text-sec">{t('streak.days')}</span>
          </div>
        </div>

        {/* Supplements */}
        {supplements.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-xs font-semibold text-text-sec uppercase tracking-wider mb-2">{t('suppl.dashTitle')}</h3>
            <div className="flex flex-col gap-1.5">
              {supplements.map(s => {
                const done = s.taken >= s.qty;
                return (
                  <div key={s.id} className="flex items-center justify-between gap-2">
                    <span className={`text-sm ${done ? 'text-text-sec line-through' : 'text-text'}`}>{s.name}</span>
                    <button
                      disabled={done}
                      onClick={()=>handleTakeSuppl(s.id)}
                      className={`text-xs px-2 py-0.5 rounded cursor-pointer transition-colors ${done?'text-text-sec':'text-accent border border-accent/40 hover:bg-accent/10'}`}
                    >
                      {s.taken}/{s.qty}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Water */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-text-sec uppercase tracking-wider">{t('dash.water')}</h3>
          <span className="text-xs text-text-sec tabular-nums">{Math.round(waterTotal)} / {waterGoal} ml</span>
        </div>
        <div className="w-full h-2 rounded-full mb-3" style={{ background: 'var(--border)' }}>
          <div className="h-full rounded-full bg-accent transition-[width] duration-400" style={{ width: `${waterPct}%` }} />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={()=>addWater(200)} className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-sec hover:border-accent hover:text-accent cursor-pointer transition-colors">+200ml</button>
          <button onClick={()=>addWater(500)} className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-sec hover:border-accent hover:text-accent cursor-pointer transition-colors">+500ml</button>
          <button onClick={()=>setWaterCustomOpen(true)} className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-sec hover:border-accent hover:text-accent cursor-pointer transition-colors">{t('dash.custom')}</button>
          {waterEntries.length > 0 && (
            <button onClick={()=>setWaterExpanded(e=>!e)} className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-sec cursor-pointer ml-auto">
              {waterExpanded ? '▲' : '▼'}
            </button>
          )}
        </div>
        {waterExpanded && waterEntries.length > 0 && (
          <div className="flex flex-col gap-1 mt-2">
            {waterEntries.map(e=>(
              <div key={e.id} className="flex items-center gap-2 text-xs text-text-sec">
                <span className="tabular-nums">{Math.round(e.ml)}ml</span>
                <span className="text-text-sec/60">{e.source === 'manual' ? t('water.manual') : `↩ ${e.source}`}</span>
                <button onClick={()=>deleteWater(e.id)} className="ml-auto text-text-sec hover:text-red cursor-pointer">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Exercise */}
      <ExerciseSection date={dateStr} weightKg={weightKg} onCaloriesChange={setExerciseKcal} />

      {/* Favorites + frequent */}
      {favorites.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-text-sec uppercase tracking-wider mb-2">⭐ Favorites</h3>
          <div className="flex flex-wrap gap-2">
            {favorites.map(f=>(
              <button key={f.id} onClick={()=>quickLog(f)} className="text-sm px-3 py-1.5 rounded-lg bg-card border border-border text-text-sec hover:border-accent hover:text-accent cursor-pointer transition-colors">
                {f.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {frequent.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-text-sec uppercase tracking-wider mb-2">{t('dash.frequent')}</h3>
          <div className="flex flex-wrap gap-2">
            {frequent.slice(0,8).map(f=>(
              <button key={f.id} onClick={()=>quickLog(f)} title={`${f.use_count}× · ${f.calories} kcal/100g`} className="text-sm px-3 py-1.5 rounded-lg bg-card border border-border text-text-sec hover:border-accent hover:text-accent cursor-pointer transition-colors">
                {f.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Log food section */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-text">{t('dash.logFood')}</h3>
        <FoodSearch items={searchItems} onSelect={handleSelect} onClear={handleClear} placeholder={t('dash.searchPlaceholder')} />

        {/* Food log form */}
        {selectedFood && (
          <div className="flex flex-col gap-3">
            {/* Food preview */}
            <div className="flex flex-wrap gap-3 text-xs text-text-sec bg-bg rounded-lg px-3 py-2">
              <span className="text-text font-medium">{selectedFood.name}</span>
              <span>{t('common.per100g')}:</span>
              <span><span className="text-text font-medium">{selectedFood.calories}</span> kcal</span>
              <span><span className="text-text font-medium">{selectedFood.protein}</span>g {t('macro.protein')}</span>
              <span><span className="text-text font-medium">{selectedFood.carbs}</span>g {t('macro.carbs')}</span>
              <span><span className="text-text font-medium">{selectedFood.fat}</span>g {t('macro.fat')}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="number"
                value={amount}
                onChange={e=>setAmount(e.target.value)}
                placeholder={usePieces ? `${t('common.pieces')} (${selectedFood.piece_grams}g)` : t('common.grams')}
                className={`w-32 ${inputCls}`}
              />
              {selectedFood.piece_grams && (
                <button type="button" onClick={()=>{ setUsePieces(v=>!v); setAmount(''); }} className="text-xs text-accent underline cursor-pointer">
                  {usePieces ? t('dash.switchToGrams') : t('dash.switchToPieces')}
                </button>
              )}
              {effectiveGrams > 0 && !usePieces && (
                <span className="text-xs text-text-sec">= {Math.round(selectedFood.calories * effectiveGrams / 100)} kcal</span>
              )}
            </div>
            <MealPills selected={meal} onChange={setMeal} />
            <div className="flex gap-2">
              <button onClick={handleLogFood} disabled={!effectiveGrams} className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer hover:opacity-90 disabled:opacity-40">
                {planMode ? 'Add to Plan' : t('common.add')}
              </button>
              <button onClick={handleClear} className="border border-border text-text-sec px-4 py-2 rounded-lg text-sm cursor-pointer hover:text-text">{t('common.cancel')}</button>
            </div>
          </div>
        )}

        {/* Recipe editor */}
        {selectedRecipe && (
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-text">{selectedRecipe.name}</h4>
            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
              {selectedRecipe.ingredients.map((ing, i) => {
                const ratio = ing.editGrams / ing.grams;
                return (
                  <div key={ing.id} className="flex items-center gap-2 bg-bg rounded-lg px-3 py-2">
                    <span className="flex-1 text-sm text-text truncate">{ing.name}</span>
                    <input
                      type="number"
                      value={ing.editGrams}
                      min={0}
                      step={0.1}
                      onChange={e=>{
                        const val = parseFloat(e.target.value)||0;
                        setSelectedRecipe(r=>r ? { ...r, ingredients: r.ingredients.map((x,j)=>j===i?{...x,editGrams:val}:x) } : r);
                      }}
                      className={`w-20 ${inputCls}`}
                    />
                    <span className="text-xs text-text-sec">g</span>
                    <span className="text-xs text-text-sec tabular-nums">{Math.round(ing.calories*ratio)} kcal</span>
                  </div>
                );
              })}
            </div>
            <MealPills selected={meal} onChange={setMeal} />
            <div className="flex gap-2">
              <button onClick={handleLogRecipe} className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer hover:opacity-90">
                {planMode ? 'Add to Plan' : t('dash.logRecipe')}
              </button>
              <button onClick={handleClear} className="border border-border text-text-sec px-4 py-2 rounded-lg text-sm cursor-pointer hover:text-text">{t('common.cancel')}</button>
            </div>
          </div>
        )}
      </div>

      {/* Entries table */}
      <div>
        <h3 className="text-xs font-semibold text-text-sec uppercase tracking-wider mb-3">{t('dash.todayEntries')}</h3>
        {entries.length === 0
          ? <p className="text-text-sec text-sm">{t('dash.nothingLogged')}</p>
          : <EntryTable entries={entries} foods={foods} onRefresh={load} onConfirm={handleConfirmPlanned} />}
      </div>

      {/* Notes */}
      <div>
        <h3 className="text-xs font-semibold text-text-sec uppercase tracking-wider mb-2">{t('dash.notes')}</h3>
        <textarea
          value={note}
          onChange={e=>handleNoteChange(e.target.value)}
          placeholder={t('dash.notesPlaceholder')}
          rows={3}
          className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-text outline-none focus:border-accent resize-none placeholder:text-text-sec"
        />
      </div>

      {/* Dialogs */}
      <QuickFoodDialog
        isOpen={quickFoodOpen}
        onClose={()=>setQuickFoodOpen(false)}
        date={dateStr}
        meal={meal}
        onLogged={load}
      />

      <Modal isOpen={waterCustomOpen} onClose={()=>setWaterCustomOpen(false)} title={t('water.addWater')}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-sec">{t('water.amountMl')}</label>
            <input
              type="number"
              value={waterCustomMl}
              onChange={e=>setWaterCustomMl(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&handleWaterCustom()}
              autoFocus
              className={`w-full ${inputCls}`}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={()=>setWaterCustomOpen(false)} className="px-4 py-2 text-sm text-text-sec border border-border rounded-lg cursor-pointer">{t('common.cancel')}</button>
            <button onClick={handleWaterCustom} disabled={!waterCustomMl} className="px-4 py-2 text-sm bg-accent text-white rounded-lg cursor-pointer hover:opacity-90 disabled:opacity-40 font-medium">{t('common.add')}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
