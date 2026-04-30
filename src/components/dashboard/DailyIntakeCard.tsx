import { useT } from '../../i18n/useT';
import { fbCardHero } from '../../lib/fbStyles';
import { fbBarColor } from '../../lib/fbBarColor';
import ConcentricRings from '../ConcentricRings';

interface MacroTarget {
  min: number;
  max: number;
  rec: number;
}

interface DailyIntakeCardProps {
  calories: { actual: number } & MacroTarget;
  protein:  { actual: number } & MacroTarget;
  carbs:    { actual: number } & MacroTarget;
  fat:      { actual: number } & MacroTarget;
}

export default function DailyIntakeCard({ calories, protein, carbs, fat }: DailyIntakeCardProps) {
  const { t } = useT();

  const calPct = (calories.actual / calories.rec) * 100;
  const proPct = (protein.actual / protein.rec) * 100;
  const carPct = (carbs.actual / carbs.rec) * 100;
  const fatPct = (fat.actual / fat.rec) * 100;

  const macros = [
    { name: t('dash.macroProtein'), actual: protein.actual, min: protein.min, max: protein.max, rec: protein.rec, dotColor: 'var(--fb-red)' },
    { name: t('dash.macroCarbs'),   actual: carbs.actual,   min: carbs.min,   max: carbs.max,   rec: carbs.rec,   dotColor: 'var(--fb-amber)' },
    { name: t('dash.macroFat'),     actual: fat.actual,     min: fat.min,     max: fat.max,     rec: fat.rec,     dotColor: 'var(--fb-green)' },
  ];

  return (
    <div style={{ ...fbCardHero, display: 'grid', gridTemplateColumns: '170px 1fr', gap: '16px 28px', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ConcentricRings
          rings={[
            { pct: calPct, color: 'var(--fb-orange)', label: 'kcal' },
            { pct: proPct, color: 'var(--fb-red)',    label: 'P' },
            { pct: carPct, color: 'var(--fb-amber)',  label: 'C' },
            { pct: fatPct, color: 'var(--fb-green)',  label: 'F' },
          ]}
          centerTop={`${Math.round(calPct)}%`}
          centerSub={t('dash.centerTarget')}
          size={160}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1.4, textTransform: 'uppercase', color: 'var(--fb-text-3)' }}>
          {t('dash.dailyIntake')}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span className="tnum" style={{ fontFamily: 'var(--font-serif)', fontSize: 64, fontWeight: 300, letterSpacing: -2.5, color: 'var(--fb-text)', lineHeight: 1 }}>
            {calories.actual.toLocaleString('it-IT')}
          </span>
          <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 16, color: 'var(--fb-text-2)' }}>kcal</span>
        </div>
        <div className="tnum" style={{ fontSize: 12, color: calories.actual > calories.max ? 'var(--fb-red)' : 'var(--fb-green)', fontWeight: 600, marginTop: 2 }}>
          {calories.actual > calories.max
            ? `+${calories.actual - calories.max} ${t('dash.overMax')}`
            : `${calories.rec - calories.actual > 0 ? calories.rec - calories.actual : 0} ${t('dash.remaining')}`}
          <span style={{ color: 'var(--fb-text-3)', fontWeight: 500, marginLeft: 6 }}>
            · {calories.min}–{calories.max}
          </span>
        </div>
      </div>

      <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--fb-divider)', paddingTop: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {macros.map((m, i) => {
          const pct      = Math.min(100, m.max > 0 ? (m.actual / m.max) * 100 : 0);
          const minPct   = m.max > 0 ? (m.min / m.max) * 100 : 0;
          const recPct   = m.max > 0 ? (m.rec / m.max) * 100 : 0;
          const color    = fbBarColor(m.actual, m.min, m.max, m.rec);
          const macroPct = m.rec > 0 ? Math.round((m.actual / m.rec) * 100) : 0;
          return (
            <div key={i} style={{ background: 'var(--fb-bg)', border: '1px solid var(--fb-border)', borderRadius: 12, padding: 2 }}>
              <div style={{ background: 'var(--fb-card)', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.dotColor, flexShrink: 0 }} />
                    <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--fb-text-3)' }}>{m.name}</span>
                  </div>
                  <span className="tnum" style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.3, color, padding: '2px 7px', borderRadius: 99, background: `color-mix(in srgb, ${color} 14%, transparent)` }}>
                    {macroPct}%
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                  <span className="tnum" style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 300, letterSpacing: -1, color: 'var(--fb-text)', lineHeight: 1 }}>
                    {m.actual.toFixed(1)}
                  </span>
                  <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--fb-text-3)' }}>g</span>
                </div>
                <div>
                  <div style={{ height: 6, background: 'var(--fb-bg-2)', borderRadius: 99, position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${minPct}%`, width: `${100 - minPct}%`, background: 'var(--fb-border-strong)', borderRadius: 99 }} />
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.9s cubic-bezier(0.32,0.72,0,1)' }} />
                    <div style={{ position: 'absolute', top: -3, bottom: -3, left: `${recPct}%`, width: 1.5, background: 'var(--fb-text-2)', opacity: 0.4, borderRadius: 1 }} />
                  </div>
                  <div style={{ position: 'relative', height: 20, marginTop: 6 }}>
                    <span className="tnum" style={{ position: 'absolute', left: `${minPct}%`, transform: 'translateX(-50%)', fontSize: 9, color: 'var(--fb-text-3)', letterSpacing: 0.3, whiteSpace: 'nowrap' }}>{m.min}g</span>
                    <span className="tnum" style={{ position: 'absolute', left: `${recPct}%`, transform: 'translateX(-50%)', fontSize: 9, color: 'var(--fb-text-2)', fontWeight: 600, letterSpacing: 0.3, whiteSpace: 'nowrap' }}>{m.rec}g</span>
                    <span className="tnum" style={{ position: 'absolute', right: 0, fontSize: 9, color: 'var(--fb-text-3)', letterSpacing: 0.3 }}>{m.max}g</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
