import { useEffect, useState } from 'react';
import { useT } from '../i18n/useT';
import { useNavigate } from '../hooks/useNavigate';
import { api } from '../api';
import BarChartCard from '../components/BarChartCard';
import { fmtDate, formatShortDate, getMondayOf } from '../lib/dateUtil';
import type { WeeklySummary } from '../types';

export default function HistoryPage() {
  const { t } = useT();
  const { navigate } = useNavigate();
  const [summaries, setSummaries] = useState<WeeklySummary[]>([]);

  useEffect(() => {
    api.log.getWeeklySummaries().then(setSummaries);
  }, []);

  const chartData = summaries.slice(-12).map(s => ({
    label: formatShortDate(getMondayOf(s.week_start)),
    value: Math.round(s.avg_calories),
  }));

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-text">{t('history.title')}</h1>

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
                <th className="text-right px-4 py-3">{t('history.avgProtein')}</th>
                <th className="text-right px-4 py-3">{t('history.avgCarbs')}</th>
                <th className="text-right px-4 py-3">{t('history.avgFat')}</th>
                <th className="text-right px-4 py-3">{t('history.avgFiber')}</th>
              </tr>
            </thead>
            <tbody>
              {[...summaries].reverse().map(s => (
                <tr
                  key={s.week_start}
                  className="border-t border-border/50 hover:bg-bg cursor-pointer transition-colors"
                  onClick={() => navigate('week', { weekStart: getMondayOf(s.week_start) })}
                >
                  <td className="px-4 py-3 text-text">{fmtDate(getMondayOf(s.week_start))}</td>
                  <td className="px-4 py-3 text-right text-text-sec">{s.days_logged}</td>
                  <td className="px-4 py-3 text-right text-text tabular-nums">{Math.round(s.avg_calories)}</td>
                  <td className="px-4 py-3 text-right text-text-sec tabular-nums">{Math.round(s.avg_protein)}g</td>
                  <td className="px-4 py-3 text-right text-text-sec tabular-nums">{Math.round(s.avg_carbs)}g</td>
                  <td className="px-4 py-3 text-right text-text-sec tabular-nums">{Math.round(s.avg_fat)}g</td>
                  <td className="px-4 py-3 text-right text-text-sec tabular-nums">{Math.round(s.avg_fiber)}g</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
