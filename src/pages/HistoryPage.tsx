import { useEffect, useState, useMemo, type CSSProperties } from 'react';
import { useT } from '../i18n/useT';
import { useNavigate } from '../hooks/useNavigate';
import { useToast } from '../components/Toast';
import { useSettings } from '../hooks/useSettings';
import { api } from '../api';
import BarChartCard from '../components/BarChartCard';
import ConcentricRings from '../components/ConcentricRings';
import { MACRO_COLORS } from '../lib/macroColors';
import { PageHeader, SegmentedControl, eyebrow as eyebrowStyle, serifItalic, cardOuter } from '../lib/fbUI';
import { formatShortDate, formatDMY, getMondayOf, today, addDays, buildDateRange } from '../lib/dateUtil';
import { buildHistoryMarkdown, copyToClipboard } from '../lib/exportText';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, ReferenceLine,
} from 'recharts';
import type { WeeklySummary, MacroTrendPoint, CalorieTrendPoint, WeightEntry } from '../types';

type Tab = 'weekly' | 'analytics';
type WeekRange = '4' | '12' | '26' | '52' | 'all';
type AnalyticsRange = '7' | '30' | '90' | '180';

const statTile: CSSProperties = {
  background: 'var(--fb-bg)', border: '1px solid var(--fb-border)',
  borderRadius: 12, padding: '14px 16px',
  display: 'flex', flexDirection: 'column', gap: 4,
};

const bigSerif: CSSProperties = {
  ...serifItalic, fontSize: 26, fontWeight: 400,
  letterSpacing: -0.6, color: 'var(--fb-text)', lineHeight: 1,
};

const chartTooltip = {
  background: 'var(--fb-card)', border: '1px solid var(--fb-border-strong)',
  borderRadius: 10, color: 'var(--fb-text)', fontSize: 12,
};

export default function HistoryPage() {
  const { t } = useT();
  const { settings } = useSettings();
  const { navigate } = useNavigate();
  const { showToast } = useToast();

  const [tab, setTab]               = useState<Tab>('weekly');
  const [summaries, setSummaries]   = useState<WeeklySummary[]>([]);
  const [weekRange, setWeekRange]   = useState<WeekRange>('12');
  const [energyByWeek, setEnergyByWeek] = useState<Map<string, { avgNet: number; days: number }>>(new Map());

  const [aRange, setARange]         = useState<AnalyticsRange>('30');
  const [macroData, setMacroData]   = useState<MacroTrendPoint[]>([]);
  const [calData, setCalData]       = useState<CalorieTrendPoint[]>([]);
  const [weightData, setWeightData] = useState<WeightEntry[]>([]);

  useEffect(() => {
    api.log.getWeeklySummaries().then(setSummaries);
  }, []);

  useEffect(() => {
    if (tab === 'analytics') {
      const n = Number(aRange) as 7 | 30 | 90 | 180;
      api.analytics.macroTrend(n).then(setMacroData);
      api.analytics.caloriesTrend(n).then(setCalData);
      api.weight.getAll().then(setWeightData);
    }
  }, [tab, aRange]);

  const sortedSummaries = useMemo(
    () => [...summaries].sort((a, b) => a.week_start.localeCompare(b.week_start)),
    [summaries],
  );

  useEffect(() => {
    if (!sortedSummaries.length) return;
    const start = sortedSummaries[0].week_start;
    api.dailyEnergy.getRange(start, today()).then(rows => {
      const byMonday = new Map<string, { totalOut: number; days: number }>();
      for (const row of rows) {
        const out = row.resting_kcal + row.active_kcal + row.extra_kcal;
        if (out === 0) continue;
        const key = getMondayOf(row.date);
        const prev = byMonday.get(key) ?? { totalOut: 0, days: 0 };
        byMonday.set(key, { totalOut: prev.totalOut + out, days: prev.days + 1 });
      }
      const result = new Map<string, { avgNet: number; days: number }>();
      for (const s of sortedSummaries) {
        const key = getMondayOf(s.week_start);
        const e = byMonday.get(key);
        if (!e) continue;
        result.set(key, { avgNet: Math.round(s.avg_calories - e.totalOut / e.days), days: e.days });
      }
      setEnergyByWeek(result);
    });
  }, [sortedSummaries.length]);

  const rangedSummaries = weekRange === 'all' ? sortedSummaries : sortedSummaries.slice(-Number(weekRange));

  const chartData = rangedSummaries.map(s => ({
    label: formatShortDate(getMondayOf(s.week_start)),
    value: Math.round(s.avg_calories),
  }));

  const calRec = settings.cal_rec || 2000;
  const proRec = settings.protein_rec || 0;
  const calMax = settings.cal_max || 0;
  const maxBar = Math.max(...chartData.map(d => d.value), 1);
  const yMax   = Math.round(Math.max(calMax || calRec, maxBar) * 1.3);
  const yDomain: [number, number] = [0, yMax];

  const todayStr = today();
  const completeWeeks = rangedSummaries.filter(s => addDays(s.week_start, 6) < todayStr);
  const includedForStats = completeWeeks.filter(s => s.avg_calories > 0);
  const statsAvgKcal = includedForStats.length
    ? Math.round(includedForStats.reduce((s, w) => s + w.avg_calories, 0) / includedForStats.length)
    : 0;
  const statsAvgProtein = includedForStats.length
    ? Math.round(includedForStats.reduce((s, w) => s + w.avg_protein, 0) / includedForStats.length)
    : 0;
  const totalDays = rangedSummaries.reduce((s, w) => s + w.days_logged, 0);
  const netRows = completeWeeks
    .map(s => energyByWeek.get(getMondayOf(s.week_start)))
    .filter(Boolean) as { avgNet: number; days: number }[];
  const statsAvgNet = netRows.length
    ? Math.round(netRows.reduce((s, e) => s + e.avgNet, 0) / netRows.length)
    : null;

  const calPct = calRec > 0 ? (statsAvgKcal / calRec) * 100 : 0;
  const proPct = proRec > 0 ? (statsAvgProtein / proRec) * 100 : 0;
  const consPct = rangedSummaries.length > 0 ? (totalDays / (rangedSummaries.length * 7)) * 100 : 0;

  const aRangeN = Number(aRange) as 7 | 30 | 90 | 180;
  const dateRange = buildDateRange(aRangeN);
  const calMap    = new Map(calData.map(d => [d.date, d]));
  const filledCal = dateRange.map(date => {
    const p = calMap.get(date);
    return {
      date,
      label:        formatShortDate(date),
      calories_in:  p ? Math.round(p.calories_in)  : 0,
      calories_out: p ? Math.round(p.calories_out) : 0,
      net:          p ? Math.round(p.net)           : 0,
    };
  });

  const macroMap   = new Map(macroData.map(d => [d.date, d]));
  const filledMacro = dateRange.map(date => {
    const p = macroMap.get(date);
    return {
      label:   formatShortDate(date),
      fat:     p ? Math.round(p.fat)     : 0,
      carbs:   p ? Math.round(p.carbs)   : 0,
      fiber:   p ? Math.round(p.fiber)   : 0,
      protein: p ? Math.round(p.protein) : 0,
    };
  });

  const cutoff = addDays(today(), -(aRangeN - 1));
  const filteredWeight = weightData
    .filter(w => w.date >= cutoff)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(w => ({
      label:   formatShortDate(w.date),
      ts:      new Date(w.date).getTime(),
      weight:  w.weight,
      fat_pct: w.fat_pct,
    }));
  const hasWeightFatPct = filteredWeight.some(w => w.fat_pct != null);
  const weightMinTs = filteredWeight.length ? filteredWeight[0].ts : 0;
  const weightMaxTs = filteredWeight.length ? filteredWeight[filteredWeight.length - 1].ts : 0;
  const weightSpanDays = Math.max(1, (weightMaxTs - weightMinTs) / 86_400_000);
  const weightTickFmt = (ms: number) => {
    const d = new Date(ms);
    return weightSpanDays > 180
      ? d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
      : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const xInterval = aRangeN === 7 ? 0 : aRangeN === 30 ? 4 : aRangeN === 90 ? 12 : 20;

  async function handleCopy() {
    const [streak, weights] = await Promise.all([api.streaks.get(), api.weight.getAll()]);
    const md = buildHistoryMarkdown({
      summaries, settings,
      weightEntries: weights.map(w => ({ date: w.date, weight: w.weight, fat_pct: w.fat_pct })),
      currentStreak: streak.current,
      bestStreak:    streak.best,
    });
    const ok = await copyToClipboard(md);
    showToast(ok ? t('export.copied') : t('export.copyFailed'), ok ? 'success' : 'error');
  }

  function handleWeekBarClick(index: number) {
    const s = rangedSummaries[index];
    if (s) navigate('week', { weekStart: getMondayOf(s.week_start) });
  }

  function handleCalTrendClick(data: { activePayload?: { payload: { date: string } }[] }) {
    const date = data?.activePayload?.[0]?.payload?.date;
    if (date) navigate('day', { date });
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--fb-bg)', color: 'var(--fb-text)', fontFamily: 'var(--font-body)' }}>
      <PageHeader
        eyebrow="Trends"
        title={t('history.title')}
        left={
          <div style={{ marginLeft: 8 }}>
            <SegmentedControl<Tab>
              value={tab}
              onChange={setTab}
              options={[
                { value: 'weekly',    label: 'Weekly' },
                { value: 'analytics', label: 'Analytics' },
              ]}
              minWidth={220}
            />
          </div>
        }
        right={
          <button onClick={handleCopy}
            style={{ background: 'transparent', border: '1px solid var(--fb-border-strong)', color: 'var(--fb-text-2)', borderRadius: 99, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {t('export.copyHistory')}
          </button>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 60px' }} className="hide-scrollbar">
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {tab === 'weekly' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <SegmentedControl<WeekRange>
                  value={weekRange}
                  onChange={setWeekRange}
                  options={[
                    { value: '4',   label: '4w' },
                    { value: '12',  label: '12w' },
                    { value: '26',  label: '26w' },
                    { value: '52',  label: '52w' },
                    { value: 'all', label: 'All' },
                  ]}
                  minWidth={300}
                />
              </div>

              {summaries.length === 0 ? (
                <div style={{ ...cardOuter, alignItems: 'center', minHeight: 140, justifyContent: 'center' }}>
                  <span style={{ ...serifItalic, fontSize: 15, color: 'var(--fb-text-2)' }}>{t('history.noHistory')}</span>
                </div>
              ) : (
                <>
                  {/* Hero rings + summary */}
                  <section className="dash-hero-grid" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
                    <div style={{ ...cardOuter, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                      <ConcentricRings
                        size={200}
                        rings={[
                          { pct: calPct,  color: 'var(--fb-orange)', label: 'kcal' },
                          { pct: proPct,  color: 'var(--fb-red)',    label: 'protein' },
                          { pct: consPct, color: 'var(--fb-green)',  label: 'consistency' },
                        ]}
                        centerTop={statsAvgKcal.toLocaleString('it-IT')}
                        centerSub={`${t('history.avgKcal')} / day`}
                      />
                      <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--fb-text-2)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--fb-orange)' }} />
                          {Math.round(calPct)}%
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--fb-red)' }} />
                          {Math.round(proPct)}% P
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--fb-green)' }} />
                          {Math.round(consPct)}%
                        </span>
                      </div>
                    </div>

                    <div style={{ ...cardOuter, gap: 14 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                        <div style={statTile}>
                          <span style={eyebrowStyle}>{t('history.avgKcal')} / day</span>
                          <span className="tnum" style={{ ...bigSerif, color: 'var(--fb-orange)' }}>{statsAvgKcal}</span>
                          <span style={{ fontSize: 10, color: 'var(--fb-text-3)' }}>kcal</span>
                        </div>
                        <div style={statTile}>
                          <span style={eyebrowStyle}>{t('history.avgNet')} / day</span>
                          <span className="tnum" style={{ ...bigSerif, color: statsAvgNet == null ? 'var(--fb-text-3)' : statsAvgNet <= calRec ? 'var(--fb-green)' : 'var(--fb-orange)' }}>
                            {statsAvgNet == null ? '—' : `${statsAvgNet > 0 ? '+' : ''}${statsAvgNet}`}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--fb-text-3)' }}>kcal</span>
                        </div>
                        <div style={statTile}>
                          <span style={eyebrowStyle}>{t('history.daysTotal')}</span>
                          <span className="tnum" style={{ ...bigSerif, color: 'var(--fb-text)' }}>{totalDays}</span>
                          <span style={{ fontSize: 10, color: 'var(--fb-text-3)' }}>logged</span>
                        </div>
                      </div>

                      {rangedSummaries.length > 0 && (
                        <div style={{ background: 'var(--fb-bg)', border: '1px solid var(--fb-border)', borderRadius: 12, padding: 12 }}>
                          <BarChartCard
                            data={chartData}
                            unit="kcal"
                            goalValue={calRec}
                            yDomain={yDomain}
                            onBarClick={handleWeekBarClick}
                          />
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Table */}
                  <section style={{ ...cardOuter, padding: 0, overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--fb-border)' }}>
                            <th style={{ ...eyebrowStyle, textAlign: 'left', padding: '14px 16px', fontWeight: 600 }}>{t('history.weekOf')}</th>
                            <th style={{ ...eyebrowStyle, textAlign: 'right', padding: '14px 16px', fontWeight: 600 }}>{t('history.daysLogged')}</th>
                            <th style={{ ...eyebrowStyle, textAlign: 'right', padding: '14px 16px', fontWeight: 600 }}>{t('history.avgKcal')}</th>
                            <th style={{ ...eyebrowStyle, textAlign: 'right', padding: '14px 16px', fontWeight: 600 }}>{t('history.avgNet')}</th>
                            <th style={{ ...eyebrowStyle, textAlign: 'right', padding: '14px 16px', fontWeight: 600 }}>{t('history.avgFat')}</th>
                            <th style={{ ...eyebrowStyle, textAlign: 'right', padding: '14px 16px', fontWeight: 600 }}>{t('history.avgCarbs')}</th>
                            <th style={{ ...eyebrowStyle, textAlign: 'right', padding: '14px 16px', fontWeight: 600 }}>{t('history.avgFiber')}</th>
                            <th style={{ ...eyebrowStyle, textAlign: 'right', padding: '14px 16px', fontWeight: 600 }}>{t('history.avgProtein')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...rangedSummaries].reverse().map(s => {
                            const key = getMondayOf(s.week_start);
                            const energy = energyByWeek.get(key);
                            return (
                              <tr key={s.week_start}
                                onClick={() => navigate('week', { weekStart: key })}
                                style={{ borderTop: '1px solid var(--fb-divider)', cursor: 'pointer', transition: 'background .25s ease' }}
                                onMouseEnter={ev => (ev.currentTarget as HTMLElement).style.background = 'var(--fb-bg)'}
                                onMouseLeave={ev => (ev.currentTarget as HTMLElement).style.background = 'transparent'}
                              >
                                <td style={{ padding: '12px 16px', color: 'var(--fb-text)', ...serifItalic }}>{formatDMY(key)}</td>
                                <td className="tnum" style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--fb-text-2)' }}>{s.days_logged}</td>
                                <td className="tnum" style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--fb-text)' }}>{Math.round(s.avg_calories)}</td>
                                <td className="tnum" style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: !energy ? 'var(--fb-text-3)' : energy.avgNet <= calRec ? 'var(--fb-green)' : 'var(--fb-orange)' }}>
                                  {energy ? `${energy.avgNet > 0 ? '+' : ''}${energy.avgNet}` : '—'}
                                </td>
                                <td className="tnum" style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--fb-text-2)' }}>{Math.round(s.avg_fat)}g</td>
                                <td className="tnum" style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--fb-text-2)' }}>{Math.round(s.avg_carbs)}g</td>
                                <td className="tnum" style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--fb-text-2)' }}>{Math.round(s.avg_fiber)}g</td>
                                <td className="tnum" style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--fb-text-2)' }}>{Math.round(s.avg_protein)}g</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </>
              )}
            </>
          )}

          {tab === 'analytics' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <SegmentedControl<AnalyticsRange>
                  value={aRange}
                  onChange={setARange}
                  options={[
                    { value: '7',   label: '7d' },
                    { value: '30',  label: '30d' },
                    { value: '90',  label: '90d' },
                    { value: '180', label: '180d' },
                  ]}
                  minWidth={240}
                />
              </div>

              {/* Calorie trend */}
              <section style={cardOuter}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={eyebrowStyle}>Calorie trend</span>
                  <span style={{ fontSize: 10, color: 'var(--fb-text-3)' }}>tap a point to open the day</span>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart
                    data={filledCal}
                    margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                    onClick={(data) => handleCalTrendClick(data as Parameters<typeof handleCalTrendClick>[0])}
                    style={{ cursor: 'pointer' }}
                  >
                    <CartesianGrid vertical={false} stroke="var(--fb-divider)" />
                    <XAxis dataKey="label" tick={{ fill: 'var(--fb-text-3)', fontSize: 11 }} axisLine={false} tickLine={false} interval={xInterval} />
                    <YAxis tick={{ fill: 'var(--fb-text-3)', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 'auto']} />
                    <Tooltip contentStyle={chartTooltip} cursor={{ stroke: 'var(--fb-border-strong)', strokeWidth: 1 }}
                      formatter={((v: unknown, name: unknown) => [`${Number(v)} kcal`, String(name)]) as never} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: 'var(--fb-text-2)' }} />
                    {calRec > 0 && <ReferenceLine y={calRec} stroke="var(--fb-text-3)" strokeDasharray="5 4" strokeWidth={1} />}
                    <Line type="monotone" dataKey="calories_in"  name="Food in"   stroke="var(--fb-orange)" strokeWidth={2.4} dot={false} connectNulls />
                    <Line type="monotone" dataKey="calories_out" name="Energy out" stroke="var(--fb-green)"  strokeWidth={2.4} dot={false} connectNulls />
                    <Line type="monotone" dataKey="net"          name="Net"        stroke="var(--fb-text)"   strokeWidth={2}   dot={false} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </section>

              {/* Macro trend */}
              <section style={cardOuter}>
                <span style={eyebrowStyle}>Macro trend (g/day)</span>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={filledMacro} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--fb-divider)" />
                    <XAxis dataKey="label" tick={{ fill: 'var(--fb-text-3)', fontSize: 11 }} axisLine={false} tickLine={false} interval={xInterval} />
                    <YAxis tick={{ fill: 'var(--fb-text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={chartTooltip} cursor={{ fill: 'var(--fb-border)' }}
                      formatter={((v: unknown, n: unknown) => [`${Number(v)}g`, String(n)]) as never} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: 'var(--fb-text-2)' }} />
                    <Bar dataKey="fat"     name="Fat"     stackId="a" fill={MACRO_COLORS.fat}     radius={[0,0,0,0]} maxBarSize={48} />
                    <Bar dataKey="carbs"   name="Carbs"   stackId="a" fill={MACRO_COLORS.carbs}   radius={[0,0,0,0]} maxBarSize={48} />
                    <Bar dataKey="fiber"   name="Fiber"   stackId="a" fill={MACRO_COLORS.fiber}   radius={[0,0,0,0]} maxBarSize={48} />
                    <Bar dataKey="protein" name="Protein" stackId="a" fill={MACRO_COLORS.protein} radius={[3,3,0,0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </section>

              {filteredWeight.length > 0 && (
                <section style={cardOuter}>
                  <span style={eyebrowStyle}>Weight trend</span>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={filteredWeight} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="var(--fb-divider)" />
                      <XAxis dataKey="ts" type="number" scale="time" domain={[weightMinTs, weightMaxTs]}
                        tick={{ fill: 'var(--fb-text-3)', fontSize: 11 }} axisLine={false} tickLine={false}
                        tickFormatter={v => weightTickFmt(Number(v))} />
                      <YAxis tick={{ fill: 'var(--fb-text-3)', fontSize: 11 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                      <Tooltip contentStyle={chartTooltip} cursor={{ stroke: 'var(--fb-border-strong)', strokeWidth: 1 }}
                        formatter={((v: unknown, name: unknown) => [name === 'fat_pct' ? `${Number(v)}%` : `${Number(v)} kg`, name === 'fat_pct' ? 'Body fat' : 'Weight']) as never}
                        labelFormatter={(v: unknown) => new Date(Number(v)).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: 'var(--fb-text-2)' }} />
                      <Line type="monotone" dataKey="weight" name="Weight" stroke="var(--fb-accent)" strokeWidth={2.4} dot={false} connectNulls />
                      {hasWeightFatPct && (
                        <Line type="monotone" dataKey="fat_pct" name="Body fat" stroke="var(--fb-text-2)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
