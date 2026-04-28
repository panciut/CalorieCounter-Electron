// Single source of truth for macro colours — backed by CSS custom properties
// in src/index.css so light/dark themes share one palette definition. The
// keys here resolve at access time so charts repaint correctly when the
// theme changes (recharts reads the value once per render).

const RAW = {
  protein: 'var(--macro-protein)',
  carbs:   'var(--macro-carbs)',
  fat:     'var(--macro-fat)',
  fiber:   'var(--macro-fiber)',
} as const;

export const MACRO_COLORS = RAW;
export type MacroKey = keyof typeof RAW;
