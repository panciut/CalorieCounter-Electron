import { useState } from 'react';
import Modal from './Modal';
import { useT } from '../i18n/useT';
import type { WorkoutPlan } from '../types';

interface Props {
  plans: WorkoutPlan[];
  onSelect: (plan: WorkoutPlan) => void;
  onClose: () => void;
}

export default function PlanPickerModal({ plans, onSelect, onClose }: Props) {
  const { t } = useT();
  const [search, setSearch] = useState('');

  const filtered = plans.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Modal isOpen onClose={onClose} title={t('exercise.plans.pickPlan')} width="max-w-md">
      <div className="flex flex-col gap-3 p-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('exercise.plans.searchPlans')}
          autoFocus
          className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent"
        />
        <div className="flex flex-col gap-1 max-h-72 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="text-sm text-text-sec text-center py-4">{t('exercise.plans.noResults')}</p>
          )}
          {filtered.map(plan => (
            <button
              key={plan.id}
              onClick={() => onSelect(plan)}
              className="text-left px-3 py-2.5 rounded-lg hover:bg-card-hover cursor-pointer transition-colors"
            >
              <div className="text-sm font-medium text-text">{plan.name}</div>
              {plan.description && <div className="text-xs text-text-sec truncate">{plan.description}</div>}
              <div className="text-xs text-text-sec">{t('exercise.plans.exercises_count').replace('{n}', String(plan.exercise_count))}</div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
