import { useT } from '../i18n/useT';
import { useSettings } from '../hooks/useSettings';
import MacroChart from './MacroChart';
import MacroBars from './MacroBars';
import type { BarDef } from './MacroBars';
import { getBarColor } from '../lib/macroCalc';
import type { LogEntry } from '../types';

const remColorMap: Record<string, string> = {
  'bar-green':  'text-green',
  'bar-yellow': 'text-yellow',
  'bar-orange': 'text-orange',
  'bar-red':    'text-red',
};

interface DayMacrosCardProps {
  entries: LogEntry[];
}

export default function DayMacrosCard({ entries }: DayMacrosCardProps) {
  const { t } = useT();
  const { settings } = useSettings();

  const sumEntries = (es: LogEntry[]) => es.reduce(
    (acc, e) => ({
      cal:     acc.cal     + e.calories,
      protein: acc.protein + e.protein,
      carbs:   acc.carbs   + e.carbs,
      fat:     acc.fat     + e.fat,
      fiber:   acc.fiber   + (e.fiber || 0),
    }),
    { cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );

  const loggedEntries  = entries.filter(e => e.status !== 'planned');
  const plannedEntries = entries.filter(e => e.status === 'planned');
  const totals  = sumEntries(loggedEntries);
  const planned = sumEntries(plannedEntries);

  const round2 = (n: number) => Math.round(n * 100) / 100;
  const cal    = round2(totals.cal);
  const pro    = round2(totals.protein);
  const carbs  = round2(totals.carbs);
  const fat    = round2(totals.fat);
  const fiber  = round2(totals.fiber);
  const plCal    = round2(planned.cal);
  const plPro    = round2(planned.protein);
  const plCarbs  = round2(planned.carbs);
  const plFat    = round2(planned.fat);
  const plFiber  = round2(planned.fiber);

  const calRec = settings.cal_rec || Math.round(((settings.cal_min||1800) + (settings.cal_max||2200)) / 2);

  const bars: BarDef[] = [
    { id:'cal',     label:t('macro.kcal'),    actual:cal,   planned:plCal,   min:settings.cal_min||1800,    max:settings.cal_max||2200,    rec:settings.cal_rec||0,     unit:'kcal' },
    { id:'fat',     label:t('macro.fat'),     actual:fat,   planned:plFat,   min:settings.fat_min||0,       max:settings.fat_max||0,       rec:settings.fat_rec||0,     unit:'g' },
    { id:'carbs',   label:t('macro.carbs'),   actual:carbs, planned:plCarbs, min:settings.carbs_min||0,     max:settings.carbs_max||0,     rec:settings.carbs_rec||0,   unit:'g' },
    { id:'fiber',   label:t('macro.fiber'),   actual:fiber, planned:plFiber, min:settings.fiber_min||0,     max:settings.fiber_max||0,     rec:settings.fiber_rec||0,   unit:'g' },
    { id:'protein', label:t('macro.protein'), actual:pro,   planned:plPro,   min:settings.protein_min||0,   max:settings.protein_max||0,   rec:settings.protein_rec||0, unit:'g' },
  ];

  const loggedRound  = Math.round(cal);
  const plannedRound = Math.round(plCal);
  const intakeSum    = loggedRound + plannedRound;
  const leftover     = calRec - intakeSum;
  const leftoverAbs  = Math.abs(leftover);
  const overall      = getBarColor(intakeSum, settings.cal_min||1800, settings.cal_max||2200, settings);

  return (
    <div className="bg-card border border-border/40 rounded-[2rem] p-6 flex flex-col md:flex-row gap-8 items-center md:items-start shadow-sm hover:border-border/60 transition-colors">
      <div className="shrink-0 scale-110 md:scale-100 py-2">
        <MacroChart
          protein={pro} carbs={carbs} fat={fat} calories={cal}
          plannedProtein={plPro} plannedCarbs={plCarbs} plannedFat={plFat} plannedCalories={plCal}
          plannedLabel={t('dash.planned')}
          entries={entries}
        />
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-6 w-full">
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-4xl font-black text-text tracking-tighter tabular-nums leading-none">{intakeSum}</span>
            <span className="text-[10px] font-bold text-text-sec/60 uppercase tracking-widest">{t('macro.kcal')}</span>
            
            <div className="ml-auto flex items-center gap-1 bg-bg/40 px-3 py-1.5 rounded-xl border border-border/20">
              <span className={`text-sm font-black tabular-nums ${leftover >= 0 ? 'text-text' : 'text-red'}`}>{leftoverAbs}</span>
              <span className="text-[9px] font-bold text-text-sec/60 uppercase tracking-tight">
                {leftover >= 0 ? t('dash.remaining') : t('dash.overBy')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-text-sec/40 mt-1">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-text inline-block" />
              {loggedRound} {t('dash.logged')}
            </div>
            {plannedRound > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
                {plannedRound} {t('dash.planned')}
              </div>
            )}
            <div className="ml-auto opacity-40">Target {calRec}</div>
          </div>
        </div>
        
        <div className="space-y-4">
          <MacroBars bars={bars} settings={settings} entries={entries} />
        </div>
      </div>
    </div>
  );
}
