import { useState, useRef } from 'react';
import ExerciseSearch from './ExerciseSearch';
import ModalFooter from './ui/ModalFooter';
import { useT } from '../i18n/useT';
import type { ExerciseType, WorkoutPlan, WorkoutPlanExercise, WorkoutPlanExerciseInput } from '../types';

interface PlanRow {
  key: number;
  exercise_type_id: number;
  exercise_name: string;
  exercise_category: string;
  target_sets: string;
  target_reps: string;
  target_duration_min: string;
  target_weight_kg: string;
  rest_sec: string;
  is_optional: boolean;
  notes: string;
}

let rowKey = 0;
function newRow(ex: ExerciseType): PlanRow {
  return {
    key: ++rowKey,
    exercise_type_id: ex.id,
    exercise_name: ex.name,
    exercise_category: ex.category,
    target_sets: '', target_reps: '', target_duration_min: '',
    target_weight_kg: '', rest_sec: '', is_optional: false, notes: '',
  };
}

function planExerciseToRow(ex: WorkoutPlanExercise): PlanRow {
  return {
    key: ++rowKey,
    exercise_type_id: ex.exercise_type_id,
    exercise_name: ex.exercise_name,
    exercise_category: ex.exercise_category,
    target_sets: ex.target_sets != null ? String(ex.target_sets) : '',
    target_reps: ex.target_reps != null ? String(ex.target_reps) : '',
    target_duration_min: ex.target_duration_min != null ? String(ex.target_duration_min) : '',
    target_weight_kg: ex.target_weight_kg != null ? String(ex.target_weight_kg) : '',
    rest_sec: ex.rest_sec != null ? String(ex.rest_sec) : '',
    is_optional: !!ex.is_optional,
    notes: ex.notes ?? '',
  };
}

function rowToInput(row: PlanRow, i: number): WorkoutPlanExerciseInput {
  return {
    exercise_type_id: row.exercise_type_id,
    sort_order: i,
    target_sets: row.target_sets ? parseInt(row.target_sets) : undefined,
    target_reps: row.target_reps ? parseInt(row.target_reps) : undefined,
    target_duration_min: row.target_duration_min ? parseFloat(row.target_duration_min) : undefined,
    target_weight_kg: row.target_weight_kg ? parseFloat(row.target_weight_kg) : undefined,
    rest_sec: row.rest_sec ? parseInt(row.rest_sec) : undefined,
    is_optional: row.is_optional,
    notes: row.notes || undefined,
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  cardio:      'bg-blue-500/15 text-blue-400',
  strength:    'bg-orange-500/15 text-orange-400',
  flexibility: 'bg-green-500/15 text-green-400',
  other:       'bg-text-sec/15 text-text-sec',
};

interface Props {
  plan: WorkoutPlan | null;
  exTypes: ExerciseType[];
  onSave: (name: string, description: string, exercises: WorkoutPlanExerciseInput[]) => void;
  onCancel: () => void;
}

export default function WorkoutPlanEditor({ plan, exTypes, onSave, onCancel }: Props) {
  const { t } = useT();

  const [name, setName]           = useState(plan?.name ?? '');
  const [description, setDescription] = useState(plan?.description ?? '');
  const [rows, setRows]           = useState<PlanRow[]>(
    plan?.exercises ? plan.exercises.map(planExerciseToRow) : []
  );
  const [showSearch, setShowSearch] = useState(false);

  // DnD state (follows Nav.tsx pattern)
  const dragIdx = useRef<number | null>(null);
  const dragOverIdx = useRef<number | null>(null);

  function handleDragStart(i: number) { dragIdx.current = i; }
  function handleDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    dragOverIdx.current = i;
  }
  function handleDrop() {
    const from = dragIdx.current;
    const to = dragOverIdx.current;
    if (from == null || to == null || from === to) return;
    setRows(prev => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    dragIdx.current = null;
    dragOverIdx.current = null;
  }

  function addExercise(ex: ExerciseType) {
    setRows(prev => [...prev, newRow(ex)]);
    setShowSearch(false);
  }

  function removeRow(key: number) {
    setRows(prev => prev.filter(r => r.key !== key));
  }

  function patchRow(key: number, partial: Partial<PlanRow>) {
    setRows(prev => prev.map(r => r.key === key ? { ...r, ...partial } : r));
  }

  function handleSave() {
    if (!name.trim()) return;
    onSave(name.trim(), description.trim(), rows.map(rowToInput));
  }

  const inputCls = 'rounded-lg border border-border bg-bg px-2 py-1 text-xs text-text focus:outline-none focus:border-accent';

  return (
    <div className="flex flex-col gap-4 p-4 max-h-[80vh] overflow-y-auto">
      {/* Plan meta */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-text-sec">{t('exercise.plans.name')}</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Push Day"
            className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-text-sec">{t('exercise.plans.description')}</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Optional description…"
            rows={2}
            className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent resize-none"
          />
        </div>
      </div>

      {/* Exercise list */}
      <div className="flex flex-col gap-2">
        <div className="text-xs font-semibold text-text-sec uppercase tracking-wider">{t('exercise.plans.exercises')}</div>

        {rows.length === 0 && (
          <p className="text-xs text-text-sec py-2">No exercises yet. Add one below.</p>
        )}

        {rows.map((row, i) => (
          <PlanExerciseRow
            key={row.key}
            row={row}
            index={i}
            onPatch={partial => patchRow(row.key, partial)}
            onRemove={() => removeRow(row.key)}
            onDragStart={() => handleDragStart(i)}
            onDragOver={e => handleDragOver(e, i)}
            onDrop={handleDrop}
            inputCls={inputCls}
            categoryColors={CATEGORY_COLORS}
            t={t}
          />
        ))}

        {/* Add exercise search */}
        {showSearch ? (
          <div className="flex gap-2 items-start">
            <div className="flex-1">
              <ExerciseSearch
                items={exTypes}
                onSelect={addExercise}
                clearAfterSelect
                showAllWhenEmpty
                placeholder="Search and add exercise…"
              />
            </div>
            <button onClick={() => setShowSearch(false)} aria-label="Close" className="text-xs text-text-sec hover:text-text cursor-pointer px-2 py-2">✕</button>
          </div>
        ) : (
          <button
            onClick={() => setShowSearch(true)}
            className="text-xs text-accent hover:opacity-75 cursor-pointer transition-opacity self-start"
          >
            {t('exercise.plans.addExercise')}
          </button>
        )}
      </div>

      <ModalFooter
        onCancel={onCancel}
        onConfirm={handleSave}
        cancelLabel={t('exercise.plans.cancel')}
        confirmLabel={t('exercise.plans.save')}
        confirmDisabled={!name.trim()}
        className="border-t border-border pt-3 sticky bottom-0 bg-card"
      />
    </div>
  );
}

// ─── PlanExerciseRow defined at module level ──────────────────────────────

interface PlanExRowProps {
  row: PlanRow;
  index: number;
  onPatch: (partial: Partial<PlanRow>) => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  inputCls: string;
  categoryColors: Record<string, string>;
  t: ReturnType<typeof useT>['t'];
}

function PlanExerciseRow({ row, onPatch, onRemove, onDragStart, onDragOver, onDrop, inputCls, categoryColors, t }: PlanExRowProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="bg-bg border border-border rounded-xl p-3 flex flex-col gap-2"
    >
      <div className="flex items-center gap-2">
        {/* Drag handle */}
        <span className="text-text-sec/40 cursor-grab text-sm select-none">⠿</span>

        {/* Exercise name */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-sm font-medium text-text truncate">{row.exercise_name}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${categoryColors[row.exercise_category] ?? categoryColors.other}`}>
            {t(`category.${row.exercise_category}` as Parameters<typeof t>[0])}
          </span>
        </div>

        {/* Optional toggle */}
        <label className="flex items-center gap-1 text-xs text-text-sec cursor-pointer">
          <input
            type="checkbox"
            checked={row.is_optional}
            onChange={e => onPatch({ is_optional: e.target.checked })}
            className="cursor-pointer"
          />
          {t('exercise.plans.optional')}
        </label>

        {/* Remove */}
        <button onClick={onRemove} aria-label={t('common.delete')} className="text-text-sec hover:text-red cursor-pointer text-xs px-1">✕</button>
      </div>

      {/* Targets */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-text-sec">{t('exercise.plans.targetSets')}</label>
          <input type="text" inputMode="decimal" value={row.target_sets} onChange={e => onPatch({ target_sets: e.target.value })} placeholder="—" className={`${inputCls} w-14`} />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-text-sec">{t('exercise.plans.targetReps')}</label>
          <input type="text" inputMode="decimal" value={row.target_reps} onChange={e => onPatch({ target_reps: e.target.value })} placeholder="—" className={`${inputCls} w-14`} />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-text-sec">{t('exercise.plans.targetWeight')}</label>
          <input type="text" inputMode="decimal" value={row.target_weight_kg} onChange={e => onPatch({ target_weight_kg: e.target.value })} placeholder="—" className={`${inputCls} w-16`} />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-text-sec">{t('exercise.plans.targetDuration')}</label>
          <input type="text" inputMode="decimal" value={row.target_duration_min} onChange={e => onPatch({ target_duration_min: e.target.value })} placeholder="—" className={`${inputCls} w-14`} />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-text-sec">{t('exercise.plans.restSec')}</label>
          <input type="text" inputMode="decimal" value={row.rest_sec} onChange={e => onPatch({ rest_sec: e.target.value })} placeholder="—" className={`${inputCls} w-16`} />
        </div>
        <div className="flex flex-col gap-0.5 flex-1 min-w-24">
          <label className="text-[10px] text-text-sec">Notes</label>
          <input type="text" value={row.notes} onChange={e => onPatch({ notes: e.target.value })} placeholder="optional" className={`${inputCls} w-full`} />
        </div>
      </div>
    </div>
  );
}
