import { useT } from '../../i18n/useT';
import { fbCard, fbChipMuted } from '../../lib/fbStyles';

interface WaterCardProps {
  waterTotal: number;
  waterGoal: number;
  onAdd: (ml: number) => void;
  onCustom: () => void;
}

export default function WaterCard({ waterTotal, waterGoal, onAdd, onCustom }: WaterCardProps) {
  const { t } = useT();
  const waterPct = Math.min(100, Math.round(waterTotal / waterGoal * 100));

  return (
    <div style={fbCard}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--fb-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/></svg>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1.4, textTransform: 'uppercase', color: 'var(--fb-text-2)' }}>{t('dash.water')}</span>
        <span className="tnum" style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--fb-text-3)' }}>{waterPct}%</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span className="tnum" style={{ fontFamily: 'var(--font-serif)', fontSize: 38, fontWeight: 400, letterSpacing: -1.5, color: 'var(--fb-text)', lineHeight: 1 }}>
          {(waterTotal / 1000).toFixed(2)}
        </span>
        <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--fb-text-2)' }}>
          L · {t('dash.of')} {(waterGoal / 1000).toFixed(1)} L
        </span>
      </div>
      <div style={{ height: 4, background: 'var(--fb-bg-2)', borderRadius: 99, marginTop: 10, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, width: `${waterPct}%`, background: 'var(--fb-blue)', borderRadius: 99, transition: 'width 0.8s cubic-bezier(0.2,0.8,0.2,1)' }} />
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        {[250, 500].map(ml => (
          <button key={ml} onClick={() => onAdd(ml)} style={fbChipMuted}>+{ml}ml</button>
        ))}
        <button onClick={onCustom} style={fbChipMuted}>Custom</button>
      </div>
    </div>
  );
}
