import { useState } from 'react';
import FoodSearch, { type SearchItem } from './FoodSearch';
import MacroChips from './ui/MacroChips';
import { useT } from '../i18n/useT';
import { scaleNutrients } from '../lib/macroCalc';
import type { Food } from '../types';

interface AddFoodRowProps {
  foods: Food[];
  onAdd: (food: Food, grams: number) => void;
}

export default function AddFoodRow({ foods, onAdd }: AddFoodRowProps) {
  const { t } = useT();
  const [selected, setSelected] = useState<Food | null>(null);
  const [amount, setAmount]     = useState('');
  const [usePieces, setUsePieces] = useState(false);
  const [searchKey, setSearchKey] = useState(0);

  const items: SearchItem[] = foods.map(f => ({ ...f, isRecipe: false as const }));

  function handleSelect(item: SearchItem) {
    if (item.isRecipe) return;
    const food = item as Food;
    setSelected(food);
    setUsePieces(!!food.piece_grams);
    setAmount(food.piece_grams ? '1' : '');
  }

  function handleClear() {
    setSelected(null);
    setAmount('');
    setUsePieces(false);
  }

  const effectiveGrams = selected
    ? (usePieces && selected.piece_grams
        ? Math.round(parseFloat(amount || '0') * selected.piece_grams * 100) / 100
        : parseFloat(amount || '0'))
    : 0;

  function handleAdd() {
    if (!selected || !effectiveGrams) return;
    onAdd(selected, effectiveGrams);
    handleClear();
    setSearchKey(k => k + 1);
  }

  const inputCls = 'bg-card border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent';

  return (
    <div className="flex flex-col gap-2">
      <FoodSearch
        key={searchKey}
        items={items}
        onSelect={handleSelect}
        onClear={handleClear}
        placeholder={t('foods.searchPlaceholder')}
      />
      {selected && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3 text-xs bg-bg rounded-lg px-3 py-2">
            <span className="text-text font-medium">{selected.name}</span>
            <span className="text-text-sec">{t('common.per100g')}:</span>
            <MacroChips
              calories={selected.calories}
              protein={selected.protein}
              carbs={selected.carbs}
              fat={selected.fat}
              fiber={selected.fiber}
            />
          </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text" inputMode="decimal"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder={usePieces ? `${t('common.pieces')} (${selected.piece_grams}g)` : t('common.grams')}
            className={`w-32 ${inputCls}`}
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          />
          {selected.piece_grams && (
            <button
              type="button"
              onClick={() => { setUsePieces(v => !v); setAmount(''); }}
              className="text-xs text-accent underline cursor-pointer"
            >
              {usePieces ? t('dash.switchToGrams') : t('dash.switchToPieces')}
            </button>
          )}
          <button
            type="button"
            onClick={handleAdd}
            disabled={!effectiveGrams}
            className="px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-sm font-medium hover:bg-accent/20 cursor-pointer disabled:opacity-40"
          >
            {t('common.add')}
          </button>
          </div>
          {effectiveGrams > 0 && (() => {
            const scaled = scaleNutrients(selected, effectiveGrams);
            return (
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-sec">=</span>
                <MacroChips
                  calories={scaled.calories}
                  protein={scaled.protein}
                  carbs={scaled.carbs}
                  fat={scaled.fat}
                  fiber={scaled.fiber}
                />
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
