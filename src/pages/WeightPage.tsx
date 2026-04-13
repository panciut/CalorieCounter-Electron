import { useState, useEffect, useCallback } from "react";
import { useSettings } from "../hooks/useSettings";
import { useT } from "../i18n/useT";
import { api } from "../api";
import { linearRegression } from "../lib/macroCalc";
import { today, fmtDate, formatShortDate } from "../lib/dateUtil";
import LineChartCard from "../components/LineChartCard";
import type { WeightEntry } from "../types";

type Tab = 'weight' | 'body';

export default function WeightPage() {
  const { settings } = useSettings();
  const { t } = useT();
  const [tab, setTab] = useState<Tab>('weight');

  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [date, setDate]       = useState(today());
  const [weight, setWeight]   = useState('');
  // Body comp fields
  const [fatPct, setFatPct]           = useState('');
  const [muscleMass, setMuscleMass]   = useState('');
  const [waterPct, setWaterPct]       = useState('');
  const [boneMass, setBoneMass]       = useState('');

  const loadEntries = useCallback(async () => {
    const data = await api.weight.getAll();
    setEntries([...(data ?? [])].sort((a, b) => b.date.localeCompare(a.date)));
  }, []);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  async function handleAdd() {
    const w = parseFloat(weight);
    if (!w || w <= 0 || !date) return;
    await api.weight.add({
      weight: w,
      date,
      fat_pct:     fatPct     ? parseFloat(fatPct)     : null,
      muscle_mass: muscleMass ? parseFloat(muscleMass) : null,
      water_pct:   waterPct   ? parseFloat(waterPct)   : null,
      bone_mass:   boneMass   ? parseFloat(boneMass)   : null,
    });
    setWeight(''); setFatPct(''); setMuscleMass(''); setWaterPct(''); setBoneMass('');
    setDate(today());
    await loadEntries();
  }

  async function handleDelete(id: number) {
    await api.weight.delete(id);
    await loadEntries();
  }

  const currentWeight = entries.length > 0 ? entries[0].weight : null;
  const goalWeight    = settings.weight_goal || null;

  function getPrediction(): string {
    if (entries.length < 2) return t("weight.needData");
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const xs = sorted.map((_, i) => i);
    const ys = sorted.map(e => e.weight);
    const { slope, intercept } = linearRegression(xs, ys);
    if (!goalWeight) return "—";
    const currentVal = slope * (sorted.length - 1) + intercept;
    const diff = currentVal - goalWeight;
    if (Math.abs(diff) < 0.1) return t("weight.reached");
    if (slope === 0) return "—";
    const goingDown = goalWeight < currentVal;
    if (goingDown && slope > 0) return t("weight.wrongWay");
    if (!goingDown && slope < 0) return t("weight.wrongWay");
    const daysNeeded = Math.abs(diff / slope);
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + Math.round(daysNeeded));
    const yy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    return fmtDate(`${yy}-${mm}-${dd}`);
  }

  const prediction = getPrediction();

  const chartData = [...entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(e => ({ label: formatShortDate(e.date), value: e.weight }));

  // Body comp data (only entries with fat_pct)
  const bodyEntries = [...entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .filter(e => e.fat_pct != null || e.muscle_mass != null);

  const fatData    = bodyEntries.filter(e => e.fat_pct     != null).map(e => ({ label: formatShortDate(e.date), value: e.fat_pct! }));
  const muscleData = bodyEntries.filter(e => e.muscle_mass != null).map(e => ({ label: formatShortDate(e.date), value: e.muscle_mass! }));
  const waterData  = bodyEntries.filter(e => e.water_pct   != null).map(e => ({ label: formatShortDate(e.date), value: e.water_pct! }));

  const latestBodyComp = entries.find(e => e.fat_pct != null || e.muscle_mass != null);

  const inputCls = "rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

  const tabBtn = (t: Tab) => [
    'text-sm px-4 py-1.5 rounded-lg font-medium cursor-pointer transition-colors border',
    tab === t ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-sec hover:text-text',
  ].join(' ');

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">Body</h1>
        <div className="flex gap-2">
          <button className={tabBtn('weight')} onClick={() => setTab('weight')}>Weight</button>
          <button className={tabBtn('body')}   onClick={() => setTab('body')}>Composition</button>
        </div>
      </div>

      {/* ── WEIGHT TAB ─────────────────────────────────────────────────────── */}
      {tab === 'weight' && (
        <>
          {/* Log form */}
          <div className="bg-card rounded-2xl p-5 border border-border space-y-3">
            <h2 className="text-base font-semibold text-text">{t("weight.logWeight")}</h2>
            <div className="flex gap-3 items-end flex-wrap">
              <input type="date" className={`${inputCls} flex-1 min-w-[140px]`} value={date} onChange={e => setDate(e.target.value)} />
              <input
                type="text" inputMode="decimal"
                className={`${inputCls} w-32`}
                placeholder={t("weight.kgPlaceholder")}
                value={weight}
                onChange={e => setWeight(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAdd()}
              />
              <button onClick={handleAdd} className="rounded-xl bg-accent text-white px-5 py-2 text-sm font-semibold hover:opacity-90 cursor-pointer">
                {t("common.add")}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: t("weight.current"),       value: currentWeight != null ? `${currentWeight} kg` : "—" },
              { label: t("weight.goal"),           value: goalWeight != null ? `${goalWeight} kg` : "—" },
              { label: t("weight.predictedDate"),  value: prediction },
            ].map(stat => (
              <div key={stat.label} className="bg-card rounded-2xl p-4 border border-border flex flex-col gap-1">
                <span className="text-xs text-text-sec">{stat.label}</span>
                <span className="text-sm font-semibold text-text truncate">{stat.value}</span>
              </div>
            ))}
          </div>

          {chartData.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-4">
              <LineChartCard data={chartData} goalValue={settings.weight_goal || undefined} showTrend={true} unit=" kg" height={250} />
            </div>
          )}

          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {entries.length === 0 ? (
              <p className="text-sm text-text-sec text-center py-8">{t("weight.noEntries")}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-text-sec text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3">{t("weight.dateCol")}</th>
                    <th className="text-right px-4 py-3">{t("weight.weightCol")}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {entries.map(entry => (
                    <tr key={entry.id} className="border-b border-border/50 last:border-0 hover:bg-bg/50 transition-colors">
                      <td className="px-4 py-3 text-text">{fmtDate(entry.date)}</td>
                      <td className="px-4 py-3 text-right font-medium text-text tabular-nums">{entry.weight} kg</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDelete(entry.id)} className="text-text-sec hover:text-red transition-colors px-1 cursor-pointer">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ── BODY COMPOSITION TAB ───────────────────────────────────────────── */}
      {tab === 'body' && (
        <>
          {/* Log form */}
          <div className="bg-card rounded-2xl p-5 border border-border space-y-3">
            <h2 className="text-base font-semibold text-text">Log body composition</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-text-sec">Date</label>
                <input type="date" className={inputCls} value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-text-sec">Weight (kg, required)</label>
                <input type="text" inputMode="decimal" className={inputCls} placeholder="kg" value={weight} onChange={e => setWeight(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-text-sec">Body fat (%)</label>
                <input type="text" inputMode="decimal" className={inputCls} placeholder="e.g. 18.5" value={fatPct} onChange={e => setFatPct(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-text-sec">Muscle mass (kg)</label>
                <input type="text" inputMode="decimal" className={inputCls} placeholder="kg" value={muscleMass} onChange={e => setMuscleMass(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-text-sec">Body water (%)</label>
                <input type="text" inputMode="decimal" className={inputCls} placeholder="e.g. 55" value={waterPct} onChange={e => setWaterPct(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-text-sec">Bone mass (kg)</label>
                <input type="text" inputMode="decimal" className={inputCls} placeholder="kg" value={boneMass} onChange={e => setBoneMass(e.target.value)} />
              </div>
            </div>
            <button onClick={handleAdd} disabled={!weight} className="w-full rounded-xl bg-accent text-white py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-40 cursor-pointer">
              {t("common.add")}
            </button>
          </div>

          {/* Latest stats */}
          {latestBodyComp && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Body fat',    value: latestBodyComp.fat_pct     != null ? `${latestBodyComp.fat_pct}%`     : '—' },
                { label: 'Muscle mass', value: latestBodyComp.muscle_mass != null ? `${latestBodyComp.muscle_mass} kg` : '—' },
                { label: 'Body water',  value: latestBodyComp.water_pct   != null ? `${latestBodyComp.water_pct}%`   : '—' },
                { label: 'Bone mass',   value: latestBodyComp.bone_mass   != null ? `${latestBodyComp.bone_mass} kg` : '—' },
              ].map(s => (
                <div key={s.label} className="bg-card border border-border rounded-xl p-4">
                  <div className="text-xs text-text-sec mb-1">{s.label}</div>
                  <div className="text-lg font-bold text-text">{s.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Charts */}
          {fatData.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-4">
              <p className="text-xs font-semibold text-text-sec uppercase tracking-wider mb-3">Body fat %</p>
              <LineChartCard data={fatData} unit="%" height={200} showTrend={fatData.length >= 3} />
            </div>
          )}
          {muscleData.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-4">
              <p className="text-xs font-semibold text-text-sec uppercase tracking-wider mb-3">Muscle mass</p>
              <LineChartCard data={muscleData} unit=" kg" height={200} showTrend={muscleData.length >= 3} />
            </div>
          )}
          {waterData.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-4">
              <p className="text-xs font-semibold text-text-sec uppercase tracking-wider mb-3">Body water %</p>
              <LineChartCard data={waterData} unit="%" height={200} showTrend={waterData.length >= 3} />
            </div>
          )}

          {bodyEntries.length === 0 && (
            <p className="text-sm text-text-sec text-center py-8">No body composition data yet. Log a measurement above.</p>
          )}
        </>
      )}
    </div>
  );
}
