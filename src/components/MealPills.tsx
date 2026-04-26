import { useT } from '../i18n/useT';
import { MEAL_ORDER, type Meal } from '../types';

interface MealPillsProps {
  selected: Meal;
  onChange: (meal: Meal) => void;
}

export default function MealPills({ selected, onChange }: MealPillsProps) {
  const { tMeal } = useT();
  return (
    <div className="flex gap-2 flex-wrap">
      {MEAL_ORDER.map(meal => (
        <button
          key={meal}
          type="button"
          onClick={() => onChange(meal)}
          className={[
            'px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 cursor-pointer border',
            selected === meal
              ? 'bg-accent text-white border-accent'
              : 'bg-transparent text-text-sec border-border hover:border-accent/50 hover:text-text',
          ].join(' ')}
        >
          {tMeal(meal)}
        </button>
      ))}
    </div>
  );
}
