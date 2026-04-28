import { useState } from 'react';
import { useT } from '../../i18n/useT';
import { api } from '../../api';
import Modal from '../Modal';
import ModalFooter from '../ui/ModalFooter';
import Field from '../ui/Field';
import MacroChips from '../ui/MacroChips';
import type { Meal } from '../../types';

// Calorie share per macro (must sum to 1.0); fiber as g/100kcal.
// Kept in sync with the presets used by the Foods page add form.
const QF_PRESETS = {
  balanced:    { proteinPct: 0.25, carbsPct: 0.50, fatPct: 0.25, fiberPer100: 2.5 },
  highProtein: { proteinPct: 0.40, carbsPct: 0.20, fatPct: 0.40, fiberPer100: 1.0 },
  highCarb:    { proteinPct: 0.10, carbsPct: 0.80, fatPct: 0.10, fiberPer100: 3.0 },
  highFat:     { proteinPct: 0.20, carbsPct: 0.05, fatPct: 0.75, fiberPer100: 1.0 },
  vegetable:   { proteinPct: 0.15, carbsPct: 0.65, fatPct: 0.20, fiberPer100: 6.0 },
} as const;
type QfPresetKey = keyof typeof QF_PRESETS;
const QF_PRESET_LABELS: Record<QfPresetKey, string> = {
  balanced: 'foods.balanced', highProtein: 'foods.highProtein',
  highCarb: 'foods.highCarb', highFat: 'foods.highFat', vegetable: 'foods.vegetable',
};

function macrosFromPreset(kcal: number, p: typeof QF_PRESETS[QfPresetKey]) {
  return {
    fat:     Math.round(kcal * p.fatPct     / 9 * 10) / 10,
    carbs:   Math.round(kcal * p.carbsPct   / 4 * 10) / 10,
    protein: Math.round(kcal * p.proteinPct / 4 * 10) / 10,
    fiber:   Math.round(kcal * p.fiberPer100 / 100 * 10) / 10,
  };
}

interface QuickFoodDialogProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  meal: Meal;
  onLogged: () => void;
}

export default function QuickFoodDialog({ isOpen, onClose, date, meal, onLogged }: QuickFoodDialogProps) {
  const { t } = useT();
  const [mode, setMode] = useState<'preset' | 'detailed'>('preset');
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [preset, setPreset] = useState<QfPresetKey>('balanced');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  const inputCls = "w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

  function resetAll() {
    setName(''); setKcal(''); setPreset('balanced');
    setProtein(''); setCarbs(''); setFat('');
  }

  const kcalNum = parseFloat(kcal) || 0;
  const presetMacros = macrosFromPreset(kcalNum, QF_PRESETS[preset]);

  async function handleSubmit() {
    if (!name.trim() || !kcal) return;
    const macros = mode === 'preset'
      ? presetMacros
      : {
          protein: parseFloat(protein) || 0,
          carbs:   parseFloat(carbs)   || 0,
          fat:     parseFloat(fat)     || 0,
          fiber:   0,
        };
    await api.log.addQuick({
      food: {
        name: name.trim(),
        calories: kcalNum,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
        fiber: macros.fiber,
        piece_grams: null,
        is_liquid: 0,
      },
      grams: 100,
      meal,
      date,
    });
    resetAll();
    onLogged();
    onClose();
  }

  const submitDisabled = !name.trim() || !kcal;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('qf.title')}>
      <div className="flex flex-col gap-3">
        <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder={t('qf.foodNamePlaceholder')} className={inputCls} />

        <Field label={t('qf.totalKcal')}>
          <input type="text" inputMode="decimal" value={kcal} onChange={e=>setKcal(e.target.value)} className={inputCls} />
        </Field>

        {/* Mode toggle */}
        <div className="flex gap-1 p-0.5 bg-bg border border-border rounded-lg">
          <button
            type="button"
            onClick={() => setMode('preset')}
            className={[
              'flex-1 text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-colors',
              mode === 'preset' ? 'bg-accent/15 text-accent font-medium' : 'text-text-sec hover:text-text',
            ].join(' ')}
          >
            {t('qf.modePreset')}
          </button>
          <button
            type="button"
            onClick={() => setMode('detailed')}
            className={[
              'flex-1 text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-colors',
              mode === 'detailed' ? 'bg-accent/15 text-accent font-medium' : 'text-text-sec hover:text-text',
            ].join(' ')}
          >
            {t('qf.modeDetailed')}
          </button>
        </div>

        {mode === 'preset' ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-1">
              {(Object.keys(QF_PRESETS) as QfPresetKey[]).map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPreset(key)}
                  className={[
                    'text-xs px-2 py-1 rounded border cursor-pointer transition-colors',
                    preset === key
                      ? 'border-accent text-accent bg-accent/10'
                      : 'border-border text-text-sec hover:border-accent hover:text-accent',
                  ].join(' ')}
                >
                  {t(QF_PRESET_LABELS[key])}
                </button>
              ))}
            </div>
            <MacroChips
              protein={presetMacros.protein}
              carbs={presetMacros.carbs}
              fat={presetMacros.fat}
              fiber={presetMacros.fiber}
              className="bg-bg rounded-lg px-3 py-2"
            />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <Field label={`${t('th.protein')} (g)`}>
              <input type="text" inputMode="decimal" value={protein} onChange={e=>setProtein(e.target.value)} className={inputCls} />
            </Field>
            <Field label={`${t('th.carbs')} (g)`}>
              <input type="text" inputMode="decimal" value={carbs} onChange={e=>setCarbs(e.target.value)} className={inputCls} />
            </Field>
            <Field label={`${t('th.fat')} (g)`}>
              <input type="text" inputMode="decimal" value={fat} onChange={e=>setFat(e.target.value)} className={inputCls} />
            </Field>
          </div>
        )}

        <ModalFooter
          onCancel={onClose}
          onConfirm={handleSubmit}
          cancelLabel={t('common.cancel')}
          confirmLabel={t('qf.addAndLog')}
          confirmDisabled={submitDisabled}
          className="pt-1"
        />
      </div>
    </Modal>
  );
}
