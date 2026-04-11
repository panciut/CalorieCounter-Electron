import { useState, useEffect } from "react";
import { useSettings } from "../hooks/useSettings";
import { useT } from "../i18n/useT";
import { useToast } from "../components/Toast";
import { calcMacroRanges } from "../lib/macroCalc";
import { api } from "../api";
import type { Settings } from "../types";

type MacroField = "protein" | "carbs" | "fat" | "fiber";

const MACROS: MacroField[] = ["protein", "carbs", "fat", "fiber"];

export default function GoalsPage() {
  const { settings, updateSettings } = useSettings();
  const { t } = useT();
  const { showToast } = useToast();

  const [form, setForm] = useState<Partial<Settings>>({});
  const [calcWeight, setCalcWeight] = useState("");
  const [preview, setPreview] = useState<ReturnType<typeof calcMacroRanges> | null>(null);

  useEffect(() => {
    setForm({ ...settings });
    api.weight.getAll().then((entries) => {
      if (entries && entries.length > 0) {
        const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
        setCalcWeight(String(sorted[0].weight));
      }
    });
  }, [settings]);

  function setField(key: keyof Settings, value: number | string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleCalculate() {
    const w = parseFloat(calcWeight);
    if (!w || w <= 0) return;
    const calories = Number(form.cal_rec) || 2000;
    const ranges = calcMacroRanges(w, calories);
    setPreview(ranges);
    setForm((f) => ({
      ...f,
      protein_min: ranges.protein_min, protein_max: ranges.protein_max, protein_rec: ranges.protein_rec,
      fat_min: ranges.fat_min,         fat_max: ranges.fat_max,         fat_rec: ranges.fat_rec,
      carbs_min: ranges.carbs_min,     carbs_max: ranges.carbs_max,     carbs_rec: ranges.carbs_rec,
      fiber_min: ranges.fiber_min,     fiber_max: ranges.fiber_max,     fiber_rec: ranges.fiber_rec,
    }));
  }

  async function handleSave() {
    await updateSettings(form);
    showToast(t("common.saved"));
    setPreview(null);
  }

  const inputCls =
    "w-full rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-text focus:outline-none focus:border-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

  function MacroRow({ macro }: { macro: MacroField }) {
    return (
      <div className="grid grid-cols-4 gap-2 items-center">
        <span className="text-sm font-medium text-text capitalize">{t(`settings.${macro}`)}</span>
        {(["min", "max", "rec"] as const).map((suffix) => {
          const key = `${macro}_${suffix}` as keyof Settings;
          const label = suffix === 'min' ? 'Minimum' : suffix === 'max' ? 'Maximum' : 'Recommended';
          return (
            <input
              key={suffix}
              type="number"
              className={inputCls}
              placeholder={label}
              value={form[key] as number ?? ""}
              onChange={(e) => setField(key, parseFloat(e.target.value))}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-text">{t("settings.title")}</h1>

      {/* Macro Calculator */}
      <div className="bg-card rounded-2xl p-5 space-y-4 border border-border">
        <div>
          <h2 className="text-lg font-semibold text-text">{t("goals.calcTitle")}</h2>
          <p className="text-sm text-text-sec mt-0.5">{t("goals.calcNote")}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-text-sec">{t("goals.calcWeight")} (kg)</label>
            <input
              type="number"
              className={inputCls}
              placeholder="kg"
              value={calcWeight}
              onChange={(e) => setCalcWeight(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-text-sec">{t("goals.calcCalories")}</label>
            <input
              type="number"
              className={inputCls}
              value={form.cal_rec ?? ""}
              onChange={(e) => setField("cal_rec", parseFloat(e.target.value))}
            />
          </div>
        </div>

        <button
          onClick={handleCalculate}
          className="w-full rounded-xl bg-accent text-white py-2 text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
        >
          {t("goals.calcBtn")}
        </button>

        {preview && (
          <div className="flex flex-wrap gap-2 pt-1">
            {MACROS.map((macro) => {
              const rec = preview[`${macro}_rec` as keyof typeof preview] as number;
              return (
                <span
                  key={macro}
                  className="rounded-full bg-accent/10 border border-accent/30 text-accent text-xs px-3 py-1 font-medium"
                >
                  {t(`settings.${macro}`)}: {t("goals.rec")} {rec}g
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Goals Form */}
      <div className="bg-card rounded-2xl p-5 space-y-5 border border-border">
        {/* Calories */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-text">{t("settings.dailyCal")}</h3>
          <div className="grid grid-cols-3 gap-2">
            {(["cal_min", "cal_max", "cal_rec"] as const).map((key) => {
              const suffix = key.split("_")[1];
              const label = suffix === 'min' ? 'Minimum' : suffix === 'max' ? 'Maximum' : 'Recommended';
              return (
                <input
                  key={key}
                  type="number"
                  className={inputCls}
                  placeholder={label}
                  value={form[key] as number ?? ""}
                  onChange={(e) => setField(key, parseFloat(e.target.value))}
                />
              );
            })}
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs text-text-sec px-1">
            <span>Minimum</span><span>Maximum</span><span>Recommended</span>
          </div>
        </div>

        {/* Macros header */}
        <div className="grid grid-cols-4 gap-2 text-xs text-text-sec px-1">
          <span></span><span>Minimum</span><span>Maximum</span><span>Recommended</span>
        </div>

        <div className="space-y-3">
          {MACROS.map((macro) => (
            <MacroRow key={macro} macro={macro} />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="space-y-1">
            <label className="text-xs text-text-sec">{t("settings.goalWeight")} (kg)</label>
            <input
              type="number"
              className={inputCls}
              value={form.weight_goal ?? ""}
              onChange={(e) => setField("weight_goal", parseFloat(e.target.value))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-text-sec">{t("settings.waterGoal")} (ml)</label>
            <input
              type="number"
              className={inputCls}
              value={form.water_goal ?? ""}
              onChange={(e) => setField("water_goal", parseFloat(e.target.value))}
            />
          </div>
        </div>

        {/* Tolerances */}
        <div className="space-y-2 pt-1">
          <h3 className="text-sm font-semibold text-text">{t("settings.tolTitle")}</h3>
          <div className="grid grid-cols-3 gap-2">
            {([1, 2, 3] as const).map((n) => {
              const key = `tol_${n}` as keyof Settings;
              return (
                <div key={n} className="space-y-1">
                  <label className="text-xs text-text-sec">{t(`settings.tol${n}`)}</label>
                  <input
                    type="number"
                    className={inputCls}
                    value={form[key] as number ?? ""}
                    onChange={(e) => setField(key, parseFloat(e.target.value))}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full rounded-xl bg-accent text-white py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
      >
        {t("common.save")}
      </button>
    </div>
  );
}
