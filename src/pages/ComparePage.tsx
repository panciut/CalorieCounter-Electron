import { useState, useEffect, useMemo, type CSSProperties } from 'react';
import { useT } from '../i18n/useT';
import { useSettings } from '../hooks/useSettings';
import { useToast } from '../components/Toast';
import { api } from '../api';
import FoodSearch from '../components/FoodSearch';
import { PageHeader, SegmentedControl, eyebrow as eyebrowStyle, serifItalic, cardOuter } from '../lib/fbUI';
import { buildCompareMarkdown, copyToClipboard } from '../lib/exportText';
import type { Food } from '../types';
import type { SearchItem } from '../components/FoodSearch';

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'compare' | 'rank';

type CompareMode = 'per100g' | 'per100kcal' | 'perPiece' | 'perPackage' | 'customG' | 'customKcal';

type RankMetric =
  | 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber'
  | 'netCarbs' | 'energyDensity' | 'proteinDensity' | 'satiety'
  | 'pricePer100g' | 'pricePer100kcal' | 'pricePer10gProtein';

const MAX_FOODS = 5;

// ── Pure helpers ──────────────────────────────────────────────────────────────

function effectivePricePer100g(food: Food, selectedPkgId: number | null): number | null {
  if (selectedPkgId != null) {
    const pkg = food.packages?.find(p => p.id === selectedPkgId);
    if (pkg?.price != null && pkg.grams > 0) return (pkg.price / pkg.grams) * 100;
  }
  const priced = food.packages?.filter(p => p.price != null && p.grams > 0);
  if (priced && priced.length > 0) {
    const cheapest = priced.reduce((best, p) =>
      (p.price! / p.grams) < (best.price! / best.grams) ? p : best
    );
    return (cheapest.price! / cheapest.grams) * 100;
  }
  return food.price_per_100g ?? null;
}

interface NormalizedRow {
  food: Food;
  gramsEff: number | null;
  kcalBudget: number | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  netCarbs: number;
  energyDensity: number;
  proteinDensity: number;
  satiety: number;
  macroPctP: number;
  macroPctC: number;
  macroPctF: number;
  price: number | null;
  pricePer100g: number | null;
  pricePer100kcal: number | null;
  pricePer10gProtein: number | null;
  available: boolean;
}

function normalize(
  food: Food,
  mode: CompareMode,
  ctx: { customG: number; customKcal: number; pkgId: number | null; pricePer100g: number | null }
): NormalizedRow {
  const base = { food, gramsEff: null as number | null, kcalBudget: null as number | null };

  let gramsEff: number | null = null;
  let kcalBudget: number | null = null;
  let available = true;

  switch (mode) {
    case 'per100g':
      gramsEff = 100;
      break;
    case 'per100kcal':
      if (!food.calories) { available = false; break; }
      gramsEff = (100 / food.calories) * 100;
      kcalBudget = 100;
      break;
    case 'perPiece':
      if (!food.piece_grams) { available = false; break; }
      gramsEff = food.piece_grams;
      break;
    case 'perPackage': {
      let pkgGrams: number | null = null;
      if (ctx.pkgId != null) {
        pkgGrams = food.packages?.find(p => p.id === ctx.pkgId)?.grams ?? null;
      } else {
        pkgGrams = food.packages?.[0]?.grams ?? null;
      }
      if (!pkgGrams) { available = false; break; }
      gramsEff = pkgGrams;
      break;
    }
    case 'customG':
      gramsEff = ctx.customG;
      break;
    case 'customKcal':
      if (!food.calories) { available = false; break; }
      gramsEff = (ctx.customKcal / food.calories) * 100;
      kcalBudget = ctx.customKcal;
      break;
  }

  if (!available || gramsEff === null) {
    return {
      ...base, gramsEff: null, kcalBudget: null,
      calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0,
      netCarbs: 0, energyDensity: 0, proteinDensity: 0, satiety: 0,
      macroPctP: 0, macroPctC: 0, macroPctF: 0,
      price: null, pricePer100g: null, pricePer100kcal: null, pricePer10gProtein: null,
      available: false,
    };
  }

  const scale = gramsEff / 100;
  const calories  = food.calories  * scale;
  const protein   = food.protein   * scale;
  const carbs     = food.carbs     * scale;
  const fat       = food.fat       * scale;
  const fiber     = food.fiber     * scale;
  const netCarbs  = carbs - fiber;

  const energyDensity  = food.calories / 100;
  const proteinDensity = food.calories > 0 ? (food.protein / food.calories) * 100 : 0;
  const satiety        = food.calories > 0 ? ((food.protein + food.fiber) / food.calories) * 100 : 0;

  const kcalFromMacros = food.protein * 4 + food.carbs * 4 + food.fat * 9;
  const macroPctP = kcalFromMacros > 0 ? Math.round((food.protein * 4 / kcalFromMacros) * 100) : 0;
  const macroPctF = kcalFromMacros > 0 ? Math.round((food.fat * 9 / kcalFromMacros) * 100) : 0;
  const macroPctC = 100 - macroPctP - macroPctF;

  const pp100g = ctx.pricePer100g;
  const price              = pp100g != null ? pp100g * scale : null;
  const pricePer100g       = pp100g;
  const pricePer100kcal    = (pp100g != null && food.calories > 0) ? (pp100g * 100 / food.calories) : null;
  const pricePer10gProtein = (pp100g != null && food.protein > 0) ? (pp100g * 10 / food.protein) : null;

  return {
    food, gramsEff: mode === 'per100kcal' ? null : gramsEff, kcalBudget,
    calories, protein, carbs, fat, fiber, netCarbs,
    energyDensity, proteinDensity, satiety,
    macroPctP, macroPctC, macroPctF,
    price, pricePer100g, pricePer100kcal, pricePer10gProtein,
    available: true,
  };
}

function fmt(v: number, d = 1): string {
  return v.toFixed(d).replace(/\.0+$/, d === 0 ? '' : '.0');
}

function fmtOrDash(v: number | null, d = 1): string {
  return v == null ? '—' : fmt(v, d);
}

const RANK_METRIC_LABELS: Record<RankMetric, string> = {
  calories:           'Calories (kcal/100g)',
  protein:            'Protein (g/100g)',
  carbs:              'Carbs (g/100g)',
  fat:                'Fat (g/100g)',
  fiber:              'Fiber (g/100g)',
  netCarbs:           'Net carbs (g/100g)',
  energyDensity:      'Energy density (kcal/g)',
  proteinDensity:     'Protein density (g/100 kcal)',
  satiety:            'Satiety (P+Fi /100 kcal)',
  pricePer100g:       'Price /100g',
  pricePer100kcal:    'Price /100 kcal',
  pricePer10gProtein: 'Price /10g protein',
};

const RANK_DIR_DEFAULT: Record<RankMetric, boolean> = {
  calories: false, protein: true, carbs: false, fat: false, fiber: true,
  netCarbs: false, energyDensity: false, proteinDensity: true, satiety: true,
  pricePer100g: false, pricePer100kcal: false, pricePer10gProtein: false,
};

function computeRankValue(food: Food, metric: RankMetric): number | null {
  switch (metric) {
    case 'calories':           return food.calories;
    case 'protein':            return food.protein;
    case 'carbs':              return food.carbs;
    case 'fat':                return food.fat;
    case 'fiber':              return food.fiber;
    case 'netCarbs':           return food.carbs - food.fiber;
    case 'energyDensity':      return food.calories / 100;
    case 'proteinDensity':     return food.calories > 0 ? (food.protein / food.calories) * 100 : null;
    case 'satiety':            return food.calories > 0 ? ((food.protein + food.fiber) / food.calories) * 100 : null;
    case 'pricePer100g': {
      const p = effectivePricePer100g(food, null);
      return p;
    }
    case 'pricePer100kcal': {
      const p = effectivePricePer100g(food, null);
      return (p != null && food.calories > 0) ? (p * 100 / food.calories) : null;
    }
    case 'pricePer10gProtein': {
      const p = effectivePricePer100g(food, null);
      return (p != null && food.protein > 0) ? (p * 10 / food.protein) : null;
    }
  }
}

// ── Style tokens ──────────────────────────────────────────────────────────────

const fbInput: CSSProperties = {
  background: 'var(--fb-bg)', border: '1px solid var(--fb-border-strong)',
  color: 'var(--fb-text)', borderRadius: 10,
  padding: '7px 10px', fontSize: 13, outline: 'none',
  fontFamily: 'var(--font-body)',
};

const pillBtn = (active: boolean): CSSProperties => ({
  padding: '7px 14px', borderRadius: 99,
  background: active ? 'var(--fb-accent)' : 'transparent',
  color: active ? 'white' : 'var(--fb-text-2)',
  border: '1px solid ' + (active ? 'var(--fb-accent)' : 'var(--fb-border-strong)'),
  fontSize: 12, fontWeight: 600, cursor: 'pointer',
  transition: 'all .25s cubic-bezier(0.32,0.72,0,1)',
  whiteSpace: 'nowrap',
});

const ghostBtn: CSSProperties = {
  padding: '7px 14px', borderRadius: 99,
  background: 'transparent', color: 'var(--fb-text-2)',
  border: '1px solid var(--fb-border-strong)',
  fontSize: 12, fontWeight: 600, cursor: 'pointer',
  whiteSpace: 'nowrap',
};

// ── Compare tab ───────────────────────────────────────────────────────────────

function CompareTab({
  allFoods, settings, t, seeds = [],
}: {
  allFoods: Food[];
  settings: ReturnType<typeof useSettings>['settings'];
  t: (k: string) => string;
  seeds?: Food[];
}) {
  const { showToast } = useToast();
  const [selected, setSelected] = useState<Food[]>(() => seeds);
  const [mode, setMode] = useState<CompareMode>('per100g');
  const [customG, setCustomG] = useState('100');
  const [customKcal, setCustomKcal] = useState('100');
  const [pkgChoice, setPkgChoice] = useState<Record<number, number>>({});
  const currency = settings.currency_symbol ?? '€';

  function addFood(item: SearchItem) {
    if ('isRecipe' in item && item.isRecipe) return;
    const food = item as Food;
    if (selected.find(f => f.id === food.id)) return;
    if (selected.length >= MAX_FOODS) return;
    setSelected(prev => [...prev, food]);
  }

  function removeFood(id: number) {
    setSelected(prev => prev.filter(f => f.id !== id));
    setPkgChoice(prev => { const n = { ...prev }; delete n[id]; return n; });
  }

  const rows = useMemo<NormalizedRow[]>(() => {
    return selected.map(food => {
      const pkgId = pkgChoice[food.id] ?? null;
      const pp100g = effectivePricePer100g(food, pkgId);
      return normalize(food, mode, {
        customG: parseFloat(customG) || 100,
        customKcal: parseFloat(customKcal) || 100,
        pkgId, pricePer100g: pp100g,
      });
    });
  }, [selected, mode, customG, customKcal, pkgChoice]);

  const hasPrices = rows.some(r => r.pricePer100g != null);

  const modes: { key: CompareMode; label: string }[] = [
    { key: 'per100g',   label: t('compare.mode.per100g') },
    { key: 'per100kcal',label: t('compare.mode.per100kcal') },
    { key: 'perPiece',  label: t('compare.mode.perPiece') },
    { key: 'perPackage',label: t('compare.mode.perPackage') },
    { key: 'customG',   label: t('compare.mode.customG') },
    { key: 'customKcal',label: t('compare.mode.customKcal') },
  ];

  async function handleCopy() {
    const md = buildCompareMarkdown(
      rows.map(r => ({
        name: r.food.name,
        gramsEff: r.gramsEff, kcalBudget: r.kcalBudget,
        calories: r.calories, protein: r.protein, carbs: r.carbs, fat: r.fat, fiber: r.fiber,
        netCarbs: r.netCarbs, energyDensity: r.energyDensity, proteinDensity: r.proteinDensity, satiety: r.satiety,
        macroPctP: r.macroPctP, macroPctC: r.macroPctC, macroPctF: r.macroPctF,
        price: r.price, pricePer100g: r.pricePer100g, pricePer100kcal: r.pricePer100kcal, pricePer10gProtein: r.pricePer10gProtein,
        available: r.available,
      })),
      modes.find(m => m.key === mode)?.label ?? mode,
      currency,
    );
    const ok = await copyToClipboard(md);
    if (ok) showToast(t('common.copied') || 'Copied', 'success');
  }

  const cellSty: CSSProperties = { padding: '10px 12px', textAlign: 'right', color: 'var(--fb-text)', fontSize: 13, fontVariantNumeric: 'tabular-nums' };
  const labelSty: CSSProperties = { padding: '10px 12px', textAlign: 'left', color: 'var(--fb-text-2)', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' };
  const sectionSty: CSSProperties = { ...eyebrowStyle, padding: '10px 12px', textAlign: 'left', background: 'var(--fb-bg)', borderTop: '1px solid var(--fb-border)', borderBottom: '1px solid var(--fb-border)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Mode + actions */}
      <section style={{ ...cardOuter, gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span style={eyebrowStyle}>Normalisation</span>
          {selected.length > 0 && (
            <button onClick={handleCopy} style={ghostBtn}>{t('compare.copyMarkdown')}</button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {modes.map(m => (
            <button key={m.key} onClick={() => setMode(m.key)} style={pillBtn(mode === m.key)}>
              {m.label}
            </button>
          ))}
          {mode === 'customG' && (
            <input type="number" inputMode="decimal" min={1}
              value={customG} onChange={e => setCustomG(e.target.value)}
              style={{ ...fbInput, width: 90 }} />
          )}
          {mode === 'customKcal' && (
            <input type="number" inputMode="decimal" min={1}
              value={customKcal} onChange={e => setCustomKcal(e.target.value)}
              style={{ ...fbInput, width: 90 }} />
          )}
        </div>
      </section>

      {/* Foods + comparison table */}
      <section style={{ ...cardOuter, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 400, borderCollapse: 'collapse' }}>
            <colgroup>
              <col style={{ width: 180 }} />
              {selected.map(f => <col key={f.id} />)}
              {selected.length < MAX_FOODS && <col style={{ width: 220 }} />}
            </colgroup>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--fb-border)' }}>
                <th />
                {selected.map(food => (
                  <th key={food.id} style={{ padding: '14px 12px', verticalAlign: 'top', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ ...serifItalic, fontSize: 14, fontWeight: 500, color: 'var(--fb-text)', lineHeight: 1.1 }}>{food.name}</span>
                        <button onClick={() => removeFood(food.id)} title="Remove"
                          style={{ background: 'transparent', border: 0, color: 'var(--fb-text-3)', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 2 }}>✕</button>
                      </div>
                      {mode === 'perPackage' && food.packages && food.packages.length > 1 && (
                        <select
                          value={pkgChoice[food.id] ?? food.packages[0]?.id ?? ''}
                          onChange={e => setPkgChoice(prev => ({ ...prev, [food.id]: Number(e.target.value) }))}
                          style={{ ...fbInput, fontSize: 11, padding: '4px 8px' }}
                        >
                          {food.packages.map(pkg => (
                            <option key={pkg.id} value={pkg.id}>{pkg.grams}g{pkg.price != null ? ` · ${currency}${pkg.price}` : ''}</option>
                          ))}
                        </select>
                      )}
                      {mode === 'perPackage' && (!food.packages || food.packages.length === 0) && (
                        <span style={{ ...serifItalic, fontSize: 11, color: 'var(--fb-text-3)' }}>{t('compare.notAvailable')}</span>
                      )}
                    </div>
                  </th>
                ))}
                {selected.length < MAX_FOODS && (
                  <th style={{ padding: '14px 12px', verticalAlign: 'top' }}>
                    <FoodSearch
                      items={allFoods}
                      onSelect={addFood}
                      clearAfterSelect
                      showAllWhenEmpty
                      placeholder={t('compare.addFood')}
                    />
                  </th>
                )}
              </tr>
            </thead>

            {selected.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={2} style={{ padding: '60px 12px', textAlign: 'center' }}>
                    <span style={{ ...serifItalic, fontSize: 15, color: 'var(--fb-text-2)' }}>{t('compare.emptyState')}</span>
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody>
                <tr><td colSpan={selected.length + 2} style={sectionSty}>Nutrition</td></tr>

                {rows.some(r => r.gramsEff != null) && (
                  <tr style={{ borderTop: '1px solid var(--fb-divider)' }}>
                    <td style={labelSty}>{t('compare.effectiveGrams')}</td>
                    {rows.map(r => (
                      <td key={r.food.id} style={cellSty}>{r.available && r.gramsEff != null ? `${fmt(r.gramsEff, 1)}g` : '—'}</td>
                    ))}
                  </tr>
                )}
                {rows.some(r => r.kcalBudget != null) && (
                  <tr style={{ borderTop: '1px solid var(--fb-divider)' }}>
                    <td style={labelSty}>{t('compare.kcalBudget')}</td>
                    {rows.map(r => (
                      <td key={r.food.id} style={cellSty}>{r.kcalBudget != null ? `${fmt(r.kcalBudget, 0)} kcal` : '—'}</td>
                    ))}
                  </tr>
                )}

                {([
                  ['Calories (kcal)', (r: NormalizedRow) => fmtOrDash(r.available ? r.calories : null, 1), 'var(--fb-orange)'],
                  ['Protein (g)',     (r: NormalizedRow) => fmtOrDash(r.available ? r.protein  : null), 'var(--fb-red)'],
                  ['Carbs (g)',       (r: NormalizedRow) => fmtOrDash(r.available ? r.carbs    : null), 'var(--fb-amber)'],
                  ['Fat (g)',         (r: NormalizedRow) => fmtOrDash(r.available ? r.fat      : null), 'var(--fb-green)'],
                  ['Fiber (g)',       (r: NormalizedRow) => fmtOrDash(r.available ? r.fiber    : null), 'var(--fb-text-2)'],
                ] as [string, (r: NormalizedRow) => string, string][]).map(([label, fn, dot]) => (
                  <tr key={label} style={{ borderTop: '1px solid var(--fb-divider)' }}>
                    <td style={labelSty}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: dot }} />
                        {label}
                      </span>
                    </td>
                    {rows.map(r => <td key={r.food.id} style={cellSty}>{fn(r)}</td>)}
                  </tr>
                ))}

                <tr><td colSpan={selected.length + 2} style={sectionSty}>Density & quality</td></tr>

                {([
                  [t('compare.netCarbs'),       (r: NormalizedRow) => fmtOrDash(r.available ? r.netCarbs       : null)],
                  [t('compare.energyDensity'),  (r: NormalizedRow) => fmtOrDash(r.available ? r.energyDensity  : null, 2)],
                  [t('compare.proteinDensity'), (r: NormalizedRow) => fmtOrDash(r.available ? r.proteinDensity : null)],
                  [t('compare.satiety'),        (r: NormalizedRow) => fmtOrDash(r.available ? r.satiety        : null)],
                  [t('compare.macroSplit'),     (r: NormalizedRow) => r.available
                    ? `${r.macroPctP}% / ${r.macroPctC}% / ${r.macroPctF}%` : '—'],
                ] as [string, (r: NormalizedRow) => string][]).map(([label, fn]) => (
                  <tr key={label} style={{ borderTop: '1px solid var(--fb-divider)' }}>
                    <td style={labelSty}>{label}</td>
                    {rows.map(r => <td key={r.food.id} style={cellSty}>{fn(r)}</td>)}
                  </tr>
                ))}

                {hasPrices && (
                  <>
                    <tr><td colSpan={selected.length + 2} style={sectionSty}>{t('compare.price.section')} ({currency})</td></tr>
                    {([
                      [t('compare.price.scaled'),       (r: NormalizedRow) => fmtOrDash(r.price, 2)],
                      [t('compare.price.per100g'),      (r: NormalizedRow) => fmtOrDash(r.pricePer100g, 2)],
                      [t('compare.price.per100kcal'),   (r: NormalizedRow) => fmtOrDash(r.pricePer100kcal, 2)],
                      [t('compare.price.per10gProtein'),(r: NormalizedRow) => fmtOrDash(r.pricePer10gProtein, 2)],
                    ] as [string, (r: NormalizedRow) => string][]).map(([label, fn]) => (
                      <tr key={label} style={{ borderTop: '1px solid var(--fb-divider)' }}>
                        <td style={labelSty}>{label}</td>
                        {rows.map(r => <td key={r.food.id} style={cellSty}>{fn(r)}</td>)}
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            )}
          </table>
        </div>
      </section>
    </div>
  );
}

// ── Rank tab ──────────────────────────────────────────────────────────────────

function RankTab({
  allFoods, settings, t, onCompareSelected,
}: {
  allFoods: Food[];
  settings: ReturnType<typeof useSettings>['settings'];
  t: (k: string) => string;
  onCompareSelected: (foods: Food[]) => void;
}) {
  const [metric, setMetric] = useState<RankMetric>('proteinDensity');
  const [dirDesc, setDirDesc] = useState<boolean>(RANK_DIR_DEFAULT['proteinDensity']);
  const [search, setSearch] = useState('');
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [normMode, setNormMode] = useState<'per100g' | 'per100kcal'>('per100g');
  const currency = settings.currency_symbol ?? '€';

  function setMetricWithDir(m: RankMetric) {
    setMetric(m);
    setDirDesc(RANK_DIR_DEFAULT[m]);
  }

  function handleColClick(m: RankMetric) {
    if (m === metric) setDirDesc(v => !v);
    else setMetricWithDir(m);
  }

  function scaleVal(raw: number, food: Food): number {
    if (normMode === 'per100kcal') return food.calories > 0 ? (raw / food.calories) * 100 : 0;
    return raw;
  }

  const ranked = useMemo(() => {
    const withValues = allFoods.map(food => {
      let value = computeRankValue(food, metric);
      if (normMode === 'per100kcal' && value != null &&
          ['calories','protein','carbs','fat','fiber','netCarbs'].includes(metric)) {
        value = food.calories > 0 ? (value / food.calories) * 100 : null;
      }
      const pp100g = effectivePricePer100g(food, null);
      return {
        food, value,
        pricePer100g: pp100g,
        pricePer100kcal: (pp100g != null && food.calories > 0) ? (pp100g * 100 / food.calories) : null,
      };
    });
    const filtered = search
      ? withValues.filter(r => r.food.name.toLowerCase().includes(search.toLowerCase()))
      : withValues;

    return filtered.sort((a, b) => {
      if (a.value == null && b.value == null) return 0;
      if (a.value == null) return 1;
      if (b.value == null) return -1;
      return dirDesc ? b.value - a.value : a.value - b.value;
    });
  }, [allFoods, metric, dirDesc, search, normMode]);

  function toggleCheck(id: number) {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_FOODS) next.add(id);
      return next;
    });
  }

  function handleCompareSelected() {
    const foods = ranked.filter(r => checked.has(r.food.id)).map(r => r.food);
    onCompareSelected(foods);
  }

  const is100kcal = normMode === 'per100kcal';
  const FIXED_COLS: { label: string; m: RankMetric; dot: string }[] = [
    { label: is100kcal ? '100 kcal' : 'kcal', m: 'calories', dot: 'var(--fb-orange)' },
    { label: 'P',  m: 'protein', dot: 'var(--fb-red)' },
    { label: 'C',  m: 'carbs',   dot: 'var(--fb-amber)' },
    { label: 'F',  m: 'fat',     dot: 'var(--fb-green)' },
    { label: 'Fi', m: 'fiber',   dot: 'var(--fb-text-2)' },
  ];
  const FIXED_METRIC_KEYS = new Set<RankMetric>(['calories', 'protein', 'carbs', 'fat', 'fiber', 'pricePer100g', 'pricePer100kcal']);
  const isDerived = !FIXED_METRIC_KEYS.has(metric);

  function thStyle(m: RankMetric): CSSProperties {
    return {
      padding: '12px', textAlign: 'right', whiteSpace: 'nowrap',
      ...eyebrowStyle, fontWeight: 700,
      color: metric === m ? 'var(--fb-accent)' : 'var(--fb-text-3)',
      cursor: 'pointer', userSelect: 'none',
      transition: 'color .25s ease',
    };
  }

  function dirArrow(m: RankMetric) {
    return metric === m ? (dirDesc ? ' ↓' : ' ↑') : '';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <section style={{ ...cardOuter, gap: 12 }}>
        <span style={eyebrowStyle}>Rank by metric</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <select value={metric} onChange={e => setMetricWithDir(e.target.value as RankMetric)}
            style={{ ...fbInput, paddingRight: 22, minWidth: 220 }}>
            {(Object.entries(RANK_METRIC_LABELS) as [RankMetric, string][]).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
          <SegmentedControl<'per100g' | 'per100kcal'>
            value={normMode}
            onChange={setNormMode}
            options={[
              { value: 'per100g',    label: '/100g' },
              { value: 'per100kcal', label: '/100 kcal' },
            ]}
            minWidth={180}
          />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('compare.rank.searchPlaceholder')}
            style={{ ...fbInput, width: 200 }} />
          <div style={{ marginLeft: 'auto' }}>
            {checked.size > 0 && (
              <button onClick={handleCompareSelected}
                style={{ padding: '7px 16px', borderRadius: 99, background: 'var(--fb-accent)', color: 'white', border: 0, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {t('compare.rank.compareSelected').replace('{n}', String(checked.size))} ({checked.size}/{MAX_FOODS})
              </button>
            )}
          </div>
        </div>
      </section>

      <section style={{ ...cardOuter, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--fb-bg)', borderBottom: '1px solid var(--fb-border)' }}>
                <th style={{ ...eyebrowStyle, padding: '12px', textAlign: 'right', width: 40 }}>#</th>
                <th style={{ padding: '12px', width: 32 }} />
                <th style={{ ...eyebrowStyle, padding: '12px', textAlign: 'left' }}>Name</th>
                {isDerived && (
                  <th style={thStyle(metric)} onClick={() => handleColClick(metric)}>
                    {RANK_METRIC_LABELS[metric]}{dirArrow(metric)}
                  </th>
                )}
                {FIXED_COLS.map(({ label, m, dot }) => (
                  <th key={m} style={thStyle(m)} onClick={() => handleColClick(m)}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: dot }} />
                      {label}{dirArrow(m)}
                    </span>
                  </th>
                ))}
                <th style={thStyle(is100kcal ? 'pricePer100kcal' : 'pricePer100g')}
                  onClick={() => handleColClick(is100kcal ? 'pricePer100kcal' : 'pricePer100g')}>
                  {currency}/{is100kcal ? '100kcal' : '100g'}{dirArrow(is100kcal ? 'pricePer100kcal' : 'pricePer100g')}
                </th>
              </tr>
            </thead>
            <tbody>
              {ranked.map(({ food, value, pricePer100g, pricePer100kcal }, i) => {
                const isChecked = checked.has(food.id);
                return (
                  <tr key={food.id}
                    onClick={() => toggleCheck(food.id)}
                    style={{
                      borderTop: '1px solid var(--fb-divider)',
                      cursor: 'pointer',
                      background: isChecked ? 'var(--fb-accent-soft)' : 'transparent',
                      transition: 'background .25s ease',
                    }}
                    onMouseEnter={ev => { if (!isChecked) (ev.currentTarget as HTMLElement).style.background = 'var(--fb-bg)'; }}
                    onMouseLeave={ev => { if (!isChecked) (ev.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <td className="tnum" style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--fb-text-3)', fontSize: 11 }}>{i + 1}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isChecked} onChange={() => toggleCheck(food.id)}
                        disabled={!isChecked && checked.size >= MAX_FOODS}
                        style={{ accentColor: 'var(--fb-accent)', cursor: 'pointer' }} />
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--fb-text)', ...serifItalic, fontSize: 13 }}>{food.name}</td>
                    {isDerived && (
                      <td className="tnum" style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--fb-accent)', fontWeight: 600 }}>
                        {value != null ? fmt(value, 2) : '—'}
                      </td>
                    )}
                    <td className="tnum" style={{ padding: '10px 12px', textAlign: 'right', color: metric === 'calories' ? 'var(--fb-accent)' : 'var(--fb-text-2)', fontWeight: metric === 'calories' ? 600 : 400 }}>
                      {is100kcal ? '100' : fmt(food.calories, 1)}
                    </td>
                    <td className="tnum" style={{ padding: '10px 12px', textAlign: 'right', color: metric === 'protein' ? 'var(--fb-accent)' : 'var(--fb-text-2)', fontWeight: metric === 'protein' ? 600 : 400 }}>
                      {fmt(scaleVal(food.protein, food), 1)}
                    </td>
                    <td className="tnum" style={{ padding: '10px 12px', textAlign: 'right', color: metric === 'carbs' ? 'var(--fb-accent)' : 'var(--fb-text-2)', fontWeight: metric === 'carbs' ? 600 : 400 }}>
                      {fmt(scaleVal(food.carbs, food), 1)}
                    </td>
                    <td className="tnum" style={{ padding: '10px 12px', textAlign: 'right', color: metric === 'fat' ? 'var(--fb-accent)' : 'var(--fb-text-2)', fontWeight: metric === 'fat' ? 600 : 400 }}>
                      {fmt(scaleVal(food.fat, food), 1)}
                    </td>
                    <td className="tnum" style={{ padding: '10px 12px', textAlign: 'right', color: metric === 'fiber' ? 'var(--fb-accent)' : 'var(--fb-text-2)', fontWeight: metric === 'fiber' ? 600 : 400 }}>
                      {fmt(scaleVal(food.fiber, food), 1)}
                    </td>
                    <td className="tnum" style={{
                      padding: '10px 12px', textAlign: 'right', fontSize: 12,
                      color: (is100kcal ? metric === 'pricePer100kcal' : metric === 'pricePer100g') ? 'var(--fb-accent)' : 'var(--fb-text-2)',
                      fontWeight: (is100kcal ? metric === 'pricePer100kcal' : metric === 'pricePer100g') ? 600 : 400,
                    }}>
                      {(() => { const v = is100kcal ? pricePer100kcal : pricePer100g; return v != null ? `${currency}${fmt(v, 2)}` : '—'; })()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// ── ComparePage ───────────────────────────────────────────────────────────────

export default function ComparePage() {
  const { t } = useT();
  const { settings } = useSettings();
  const [allFoods, setAllFoods] = useState<Food[]>([]);
  const [tab, setTab] = useState<Tab>('compare');
  const [compareSeeds, setCompareSeeds] = useState<Food[]>([]);

  useEffect(() => {
    api.foods.getAll().then(setAllFoods);
  }, []);

  function handleCompareSelected(foods: Food[]) {
    setCompareSeeds(foods);
    setTab('compare');
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--fb-bg)', color: 'var(--fb-text)', fontFamily: 'var(--font-body)' }}>
      <PageHeader
        eyebrow="Foods"
        title={t('compare.title')}
        right={
          <SegmentedControl<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { value: 'compare', label: t('compare.tabCompare') },
              { value: 'rank',    label: t('compare.tabRank') },
            ]}
            minWidth={220}
          />
        }
      />
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 60px' }} className="hide-scrollbar">
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          {tab === 'compare' && (
            <CompareTab
              key={compareSeeds.map(f => f.id).join(',') || 'empty'}
              allFoods={allFoods} settings={settings} t={t} seeds={compareSeeds}
            />
          )}
          {tab === 'rank' && (
            <RankTab
              allFoods={allFoods} settings={settings} t={t}
              onCompareSelected={handleCompareSelected}
            />
          )}
        </div>
      </div>
    </div>
  );
}
