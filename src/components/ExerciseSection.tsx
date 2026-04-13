import { useState, useEffect } from 'react';
import { api } from '../api';
import ConfirmDialog from './ConfirmDialog';
import type { Exercise, ExerciseType } from '../types';

interface Props {
  date: string;
  weightKg: number;
  onCaloriesChange: (kcal: number) => void;
}

interface SetRow { reps: string; weight_kg: string; }

export default function ExerciseSection({ date, weightKg, onCaloriesChange }: Props) {
  const [exercises, setExercises]   = useState<Exercise[]>([]);
  const [exTypes, setExTypes]       = useState<ExerciseType[]>([]);
  const [open, setOpen]             = useState(false);
  const [editId, setEditId]         = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Exercise | null>(null);

  // Form state
  const [type, setType]             = useState('');
  const [duration, setDuration]     = useState('');
  const [notes, setNotes]           = useState('');
  const [showSets, setShowSets]     = useState(false);
  const [sets, setSets]             = useState<SetRow[]>([{ reps: '', weight_kg: '' }]);

  useEffect(() => {
    load();
    api.exercises.getTypes().then(setExTypes);
  }, [date]);

  async function load() {
    const rows = await api.exercises.getDay(date);
    setExercises(rows);
    onCaloriesChange(rows.reduce((s, e) => s + e.calories_burned, 0));
  }

  function resetForm() {
    setType(''); setDuration(''); setNotes('');
    setShowSets(false); setSets([{ reps: '', weight_kg: '' }]);
    setEditId(null);
  }

  async function handleSubmit() {
    if (!type || !duration) return;
    const validSets = showSets
      ? sets.filter(s => s.reps || s.weight_kg).map(s => ({ reps: s.reps ? parseInt(s.reps) : undefined, weight_kg: s.weight_kg ? parseFloat(s.weight_kg) : undefined }))
      : [];
    if (editId !== null) {
      await api.exercises.update({ id: editId, type, duration_min: parseFloat(duration), calories_burned: 0, notes });
    } else {
      await api.exercises.add({ date, type, duration_min: parseFloat(duration), calories_burned: 0, notes, sets: validSets });
    }
    resetForm();
    setOpen(false);
    load();
  }

  function startEdit(ex: Exercise) {
    setType(ex.type);
    setDuration(String(ex.duration_min));
    setNotes(ex.notes || '');
    setShowSets(!!(ex.sets?.length));
    setSets(ex.sets?.length ? ex.sets.map(s => ({ reps: s.reps ? String(s.reps) : '', weight_kg: s.weight_kg ? String(s.weight_kg) : '' })) : [{ reps: '', weight_kg: '' }]);
    setEditId(ex.id);
    setOpen(true);
  }

  async function doDelete() {
    if (!deleteTarget) return;
    await api.exercises.delete(deleteTarget.id);
    setDeleteTarget(null);
    load();
  }

  const inputCls = 'rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-text focus:outline-none focus:border-accent w-full';

  const categoryGroups = exTypes.reduce<Record<string, ExerciseType[]>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-semibold text-text-sec uppercase tracking-wider">Exercise</h3>
        </div>
        <button
          onClick={() => { resetForm(); setOpen(true); }}
          className="text-xs px-3 py-1 rounded-lg border border-border text-text-sec hover:border-accent hover:text-accent cursor-pointer transition-colors"
        >
          + Add
        </button>
      </div>

      {exercises.length === 0 && !open && (
        <p className="text-xs text-text-sec">No exercise logged today.</p>
      )}

      {exercises.length > 0 && (
        <div className="flex flex-col gap-1.5 mb-3">
          {exercises.map(ex => (
            <div key={ex.id} className="flex items-center gap-2 text-sm">
              <span className="flex-1 text-text">{ex.type}</span>
              <span className="text-text-sec tabular-nums text-xs">{ex.duration_min}min</span>
              {ex.sets && ex.sets.length > 0 && (
                <span className="text-xs text-text-sec">{ex.sets.length} sets</span>
              )}
              <button onClick={() => startEdit(ex)} className="text-text-sec hover:text-text px-1 cursor-pointer text-xs">✎</button>
              <button onClick={() => setDeleteTarget(ex)} className="text-text-sec hover:text-red px-1 cursor-pointer text-xs">✕</button>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="border-t border-border pt-3 mt-2 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-text-sec">Type</label>
              <select className={inputCls} value={type} onChange={e => setType(e.target.value)}>
                <option value="">Select type…</option>
                {Object.entries(categoryGroups).map(([cat, types]) => (
                  <optgroup key={cat} label={cat.charAt(0).toUpperCase() + cat.slice(1)}>
                    {types.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-sec">Duration (min)</label>
              <input type="text" inputMode="decimal" className={inputCls} value={duration} onChange={e => setDuration(e.target.value)} placeholder="30" />
            </div>
          </div>

          <input type="text" className={inputCls} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" />

          <div>
            <button
              onClick={() => setShowSets(v => !v)}
              className="text-xs text-text-sec hover:text-text cursor-pointer transition-colors"
            >
              {showSets ? '▲ Hide sets' : '▼ Add sets (strength training)'}
            </button>
          </div>

          {showSets && (
            <div className="space-y-2">
              {sets.map((s, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-xs text-text-sec w-8">#{i + 1}</span>
                  <input type="text" inputMode="decimal" className="w-20 rounded-lg border border-border bg-bg px-2 py-1 text-sm text-text focus:outline-none focus:border-accent" placeholder="Reps" value={s.reps} onChange={e => setSets(ss => ss.map((x, j) => j === i ? { ...x, reps: e.target.value } : x))} />
                  <input type="text" inputMode="decimal" className="w-20 rounded-lg border border-border bg-bg px-2 py-1 text-sm text-text focus:outline-none focus:border-accent" placeholder="kg" value={s.weight_kg} onChange={e => setSets(ss => ss.map((x, j) => j === i ? { ...x, weight_kg: e.target.value } : x))} />
                  {sets.length > 1 && <button onClick={() => setSets(ss => ss.filter((_, j) => j !== i))} className="text-red text-xs cursor-pointer">✕</button>}
                </div>
              ))}
              <button onClick={() => setSets(ss => [...ss, { reps: '', weight_kg: '' }])} className="text-xs text-accent hover:opacity-75 cursor-pointer">+ Add set</button>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={!type || !duration} className="px-4 py-2 rounded-xl bg-accent text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 cursor-pointer">
              {editId !== null ? 'Save' : 'Log'}
            </button>
            <button onClick={() => { resetForm(); setOpen(false); }} className="px-4 py-2 rounded-xl text-sm text-text-sec border border-border hover:bg-card-hover cursor-pointer">Cancel</button>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`Delete "${deleteTarget.type}"?`}
          confirmLabel="Delete"
          dangerous
          onConfirm={doDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
