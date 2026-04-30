import { useEffect, useState, type CSSProperties } from 'react';
import { useT } from '../i18n/useT';
import { useNavigate } from '../hooks/useNavigate';
import { useSettings } from '../hooks/useSettings';
import { useToast } from '../components/Toast';
import { api } from '../api';
import BarChartCard from '../components/BarChartCard';
import ConcentricRings from '../components/ConcentricRings';
import Sparkline from '../components/Sparkline';
import { PageHeader, IconBtn, eyebrow as eyebrowStyle, serifItalic, cardOuter } from '../lib/fbUI';
import { fmtDate, formatShortDate, formatDMY, addDays, today } from '../lib/dateUtil';
import { buildWeekMarkdown, buildDayMarkdown, copyToClipboard } from '../lib/exportText';
import type { WeekDayDetail, DailyEnergy } from '../types';

interface WeekPageProps { weekStart?: string; }

const heroGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '320px 1fr',
  gap: 16,
};

const statTile: CSSProperties = {
  background: 'var(--fb-bg)',
  border: '1px solid var(--fb-border)',
  borderRadius: 12,
  padding: '12px 14px',
  display: 'flex', flexDirection: 'column', gap: 4,
};

const bigSerif: CSSProperties = {
  ...serifItalic,
  fontSize: 22, fontWeight: 400,
  letterSpacing: -0.4, color: 'var(--fb-text)',
  lineHeight: 1.05,
};

export default function WeekPage({ weekStart }: WeekPageProps) {
  const { t } = useT();
  const { navigate } = useNavigate();
  const { settings } = useSettings();
  const { showToast } = useToast();
  const [details, setDetails] = useState<WeekDayDetail[]>([]);
  const [energyMap, setEnergyMap] = useState<Map<string, DailyEnergy>>(new Map());
  const [overrides, setOverrides] = useState<Record<string, 'included' | 'excluded'>>(() => {
    try { return JSON.parse(localStorage.getItem('week.dayOverrides') || '{}'); }
    catch { return {}; }
  });
  const todayStr = today();

  useEffect(() => {
    if (!weekStart) return;
    api.log.getWeekDetail(weekStart).then(setDetails);
    const end = addDays(weekStart, 6);
    api.dailyEnergy.getRange(weekStart, end).then(rows => {
      setEnergyMap(new Map(rows.map(r => [r.date, r])));
    });
  }, [weekStart]);

  function toggleDay(date: string, currentlyIncluded: boolean) {
    setOverrides(prev => {
      const next = { ...prev };
      next[date] = currentlyIncluded ? 'excluded' : 'included';
      localStorage.setItem('week.dayOverrides', JSON.stringify(next));
      return next;
    });
  }

  if (!weekStart) return null;

  const weekEnd = addDays(weekStart, 6);
  const days: string[] = [];
  for (let i = 0; i < 7; i++) days.push(addDays(weekStart, i));

  const empty = { calories:0, protein:0, carbs:0, fat:0, fiber:0, planned_calories:0, planned_protein:0, planned_carbs:0, planned_fat:0, planned_fiber:0 };
  const detailMap = new Map(details.map(d => [d.date, d]));
  const rows = days.map(date => detailMap.get(date) ?? { date, ...empty });

  const projected = rows.map(d => {
    const showPlan = d.date >= todayStr;
    const proj_calories = d.calories + (showPlan ? d.planned_calories : 0);
    const isEmpty = proj_calories <= 0;
    const override = overrides[d.date];
    const included = override ? override === 'included' : !isEmpty && d.date !== todayStr;
    return {
      ...d,
      proj_calories,
      proj_protein:  d.protein  + (showPlan ? d.planned_protein  : 0),
      proj_carbs:    d.carbs    + (showPlan ? d.planned_carbs    : 0),
      proj_fat:      d.fat      + (showPlan ? d.planned_fat      : 0),
      proj_fiber:    d.fiber    + (showPlan ? d.planned_fiber    : 0),
      hasPlanned:    showPlan && d.planned_calories > 0,
      isEmpty,
      included,
    };
  });

  const includedRows = projected.filter(d => d.included);
  const count = includedRows.length || 1;
  const avg = (key: 'proj_calories'|'proj_protein'|'proj_carbs'|'proj_fat'|'proj_fiber') =>
    Math.round(includedRows.reduce((s, d) => s + d[key], 0) / count);

  const totalKcal = Math.round(includedRows.reduce((s, d) => s + d.proj_calories, 0));

  const daysWithEnergy = includedRows.filter(d => d.date <= todayStr && energyMap.has(d.date));
  const totalEnergyOut = daysWithEnergy.reduce((s, d) => {
    const e = energyMap.get(d.date)!;
    return s + e.resting_kcal + e.active_kcal + e.extra_kcal;
  }, 0);
  const totalFoodOnEnergyDays = daysWithEnergy.reduce((s, d) => s + d.proj_calories, 0);
  const totalNet = Math.round(totalFoodOnEnergyDays - totalEnergyOut);
  const avgNet   = daysWithEnergy.length > 0 ? Math.round(totalNet / daysWithEnergy.length) : null;

  const recWeek = (settings.cal_rec || 0) * includedRows.length;
  const maxWeek = (settings.cal_max || 0) * includedRows.length;
  const bankRec = recWeek - totalKcal;
  const bankMax = maxWeek - totalKcal;

  const calRec = settings.cal_rec || 2000;
  const proRec = settings.protein_rec || 0;

  const avgKcal    = avg('proj_calories');
  const avgProtein = avg('proj_protein');
  const calPct = calRec > 0 ? (avgKcal / calRec) * 100 : 0;
  const proPct = proRec > 0 ? (avgProtein / proRec) * 100 : 0;
  const dayPct = (includedRows.length / 7) * 100;

  const sparkPoints = projected.map(d => d.proj_calories);

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

  async function handleCopyDetailed() {
    const dayData = await Promise.all(
      days.map(date => Promise.all([
        api.log.getDay(date),
        api.water.getDay(date),
        api.notes.get(date),
      ]).then(([entries, water, noteObj]) => ({ date, entries, water, noteObj })))
    );

    const parts = dayData.map(({ date, entries, water, noteObj }) => {
      const e = energyMap.get(date);
      return buildDayMarkdown({
        date, entries, settings,
        waterMl: water.total_ml || undefined, waterGoalMl: settings.water_goal,
        restingKcal: e?.resting_kcal || undefined,
        activeKcal:  e?.active_kcal  || undefined,
        extraKcal:   e?.extra_kcal   || undefined,
        note: noteObj.note || undefined,
      });
    });
    const md = parts.join('\n---\n\n');
    const ok = await copyToClipboard(md);
    showToast(ok ? t('export.copied') : t('export.copyFailed'), ok ? 'success' : 'error');
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--fb-bg)', color: 'var(--fb-text)', fontFamily: 'var(--font-body)' }}>
      <PageHeader
        eyebrow={t('week.backToHistory') ? 'Week' : 'Week'}
        title={`${formatDMY(weekStart)} – ${formatDMY(weekEnd)}`}
        left={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconBtn label="Previous week" onClick={() => navigate('week', { weekStart: addDays(weekStart, -7) })}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </IconBtn>
            <IconBtn label="Next week" onClick={() => navigate('week', { weekStart: addDays(weekStart, 7) })}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </IconBtn>
          </div>
        }
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => navigate('history')}
              style={{ background: 'transparent', border: '1px solid var(--fb-border-strong)', color: 'var(--fb-text-2)', borderRadius: 99, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              ← {t('week.backToHistory')}
            </button>
            <button onClick={handleCopy}
              style={{ background: 'transparent', border: '1px solid var(--fb-border-strong)', color: 'var(--fb-text-2)', borderRadius: 99, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {t('export.copyWeek')}
            </button>
            <button onClick={handleCopyDetailed}
              style={{ background: 'transparent', border: '1px solid var(--fb-border-strong)', color: 'var(--fb-text-2)', borderRadius: 99, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {t('export.copyWeekDetailed')}
            </button>
          </div>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 60px' }} className="hide-scrollbar">
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* HERO ─ rings + summary tiles */}
          <section className="dash-hero-grid" style={heroGrid}>
            <div style={{ ...cardOuter, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
              <ConcentricRings
                size={200}
                rings={[
                  { pct: calPct, color: 'var(--fb-orange)', label: 'kcal' },
                  { pct: proPct, color: 'var(--fb-red)',    label: 'protein' },
                  { pct: dayPct, color: 'var(--fb-green)',  label: 'days' },
                ]}
                centerTop={`${avgKcal.toLocaleString('it-IT')}`}
                centerSub={t('week.avgPerDay')}
              />
              <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--fb-text-2)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--fb-orange)' }} />
                  {Math.round(calPct)}% kcal
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--fb-red)' }} />
                  {Math.round(proPct)}% P
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--fb-green)' }} />
                  {includedRows.length}/7
                </span>
              </div>
            </div>

            <div style={{ ...cardOuter, gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={eyebrowStyle}>{t('week.totalKcal')}</span>
                  <span className="tnum" style={{ ...serifItalic, fontSize: 38, fontWeight: 400, letterSpacing: -1, color: 'var(--fb-text)', lineHeight: 1 }}>
                    {totalKcal.toLocaleString('it-IT')}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--fb-text-3)' }}>kcal · {includedRows.length} {includedRows.length === 1 ? 'day' : 'days'}</span>
                </div>
                {sparkPoints.length > 1 && (
                  <Sparkline points={sparkPoints} color="var(--fb-accent)" width={150} height={42} />
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {[
                  { label: t('week.avgProtein'), value: `${avg('proj_protein')}g`, dot: 'var(--fb-red)' },
                  { label: t('week.avgCarbs'),   value: `${avg('proj_carbs')}g`,   dot: 'var(--fb-amber)' },
                  { label: t('week.avgFat'),     value: `${avg('proj_fat')}g`,     dot: 'var(--fb-green)' },
                  { label: t('week.avgFiber'),   value: `${avg('proj_fiber')}g`,   dot: 'var(--fb-text-2)' },
                ].map(s => (
                  <div key={s.label} style={statTile}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, ...eyebrowStyle, color: 'var(--fb-text-3)' }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot }} />
                      {s.label}
                    </span>
                    <span className="tnum" style={bigSerif}>{s.value}</span>
                  </div>
                ))}
              </div>

              {(recWeek > 0 || maxWeek > 0 || avgNet !== null) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {recWeek > 0 && (
                    <div style={statTile}>
                      <span style={eyebrowStyle}>{t('week.bankRec')}</span>
                      <span className="tnum" style={{ ...bigSerif, color: bankRec >= 0 ? 'var(--fb-green)' : 'var(--fb-red)' }}>
                        {bankRec >= 0 ? `${bankRec}` : `−${Math.abs(bankRec)}`}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--fb-text-3)' }}>/ {recWeek}</span>
                    </div>
                  )}
                  {maxWeek > 0 && (
                    <div style={statTile}>
                      <span style={eyebrowStyle}>{t('week.bankMax')}</span>
                      <span className="tnum" style={{ ...bigSerif, color: bankMax >= 0 ? 'var(--fb-green)' : 'var(--fb-red)' }}>
                        {bankMax >= 0 ? `${bankMax}` : `−${Math.abs(bankMax)}`}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--fb-text-3)' }}>/ {maxWeek}</span>
                    </div>
                  )}
                  {avgNet !== null && (
                    <div style={statTile}>
                      <span style={eyebrowStyle}>Avg net / day</span>
                      <span className="tnum" style={{ ...bigSerif, color: avgNet <= 0 ? 'var(--fb-green)' : 'var(--fb-orange)' }}>
                        {avgNet > 0 ? '+' : ''}{avgNet}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--fb-text-3)' }}>kcal</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* CHART */}
          <section style={cardOuter}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span style={eyebrowStyle}>Daily kcal</span>
              <span style={{ fontSize: 10, color: 'var(--fb-text-3)' }}>tap a bar to open the day</span>
            </div>
            <BarChartCard
              data={chartData}
              unit="kcal"
              onBarClick={i => navigate('day', { date: days[i], fromWeek: weekStart })}
            />
          </section>

          {/* TABLE */}
          {projected.every(d => d.proj_calories === 0) ? (
            <div style={{ ...cardOuter, alignItems: 'center', justifyContent: 'center', minHeight: 120 }}>
              <span style={{ ...serifItalic, fontSize: 14, color: 'var(--fb-text-2)' }}>{t('week.noEntries')}</span>
            </div>
          ) : (
            <section style={{ ...cardOuter, padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--fb-border)' }}>
                      <th style={{ padding: '14px 12px', width: 32 }} />
                      <th style={{ ...eyebrowStyle, textAlign: 'left', padding: '14px 16px', fontWeight: 600 }}>{t('week.date')}</th>
                      <th style={{ ...eyebrowStyle, textAlign: 'right', padding: '14px 16px', fontWeight: 600 }}>kcal</th>
                      <th style={{ ...eyebrowStyle, textAlign: 'right', padding: '14px 16px', fontWeight: 600 }}>net</th>
                      <th style={{ ...eyebrowStyle, textAlign: 'right', padding: '14px 16px', fontWeight: 600 }}>fat</th>
                      <th style={{ ...eyebrowStyle, textAlign: 'right', padding: '14px 16px', fontWeight: 600 }}>carbs</th>
                      <th style={{ ...eyebrowStyle, textAlign: 'right', padding: '14px 16px', fontWeight: 600 }}>fiber</th>
                      <th style={{ ...eyebrowStyle, textAlign: 'right', padding: '14px 16px', fontWeight: 600 }}>protein</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projected.map(d => {
                      const isToday = d.date === todayStr;
                      const fmtCell = (logged: number, planned: number, unit = '') => {
                        if (!logged && !planned) return <span style={{ color: 'var(--fb-text-3)' }}>—</span>;
                        return (
                          <>
                            <span>{Math.round(logged)}{unit}</span>
                            {planned > 0 && <span style={{ color: 'var(--fb-accent)' }}> +{Math.round(planned)}{unit}</span>}
                          </>
                        );
                      };
                      const e = energyMap.get(d.date);
                      const hasEnergy = e && (e.resting_kcal || e.active_kcal || e.extra_kcal);
                      const net = hasEnergy ? Math.round(d.proj_calories - e!.resting_kcal - e!.active_kcal - e!.extra_kcal) : null;
                      const outBreakdown = hasEnergy ? [
                        e!.resting_kcal > 0 ? String(e!.resting_kcal) : null,
                        e!.active_kcal  > 0 ? String(e!.active_kcal)  : null,
                        e!.extra_kcal   > 0 ? String(e!.extra_kcal)   : null,
                      ].filter(Boolean).join(' + ') : '';

                      return (
                        <tr key={d.date}
                          onClick={() => navigate('day', { date: d.date, fromWeek: weekStart })}
                          style={{
                            borderTop: '1px solid var(--fb-divider)',
                            background: isToday ? 'var(--fb-accent-soft)' : 'transparent',
                            opacity: d.included ? 1 : 0.4,
                            cursor: 'pointer',
                            transition: 'background .25s ease',
                          }}
                          onMouseEnter={e2 => { if (!isToday) (e2.currentTarget as HTMLElement).style.background = 'var(--fb-bg)'; }}
                          onMouseLeave={e2 => { if (!isToday) (e2.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                          <td style={{ padding: '12px', textAlign: 'center' }} onClick={ev => ev.stopPropagation()}>
                            <input type="checkbox" checked={d.included} onChange={() => toggleDay(d.date, d.included)}
                              title={t('week.includeInAvg')}
                              style={{ accentColor: 'var(--fb-accent)', cursor: 'pointer' }} />
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--fb-text)' }}>
                            <span style={serifItalic}>{fmtDate(d.date)}</span>
                            {isToday && (
                              <span style={{ marginLeft: 8, fontSize: 9, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', background: 'var(--fb-accent)', color: 'white', borderRadius: 99, padding: '2px 8px' }}>
                                {t('week.today')}
                              </span>
                            )}
                          </td>
                          <td className="tnum" style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--fb-text)' }}>{fmtCell(d.calories, d.hasPlanned ? d.planned_calories : 0)}</td>
                          <td className="tnum" style={{ padding: '12px 16px', textAlign: 'right' }}>
                            {net == null
                              ? <span style={{ color: 'var(--fb-text-3)' }}>—</span>
                              : <span title={`out: ${outBreakdown}`} style={{ color: net <= 0 ? 'var(--fb-green)' : 'var(--fb-orange)', fontWeight: 600 }}>{net > 0 ? '+' : ''}{net}</span>
                            }
                          </td>
                          <td className="tnum" style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--fb-text-2)' }}>{fmtCell(d.fat,     d.hasPlanned ? d.planned_fat     : 0, 'g')}</td>
                          <td className="tnum" style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--fb-text-2)' }}>{fmtCell(d.carbs,   d.hasPlanned ? d.planned_carbs   : 0, 'g')}</td>
                          <td className="tnum" style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--fb-text-2)' }}>{fmtCell(d.fiber,   d.hasPlanned ? d.planned_fiber   : 0, 'g')}</td>
                          <td className="tnum" style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--fb-text-2)' }}>{fmtCell(d.protein, d.hasPlanned ? d.planned_protein : 0, 'g')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
