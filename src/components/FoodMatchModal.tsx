import { useT } from '../i18n/useT';
import Modal from './Modal';
import type { BarcodeResult } from '../types';

export type Candidate = BarcodeResult & {
  nameScore: number;
  kcalDeltaPct: number;
  macroDeltas: { calories: number; protein: number; carbs: number; fat: number };
};

interface CurrentValues {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface FoodMatchModalProps {
  isOpen: boolean;
  title?: string;
  current: CurrentValues;
  candidates: Candidate[];
  /** Apply the chosen candidate and dismiss. */
  onApply: (c: Candidate) => void;
  /** Dismiss without applying. The save-as-is path uses the modal as a confirmation
   *  before the original save proceeds; pass undefined to hide that button. */
  onSaveAsIs?: () => void;
  onClose: () => void;
}

function fmtDelta(d: number): string {
  if (d === 0) return '0';
  const s = d > 0 ? '+' : '';
  return `${s}${Math.round(d * 10) / 10}`;
}
function deltaCls(d: number): string {
  if (Math.abs(d) < 0.5) return 'text-text-sec/60';
  return 'text-yellow';
}

export default function FoodMatchModal({
  isOpen, title, current, candidates, onApply, onSaveAsIs, onClose,
}: FoodMatchModalProps) {
  const { t } = useT();
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || t('foods.didYouMean')} width="max-w-2xl">
      <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
        {/* Current values */}
        <div className="bg-bg border border-border rounded-lg p-3 flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-text-sec font-medium">{t('common.current') || 'Current'}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-sm text-text font-medium truncate">{current.name || '—'}</span>
          </div>
          <div className="text-xs text-text-sec tabular-nums">
            <span className="text-text">{current.calories}</span> kcal
            <span className="mx-1">·</span>F {current.fat}g
            <span className="mx-1">·</span>C {current.carbs}g
            <span className="mx-1">·</span>P {current.protein}g
          </div>
        </div>

        {/* Candidates */}
        {candidates.length === 0 ? (
          <p className="text-sm text-text-sec text-center py-6">{t('foods.noOffMatch')}</p>
        ) : candidates.map((c, i) => (
          <div key={`${c.barcode || ''}-${i}`} className="border border-border rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-sm text-text font-semibold truncate">{c.name}</span>
              {c.brand && <span className="text-xs text-text-sec/80">· {c.brand}</span>}
              {c.barcode && <span className="text-[10px] text-text-sec/60 tabular-nums">#{c.barcode}</span>}
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent tabular-nums" title="name similarity">
                {Math.round(c.nameScore * 100)}%
              </span>
            </div>
            <div className="text-xs text-text-sec tabular-nums">
              <span className="text-text">{c.calories}</span> kcal
              <span className={`mx-1 ${deltaCls(c.macroDeltas.calories)}`}>({fmtDelta(c.macroDeltas.calories)})</span>
              · F <span className="text-text">{c.fat}g</span>
              <span className={`mx-1 ${deltaCls(c.macroDeltas.fat)}`}>({fmtDelta(c.macroDeltas.fat)})</span>
              · C <span className="text-text">{c.carbs}g</span>
              <span className={`mx-1 ${deltaCls(c.macroDeltas.carbs)}`}>({fmtDelta(c.macroDeltas.carbs)})</span>
              · P <span className="text-text">{c.protein}g</span>
              <span className={`mx-1 ${deltaCls(c.macroDeltas.protein)}`}>({fmtDelta(c.macroDeltas.protein)})</span>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => onApply(c)}
                className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:opacity-90 cursor-pointer"
              >
                {t('foods.useMatch')}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t border-border mt-3">
        {onSaveAsIs && (
          <button
            type="button"
            onClick={onSaveAsIs}
            className="px-4 py-2 rounded-lg border border-border text-text-sec text-sm hover:border-accent/50 hover:text-text cursor-pointer"
          >
            {t('foods.saveAsIs')}
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg border border-border text-text-sec text-sm hover:border-accent/50 hover:text-text cursor-pointer"
        >
          {t('common.cancel')}
        </button>
      </div>
    </Modal>
  );
}
