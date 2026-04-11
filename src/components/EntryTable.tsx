import { useState, Fragment } from 'react';
import { useT } from '../i18n/useT';
import { api } from '../api';
import type { LogEntry, Food, Meal } from '../types';

const MEAL_ORDER: Meal[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

interface EntryTableProps {
  entries: LogEntry[];
  foods: Food[];
  onRefresh: () => void;
}

interface EditState {
  id: number;
  food_id: number;
  grams: number;
  meal: Meal;
}

export default function EntryTable({ entries, foods, onRefresh }: EntryTableProps) {
  const { t, tMeal } = useT();
  const [editing, setEditing] = useState<EditState | null>(null);

  if (!entries.length) {
    return <p className="text-text-sec text-sm py-4">{t('dash.nothingLogged')}</p>;
  }

  const groups: Record<Meal, LogEntry[]> = { Breakfast: [], Lunch: [], Dinner: [], Snack: [] };
  for (const e of entries) groups[e.meal as Meal]?.push(e);

  async function handleDelete(id: number) {
    await api.log.delete(id);
    onRefresh();
  }

  async function handleSave() {
    if (!editing) return;
    await api.log.update({ id: editing.id, food_id: editing.food_id, grams: editing.grams, meal: editing.meal });
    setEditing(null);
    onRefresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {MEAL_ORDER.filter(m => groups[m].length > 0).map(meal => (
        <div key={meal}>
          <div className="text-xs text-text-sec uppercase tracking-wider font-semibold py-1 mb-1 border-b border-border">
            {tMeal(meal)}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-sec text-xs">
                <th className="pb-1 font-medium">{t('th.food')}</th>
                <th className="pb-1 font-medium w-12 text-right">{t('th.g')}</th>
                <th className="pb-1 font-medium w-14 text-right">{t('th.kcal')}</th>
                <th className="pb-1 font-medium w-14 text-right">{t('th.protein')}</th>
                <th className="pb-1 font-medium w-14 text-right">{t('th.carbs')}</th>
                <th className="pb-1 font-medium w-14 text-right">{t('th.fat')}</th>
                <th className="pb-1 font-medium w-14 text-right">{t('th.fiber')}</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody>
              {groups[meal].map(e => (
                <Fragment key={e.id}>
                  <tr className="border-t border-border/40 hover:bg-card-hover/30">
                    <td className="py-1.5 pr-2">{e.name}</td>
                    <td className="py-1.5 text-right tabular-nums">{Math.round(e.grams * 10) / 10}</td>
                    <td className="py-1.5 text-right tabular-nums">{e.calories}</td>
                    <td className="py-1.5 text-right tabular-nums text-text-sec">{e.protein}g</td>
                    <td className="py-1.5 text-right tabular-nums text-text-sec">{e.carbs}g</td>
                    <td className="py-1.5 text-right tabular-nums text-text-sec">{e.fat}g</td>
                    <td className="py-1.5 text-right tabular-nums text-text-sec">{e.fiber || 0}g</td>
                    <td className="py-1.5 text-right">
                      <button onClick={() => setEditing({ id: e.id, food_id: e.food_id, grams: e.grams, meal: e.meal as Meal })}
                        className="text-text-sec hover:text-text px-1 cursor-pointer transition-colors">✎</button>
                      <button onClick={() => handleDelete(e.id)}
                        className="text-text-sec hover:text-red px-1 cursor-pointer transition-colors">✕</button>
                    </td>
                  </tr>
                  {editing?.id === e.id && (
                    <tr className="bg-card-hover/50">
                      <td colSpan={8} className="py-2 px-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <select
                            value={editing.food_id}
                            onChange={ev => setEditing({ ...editing, food_id: +ev.target.value })}
                            className="bg-card border border-border rounded px-2 py-1 text-sm text-text outline-none focus:border-accent"
                          >
                            {foods.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                          </select>
                          <input type="number" value={editing.grams} min="0.1" step="0.1"
                            onChange={ev => setEditing({ ...editing, grams: +ev.target.value })}
                            className="w-20 bg-card border border-border rounded px-2 py-1 text-sm text-text outline-none focus:border-accent" />
                          <select value={editing.meal}
                            onChange={ev => setEditing({ ...editing, meal: ev.target.value as Meal })}
                            className="bg-card border border-border rounded px-2 py-1 text-sm text-text outline-none focus:border-accent">
                            {(['Breakfast','Lunch','Dinner','Snack'] as Meal[]).map(m =>
                              <option key={m} value={m}>{tMeal(m)}</option>)}
                          </select>
                          <button onClick={handleSave}
                            className="bg-accent text-white rounded px-3 py-1 text-sm cursor-pointer hover:brightness-110">
                            {t('common.save')}
                          </button>
                          <button onClick={() => setEditing(null)}
                            className="border border-border text-text-sec rounded px-3 py-1 text-sm cursor-pointer hover:text-text">
                            {t('common.cancel')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
