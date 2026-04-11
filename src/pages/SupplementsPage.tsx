import { useEffect, useState } from 'react';
import { useT } from '../i18n/useT';
import { useToast } from '../components/Toast';
import { api } from '../api';
import type { Supplement } from '../types';

export default function SupplementsPage() {
  const { t } = useT();
  const { showToast } = useToast();

  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState(1);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editQty, setEditQty] = useState(1);

  const load = async () => {
    const data = await api.supplements.getAll();
    setSupplements(data);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await api.supplements.add({ name: newName.trim(), qty: newQty });
    setNewName('');
    setNewQty(1);
    await load();
    showToast(t('common.saved'));
  };

  const handleDelete = async (id: number) => {
    await api.supplements.delete(id);
    await load();
  };

  const startEdit = (s: Supplement) => {
    setEditId(s.id);
    setEditName(s.name);
    setEditQty(s.qty);
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditName('');
    setEditQty(1);
  };

  const handleSave = async () => {
    if (editId === null || !editName.trim()) return;
    await api.supplements.update({ id: editId, name: editName.trim(), qty: editQty });
    cancelEdit();
    await load();
    showToast(t('common.saved'));
  };

  const numCls = "bg-bg border border-border rounded-lg px-3 py-2 text-text focus:outline-none focus:border-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-text mb-6">{t('suppl.title')}</h1>

      {/* Add form */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <h2 className="text-base font-semibold text-text mb-3">{t('suppl.addTitle')}</h2>
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs text-text-sec mb-1">{t('suppl.name')}</label>
            <input
              type="text"
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-text placeholder:text-text-sec focus:outline-none focus:border-accent text-sm"
              placeholder={t('suppl.namePlaceholder')}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <div className="w-24">
            <label className="block text-xs text-text-sec mb-1">{t('suppl.qty')}</label>
            <input
              type="number"
              className={`w-full text-sm ${numCls}`}
              value={newQty}
              min={1}
              onChange={e => setNewQty(Number(e.target.value))}
            />
          </div>
          <button
            className="bg-accent text-white font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity text-sm cursor-pointer"
            onClick={handleAdd}
          >
            {t('common.add')}
          </button>
        </div>
      </div>

      {/* List */}
      {supplements.length === 0 ? (
        <p className="text-text-sec text-center py-8">{t('suppl.noSupplements')}</p>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-text-sec text-xs font-medium uppercase tracking-wider px-4 py-3">{t('suppl.name')}</th>
                <th className="text-left text-text-sec text-xs font-medium uppercase tracking-wider px-4 py-3 w-24">{t('suppl.qty')}</th>
                <th className="px-4 py-3 w-28" />
              </tr>
            </thead>
            <tbody>
              {supplements.map((s) => (
                <tr key={s.id} className="border-t border-border/50">
                  {editId === s.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          className="w-full bg-bg border border-border rounded px-2 py-1 text-text text-sm focus:outline-none focus:border-accent"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          className={`w-16 text-sm ${numCls}`}
                          value={editQty}
                          min={1}
                          onChange={e => setEditQty(Number(e.target.value))}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2 justify-end">
                          <button className="text-sm text-accent font-medium hover:opacity-80 cursor-pointer" onClick={handleSave}>{t('common.save')}</button>
                          <button className="text-sm text-text-sec hover:text-text cursor-pointer" onClick={cancelEdit}>{t('common.cancel')}</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-text">{s.name}</td>
                      <td className="px-4 py-3 text-text">{s.qty}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          <button className="text-sm text-text-sec hover:text-text cursor-pointer" onClick={() => startEdit(s)}>{t('common.edit')}</button>
                          <button className="text-sm text-text-sec hover:text-red cursor-pointer transition-colors" onClick={() => handleDelete(s.id)}>✕</button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
