import { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import Modal from './Modal';
import ConfirmDialog from './ConfirmDialog';
import ExerciseDetailModal from './ExerciseDetailModal';
import { useT } from '../i18n/useT';
import { useToast } from './Toast';
import type { ExerciseType, Equipment } from '../types';
import { MUSCLE_GROUPS, EXERCISE_CATEGORIES } from '../types';

interface FormState {
  name: string;
  category: string;
  met_value: string;
  muscle_groups: string[];
  equipment: string[];
  instructions: string;
}

function emptyForm(): FormState {
  return { name: '', category: 'strength', met_value: '5.0', muscle_groups: [], equipment: [], instructions: '' };
}

function typeToForm(t: ExerciseType): FormState {
  return {
    name: t.name,
    category: t.category,
    met_value: String(t.met_value),
    muscle_groups: t.muscle_groups ? t.muscle_groups.split(',').filter(Boolean) : [],
    equipment: t.equipment ? t.equipment.split(',').filter(Boolean) : [],
    instructions: t.instructions ?? '',
  };
}

function toggleItem(arr: string[], item: string): string[] {
  return arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
}

const CATEGORY_COLORS: Record<string, string> = {
  cardio:      'bg-blue-500/15 text-blue-400',
  strength:    'bg-orange-500/15 text-orange-400',
  flexibility: 'bg-green-500/15 text-green-400',
  other:       'bg-text-sec/15 text-text-sec',
};

export default function ExerciseLibrary() {
  const { t } = useT();
  const { showToast } = useToast();

  const [types, setTypes]             = useState<ExerciseType[]>([]);
  const [equipment, setEquipment]     = useState<Equipment[]>([]);
  const [query, setQuery]             = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [muscleFilter, setMuscleFilter]     = useState('');
  const [equipFilter, setEquipFilter]       = useState('');
  const [expandedId, setExpandedId]         = useState<number | null>(null);
  const [detailTarget, setDetailTarget]     = useState<ExerciseType | null>(null);

  const [modalOpen, setModalOpen]       = useState(false);
  const [editTarget, setEditTarget]     = useState<ExerciseType | null>(null);
  const [form, setForm]                 = useState<FormState>(emptyForm());

  const [deleteTarget, setDeleteTarget] = useState<ExerciseType | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const [rows, equip] = await Promise.all([api.exercises.getTypes(), api.exercises.getEquipment()]);
    setTypes(rows);
    setEquipment(equip);
  }

  function openAdd() {
    setEditTarget(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(ex: ExerciseType) {
    setEditTarget(ex);
    setForm(typeToForm(ex));
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditTarget(null);
    setForm(emptyForm());
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    const data = {
      name: form.name.trim(),
      met_value: parseFloat(form.met_value) || 5.0,
      category: form.category,
      muscle_groups: form.muscle_groups.join(','),
      equipment: form.equipment.join(','),
      instructions: form.instructions.trim() || undefined,
    };
    if (editTarget) {
      await api.exercises.updateType({ id: editTarget.id, ...data });
      showToast(t('common.saved'));
    } else {
      await api.exercises.addType(data);
      showToast(t('common.saved'));
    }
    closeModal();
    load();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await api.exercises.deleteType(deleteTarget.id);
    setDeleteTarget(null);
    if (!result.ok) {
      const msg = result.reason === 'in_use'
        ? t('exercise.library.inUse')
        : t('exercise.library.cannotDelete');
      showToast(msg, 'error');
      return;
    }
    showToast('Deleted');
    load();
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return types.filter(ex => {
      if (q && !ex.name.toLowerCase().includes(q)) return false;
      if (categoryFilter && ex.category !== categoryFilter) return false;
      if (muscleFilter && !ex.muscle_groups.includes(muscleFilter)) return false;
      if (equipFilter && !ex.equipment.toLowerCase().includes(equipFilter.toLowerCase())) return false;
      return true;
    });
  }, [types, query, categoryFilter, muscleFilter, equipFilter]);

  const byCategory = useMemo(() => {
    const groups: Record<string, ExerciseType[]> = {};
    for (const ex of filtered) {
      (groups[ex.category] ??= []).push(ex);
    }
    return groups;
  }, [filtered]);

  const categoryOrder = ['cardio', 'strength', 'flexibility', 'other'];

  return (
    <div className="flex flex-col gap-4 min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap shrink-0">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('exercise.library.search')}
          className="bg-bg border border-border rounded-lg px-3 py-2 text-text text-sm outline-none focus:border-accent flex-1 min-w-40"
        />
        <button
          onClick={openAdd}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 cursor-pointer whitespace-nowrap"
        >
          {t('exercise.library.addExercise')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap shrink-0">
        {/* Category pills */}
        <button
          onClick={() => setCategoryFilter('')}
          className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
            categoryFilter === '' ? 'bg-accent text-white' : 'bg-card border border-border text-text-sec hover:border-accent'
          }`}
        >
          {t('exercise.library.filterAll')}
        </button>
        {EXERCISE_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(categoryFilter === cat ? '' : cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
              categoryFilter === cat ? 'bg-accent text-white' : 'bg-card border border-border text-text-sec hover:border-accent'
            }`}
          >
            {t(`category.${cat}` as Parameters<typeof t>[0])}
          </button>
        ))}

        {/* Muscle group dropdown */}
        <select
          value={muscleFilter}
          onChange={e => setMuscleFilter(e.target.value)}
          className="text-xs bg-card border border-border rounded-lg px-2 py-1 text-text-sec focus:outline-none focus:border-accent cursor-pointer"
        >
          <option value="">{t('exercise.library.filterMuscle')}</option>
          {MUSCLE_GROUPS.map(m => (
            <option key={m} value={m}>{t(`muscle.${m}` as Parameters<typeof t>[0])}</option>
          ))}
        </select>

        {/* Equipment dropdown (dynamic) */}
        <select
          value={equipFilter}
          onChange={e => setEquipFilter(e.target.value)}
          className="text-xs bg-card border border-border rounded-lg px-2 py-1 text-text-sec focus:outline-none focus:border-accent cursor-pointer"
        >
          <option value="">{t('exercise.library.filterEquip')}</option>
          {equipment.map(eq => (
            <option key={eq.id} value={eq.name}>{eq.name}</option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <div className="text-xs text-text-sec shrink-0">
        {filtered.length} exercise{filtered.length !== 1 ? 's' : ''}
      </div>

      {/* Exercise list */}
      <div className="flex flex-col gap-6 overflow-y-auto flex-1 pb-4">
        {filtered.length === 0 && (
          <p className="text-text-sec text-sm text-center py-8">{t('exercise.library.noResults')}</p>
        )}

        {categoryOrder.filter(cat => byCategory[cat]?.length > 0).map(cat => (
          <div key={cat} className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold text-text-sec uppercase tracking-wider">
              {t(`category.${cat}` as Parameters<typeof t>[0])}
            </h3>
            <div className="flex flex-col gap-1">
              {byCategory[cat].map(ex => (
                <ExerciseTypeRow
                  key={ex.id}
                  ex={ex}
                  expanded={expandedId === ex.id}
                  onToggleExpand={() => setExpandedId(expandedId === ex.id ? null : ex.id)}
                  onOpenDetail={() => setDetailTarget(ex)}
                  onEdit={() => openEdit(ex)}
                  onDelete={() => setDeleteTarget(ex)}
                  categoryColors={CATEGORY_COLORS}
                  t={t}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={editTarget ? t('exercise.library.editExercise') : t('exercise.library.addExercise')} width="max-w-2xl">
        <ExerciseForm form={form} setForm={setForm} onSave={handleSave} onCancel={closeModal} t={t} equipment={equipment} />
      </Modal>

      {/* Detail modal */}
      {detailTarget && (
        <ExerciseDetailModal
          exercise={detailTarget}
          onClose={() => setDetailTarget(null)}
          onEdit={() => { const ex = detailTarget; setDetailTarget(null); openEdit(ex); }}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <ConfirmDialog
          message={t('exercise.library.deleteConfirm')}
          confirmLabel="Delete"
          cancelLabel={t('exercise.library.cancel')}
          dangerous
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

// ─── Sub-components defined at module level ────────────────────────────────

type TFn = ReturnType<typeof useT>['t'];

interface RowProps {
  ex: ExerciseType;
  expanded: boolean;
  onToggleExpand: () => void;
  onOpenDetail: () => void;
  onEdit: () => void;
  onDelete: () => void;
  categoryColors: Record<string, string>;
  t: TFn;
}

function ExerciseTypeRow({ ex, expanded, onToggleExpand, onOpenDetail, onEdit, onDelete, categoryColors, t }: RowProps) {
  const muscles = ex.muscle_groups ? ex.muscle_groups.split(',').filter(Boolean) : [];
  const equips  = ex.equipment ? ex.equipment.split(',').filter(Boolean) : [];

  return (
    <div className="bg-card border border-border rounded-xl p-3 flex flex-col gap-2">
      <div className="flex items-start gap-3">
        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={onOpenDetail} className="text-sm font-medium text-text hover:text-accent cursor-pointer transition-colors text-left">{ex.name}</button>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[ex.category] ?? categoryColors.other}`}>
              {t(`category.${ex.category}` as Parameters<typeof t>[0])}
            </span>
            {!!ex.is_custom && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                {t('exercise.library.customBadge')}
              </span>
            )}
          </div>
          {muscles.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {muscles.map(m => (
                <span key={m} className="text-xs px-1.5 py-0.5 rounded bg-bg border border-border text-text-sec">
                  {t(`muscle.${m}` as Parameters<typeof t>[0])}
                </span>
              ))}
            </div>
          )}
          {equips.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {equips.map(eq => (
                <span key={eq} className="text-xs px-1.5 py-0.5 rounded bg-bg text-text-sec italic">
                  {t(`equip.${eq}` as Parameters<typeof t>[0])}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-text-sec tabular-nums mr-1">MET {ex.met_value}</span>
          {ex.instructions && (
            <button
              onClick={onToggleExpand}
              className="text-xs text-text-sec hover:text-text px-1.5 py-1 rounded cursor-pointer transition-colors"
              title="View instructions"
            >
              {expanded ? '▲' : '▼'}
            </button>
          )}
          <button
            onClick={onEdit}
            className="text-xs text-text-sec hover:text-text px-2 py-1 rounded border border-transparent hover:border-border cursor-pointer transition-colors"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="text-xs text-text-sec hover:text-red px-2 py-1 rounded border border-transparent hover:border-red/30 cursor-pointer transition-colors"
            title="Delete"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Instructions expand */}
      {expanded && ex.instructions && (
        <div className="text-xs text-text-sec border-t border-border pt-2 whitespace-pre-wrap leading-relaxed">
          {ex.instructions}
        </div>
      )}
    </div>
  );
}

interface FormProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onSave: () => void;
  onCancel: () => void;
  t: TFn;
  equipment: Equipment[];
}

function ExerciseForm({ form, setForm, onSave, onCancel, t, equipment }: FormProps) {
  const inputCls = 'rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent w-full';

  function patch(partial: Partial<FormState>) {
    setForm(f => ({ ...f, ...partial }));
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Name + Category */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-sec font-medium">{t('exercise.library.name')}</label>
          <input
            type="text"
            value={form.name}
            onChange={e => patch({ name: e.target.value })}
            placeholder="e.g. Bulgarian Split Squat"
            className={inputCls}
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-sec font-medium">{t('exercise.library.category')}</label>
          <select value={form.category} onChange={e => patch({ category: e.target.value })} className={inputCls}>
            {EXERCISE_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{t(`category.${cat}` as Parameters<typeof t>[0])}</option>
            ))}
          </select>
        </div>
      </div>

      {/* MET value */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-text-sec font-medium">{t('exercise.library.met')} <span className="font-normal">(metabolic equivalent — used to estimate calories burned)</span></label>
        <input
          type="text"
          inputMode="decimal"
          value={form.met_value}
          onChange={e => patch({ met_value: e.target.value })}
          className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent w-32"
        />
      </div>

      {/* Muscle groups */}
      <div className="flex flex-col gap-2">
        <label className="text-xs text-text-sec font-medium">{t('exercise.library.muscleGroups')}</label>
        <div className="flex flex-wrap gap-1.5">
          {MUSCLE_GROUPS.map(m => (
            <button
              key={m}
              type="button"
              onClick={() => patch({ muscle_groups: toggleItem(form.muscle_groups, m) })}
              className={`px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                form.muscle_groups.includes(m)
                  ? 'bg-accent text-white'
                  : 'bg-bg border border-border text-text-sec hover:border-accent'
              }`}
            >
              {t(`muscle.${m}` as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>
      </div>

      {/* Equipment */}
      <div className="flex flex-col gap-2">
        <label className="text-xs text-text-sec font-medium">{t('exercise.library.equipment')}</label>
        <div className="flex flex-wrap gap-1.5">
          {equipment.map(eq => (
            <button
              key={eq.id}
              type="button"
              onClick={() => patch({ equipment: toggleItem(form.equipment, eq.name) })}
              className={`px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                form.equipment.includes(eq.name)
                  ? 'bg-accent text-white'
                  : 'bg-bg border border-border text-text-sec hover:border-accent'
              }`}
            >
              {eq.name}
            </button>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-text-sec font-medium">{t('exercise.library.instructions')}</label>
        <textarea
          value={form.instructions}
          onChange={e => patch({ instructions: e.target.value })}
          placeholder={t('exercise.library.instructionsHint')}
          rows={4}
          className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent w-full resize-y"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end border-t border-border pt-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl text-sm text-text-sec border border-border hover:bg-card-hover cursor-pointer"
        >
          {t('exercise.library.cancel')}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!form.name.trim()}
          className="px-4 py-2 rounded-xl bg-accent text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 cursor-pointer"
        >
          {t('exercise.library.save')}
        </button>
      </div>
    </div>
  );
}
