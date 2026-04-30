/**
 * Shared Apple-Fitness-styled UI primitives built on the fb-* design tokens.
 * Used by FoodsPage, PantryPage, RecipesPage and child components.
 */
import type { CSSProperties, ReactNode } from 'react';

// ── Style tokens ─────────────────────────────────────────────────────────────

export const eyebrow: CSSProperties = {
  fontSize: 10, fontWeight: 600, letterSpacing: 1.4,
  textTransform: 'uppercase', color: 'var(--fb-text-3)',
};

export const serifItalic: CSSProperties = {
  fontFamily: 'var(--font-serif)', fontStyle: 'italic',
};

export const cardOuter: CSSProperties = {
  background: 'var(--fb-card)',
  border: '1px solid var(--fb-border)',
  borderRadius: 18,
  padding: 20,
  display: 'flex', flexDirection: 'column', gap: 14,
};

export const tinyInput: CSSProperties = {
  width: '100%',
  background: 'var(--fb-card)', border: '1px solid var(--fb-border)',
  color: 'var(--fb-text)',
  borderRadius: 10, padding: '7px 10px',
  fontSize: 13, outline: 'none',
  fontFeatureSettings: '"tnum"',
  transition: 'border-color .25s ease, box-shadow .25s ease',
};

export const pillPrimary: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  padding: '8px 18px', borderRadius: 99,
  background: 'var(--fb-accent)', color: 'white', border: 0,
  fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
  transition: 'all .25s cubic-bezier(0.32,0.72,0,1)',
  whiteSpace: 'nowrap',
};

export const pillGhost: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  padding: '8px 18px', borderRadius: 99,
  background: 'transparent', color: 'var(--fb-text-2)',
  border: '1px solid var(--fb-border-strong)',
  fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
  transition: 'all .25s ease',
  whiteSpace: 'nowrap',
};

export const pillSoft: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  padding: '6px 14px', borderRadius: 99,
  background: 'var(--fb-bg)', color: 'var(--fb-text-2)',
  border: '1px solid var(--fb-border)',
  fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
  transition: 'all .25s ease',
  whiteSpace: 'nowrap',
};

export const MACRO_DOT = {
  kcal:    'var(--fb-orange)',
  fat:     'var(--fb-green)',
  carbs:   'var(--fb-amber)',
  fiber:   'var(--fb-text-2)',
  protein: 'var(--fb-red)',
} as const;

// ── PageHeader ────────────────────────────────────────────────────────────────

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  left?: ReactNode;
  right?: ReactNode;
}

export function PageHeader({ eyebrow: eb, title, left, right }: PageHeaderProps) {
  return (
    <header style={{
      flexShrink: 0, padding: '16px 28px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 14,
      borderBottom: '1px solid var(--fb-border)',
      background: 'var(--fb-bg)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1.6, textTransform: 'uppercase', color: 'var(--fb-accent)' }}>{eb}</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, fontStyle: 'italic', letterSpacing: -0.4, color: 'var(--fb-text)', lineHeight: 1.1 }}>{title}</div>
        </div>
        {left}
      </div>
      {right}
    </header>
  );
}

// ── SegmentedControl ──────────────────────────────────────────────────────────

interface SegmentedControlProps<T extends string> {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  minWidth?: number;
}

export function SegmentedControl<T extends string>({ value, options, onChange, minWidth = 200 }: SegmentedControlProps<T>) {
  const idx = Math.max(0, options.findIndex(o => o.value === value));
  const pct = 100 / options.length;
  return (
    <div style={{
      position: 'relative',
      display: 'grid', gridTemplateColumns: `repeat(${options.length}, 1fr)`,
      padding: 4,
      background: 'var(--fb-bg-2)', border: '1px solid var(--fb-border)',
      borderRadius: 99, minWidth,
    }}>
      <span style={{
        position: 'absolute', top: 4, bottom: 4,
        left: `calc(${idx * pct}% + 4px)`,
        width: `calc(${pct}% - 8px)`,
        background: 'var(--fb-card)',
        border: '1px solid var(--fb-border-strong)',
        borderRadius: 99,
        transition: 'left .4s cubic-bezier(0.32,0.72,0,1)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
      }} />
      {options.map(o => (
        <button
          key={o.value} type="button" onClick={() => onChange(o.value)}
          style={{
            position: 'relative', zIndex: 1,
            padding: '7px 16px',
            background: 'transparent', border: 0, cursor: 'pointer',
            fontSize: 12, fontWeight: 600, letterSpacing: 0.2,
            color: value === o.value ? 'var(--fb-text)' : 'var(--fb-text-2)',
            transition: 'color .3s ease',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            whiteSpace: 'nowrap',
          }}
        >{o.label}</button>
      ))}
    </div>
  );
}

// ── SearchField ───────────────────────────────────────────────────────────────

interface SearchFieldProps {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  flex?: boolean;
}

export function SearchField({ value, onChange, placeholder, flex = true }: SearchFieldProps) {
  return (
    <div style={{
      flex: flex ? 1 : undefined, minWidth: 220,
      background: 'var(--fb-bg)', border: '1px solid var(--fb-border)',
      borderRadius: 14, padding: 3,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--fb-card)', borderRadius: 11,
        padding: '8px 12px',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--fb-text-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          type="text" value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1, minWidth: 0,
            background: 'transparent', border: 0, outline: 'none',
            color: 'var(--fb-text)',
            fontFamily: 'var(--font-serif)', fontStyle: 'italic',
            fontSize: 14.5, fontWeight: 400, letterSpacing: -0.1,
          }}
        />
        {value && (
          <button
            type="button" onClick={() => onChange('')}
            aria-label="Clear"
            style={{
              width: 20, height: 20, borderRadius: 99, border: 0,
              background: 'var(--fb-bg-2)', color: 'var(--fb-text-3)',
              fontSize: 11, lineHeight: 1, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >✕</button>
        )}
      </div>
    </div>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────

export function EmptyState({ message, eyebrow: eb = 'Empty' }: { message: string; eyebrow?: string }) {
  return (
    <div style={{
      flex: 1, minHeight: 160,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
      background: 'var(--fb-bg)',
      border: '1px dashed var(--fb-border-strong)',
      borderRadius: 14,
      padding: '32px 16px',
    }}>
      <span style={eyebrow}>{eb}</span>
      <span style={{ ...serifItalic, fontSize: 16, color: 'var(--fb-text-2)' }}>{message}</span>
    </div>
  );
}

// ── IconBtn ───────────────────────────────────────────────────────────────────

export function IconBtn({ children, onClick, label, tone, size = 28 }: {
  children: ReactNode; onClick: () => void; label: string; tone?: 'red' | 'accent'; size?: number;
}) {
  const baseColor = tone === 'red' ? 'var(--fb-red)' : 'var(--fb-text-2)';
  const hoverColor = tone === 'red' ? 'var(--fb-red)' : 'var(--fb-accent)';
  return (
    <button
      type="button" onClick={onClick} title={label} aria-label={label}
      style={{
        width: size, height: size, borderRadius: 99,
        background: 'var(--fb-card)', border: '1px solid var(--fb-border)',
        color: baseColor,
        fontSize: 12, lineHeight: 1, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all .25s cubic-bezier(0.32,0.72,0,1)',
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = hoverColor;
        e.currentTarget.style.color = hoverColor;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--fb-border)';
        e.currentTarget.style.color = baseColor;
      }}
    >{children}</button>
  );
}

// ── ToggleSwitch (iOS-style) ──────────────────────────────────────────────────

export function ToggleSwitch({ checked, onChange, label, title }: {
  checked: boolean; onChange: (v: boolean) => void; label?: string; title?: string;
}) {
  return (
    <label title={title} style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      fontSize: 11.5, fontWeight: 500, color: 'var(--fb-text-2)',
      cursor: 'pointer', userSelect: 'none',
    }}>
      <span
        role="switch" aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          position: 'relative', width: 32, height: 18, borderRadius: 99,
          background: checked ? 'var(--fb-accent)' : 'var(--fb-bg-2)',
          border: '1px solid ' + (checked ? 'var(--fb-accent)' : 'var(--fb-border-strong)'),
          transition: 'background .3s cubic-bezier(0.32,0.72,0,1)',
          flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute', top: 1, left: checked ? 15 : 1,
          width: 14, height: 14, borderRadius: '50%',
          background: 'white',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          transition: 'left .3s cubic-bezier(0.32,0.72,0,1)',
        }} />
      </span>
      {label}
    </label>
  );
}

// ── MacroChip ─────────────────────────────────────────────────────────────────

export function MacroChip({ dot, value, unit, emphasis }: { dot: string; value: string; unit: string; emphasis?: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 99,
      background: emphasis ? `color-mix(in srgb, ${dot} 14%, transparent)` : 'var(--fb-bg)',
      border: '1px solid ' + (emphasis ? 'transparent' : 'var(--fb-border)'),
      fontSize: 11, fontWeight: 600,
      color: emphasis ? dot : 'var(--fb-text-2)',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: dot }} />
      <span className="tnum">{value}</span>
      <span style={{ color: emphasis ? dot : 'var(--fb-text-3)', fontWeight: 500, fontSize: 10 }}>{unit}</span>
    </span>
  );
}

// ── Section card with hero header ─────────────────────────────────────────────

export function SectionHero({ eyebrow: eb, title, right, children }: {
  eyebrow: string; title: ReactNode; right?: ReactNode; children?: ReactNode;
}) {
  return (
    <section style={cardOuter}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={eyebrow}>{eb}</span>
          <span style={{ ...serifItalic, fontSize: 22, fontWeight: 400, color: 'var(--fb-text)', letterSpacing: -0.3, lineHeight: 1.1 }}>
            {title}
          </span>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}
