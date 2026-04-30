import { useState, useEffect, type CSSProperties } from 'react';
import { api } from '../api';
import { useSettings } from '../hooks/useSettings';
import ConcentricRings from '../components/ConcentricRings';
import { PageHeader, SegmentedControl, eyebrow as eyebrowStyle, serifItalic, cardOuter } from '../lib/fbUI';
import { formatShortDate, buildDateRange } from '../lib/dateUtil';
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts';
import type { CalorieTrendPoint } from '../types';

type Range = '7' | '30' | '90';

const statTile: CSSProperties = {
  background: 'var(--fb-bg)', border: '1px solid var(--fb-border)',
  borderRadius: 12, padding: '14px 16px',
  display: 'flex', flexDirection: 'column', gap: 4,
};

const bigSerif: CSSProperties = {
  ...serifItalic, fontSize: 26, fontWeight: 400,
  letterSpacing: -0.6, lineHeight: 1,
};

const chartTooltip = {
  background: 'var(--fb-card)', border: '1px solid var(--fb-border-strong)',
  borderRadius: 10, color: 'var(--fb-text)', fontSize: 12,
};

export default function NetPage() {
  const { settings } = useSettings();
  const [range, setRange] = useState<Range>('30');
  const [data, setData]   = useState<CalorieTrendPoint[]>([]);

  useEffect(() => {
    api.analytics.caloriesTrend(Number(range) as 7 | 30 | 90).then(setData);
  }, [range]);

  const rangeN = Number(range) as 7 | 30 | 90;
  const dateRange = buildDateRange(rangeN);
  const dataMap   = new Map(data.map(d => [d.date, d]));
  const filled = dateRange.map(date => {
    const p = dataMap.get(date);
    return {
      date,
      label:        formatShortDate(date),
      calories_in:  p ? Math.round(p.calories_in)  : 0,
      calories_out: p ? Math.round(p.calories_out) : 0,
      resting_kcal: p ? Math.round(p.resting_kcal) : 0,
      active_kcal:  p ? Math.round(p.active_kcal)  : 0,
      extra_kcal:   p ? Math.round(p.extra_kcal)   : 0,
      steps:        p ? (p.steps ?? 0)             : 0,
      net:          p ? Math.round(p.net)           : 0,
    };
  });

  const todayStr  = new Date().toISOString().slice(0, 10);
  const chart     = filled.filter(d => d.date < todayStr);
  const withData  = chart.filter(d => d.calories_in > 0);
  const avgIn     = withData.length ? Math.round(withData.reduce((s, d) => s + d.calories_in,  0) / withData.length) : 0;
  const avgOut    = withData.length ? Math.round(withData.reduce((s, d) => s + d.calories_out, 0) / withData.length) : 0;
  const avgNet    = withData.length ? Math.round(withData.reduce((s, d) => s + d.net,          0) / withData.length) : 0;
  const stepsRows = chart.filter(d => d.steps > 0);
  const avgSteps  = stepsRows.length ? Math.round(stepsRows.reduce((s, d) => s + d.steps, 0) / stepsRows.length) : 0;

  const calRec = settings.cal_rec || 2000;
  const stepsGoal = 10000;

  // Apple-Fitness-style rings:
  // Move = food in vs target rec; Exercise = energy out vs in (burn ratio); Stand = steps vs goal
  const movePct = calRec > 0 ? (avgIn / calRec) * 100 : 0;
  const burnPct = avgIn > 0 ? (avgOut / avgIn) * 100 : 0;
  const stepsPct = avgSteps > 0 ? (avgSteps / stepsGoal) * 100 : 0;

  const xInterval = rangeN === 7 ? 0 : rangeN === 30 ? 4 : 12;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--fb-bg)', color: 'var(--fb-text)', fontFamily: 'var(--font-body)' }}>
      <PageHeader
        eyebrow="Energy"
        title="Net Calories"
        right={
          <SegmentedControl<Range>
            value={range}
            onChange={setRange}
            options={[
              { value: '7',  label: '7d' },
              { value: '30', label: '30d' },
              { value: '90', label: '90d' },
            ]}
            minWidth={200}
          />
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 60px' }} className="hide-scrollbar">
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* HERO */}
          <section className="dash-hero-grid" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
            <div style={{ ...cardOuter, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <ConcentricRings
                size={200}
                rings={[
                  { pct: movePct,  color: 'var(--fb-orange)', label: 'in' },
                  { pct: burnPct,  color: 'var(--fb-green)',  label: 'out' },
                  { pct: stepsPct, color: 'var(--fb-blue)',   label: 'steps' },
                ]}
                centerTop={avgNet > 0 ? `+${avgNet}` : `${avgNet}`}
                centerSub="avg net / day"
              />
              <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--fb-text-2)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--fb-orange)' }} /> In
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--fb-green)' }} /> Out
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--fb-blue)' }} /> Steps
                </span>
              </div>
            </div>

            <div style={{ ...cardOuter, gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div style={statTile}>
                  <span style={eyebrowStyle}>Avg food in</span>
                  <span className="tnum" style={{ ...bigSerif, color: 'var(--fb-orange)' }}>{avgIn}</span>
                  <span style={{ fontSize: 10, color: 'var(--fb-text-3)' }}>kcal · target {calRec}</span>
                </div>
                <div style={statTile}>
                  <span style={eyebrowStyle}>Avg energy out (Apple Watch)</span>
                  <span className="tnum" style={{ ...bigSerif, color: 'var(--fb-green)' }}>
                    {avgOut > 0 ? `−${avgOut}` : '—'}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--fb-text-3)' }}>kcal</span>
                </div>
                <div style={statTile}>
                  <span style={eyebrowStyle}>Avg net</span>
                  <span className="tnum" style={{ ...bigSerif, color: avgIn === 0 ? 'var(--fb-text-3)' : avgNet > 0 && avgNet <= calRec ? 'var(--fb-green)' : avgNet > calRec ? 'var(--fb-red)' : 'var(--fb-text)' }}>
                    {avgIn > 0 ? avgNet : '—'}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--fb-text-3)' }}>kcal</span>
                </div>
                <div style={statTile}>
                  <span style={eyebrowStyle}>Avg steps</span>
                  <span className="tnum" style={{ ...bigSerif, color: 'var(--fb-blue)' }}>
                    {avgSteps > 0 ? avgSteps.toLocaleString() : '—'}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--fb-text-3)' }}>{avgSteps > 0 ? `${Math.round(stepsPct)}% of ${stepsGoal.toLocaleString()}` : 'no data'}</span>
                </div>
              </div>
            </div>
          </section>

          {/* CHART */}
          <section style={cardOuter}>
            <span style={eyebrowStyle}>Daily energy balance</span>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chart} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--fb-divider)" />
                <XAxis dataKey="label" tick={{ fill: 'var(--fb-text-3)', fontSize: 11 }} axisLine={false} tickLine={false} interval={xInterval} />
                <YAxis tick={{ fill: 'var(--fb-text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltip}
                  formatter={((v: unknown, name: unknown) => [`${Number(v)} kcal`, String(name)]) as never} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: 'var(--fb-text-2)' }} />
                {calRec > 0 && (
                  <ReferenceLine y={calRec} stroke="var(--fb-text-3)" strokeDasharray="5 4" strokeWidth={1} />
                )}
                <Line type="monotone" dataKey="calories_in"  name="Food in"        stroke="var(--fb-orange)" strokeWidth={2.4} dot={false} connectNulls />
                <Line type="monotone" dataKey="calories_out" name="Energy out (AW)" stroke="var(--fb-green)"  strokeWidth={2.4} dot={false} connectNulls />
                <Line type="monotone" dataKey="net"          name="Net"             stroke="var(--fb-text)"   strokeWidth={2}   dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </section>

          {/* TABLE */}
          <section style={{ ...cardOuter, padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--fb-border)' }}>
                    <th style={{ ...eyebrowStyle, textAlign: 'left', padding: '14px 16px', fontWeight: 600 }}>Date</th>
                    <th style={{ ...eyebrowStyle, textAlign: 'right', padding: '14px 16px', fontWeight: 600 }}>Food in</th>
                    <th style={{ ...eyebrowStyle, textAlign: 'right', padding: '14px 16px', fontWeight: 600 }}>Energy out (AW)</th>
                    <th style={{ ...eyebrowStyle, textAlign: 'right', padding: '14px 16px', fontWeight: 600 }}>Net</th>
                    <th style={{ ...eyebrowStyle, textAlign: 'right', padding: '14px 16px', fontWeight: 600 }}>Steps</th>
                  </tr>
                </thead>
                <tbody>
                  {[...chart].reverse().map(d => (
                    <tr key={d.date}
                      style={{ borderTop: '1px solid var(--fb-divider)', transition: 'background .25s ease' }}
                      onMouseEnter={ev => (ev.currentTarget as HTMLElement).style.background = 'var(--fb-bg)'}
                      onMouseLeave={ev => (ev.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <td style={{ padding: '11px 16px', color: 'var(--fb-text-2)', fontSize: 12, ...serifItalic }}>{d.label}</td>
                      <td className="tnum" style={{ padding: '11px 16px', textAlign: 'right', color: 'var(--fb-text)' }}>
                        {d.calories_in > 0 ? d.calories_in : <span style={{ color: 'var(--fb-text-3)' }}>—</span>}
                      </td>
                      <td className="tnum" style={{ padding: '11px 16px', textAlign: 'right', color: d.calories_out > 0 ? 'var(--fb-green)' : 'var(--fb-text-3)' }}>
                        {d.calories_out > 0
                          ? `−${[
                              d.resting_kcal > 0 ? String(d.resting_kcal) : null,
                              d.active_kcal  > 0 ? String(d.active_kcal)  : null,
                              d.extra_kcal   > 0 ? String(d.extra_kcal)   : null,
                            ].filter(Boolean).join(' + ')}`
                          : '—'}
                      </td>
                      <td className="tnum" style={{
                        padding: '11px 16px', textAlign: 'right', fontWeight: 600,
                        color: d.calories_in > 0 ? (d.net <= calRec ? 'var(--fb-green)' : 'var(--fb-red)') : 'var(--fb-text-3)',
                      }}>
                        {d.calories_in > 0 ? d.net : '—'}
                      </td>
                      <td className="tnum" style={{ padding: '11px 16px', textAlign: 'right', color: d.steps > 0 ? 'var(--fb-text-2)' : 'var(--fb-text-3)' }}>
                        {d.steps > 0 ? d.steps.toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
