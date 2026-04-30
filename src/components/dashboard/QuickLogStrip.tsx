import { useT } from '../../i18n/useT';
import { fbCard, fbChipFav, fbChipMuted } from '../../lib/fbStyles';
import type { Food, FrequentFood } from '../../types';

interface QuickLogStripProps {
  favorites: Food[];
  frequent: FrequentFood[];
  onQuickLog: (food: Food) => void;
  onNavigateFoods: () => void;
}

export default function QuickLogStrip({ favorites, frequent, onQuickLog, onNavigateFoods }: QuickLogStripProps) {
  const { t } = useT();

  return (
    <section style={{ ...fbCard, display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', padding: '10px 14px' }} className="hide-scrollbar">
      <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 12.5, color: 'var(--fb-text-2)', flexShrink: 0, paddingRight: 4 }}>
        {t('dash.suggested')}
      </span>
      {favorites.slice(0, 4).map(f => (
        <button key={f.id} onClick={() => onQuickLog(f)} style={fbChipFav}>
          <span style={{ color: 'var(--fb-accent)', fontSize: 10 }}>★</span>
          {f.name}
        </button>
      ))}
      {favorites.length > 0 && frequent.length > 0 && (
        <div style={{ width: 1, height: 16, background: 'var(--fb-border)', flexShrink: 0 }} />
      )}
      {frequent.slice(0, 5).map(f => (
        <button key={f.id} onClick={() => onQuickLog(f as Food)} style={fbChipMuted}>{f.name}</button>
      ))}
      {favorites.length === 0 && frequent.length === 0 && (
        <span style={{ fontSize: 11.5, color: 'var(--fb-text-3)', fontStyle: 'italic' }}>
          {t('dash.noFavorites')} —{' '}
          <button onClick={onNavigateFoods} style={{ background: 'none', border: 0, color: 'var(--fb-accent)', cursor: 'pointer', fontSize: 11.5, padding: 0 }}>{t('dash.addFromFoods')}</button>
        </span>
      )}
    </section>
  );
}
