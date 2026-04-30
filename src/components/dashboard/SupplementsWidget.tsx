import { useT } from '../../i18n/useT';
import { fbCard } from '../../lib/fbStyles';
import type { SupplementDay } from '../../types';

interface SupplementsWidgetProps {
  supplements: SupplementDay[];
  onTake: (id: number) => void;
}

export default function SupplementsWidget({ supplements, onTake }: SupplementsWidgetProps) {
  const { t } = useT();
  const card = fbCard;
  const supplTaken = supplements.filter(s => s.taken >= s.qty).length;

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14, fontWeight: 400, color: 'var(--fb-text)' }}>{t('suppl.dashTitle')}</span>
        <span className="tnum" style={{ fontSize: 10.5, color: 'var(--fb-text-3)' }}>{supplTaken} / {supplements.length}</span>
      </div>
      {supplements.length === 0 ? (
        <p style={{ fontSize: 11.5, color: 'var(--fb-text-3)', fontStyle: 'italic', margin: 0 }}>{t('dash.noSupplPlanned')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {supplements.slice(0, 5).map(s => {
            const done = s.taken >= s.qty;
            const timeLabel = s.time_of_day === 'breakfast' ? t('suppl.morning') : s.time_of_day === 'evening_snack' ? t('suppl.evening') : s.time_of_day === 'afternoon_snack' ? t('suppl.afternoon') : s.time_of_day ?? '';
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11.5 }}>
                <button onClick={() => !done && onTake(s.id)} style={{ width: 14, height: 14, borderRadius: 4, flexShrink: 0, border: done ? '1px solid var(--fb-green)' : '1px solid var(--fb-border-strong)', background: done ? 'var(--fb-green)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: done ? 'default' : 'pointer', color: 'var(--fb-bg)', padding: 0 }}>
                  {done && <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </button>
                <span style={{ flex: 1, color: done ? 'var(--fb-text-3)' : 'var(--fb-text)', textDecoration: done ? 'line-through' : 'none' }}>{s.name}</span>
                <span style={{ fontSize: 9.5, color: 'var(--fb-text-3)', letterSpacing: 0.6, textTransform: 'uppercase' }}>{timeLabel}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
