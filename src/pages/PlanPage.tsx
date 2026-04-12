import { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../hooks/useSettings';
import { useT } from '../i18n/useT';
import { useToast } from '../components/Toast';
import { api } from '../api';
import { buildPlanMarkdown, copyToClipboard } from '../lib/exportText';
import FoodSearch from '../components/FoodSearch';
import type { SearchItem } from '../components/FoodSearch';
import MealPills from '../components/MealPills';
import EntryTable from '../components/EntryTable';
import MacroChart from '../components/MacroChart';
import MacroBars from '../components/MacroBars';
import type { BarDef } from '../components/MacroBars';
import { today, fmtDate } from '../lib/dateUtil';
import { getBarColor } from '../lib/macroCalc';
import type { LogEntry, Food, Recipe, Meal, FrequentFood } from '../types';

function getTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function PlanPage() {
  const { settings } = useSettings();
  const { t } = useT();
  const { showToast } = useToast();
  const [dateStr, setDateStr]         = useState(getTomorrow());
  const [entries, setEntries]         = useState<LogEntry[]>([]);
  const [foods, setFoods]             = useState<Food[]>([]);
  const [recipes, setRecipes]         = useState<Recipe[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [amount, setAmount]             = useState('');
  const [meal, setMeal]                 = useState<Meal>('Breakfast');
  const [favorites, setFavorites]       = useState<Food[]>([]);
  const [frequent, setFrequent]         = useState<FrequentFood[]>([]);

  const load = useCallback(async () => {
    const [ent, fds, rcs, fav, freq] = await Promise.all([
      api.log.getDay(dateStr),
      api.foods.getAll(),
      api.recipes.getAll(),
      api.foods.getFavorites(),
      api.foods.getFrequent(8),
    ]);
    setEntries(ent);
    setFoods(fds);
    setRecipes(rcs);
    setFavorites(fav);
    setFrequent(freq);
  }, [dateStr]);

  useEffect(() => { load(); }, [load]);

  const freqMap = new Map(frequent.map(f => [f.id, f.use_count]));
  const searchItems: SearchItem[] = [
    ...foods.map(f => ({ ...f, isRecipe: false as const, _freq: freqMap.get(f.id) || 0 })),
    ...recipes.map(r => ({ ...r, isRecipe: true as const, _freq: 0 })),
  ];

  function handleSelect(item: SearchItem) {
    if (!item.isRecipe) {
      const food = item as Food;
      setSelectedFood(food);
      setAmount(food.piece_grams ? '1' : '');
    }
  }

  async function handleAdd() {
    if (!selectedFood || !amount) return;
    const grams = selectedFood.piece_grams
      ? parseFloat(amount) * selectedFood.piece_grams
      : parseFloat(amount);
    await api.log.add({ food_id: selectedFood.id, grams, meal, date: dateStr, status: 'planned' });
    setSelectedFood(null); setAmount('');
    load();
  }

  async function quickPlan(food: Food) {
    const grams = food.piece_grams || 100;
    await api.log.add({ food_id: food.id, grams, meal: 'Snack', date: dateStr, status: 'planned' });
    load();
  }

  async function handleConfirmAll() {
    await api.log.confirmAllPlanned(dateStr);
    load();
  }

  async function handleConfirmEntry(id: number) {
    await api.log.confirmPlanned(id);
    load();
  }

  async function handleCopy() {
    const md = buildPlanMarkdown(dateStr, entries, settings);
    const ok = await copyToClipboard(md);
    showToast(ok ? t('export.copied') : t('export.copyFailed'), ok ? 'success' : 'error');
  }

  // ── Totals ──────────────────────────────────────────────────────────────────

  const plannedEntries = entries.filter(e => e.status === 'planned');
  const loggedEntries  = entries.filter(e => e.status === 'logged');

  const sum = (es: LogEntry[]) => es.reduce(
    (acc, e) => ({
      cal:     acc.cal     + e.calories,
      protein: acc.protein + e.protein,
      carbs:   acc.carbs   + e.carbs,
      fat:     acc.fat     + e.fat,
      fiber:   acc.fiber   + (e.fiber || 0),
    }),
    { cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );

  // Combined = what the full day will look like (planned + already logged)
  const combined = sum(entries);
  const loggedT  = sum(loggedEntries);

  const cal     = Math.round(combined.cal);
  const pro     = Math.round(combined.protein * 10) / 10;
  const carbs   = Math.round(combined.carbs   * 10) / 10;
  const fat     = Math.round(combined.fat     * 10) / 10;
  const fiber   = Math.round(combined.fiber   * 10) / 10;

  const calRec  = settings.cal_rec || Math.round(((settings.cal_min || 1800) + (settings.cal_max || 2200)) / 2);
  const remaining    = calRec - cal;
  const remainingAbs = Math.abs(remaining);
  const remColor     = getBarColor(cal, settings.cal_min || 1800, settings.cal_max || 2200, settings);
  const remColorMap: Record<string, string> = {
    'bar-green': 'text-green', 'bar-yellow': 'text-yellow',
    'bar-orange': 'text-orange-400', 'bar-red': 'text-red',
  };

  const bars: BarDef[] = [
    { id: 'cal',     label: t('macro.kcal'),    actual: cal,   min: settings.cal_min     || 1800, max: settings.cal_max     || 2200, rec: settings.cal_rec     || 0, unit: 'kcal' },
    { id: 'protein', label: t('macro.protein'), actual: pro,   min: settings.protein_min || 0,    max: settings.protein_max || 0,    rec: settings.protein_rec || 0, unit: 'g' },
    { id: 'carbs',   label: t('macro.carbs'),   actual: carbs, min: settings.carbs_min   || 0,    max: settings.carbs_max   || 0,    rec: settings.carbs_rec   || 0, unit: 'g' },
    { id: 'fat',     label: t('macro.fat'),     actual: fat,   min: settings.fat_min     || 0,    max: settings.fat_max     || 0,    rec: settings.fat_rec     || 0, unit: 'g' },
    { id: 'fiber',   label: t('macro.fiber'),   actual: fiber, min: settings.fiber_min   || 0,    max: settings.fiber_max   || 0,    rec: settings.fiber_rec   || 0, unit: 'g' },
  ];

  const isToday  = dateStr === today();
  const isPast   = dateStr < today();
  const canConfirm = isToday || isPast;

  const inputCls = "bg-card border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

  return (
    <div className="p-6 max-w-3xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-text">Plan</h1>
        <input
          type="date"
          value={dateStr}
          onChange={e => setDateStr(e.target.value)}
          className="text-xs bg-card border border-border rounded-lg px-2 py-1 text-text-sec focus:outline-none focus:border-accent cursor-pointer"
        />
        <span className="text-sm text-text-sec">{fmtDate(dateStr)}</span>
        <button onClick={handleCopy} className="ml-auto text-sm text-text-sec border border-border rounded-lg px-3 py-1.5 hover:border-accent/50 hover:text-text cursor-pointer transition-colors">
          📋 {t('export.copyPlan')}
        </button>
      </div>

      {/* Macro summary card — shows projected totals for the day */}
      {entries.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5 flex gap-4 items-start">
          <MacroChart protein={pro} carbs={carbs} fat={fat} calories={cal} />
          <div className="flex-1 flex flex-col gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className={`text-sm font-semibold ${remColorMap[remColor] || 'text-text'}`}>
                {remaining >= 0
                  ? `${remainingAbs} ${t('macro.kcal')} ${t('dash.remaining')}`
                  : `${t('dash.overBy')} ${remainingAbs} ${t('macro.kcal')}`}
              </div>
              {loggedEntries.length > 0 && plannedEntries.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-text-sec">
                  <span className="tabular-nums">{Math.round(loggedT.cal)} logged</span>
                  <span>+</span>
                  <span className="text-accent tabular-nums">{Math.round(combined.cal - loggedT.cal)} planned</span>
                  <span>=</span>
                  <span className="font-medium text-text tabular-nums">{cal} projected</span>
                </div>
              )}
              {loggedEntries.length === 0 && plannedEntries.length > 0 && (
                <span className="text-xs text-text-sec">projected from plan</span>
              )}
            </div>
            <MacroBars bars={bars} settings={settings} />
          </div>
        </div>
      )}

      {/* Confirm all banner */}
      {canConfirm && plannedEntries.length > 0 && (
        <div className="flex items-center justify-between gap-3 bg-accent/8 border border-accent/25 rounded-xl px-4 py-2.5">
          <div className="text-sm text-text-sec">
            <span className="text-accent font-medium">{plannedEntries.length}</span> planned ·{' '}
            <span className="text-accent font-medium">{Math.round(sum(plannedEntries).cal)}</span> kcal
          </div>
          <button
            onClick={handleConfirmAll}
            className="text-sm font-medium text-accent border border-accent/40 rounded-lg px-3 py-1 hover:bg-accent/10 cursor-pointer transition-colors"
          >
            Confirm All
          </button>
        </div>
      )}

      {/* Favorites */}
      {favorites.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-text-sec uppercase tracking-wider mb-2">⭐ Favorites</h3>
          <div className="flex flex-wrap gap-2">
            {favorites.map(f => (
              <button
                key={f.id}
                onClick={() => quickPlan(f)}
                className="text-sm px-3 py-1.5 rounded-lg bg-card border border-border text-text-sec hover:border-accent hover:text-accent cursor-pointer transition-colors"
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Frequent */}
      {frequent.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-text-sec uppercase tracking-wider mb-2">{t('dash.frequent')}</h3>
          <div className="flex flex-wrap gap-2">
            {frequent.map(f => (
              <button
                key={f.id}
                onClick={() => quickPlan(f)}
                title={`${f.use_count}× · ${f.calories} kcal/100g`}
                className="text-sm px-3 py-1.5 rounded-lg bg-card border border-border text-text-sec hover:border-accent hover:text-accent cursor-pointer transition-colors"
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add planned food */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-text">Add to plan</h3>
        <FoodSearch
          items={searchItems}
          onSelect={handleSelect}
          onClear={() => { setSelectedFood(null); setAmount(''); }}
          placeholder="Search food…"
          clearAfterSelect
        />
        {selectedFood && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder={selectedFood.piece_grams ? 'pieces' : 'grams'}
                className={`w-28 ${inputCls}`}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
              <span className="text-xs text-text-sec">
                {selectedFood.name} · {Math.round(selectedFood.calories * (selectedFood.piece_grams ? parseFloat(amount || '0') * selectedFood.piece_grams : parseFloat(amount || '0')) / 100)} kcal
              </span>
            </div>
            <MealPills selected={meal} onChange={setMeal} />
            <div className="flex gap-2">
              <button onClick={handleAdd} disabled={!amount} className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer hover:opacity-90 disabled:opacity-40">
                Add to Plan
              </button>
              <button onClick={() => setSelectedFood(null)} className="border border-border text-text-sec px-4 py-2 rounded-lg text-sm cursor-pointer hover:text-text">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Planned entries */}
      {plannedEntries.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-text-sec uppercase tracking-wider mb-3">Planned</h3>
          <EntryTable entries={plannedEntries} foods={foods} onRefresh={load} onConfirm={canConfirm ? handleConfirmEntry : undefined} />
        </div>
      )}

      {/* Logged entries */}
      {loggedEntries.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-text-sec uppercase tracking-wider mb-3">Logged</h3>
          <EntryTable entries={loggedEntries} foods={foods} onRefresh={load} />
        </div>
      )}

      {entries.length === 0 && (
        <p className="text-text-sec text-sm text-center py-8">Nothing planned for this date. Add something above.</p>
      )}
    </div>
  );
}
