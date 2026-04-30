import { useState } from 'react';
import type React from 'react';
import { fbCard } from '../../lib/fbStyles';

interface CollapsibleSectionProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge: string;
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}

export default function CollapsibleSection({
  icon,
  title,
  subtitle,
  badge,
  children,
  defaultCollapsed = true,
}: CollapsibleSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div style={{ ...fbCard, padding: 0, overflow: 'hidden' }}>
      <button
        onClick={() => setCollapsed(v => !v)}
        style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', alignItems: 'center', gap: 14, background: 'transparent', border: 0, padding: '14px 18px', cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: 'var(--font-body)' }}
      >
        <span style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--fb-bg-2)', border: '1px solid var(--fb-divider)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fb-text-2)' }}>
          {icon}
        </span>
        <div>
          <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15, fontWeight: 400, color: 'var(--fb-text)', letterSpacing: -0.2 }}>{title}</div>
          <div style={{ fontSize: 11, color: 'var(--fb-text-3)', marginTop: 1 }}>{subtitle}</div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--fb-text-3)' }}>{badge}</span>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--fb-text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s ease', transform: collapsed ? '' : 'rotate(180deg)' }}><path d="M6 9l6 6 6-6"/></svg>
      </button>
      {!collapsed && (
        <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--fb-divider)', animation: 'fb-fade-up 0.15s ease' }}>
          {children}
        </div>
      )}
    </div>
  );
}
