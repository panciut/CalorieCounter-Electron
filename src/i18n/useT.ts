import { useContext } from 'react';
import { SettingsContext } from '../hooks/useSettings';
import { translations } from './translations';
import type { Meal } from '../types';

export function useT() {
  const { settings } = useContext(SettingsContext);
  const lang = (settings?.language ?? 'en') as 'en' | 'it';
  const map = translations[lang] ?? translations.en;

  function t(key: string): string {
    return map[key] ?? translations.en[key] ?? key;
  }

  function tMeal(meal: Meal | string): string {
    const keyMap: Record<string, string> = {
      Breakfast: 'meal.breakfast',
      Lunch:     'meal.lunch',
      Dinner:    'meal.dinner',
      Snack:     'meal.snack',
    };
    const k = keyMap[meal];
    return k ? t(k) : meal;
  }

  function mealFromTranslated(translated: string): Meal {
    const meals: Meal[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
    return meals.find(m => tMeal(m) === translated) ?? (translated as Meal);
  }

  return { t, tMeal, mealFromTranslated, lang };
}
