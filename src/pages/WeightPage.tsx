import { useState, useEffect, useCallback } from "react";
import { useSettings } from "../hooks/useSettings";
import { useT } from "../i18n/useT";
import { api } from "../api";
import { linearRegression } from "../lib/macroCalc";
import { today, fmtDate, formatShortDate } from "../lib/dateUtil";
import LineChartCard from "../components/LineChartCard";
import type { WeightEntry } from "../types";

export default function WeightPage() {
  const { settings } = useSettings();
  const { t } = useT();

  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [date, setDate] = useState(today());
  const [weight, setWeight] = useState("");

  const loadEntries = useCallback(async () => {
    const data = await api.weight.getAll();
    const sorted = [...(data ?? [])].sort((a, b) => b.date.localeCompare(a.date));
    setEntries(sorted);
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  async function handleAdd() {
    const w = parseFloat(weight);
    if (!w || w <= 0 || !date) return;
    await api.weight.add({ weight: w, date });
    setWeight("");
    setDate(today());
    await loadEntries();
  }

  async function handleDelete(id: number) {
    await api.weight.delete(id);
    await loadEntries();
  }

  const currentWeight = entries.length > 0 ? entries[0].weight : null;
  const goalWeight = settings.weight_goal || null;

  function getPrediction(): string {
    if (entries.length < 2) return t("weight.needData");
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const xs = sorted.map((_, i) => i);
    const ys = sorted.map((e) => e.weight);
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
    .map((e) => ({ label: formatShortDate(e.date), value: e.weight }));

  const inputCls =
    "rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-text">{t("weight.title")}</h1>

      {/* Log form */}
      <div className="bg-card rounded-2xl p-5 border border-border space-y-3">
        <h2 className="text-base font-semibold text-text">{t("weight.logWeight")}</h2>
        <div className="flex gap-3 items-end flex-wrap">
          <input
            type="date"
            className={`${inputCls} flex-1 min-w-[140px]`}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <input
            type="number"
            className={`${inputCls} w-32`}
            placeholder={t("weight.kgPlaceholder")}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <button
            onClick={handleAdd}
            className="rounded-xl bg-accent text-white px-5 py-2 text-sm font-semibold hover:opacity-90 transition-opacity whitespace-nowrap cursor-pointer"
          >
            {t("common.add")}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t("weight.current"), value: currentWeight != null ? `${currentWeight} kg` : "—" },
          { label: t("weight.goal"), value: goalWeight != null ? `${goalWeight} kg` : "—" },
          { label: t("weight.predictedDate"), value: prediction },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded-2xl p-4 border border-border flex flex-col gap-1">
            <span className="text-xs text-text-sec">{stat.label}</span>
            <span className="text-sm font-semibold text-text truncate">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-4">
          <LineChartCard
            data={chartData}
            goalValue={settings.weight_goal || undefined}
            showTrend={true}
            unit=" kg"
            height={250}
          />
        </div>
      )}

      {/* Table */}
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
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-border/50 last:border-0 hover:bg-bg/50 transition-colors">
                  <td className="px-4 py-3 text-text">{fmtDate(entry.date)}</td>
                  <td className="px-4 py-3 text-right font-medium text-text tabular-nums">{entry.weight} kg</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="text-text-sec hover:text-red transition-colors px-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
