import type React from 'react';

export const fbCard: React.CSSProperties = {
  background: 'var(--fb-card)',
  border: '1px solid var(--fb-border)',
  borderRadius: 12,
  padding: 16,
};

export const fbCardHero: React.CSSProperties = {
  ...fbCard,
  padding: 24,
};

export const fbBtnIcon: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 28, height: 28, borderRadius: 6,
  background: 'transparent', border: 0,
  color: 'var(--fb-text-2)', cursor: 'pointer',
};

export const fbBtnGhost: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  background: 'transparent', border: '1px solid var(--fb-border-strong)',
  color: 'var(--fb-text-2)', padding: '6px 12px',
  borderRadius: 6, fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-body)',
  cursor: 'pointer',
};

export const fbBtnPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: 'var(--fb-accent)', color: 'white',
  border: 0, padding: '7px 14px',
  borderRadius: 7, fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-body)',
  cursor: 'pointer', flexShrink: 0,
};

export const fbChipFav: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  background: 'var(--fb-bg-2)', border: '1px solid var(--fb-border-strong)',
  color: 'var(--fb-text)', padding: '4px 10px',
  borderRadius: 6, fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
  fontFamily: 'var(--font-body)', flexShrink: 0,
};

export const fbChipMuted: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center',
  background: 'transparent', border: '1px solid var(--fb-border)',
  color: 'var(--fb-text-2)', padding: '4px 10px',
  borderRadius: 6, fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
  fontFamily: 'var(--font-body)', flexShrink: 0,
};

export const fbEyebrow: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, letterSpacing: 1.4,
  textTransform: 'uppercase', color: 'var(--fb-text-3)',
};

export const fbSerifItalic: React.CSSProperties = {
  fontFamily: 'var(--font-serif)', fontStyle: 'italic',
};
