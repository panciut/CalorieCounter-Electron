import { useEffect, useState } from 'react';
import { useT } from '../i18n/useT';
import { useNavigate } from '../hooks/useNavigate';
import { api } from '../api';
import EntryTable from '../components/EntryTable';
import MealPills from '../components/MealPills';
import FoodSearch from '../components/FoodSearch';
import type { SearchItem } from '../components/FoodSearch';
import { fmtDate, today } from '../lib/dateUtil';
import type { LogEntry, Food, Meal } from '../types';

interface DayPageProps { date?: string; fromWeek?: string; }

export default function DayPage({ date: dateProp, fromWeek }: DayPageProps) {
  const { t } = useT();
  const { navigate } = useNavigate();

  const date = dateProp ?? today();

  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [amount, setAmount] = useState('');
  const [meal, setMeal] = useState<Meal>('Breakfast');

  const loadEntries = async () => {
    const data = await api.log.getDay(date);
    setEntries(data);
  };

  useEffect(() => {
    loadEntries();
    api.foods.getAll().then(setFoods);
  }, [date]);

  const handleBack = () => {
    if (fromWeek) navigate('week', { weekStart: fromWeek });
    else navigate('history');
  };

  const handleSelect = (item: SearchItem) => {
    if (!item.isRecipe) {
      setSelectedFood(item as Food);
      if ((item as Food).piece_grams) setAmount(String((item as Food).piece_grams));
    }
  };

  const handleAdd = async () => {
    if (!selectedFood || !amount) return;
    await api.log.add({ food_id: selectedFood.id, grams: parseFloat(amount), meal, date });
    setSelectedFood(null);
    setAmount('');
    await loadEntries();
  };

  const totalCalories = entries.reduce((s, e) => s + e.calories, 0);
  const totalProtein  = entries.reduce((s, e) => s + e.protein, 0);
  const totalCarbs    = entries.reduce((s, e) => s + e.carbs, 0);
  const totalFat      = entries.reduce((s, e) => s + e.fat, 0);
  const totalFiber    = entries.reduce((s, e) => s + (e.fiber || 0), 0);

  const searchItems: SearchItem[] = foods.map(f => ({ ...f, isRecipe: false as const }));

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <button className="text-accent text-sm hover:opacity-80 cursor-pointer" onClick={handleBack}>
        {t('day.back')}
      </button>

      <h1 className="text-2xl font-bold text-text">{fmtDate(date)}</h1>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: t('macro.kcal'),    value: `${Math.round(totalCalories)}` },
          { label: t('macro.protein'), value: `${Math.round(totalProtein)}g` },
          { label: t('macro.carbs'),   value: `${Math.round(totalCarbs)}g` },
          { label: t('macro.fat'),     value: `${Math.round(totalFat)}g` },
          { label: t('macro.fiber'),   value: `${Math.round(totalFiber)}g` },
        ].map(item => (
          <div key={item.label} className="bg-card rounded-xl p-3 border border-border text-center">
            <p className="text-xs text-text-sec mb-1">{item.label}</p>
            <p className="font-semibold text-text text-sm tabular-nums">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Add entry */}
      <div className="bg-card rounded-xl p-4 border border-border space-y-3">
        <h2 className="text-base font-semibold text-text">{t('day.addEntry')}</h2>
        <FoodSearch items={searchItems} onSelect={handleSelect} placeholder={t('dash.searchPlaceholder')} />
        <div className="flex gap-3 items-center flex-wrap">
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder={t('common.grams')}
            className="w-28 bg-bg border border-border rounded-lg px-3 py-2 text-text text-sm outline-none focus:border-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="text-text-sec text-xs">{t('common.grams')}</span>
        </div>
        <MealPills selected={meal} onChange={setMeal} />
        <button
          onClick={handleAdd}
          disabled={!selectedFood || !amount}
          className="bg-accent text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity cursor-pointer"
        >
          {t('common.add')}
        </button>
      </div>

      {/* Entries */}
      <div>
        <h2 className="text-base font-semibold text-text mb-3">{t('day.entries')}</h2>
        {entries.length === 0 ? (
          <p className="text-text-sec text-sm">{t('day.nothingLogged')}</p>
        ) : (
          <EntryTable entries={entries} foods={foods} onRefresh={loadEntries} />
        )}
      </div>
    </div>
  );
}
