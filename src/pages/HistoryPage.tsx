import { useEffect, useState } from 'react';
import { useT } from '../i18n/useT';
import { useNavigate } from '../hooks/useNavigate';
import { useToast } from '../components/Toast';
import { api } from '../api';
import BarChartCard from '../components/BarChartCard';
import { formatShortDate, formatDMY, getMondayOf } from '../lib/dateUtil';
import { buildHistoryMarkdown, copyToClipboard } from '../lib/exportText';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, ReferenceLine,
} from 'recharts';
import { useSettings } from '../hooks/useSettings';
import type { WeeklySummary, MacroTrendPoint } from '../types';

type Tab = 'weekly' | 'analytics';
type AnalyticsRange = 30 | 90;

function buildDateRange(days: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  return dates;
}

export default function HistoryPage() {
  const { t } = useT();
  const { settings } = useSettings();
  const { navigate } = useNavigate();
  const { showToast } = useToast();
  const [tab, setTab]         = useState<Tab>('weekly');
  const [summaries, setSummaries] = useState<WeeklySummary[]>([]);

  // Analytics state
  const [aRange, setARange]           = useState<AnalyticsRange>(30);
  const [macroData, setMacroData]     = useState<MacroTrendPoint[]>([]);
  const [calData, setCalData]         = useState<{ date: string; calories_in: number; calories_out: number; net: number }[]>([]);

  useEffect(() => {
    api.log.getWeeklySummaries().then(setSummaries);
  }, []);

  useEffect(() => {
    if (tab === 'analytics') {
      api.analytics.macroTrend(aRange).then(setMacroData);
      api.analytics.caloriesTrend(aRange).then(setCalData);
    }
  }, [tab, aRange]);

  async function handleCopy() {
    const [streak, weights] = await Promise.all([
      api.streaks.get(),
      api.weight.getAll(),
    ]);
    const md = buildHistoryMarkdown({
      summaries,
      settings,
      weightEntries: weights.map(w => ({ date: w.date, weight: w.weight, fat_pct: w.fat_pct })),
      currentStreak: streak.current,
      bestStreak: streak.best,
    });
    const ok = await copyToClipboard(md);
    showToast(ok ? t('export.copied') : t('export.copyFailed'), ok ? 'success' : 'error');
  }

  const chartData = summaries.slice(-12).map(s => ({
    label: formatShortDate(getMondayOf(s.week_start)),
    value: Math.round(s.avg_calories),
  }));

  // Build filled calorie data
  const dateRange = buildDateRange(aRange);
  const calMap = new Map(calData.map(d => [d.date, d]));
  const filledCal = dateRange.map(date => {
    const p = calMap.get(date);
    return {
      label: formatShortDate(date),
      calories_in:  p ? Math.round(p.calories_in)  : 0,
      calories_out: p ? Math.round(p.calories_out) : 0,
      net:          p ? Math.round(p.net)           : 0,
    };
  });

  // Build filled macro data
  const macroMap = new Map(macroData.map(d => [d.date, d]));
  const filledMacro = dateRange.map(date => {
    const p = macroMap.get(date);
    return {
      label: formatShortDate(date),
      protein: p ? Math.round(p.protein) : 0,
      carbs:   p ? Math.round(p.carbs)   : 0,
      fat:     p ? Math.round(p.fat)     : 0,
    };
  });

  const calRec = settings.cal_rec || 2000;
  const xInterval = aRange === 30 ? 4 : 12;

  const tooltipStyle = { background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' };

  const tabBtn = (t: Tab) => [
    'text-sm px-4 py-1.5 rounded-lg font-medium cursor-pointer transition-colors border',
    tab === t ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-sec hover:text-text',
  ].join(' ');

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">{t('history.title')}</h1>
        <div className="flex gap-2">
          <button onClick={handleCopy} className="text-sm text-text-sec border border-border rounded-lg px-3 py-1.5 hover:border-accent/50 hover:text-text cursor-pointer transition-colors">
            📋 {t('export.copyHistory')}
          </button>
          <button className={tabBtn('weekly')}    onClick={() => setTab('weekly')}>Weekly</button>
          <button className={tabBtn('analytics')} onClick={() => setTab('analytics')}>Analytics</button>
        </div>
      </div>

      {/* ── WEEKLY TAB ─────────────────────────────────────────────────────── */}
      {tab === 'weekly' && (
        <>
          {summaries.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <BarChartCard data={chartData} unit="kcal" />
            </div>
          )}

          {summaries.length === 0 ? (
            <p className="text-text-sec text-center py-8">{t('history.noHistory')}</p>
          ) : (
            <div className="bg-card rounded-xl overflow-hidden border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-text-sec text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3">{t('history.weekOf')}</th>
                    <th className="text-right px-4 py-3">{t('history.daysLogged')}</th>
                    <th className="text-right px-4 py-3">{t('history.avgKcal')}</th>
                    <th className="text-right px-4 py-3">{t('history.avgFat')}</th>
                    <th className="text-right px-4 py-3">{t('history.avgCarbs')}</th>
                    <th className="text-right px-4 py-3">{t('history.avgFiber')}</th>
                    <th className="text-right px-4 py-3">{t('history.avgProtein')}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...summaries].reverse().map(s => (
                    <tr
                      key={s.week_start}
                      className="border-t border-border/50 hover:bg-bg cursor-pointer transition-colors"
                      onClick={() => navigate('week', { weekStart: getMondayOf(s.week_start) })}
                    >
                      <td className="px-4 py-3 text-text">{formatDMY(getMondayOf(s.week_start))}</td>
                      <td className="px-4 py-3 text-right text-text-sec">{s.days_logged}</td>
                      <td className="px-4 py-3 text-right text-text tabular-nums">{Math.round(s.avg_calories)}</td>
                      <td className="px-4 py-3 text-right text-text-sec tabular-nums">{Math.round(s.avg_fat)}g</td>
                      <td className="px-4 py-3 text-right text-text-sec tabular-nums">{Math.round(s.avg_carbs)}g</td>
                      <td className="px-4 py-3 text-right text-text-sec tabular-nums">{Math.round(s.avg_fiber)}g</td>
                      <td className="px-4 py-3 text-right text-text-sec tabular-nums">{Math.round(s.avg_protein)}g</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── ANALYTICS TAB ──────────────────────────────────────────────────── */}
      {tab === 'analytics' && (
        <>
          <div className="flex gap-1 justify-end">
            {([30, 90] as AnalyticsRange[]).map(r => (
              <button
                key={r}
                onClick={() => setARange(r)}
                className={[
                  'text-xs px-3 py-1.5 rounded-lg border cursor-pointer transition-colors',
                  aRange === r ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-sec hover:border-accent/50',
                ].join(' ')}
              >
                {r}d
              </button>
            ))}
          </div>

          {/* Calorie trend */}
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs font-semibold text-text-sec uppercase tracking-wider mb-4">Calorie trend</p>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={filledCal} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fill: 'var(--text-sec)', fontSize: 11 }} axisLine={false} tickLine={false} interval={xInterval} />
                <YAxis tick={{ fill: 'var(--text-sec)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} kcal`, '']} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: 'var(--text-sec)' }} />
                {calRec > 0 && <ReferenceLine y={calRec} stroke="var(--text-sec)" strokeDasharray="4 4" strokeWidth={1} />}
                <Line type="monotone" dataKey="calories_in"  name="Food in"     stroke="var(--accent)" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="calories_out" name="Exercise out" stroke="var(--green)"  strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="net"          name="Net"          stroke="var(--text)"   strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Macro trend */}
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs font-semibold text-text-sec uppercase tracking-wider mb-4">Macro trend (g/day)</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={filledMacro} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fill: 'var(--text-sec)', fontSize: 11 }} axisLine={false} tickLine={false} interval={xInterval} />
                <YAxis tick={{ fill: 'var(--text-sec)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [`${v}g`, n]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: 'var(--text-sec)' }} />
                <Bar dataKey="protein" name="Protein" stackId="a" fill="var(--accent)"    radius={[0,0,0,0]} />
                <Bar dataKey="carbs"   name="Carbs"   stackId="a" fill="var(--yellow)"    radius={[0,0,0,0]} />
                <Bar dataKey="fat"     name="Fat"     stackId="a" fill="var(--text-sec)"  radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
