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
      <div className="flex flex-col gap-6 p-2">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] uppercase tracking-widest font-black text-text-sec/60 ml-1">{t('qf.foodNamePlaceholder')}</label>
          <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="es. Spuntino veloce" className="bg-bg border-2 border-border/40 rounded-2xl px-5 py-4 text-xl font-black text-text outline-none focus:border-accent transition-all" />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] uppercase tracking-widest font-black text-text-sec/60 ml-1">{t('qf.totalKcal')}</label>
          <input type="text" inputMode="decimal" value={kcal} onChange={e=>setKcal(e.target.value)} placeholder="0" className="bg-bg border-2 border-border/40 rounded-2xl px-5 py-4 text-3xl font-black text-text outline-none focus:border-accent transition-all tabular-nums" />
        </div>

        {/* Mode toggle */}
        <div className="flex p-1.5 bg-bg/60 border-2 border-border/20 rounded-[1.25rem] shadow-inner">
          <button
            type="button"
            onClick={() => setMode('preset')}
            className={[
              'flex-1 text-[10px] uppercase tracking-widest px-4 py-3 rounded-xl cursor-pointer transition-all font-black',
              mode === 'preset' ? 'bg-card border border-border/40 text-accent shadow-sm' : 'text-text-sec/60 hover:text-text',
            ].join(' ')}
          >
            {t('qf.modePreset')}
          </button>
          <button
            type="button"
            onClick={() => setMode('detailed')}
            className={[
              'flex-1 text-[10px] uppercase tracking-widest px-4 py-3 rounded-xl cursor-pointer transition-all font-black',
              mode === 'detailed' ? 'bg-card border border-border/40 text-accent shadow-sm' : 'text-text-sec/60 hover:text-text',
            ].join(' ')}
          >
            {t('qf.modeDetailed')}
          </button>
        </div>

        {mode === 'preset' ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(PRESETS) as PresetKey[]).map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPreset(key)}
                  className={[
                    'text-[10px] uppercase tracking-widest px-4 py-2.5 rounded-xl border-2 transition-all font-black',
                    preset === key
                      ? 'border-accent text-accent bg-accent/5'
                      : 'border-border/40 text-text-sec hover:border-accent/40 hover:text-accent',
                  ].join(' ')}
                >
                  {t(PRESET_LABELS[key])}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-3 bg-bg/40 border border-border/20 rounded-2xl p-4">
              <div className="flex flex-col items-center">
                <span className="text-sm font-black text-text tabular-nums">{presetMacros.protein}g</span>
                <span className="text-[8px] font-bold text-text-sec/50 uppercase">{t('macro.protein')}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-sm font-black text-text tabular-nums">{presetMacros.carbs}g</span>
                <span className="text-[8px] font-bold text-text-sec/50 uppercase">{t('macro.carbs')}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-sm font-black text-text tabular-nums">{presetMacros.fat}g</span>
                <span className="text-[8px] font-bold text-text-sec/50 uppercase">{t('macro.fat')}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-sm font-black text-text tabular-nums">{presetMacros.fiber}g</span>
                <span className="text-[8px] font-bold text-text-sec/50 uppercase">{t('macro.fiber')}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-widest font-black text-text-sec/60 ml-1">{t('macro.protein')}</label>
              <input type="text" inputMode="decimal" value={protein} onChange={e=>setProtein(e.target.value)} placeholder="0" className="bg-bg border-2 border-border/40 rounded-xl px-4 py-3 text-lg font-black text-text outline-none focus:border-accent transition-all text-center tabular-nums" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-widest font-black text-text-sec/60 ml-1">{t('macro.carbs')}</label>
              <input type="text" inputMode="decimal" value={carbs} onChange={e=>setCarbs(e.target.value)} placeholder="0" className="bg-bg border-2 border-border/40 rounded-xl px-4 py-3 text-lg font-black text-text outline-none focus:border-accent transition-all text-center tabular-nums" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-widest font-black text-text-sec/60 ml-1">{t('macro.fat')}</label>
              <input type="text" inputMode="decimal" value={fat} onChange={e=>setFat(e.target.value)} placeholder="0" className="bg-bg border-2 border-border/40 rounded-xl px-4 py-3 text-lg font-black text-text outline-none focus:border-accent transition-all text-center tabular-nums" />
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-6 py-4 text-sm font-black uppercase tracking-widest text-text-sec border-2 border-border/40 rounded-2xl hover:bg-card/40 transition-all">{t('common.cancel')}</button>
          <button onClick={handleSubmit} disabled={submitDisabled} className="flex-[1.5] px-6 py-4 text-sm font-black uppercase tracking-widest bg-accent text-white rounded-2xl shadow-lg shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 transition-all">{t('qf.addAndLog')}</button>
        </div>
      </div>
    </Modal>
  );
}
