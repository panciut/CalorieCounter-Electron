import { useT } from '../../i18n/useT';
import { fbCard } from '../../lib/fbStyles';

interface EnergyBalanceCardProps {
  caloriesIn: number;
  netKcal: number;
  energyOut: number;
  stepCount: number;
  restingKcal: string;
  activeKcal: string;
  extraKcal: string;
  steps: string;
  restingFromYest: boolean;
  onRestingChange: (v: string) => void;
  onActiveChange: (v: string) => void;
  onExtraChange: (v: string) => void;
  onStepsChange: (v: string) => void;
  onSave: () => void;
}

export default function EnergyBalanceCard({
  caloriesIn,
  netKcal,
  energyOut,
  stepCount,
  restingKcal,
  activeKcal,
  extraKcal,
  steps,
  restingFromYest,
  onRestingChange,
  onActiveChange,
  onExtraChange,
  onStepsChange,
  onSave,
}: EnergyBalanceCardProps) {
  const { t } = useT();
  const card = fbCard;

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--fb-orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1.4, textTransform: 'uppercase', color: 'var(--fb-text-2)' }}>{t('dash.balance')}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span className="tnum" style={{ fontFamily: 'var(--font-serif)', fontSize: 38, fontWeight: 400, letterSpacing: -1.5, color: netKcal > 0 ? 'var(--fb-orange)' : 'var(--fb-green)', lineHeight: 1 }}>
          {netKcal > 0 ? '+' : ''}{netKcal}
        </span>
        <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--fb-text-2)' }}>{t('dash.netKcal')}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--fb-divider)' }}>
        {([[t('dash.energyIn'), caloriesIn], [t('dash.energyOut'), energyOut], [t('dash.stepsLabel'), stepCount]] as [string, number][]).map(([l, v]) => (
          <div key={l}>
            <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--fb-text-3)', letterSpacing: 0.8, textTransform: 'uppercase' }}>{l}</div>
            <div className="tnum" style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 500, color: 'var(--fb-text)', marginTop: 2 }}>
              {(v as number).toLocaleString('it-IT')}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--fb-divider)' }}>
        {([
          { label: t('energy.resting'), value: restingKcal, onChange: onRestingChange, isResting: true },
          { label: t('energy.active'),  value: activeKcal,  onChange: onActiveChange,  isResting: false },
          { label: t('energy.extra'),   value: extraKcal,   onChange: onExtraChange,   isResting: false },
          { label: t('energy.steps'),   value: steps,       onChange: (v: string) => onStepsChange(v.replace(/[^0-9]/g, '')), isResting: false },
        ]).map((inp, idx) => (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <label style={{ fontSize: 8, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--fb-text-3)' }}>{inp.label}</label>
            <input type="text" inputMode="decimal" value={inp.value}
              onChange={e => inp.onChange(e.target.value)}
              onBlur={onSave}
              style={{ background: 'var(--fb-bg-2)', border: '1px solid var(--fb-border)', borderRadius: 5, padding: '3px 4px', fontSize: 10.5, color: 'var(--fb-text)', outline: 'none', fontFamily: 'var(--font-mono)', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}
              placeholder="0"
            />
            {idx === 0 && restingFromYest && (
              <span style={{ fontSize: 8.5, color: 'var(--fb-accent)', letterSpacing: 0.5 }}>{t('dash.yesterday')}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
