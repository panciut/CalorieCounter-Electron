import { useT } from '../../i18n/useT';
import { fbCard } from '../../lib/fbStyles';

interface PantryWidgetProps {
  enabled: boolean;
  lowItems: { name: string; qty: number; unit: string }[];
}

export default function PantryWidget({ enabled, lowItems }: PantryWidgetProps) {
  const { t } = useT();
  const card = fbCard;

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14, fontWeight: 400, color: 'var(--fb-text)' }}>{t('nav.pantry')}</span>
        {lowItems.length > 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 10, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--fb-amber)', background: 'rgba(224,169,58,0.1)', padding: '3px 8px', borderRadius: 99 }}>{t('dash.pantryLow')}</span>
        )}
      </div>
      {!enabled ? (
        <p style={{ fontSize: 11.5, color: 'var(--fb-text-3)', fontStyle: 'italic', margin: 0 }}>{t('dash.pantryDisabled')}</p>
      ) : lowItems.length === 0 ? (
        <p style={{ fontSize: 11.5, color: 'var(--fb-text-3)', fontStyle: 'italic', margin: 0 }}>{t('dash.pantryEmpty')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {lowItems.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5 }}>
              <span style={{ color: 'var(--fb-text)' }}>{p.name}</span>
              <span className="tnum" style={{ color: 'var(--fb-amber)', fontWeight: 600 }}>{p.qty} {p.unit}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
