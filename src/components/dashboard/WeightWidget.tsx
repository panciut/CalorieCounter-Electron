import { useT } from '../../i18n/useT';
import { fbCard } from '../../lib/fbStyles';
import Sparkline from '../Sparkline';

interface WeightWidgetProps {
  weightKg: number;
  weightTrend: number[];
}

export default function WeightWidget({ weightKg, weightTrend }: WeightWidgetProps) {
  const { t } = useT();
  const card = fbCard;

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14, fontWeight: 400, color: 'var(--fb-text)' }}>{t('dash.weightTitle')}</span>
        {weightTrend.length >= 2 && (
          <span style={{ fontSize: 10.5, color: 'var(--fb-green)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            {weightTrend[weightTrend.length - 1] <= weightTrend[0] ? '↓' : '↑'}
            {' '}{Math.abs(weightTrend[weightTrend.length - 1] - weightTrend[0]).toFixed(1)} kg
          </span>
        )}
      </div>
      {weightKg > 0 ? (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span className="tnum" style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 400, color: 'var(--fb-text)', letterSpacing: -1, lineHeight: 1 }}>
              {weightKg.toFixed(1)}
            </span>
            <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--fb-text-2)' }}>kg</span>
          </div>
          {weightTrend.length >= 2 && (
            <div style={{ marginTop: 10 }}>
              <Sparkline points={weightTrend} color="var(--fb-accent)" width={120} height={32} />
            </div>
          )}
        </>
      ) : (
        <p style={{ fontSize: 11.5, color: 'var(--fb-text-3)', fontStyle: 'italic', margin: 0 }}>
          {t('dash.noWeight')}
        </p>
      )}
    </div>
  );
}
