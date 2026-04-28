import { useT } from '../../i18n/useT';
import { roundTo } from '../../lib/macroCalc';

interface MacroChipsProps {
  /** Optional kcal value displayed first when provided. */
  calories?: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Fiber is omitted when 0 (matches existing UX). */
  fiber?: number;
  /** Append `/100g` after the chips (used in food previews). */
  per100?: boolean;
  /** Layout variant. `inline` = single wrap-flex row of dotted chips. */
  className?: string;
}

/**
 * Standard horizontal row of macro stat chips:
 *   {kcal} kcal · {fat}g fat · {carbs}g carbs · {fiber}g fiber · {protein}g protein
 *
 * Used wherever we show per-food / per-bundle / per-recipe macros so the order
 * and formatting stay consistent.
 */
export default function MacroChips({
  calories, protein, carbs, fat, fiber, per100 = false, className = '',
}: MacroChipsProps) {
  const { t } = useT();
  return (
    <div className={`flex flex-wrap gap-3 text-xs text-text-sec ${className}`}>
      {calories != null && (
        <span><span className="text-text font-semibold tabular-nums">{Math.round(calories)}</span> kcal</span>
      )}
      <span><span className="text-text tabular-nums">{roundTo(fat)}</span>g {t('macro.fat')}</span>
      <span><span className="text-text tabular-nums">{roundTo(carbs)}</span>g {t('macro.carbs')}</span>
      {fiber != null && fiber > 0 && (
        <span><span className="text-text tabular-nums">{roundTo(fiber)}</span>g {t('macro.fiber')}</span>
      )}
      <span><span className="text-text tabular-nums">{roundTo(protein)}</span>g {t('macro.protein')}</span>
      {per100 && <span className="opacity-60">/100g</span>}
    </div>
  );
}
