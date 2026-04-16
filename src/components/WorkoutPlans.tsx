import { useState, useEffect } from 'react';
import { api } from '../api';
import Modal from './Modal';
import ConfirmDialog from './ConfirmDialog';
import WorkoutPlanEditor from './WorkoutPlanEditor';
import { useT } from '../i18n/useT';
import { useToast } from './Toast';
import type { WorkoutPlan, ExerciseType, WorkoutPlanExerciseInput } from '../types';

export default function WorkoutPlans() {
  const { t } = useT();
  const { showToast } = useToast();

  const [plans, setPlans]       = useState<WorkoutPlan[]>([]);
  const [exTypes, setExTypes]   = useState<ExerciseType[]>([]);
  const [search, setSearch]     = useState('');

  const [editorOpen, setEditorOpen]   = useState(false);
  const [editPlan, setEditPlan]       = useState<WorkoutPlan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkoutPlan | null>(null);

  useEffect(() => {
    load();
    api.exercises.getTypes().then(setExTypes);
  }, []);

  async function load() {
    setPlans(await api.workoutPlans.getAll());
  }

  function openCreate() {
    setEditPlan(null);
    setEditorOpen(true);
  }

  async function openEdit(plan: WorkoutPlan) {
    const full = await api.workoutPlans.get(plan.id);
    setEditPlan(full);
    setEditorOpen(true);
  }

  async function handleSave(name: string, description: string, exercises: WorkoutPlanExerciseInput[]) {
    if (editPlan) {
      await api.workoutPlans.update({ id: editPlan.id, name, description, exercises });
    } else {
      await api.workoutPlans.create({ name, description, exercises });
    }
    setEditorOpen(false);
    setEditPlan(null);
    showToast(t('common.saved'));
    load();
  }

  async function handleDuplicate(plan: WorkoutPlan) {
    await api.workoutPlans.duplicate(plan.id);
    showToast(t('common.saved'));
    load();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await api.workoutPlans.delete(deleteTarget.id);
    setDeleteTarget(null);
    showToast('Deleted');
    load();
  }

  const filtered = plans.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('exercise.plans.searchPlans')}
          className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent"
        />
        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 cursor-pointer whitespace-nowrap"
        >
          {t('exercise.plans.newPlan')}
        </button>
      </div>

      {/* Plan list */}
      {filtered.length === 0 && (
        <p className="text-sm text-text-sec text-center py-8">{t('exercise.plans.noPlans')}</p>
      )}

      <div className="flex flex-col gap-3">
        {filtered.map(plan => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onEdit={() => openEdit(plan)}
            onDuplicate={() => handleDuplicate(plan)}
            onDelete={() => setDeleteTarget(plan)}
            t={t}
          />
        ))}
      </div>

      {/* Editor modal */}
      <Modal
        isOpen={editorOpen}
        onClose={() => { setEditorOpen(false); setEditPlan(null); }}
        title={editPlan ? t('exercise.plans.editPlan') : t('exercise.plans.newPlan')}
        width="max-w-2xl"
      >
        <WorkoutPlanEditor
          plan={editPlan}
          exTypes={exTypes}
          onSave={handleSave}
          onCancel={() => { setEditorOpen(false); setEditPlan(null); }}
        />
      </Modal>

      {/* Delete confirm */}
      {deleteTarget && (
        <ConfirmDialog
          message={t('exercise.plans.deleteConfirm')}
          confirmLabel="Delete"
          dangerous
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

// ─── PlanCard defined at module level ────────────────────────────────────────

interface PlanCardProps {
  plan: WorkoutPlan;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  t: ReturnType<typeof useT>['t'];
}

function PlanCard({ plan, onEdit, onDuplicate, onDelete, t }: PlanCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-text">{plan.name}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
            {t('exercise.plans.exercises_count').replace('{n}', String(plan.exercise_count))}
          </span>
        </div>
        {plan.description && (
          <p className="text-xs text-text-sec truncate">{plan.description}</p>
        )}
        <p className="text-xs text-text-sec/60 mt-1">{plan.updated_at}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onEdit}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-border text-text-sec hover:border-accent hover:text-accent cursor-pointer transition-colors"
        >
          {t('common.edit')}
        </button>
        <button
          onClick={onDuplicate}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-border text-text-sec hover:border-accent hover:text-accent cursor-pointer transition-colors"
        >
          {t('exercise.plans.duplicate')}
        </button>
        <button
          onClick={onDelete}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-border text-text-sec hover:border-red/50 hover:text-red cursor-pointer transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
