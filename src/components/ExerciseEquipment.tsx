import { useState, useEffect } from 'react';
import { api } from '../api';
import ConfirmDialog from './ConfirmDialog';
import { useT } from '../i18n/useT';
import { useToast } from './Toast';
import type { Equipment } from '../types';

export default function ExerciseEquipment() {
  const { t } = useT();
  const { showToast } = useToast();

  const [items, setItems]             = useState<Equipment[]>([]);
  const [newName, setNewName]         = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Equipment | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setItems(await api.exercises.getEquipment());
  }

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    await api.exercises.addEquipment({ name });
    setNewName('');
    showToast(t('common.saved'));
    load();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await api.exercises.deleteEquipment(deleteTarget.id);
    setDeleteTarget(null);
    if (!result.ok) {
      showToast(t('exercise.equipment.cannotDelete'), 'error');
      return;
    }
    showToast('Deleted');
    load();
  }

  const builtIn  = items.filter(i => !i.is_custom);
  const custom   = items.filter(i => i.is_custom);

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <h2 className="text-sm font-semibold text-text-sec uppercase tracking-wider">{t('exercise.equipment.title')}</h2>

      {/* Add new */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder={t('exercise.equipment.placeholder')}
          className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent"
        />
        <button
          onClick={handleAdd}
          disabled={!newName.trim()}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 cursor-pointer"
        >
          {t('exercise.equipment.add')}
        </button>
      </div>

      {/* Custom equipment */}
      {custom.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-xs font-medium text-text-sec uppercase tracking-wider">Custom</div>
          <div className="flex flex-wrap gap-2">
            {custom.map(item => (
              <div key={item.id} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-sm text-text">
                <span>{item.name}</span>
                <button
                  onClick={() => setDeleteTarget(item)}
                  className="ml-1 text-text-sec hover:text-red cursor-pointer text-xs leading-none"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Built-in equipment */}
      <div className="flex flex-col gap-2">
        <div className="text-xs font-medium text-text-sec uppercase tracking-wider">Built-in</div>
        <div className="flex flex-wrap gap-2">
          {builtIn.map(item => (
            <div key={item.id} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-card border border-border text-sm text-text-sec">
              <span>{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      {deleteTarget && (
        <ConfirmDialog
          message={t('exercise.equipment.deleteConfirm')}
          confirmLabel="Delete"
          dangerous
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
