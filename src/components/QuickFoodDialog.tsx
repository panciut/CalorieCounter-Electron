import { useState } from 'react';
import Modal from './Modal';
import { useT } from '../i18n/useT';
import { api } from '../api';
import { PRESETS, type PresetKey, macrosFromPreset, INPUT_CLASS, PRESET_LABELS } from '../lib/foodPresets';
import type { Meal } from '../types';

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
  const [preset, setPreset] = useState<PresetKey>('balanced');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  function resetAll() {
    setName(''); setKcal(''); setPreset('balanced');
    setProtein(''); setCarbs(''); setFat('');
  }

  const kcalNum = parseFloat(kcal) || 0;
  const presetMacros = macrosFromPreset(kcalNum, PRESETS[preset]);

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
        <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder={t('qf.foodNamePlaceholder')} className={INPUT_CLASS} />

        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-sec">{t('qf.totalKcal')}</label>
          <input type="text" inputMode="decimal" value={kcal} onChange={e=>setKcal(e.target.value)} className={INPUT_CLASS} />
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 p-0.5 bg-bg border border-border rounded-lg">
          <button
            type="button"
            onClick={() => setMode('preset')}
            className={[
              'flex-1 text-xs px-3 py-1.5 rounded-md cursor-pointer transition-colors',
              mode === 'preset' ? 'bg-accent/15 text-accent font-medium' : 'text-text-sec hover:text-text',
            ].join(' ')}
          >
            {t('qf.modePreset')}
          </button>
          <button
            type="button"
            onClick={() => setMode('detailed')}
            className={[
              'flex-1 text-xs px-3 py-1.5 rounded-md cursor-pointer transition-colors',
              mode === 'detailed' ? 'bg-accent/15 text-accent font-medium' : 'text-text-sec hover:text-text',
            ].join(' ')}
          >
            {t('qf.modeDetailed')}
          </button>
        </div>

        {mode === 'preset' ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-1">
              {(Object.keys(PRESETS) as PresetKey[]).map(key => (
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
                  {t(PRESET_LABELS[key])}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 text-xs bg-bg rounded-lg px-3 py-2 text-text-sec">
              <span><span className="text-text font-medium">{presetMacros.fat}</span>g {t('macro.fat')}</span>
              <span><span className="text-text font-medium">{presetMacros.carbs}</span>g {t('macro.carbs')}</span>
              <span><span className="text-text font-medium">{presetMacros.fiber}</span>g {t('macro.fiber')}</span>
              <span><span className="text-text font-medium">{presetMacros.protein}</span>g {t('macro.protein')}</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-sec">{t('th.protein')} (g)</label>
              <input type="text" inputMode="decimal" value={protein} onChange={e=>setProtein(e.target.value)} className={INPUT_CLASS} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-sec">{t('th.carbs')} (g)</label>
              <input type="text" inputMode="decimal" value={carbs} onChange={e=>setCarbs(e.target.value)} className={INPUT_CLASS} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-sec">{t('th.fat')} (g)</label>
              <input type="text" inputMode="decimal" value={fat} onChange={e=>setFat(e.target.value)} className={INPUT_CLASS} />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-sec border border-border rounded-lg cursor-pointer hover:text-text">{t('common.cancel')}</button>
          <button onClick={handleSubmit} disabled={submitDisabled} className="px-4 py-2 text-sm bg-accent text-white rounded-lg cursor-pointer hover:opacity-90 disabled:opacity-40 font-medium">{t('qf.addAndLog')}</button>
        </div>
      </div>
    </Modal>
  );
}
