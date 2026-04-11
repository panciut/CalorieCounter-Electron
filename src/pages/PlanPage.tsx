import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import FoodSearch from '../components/FoodSearch';
import type { SearchItem } from '../components/FoodSearch';
import MealPills from '../components/MealPills';
import EntryTable from '../components/EntryTable';
import { today, fmtDate } from '../lib/dateUtil';
import type { LogEntry, Food, Recipe, Meal } from '../types';

function getTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function PlanPage() {
  const [dateStr, setDateStr] = useState(getTomorrow());
  const [entries, setEntries]   = useState<LogEntry[]>([]);
  const [foods, setFoods]       = useState<Food[]>([]);
  const [recipes, setRecipes]   = useState<Recipe[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [amount, setAmount]     = useState('');
  const [meal, setMeal]         = useState<Meal>('Breakfast');

  const load = useCallback(async () => {
    const [ent, fds, rcs] = await Promise.all([
      api.log.getDay(dateStr),
      api.foods.getAll(),
      api.recipes.getAll(),
    ]);
    setEntries(ent);
    setFoods(fds);
    setRecipes(rcs);
  }, [dateStr]);

  useEffect(() => { load(); }, [load]);

  const searchItems: SearchItem[] = [
    ...foods.map(f => ({ ...f, isRecipe: false as const, _freq: 0 })),
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

  async function handleConfirmAll() {
    await api.log.confirmAllPlanned(dateStr);
    load();
  }

  async function handleConfirmEntry(id: number) {
    await api.log.confirmPlanned(id);
    load();
  }

  const plannedEntries = entries.filter(e => e.status === 'planned');
  const loggedEntries  = entries.filter(e => e.status === 'logged');
  const totalPlanned   = Math.round(plannedEntries.reduce((s, e) => s + e.calories, 0));
  const totalLogged    = Math.round(loggedEntries.reduce((s, e) => s + e.calories, 0));

  const isToday = dateStr === today();
  const isPast  = dateStr < today();
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
      </div>

      {/* Summary banner */}
      {(plannedEntries.length > 0 || loggedEntries.length > 0) && (
        <div className="flex items-center justify-between gap-3 bg-accent/8 border border-accent/25 rounded-xl px-4 py-3">
          <div className="flex gap-4 text-sm">
            {loggedEntries.length > 0 && (
              <span className="text-text-sec">
                <span className="text-text font-medium">{totalLogged}</span> kcal logged
              </span>
            )}
            {plannedEntries.length > 0 && (
              <span className="text-text-sec">
                <span className="text-accent font-medium">{plannedEntries.length}</span> planned ·{' '}
                <span className="text-accent font-medium">{totalPlanned}</span> kcal
              </span>
            )}
          </div>
          {canConfirm && plannedEntries.length > 0 && (
            <button
              onClick={handleConfirmAll}
              className="text-sm font-medium text-accent border border-accent/40 rounded-lg px-3 py-1 hover:bg-accent/10 cursor-pointer transition-colors"
            >
              Confirm All
            </button>
          )}
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
