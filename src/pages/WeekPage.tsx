import { useEffect, useState } from 'react';
import { useT } from '../i18n/useT';
import { useNavigate } from '../hooks/useNavigate';
import { useSettings } from '../hooks/useSettings';
import { useToast } from '../components/Toast';
import { api } from '../api';
import BarChartCard from '../components/BarChartCard';
import { fmtDate, formatShortDate, addDays, today } from '../lib/dateUtil';
import { buildWeekMarkdown, copyToClipboard } from '../lib/exportText';
import type { WeekDayDetail } from '../types';

interface WeekPageProps { weekStart?: string; }

export default function WeekPage({ weekStart }: WeekPageProps) {
  const { t } = useT();
  const { navigate } = useNavigate();
  const { settings } = useSettings();
  const { showToast } = useToast();
  const [details, setDetails] = useState<WeekDayDetail[]>([]);
  const todayStr = today();

  useEffect(() => {
    if (!weekStart) return;
    api.log.getWeekDetail(weekStart).then(setDetails);
  }, [weekStart]);

  if (!weekStart) return null;

  const weekEnd = addDays(weekStart, 6);

  const days: string[] = [];
  for (let i = 0; i < 7; i++) days.push(addDays(weekStart, i));

  const empty = { calories:0, protein:0, carbs:0, fat:0, fiber:0, planned_calories:0, planned_protein:0, planned_carbs:0, planned_fat:0, planned_fiber:0 };
  const detailMap = new Map(details.map(d => [d.date, d]));
  const rows = days.map(date => detailMap.get(date) ?? { date, ...empty });

  // For today and future, treat planned as if it counted (logged + planned).
  // For past days, planned is ignored.
  const projected = rows.map(d => {
    const showPlan = d.date >= todayStr;
    return {
      ...d,
      proj_calories: d.calories + (showPlan ? d.planned_calories : 0),
      proj_protein:  d.protein  + (showPlan ? d.planned_protein  : 0),
      proj_carbs:    d.carbs    + (showPlan ? d.planned_carbs    : 0),
      proj_fat:      d.fat      + (showPlan ? d.planned_fat      : 0),
      proj_fiber:    d.fiber    + (showPlan ? d.planned_fiber    : 0),
      hasPlanned:    showPlan && d.planned_calories > 0,
    };
  });

  const activeRows = projected.filter(d => d.proj_calories > 0);
  const count = activeRows.length || 1;
  const avg = (key: 'proj_calories'|'proj_protein'|'proj_carbs'|'proj_fat'|'proj_fiber') =>
    Math.round(activeRows.reduce((s, d) => s + d[key], 0) / count);

  const chartData = projected.map(d => ({
    label: formatShortDate(d.date),
    value: Math.round(d.calories),
    planned: d.hasPlanned ? Math.round(d.planned_calories) : 0,
  }));

  async function handleCopy() {
    const md = buildWeekMarkdown(weekStart!, weekEnd, rows, settings);
    const ok = await copyToClipboard(md);
    showToast(ok ? t('export.copied') : t('export.copyFailed'), ok ? 'success' : 'error');
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <button
        className="text-accent text-sm hover:opacity-80 transition-opacity cursor-pointer"
        onClick={() => navigate('history')}
      >
        {t('week.backToHistory')}
      </button>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-text">
          {fmtDate(weekStart)} – {fmtDate(weekEnd)}
        </h1>
        <button onClick={handleCopy} className="text-sm text-text-sec border border-border rounded-lg px-3 py-1.5 hover:border-accent/50 hover:text-text cursor-pointer transition-colors">
          📋 {t('export.copyWeek')}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: t('week.avgPerDay'), value: `${avg('proj_calories')} kcal`, accent: true },
          { label: t('week.avgProtein'), value: `${avg('proj_protein')}g` },
          { label: t('week.avgCarbs'),   value: `${avg('proj_carbs')}g` },
          { label: t('week.avgFat'),     value: `${avg('proj_fat')}g` },
          { label: t('week.avgFiber'),   value: `${avg('proj_fiber')}g` },
        ].map(item => (
          <div key={item.label} className="bg-card rounded-xl p-3 border border-border text-center">
            <p className="text-xs text-text-sec mb-1">{item.label}</p>
            <p className={`font-semibold text-sm ${item.accent ? 'text-accent' : 'text-text'}`}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <BarChartCard data={chartData} unit="kcal" />
      </div>

      {activeRows.length === 0 ? (
        <p className="text-text-sec">{t('week.noEntries')}</p>
      ) : (
        <div className="bg-card rounded-xl overflow-hidden border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-sec text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">{t('week.date')}</th>
                <th className="text-right px-4 py-3">kcal</th>
                <th className="text-right px-4 py-3">protein</th>
                <th className="text-right px-4 py-3">carbs</th>
                <th className="text-right px-4 py-3">fat</th>
                <th className="text-right px-4 py-3">fiber</th>
              </tr>
            </thead>
            <tbody>
              {projected.map(d => {
                const isToday = d.date === todayStr;
                const fmtCell = (logged: number, planned: number, unit = '') => {
                  if (!logged && !planned) return '—';
                  return (
                    <>
                      <span>{Math.round(logged)}{unit}</span>
                      {planned > 0 && <span className="text-accent"> +{Math.round(planned)}{unit}</span>}
                    </>
                  );
                };
                return (
                  <tr
                    key={d.date}
                    className={`border-t border-border/50 cursor-pointer transition-colors ${isToday ? 'bg-accent/8' : 'hover:bg-bg'}`}
                    onClick={() => navigate('day', { date: d.date, fromWeek: weekStart })}
                  >
                    <td className="px-4 py-3 text-text">
                      <span>{fmtDate(d.date)}</span>
                      {isToday && (
                        <span className="ml-2 text-xs bg-accent text-white rounded-full px-2 py-0.5">{t('week.today')}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-text tabular-nums">{fmtCell(d.calories, d.hasPlanned ? d.planned_calories : 0)}</td>
                    <td className="px-4 py-3 text-right text-text-sec tabular-nums">{fmtCell(d.protein, d.hasPlanned ? d.planned_protein : 0, 'g')}</td>
                    <td className="px-4 py-3 text-right text-text-sec tabular-nums">{fmtCell(d.carbs,   d.hasPlanned ? d.planned_carbs   : 0, 'g')}</td>
                    <td className="px-4 py-3 text-right text-text-sec tabular-nums">{fmtCell(d.fat,     d.hasPlanned ? d.planned_fat     : 0, 'g')}</td>
                    <td className="px-4 py-3 text-right text-text-sec tabular-nums">{fmtCell(d.fiber,   d.hasPlanned ? d.planned_fiber   : 0, 'g')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
