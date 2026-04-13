import { useState, useEffect } from 'react';
import { api } from '../api';
import ExerciseSection from '../components/ExerciseSection';
import { today, fmtDate } from '../lib/dateUtil';
import type { Exercise, WeightEntry } from '../types';

function getNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ExercisePage() {
  const [dateStr, setDateStr]           = useState(today());
  const [weightKg, setWeightKg]         = useState(0);
  const [recentExercises, setRecentExercises] = useState<Exercise[]>([]);

  useEffect(() => {
    api.weight.getAll().then((entries: WeightEntry[]) => {
      if (entries.length > 0) setWeightKg(entries[entries.length - 1].weight);
    });
    loadHistory();
  }, []);

  async function loadHistory() {
    const rows = await api.exercises.getRange(getNDaysAgo(29), today());
    setRecentExercises(rows);
  }

  // Group by date, sorted newest first
  const byDate = recentExercises.reduce<Record<string, Exercise[]>>((acc, ex) => {
    (acc[ex.date] ??= []).push(ex);
    return acc;
  }, {});
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  // Stats (all 30 days)
  const totalWorkouts = recentExercises.length;
  const totalMin      = Math.round(recentExercises.reduce((s, e) => s + e.duration_min, 0));

  return (
    <div className="p-6 max-w-3xl mx-auto flex flex-col gap-6">
      <h1 className="text-xl font-bold text-text">Exercise</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-text-sec mb-1">Workouts (30d)</div>
          <div className="text-lg font-bold text-text tabular-nums">{totalWorkouts}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-text-sec mb-1">Total time (30d)</div>
          <div className="text-lg font-bold text-text tabular-nums">{Math.floor(totalMin / 60)}h {totalMin % 60}m</div>
        </div>
      </div>

      {/* Date selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-text-sec">Log for:</span>
        <input
          type="date"
          value={dateStr}
          onChange={e => setDateStr(e.target.value)}
          className="text-xs bg-card border border-border rounded-lg px-2 py-1 text-text-sec focus:outline-none focus:border-accent cursor-pointer"
        />
        <span className="text-xs text-text-sec">{fmtDate(dateStr)}</span>
      </div>

      {/* Exercise section */}
      <ExerciseSection
        date={dateStr}
        weightKg={weightKg}
        onCaloriesChange={() => loadHistory()}
      />

      {/* History */}
      {sortedDates.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold text-text-sec uppercase tracking-wider">History (30 days)</h2>
          {sortedDates.map(date => {
            const exes = byDate[date];
            return (
              <div key={date} className="bg-card border border-border rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-text-sec">{fmtDate(date)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  {exes.map(ex => (
                    <div key={ex.id} className="flex items-center gap-3 text-sm">
                      <span className="flex-1 text-text">{ex.type}</span>
                      <span className="text-text-sec text-xs tabular-nums">{ex.duration_min}min</span>
                      {ex.sets && ex.sets.length > 0 && (
                        <span className="text-xs text-text-sec">{ex.sets.length} sets</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {recentExercises.length === 0 && (
        <p className="text-text-sec text-sm text-center py-4">No exercises logged in the last 30 days.</p>
      )}
    </div>
  );
}
