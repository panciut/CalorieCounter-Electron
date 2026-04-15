import { useEffect, useState } from 'react';
import { useT } from '../i18n/useT';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { api } from '../api';
import type { Supplement, SupplementAdherence } from '../types';

type Tab = 'manage' | 'history';
type HistoryRange = 7 | 30 | 90;

// ── Edit form (module-level to avoid remount) ──────────────────────────────────
interface EditFormProps {
  supplement: Supplement;
  onSave: (data: { name: string; qty: number; unit: string; notes: string }) => void;
  onCancel: () => void;
  t: (key: string) => string;
}

function EditForm({ supplement, onSave, onCancel, t }: EditFormProps) {
  const [name, setName]   = useState(supplement.name);
  const [qty, setQty]     = useState(supplement.qty);
  const [unit, setUnit]   = useState(supplement.unit || '');
  const [notes, setNotes] = useState(supplement.notes || '');

  const inputCls = "bg-bg border border-border rounded-lg px-3 py-1.5 text-sm text-text focus:outline-none focus:border-accent";

  return (
    <div className="flex flex-col gap-2 py-2 px-1">
      <div className="flex gap-2 flex-wrap">
        <input
          type="text"
          autoFocus
          className={`flex-1 min-w-[140px] ${inputCls}`}
          placeholder={t('suppl.name')}
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <input
          type="text" inputMode="decimal"
          className={`w-16 ${inputCls}`}
          placeholder={t('suppl.qty')}
          value={qty}
          onChange={e => setQty(Number(e.target.value))}
        />
        <input
          type="text"
          className={`w-28 ${inputCls}`}
          placeholder={t('suppl.unitPlaceholder')}
          value={unit}
          onChange={e => setUnit(e.target.value)}
        />
      </div>
      <input
        type="text"
        className={`w-full ${inputCls}`}
        placeholder={t('suppl.notes')}
        value={notes}
        onChange={e => setNotes(e.target.value)}
      />
      <div className="flex gap-2">
        <button
          className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 cursor-pointer"
          onClick={() => onSave({ name: name.trim(), qty: qty || 1, unit: unit.trim(), notes: notes.trim() })}
          disabled={!name.trim()}
        >
          {t('common.save')}
        </button>
        <button
          className="px-3 py-1.5 rounded-lg border border-border text-sm text-text-sec hover:text-text cursor-pointer"
          onClick={onCancel}
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}

// ── Adherence bar ──────────────────────────────────────────────────────────────
function AdherenceBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? 'var(--green, #4ade80)' : pct >= 50 ? 'var(--yellow, #facc15)' : 'var(--red, #f87171)';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs tabular-nums text-text-sec w-9 text-right">{pct}%</span>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function SupplementsPage() {
  const { t } = useT();
  const { showToast } = useToast();

  const [tab, setTab]             = useState<Tab>('manage');
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [editId, setEditId]       = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplement | null>(null);
  const [addOpen, setAddOpen]     = useState(true);

  // History tab
  const [range, setRange]         = useState<HistoryRange>(30);
  const [adherence, setAdherence] = useState<SupplementAdherence[]>([]);
  const [histLoading, setHistLoading] = useState(false);

  async function load() {
    const data = await api.supplements.getAll();
    setSupplements(data);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (tab !== 'history') return;
    setHistLoading(true);
    api.supplements.getAdherence(range).then(data => {
      setAdherence(data);
      setHistLoading(false);
    });
  }, [tab, range]);

  async function handleAdd(data: { name: string; qty: number; unit: string; notes: string }) {
    if (!data.name) return;
    await api.supplements.add(data);
    await load();
    showToast(t('common.saved'));
  }

  async function handleUpdate(data: { name: string; qty: number; unit: string; notes: string }) {
    if (editId === null || !data.name) return;
    await api.supplements.update({ id: editId, ...data });
    setEditId(null);
    await load();
    showToast(t('common.saved'));
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await api.supplements.delete(deleteTarget.id);
    setDeleteTarget(null);
    await load();
  }

  const tabBtn = (v: Tab) => [
    'px-5 py-2.5 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px',
    tab === v ? 'border-accent text-accent' : 'border-transparent text-text-sec hover:text-text',
  ].join(' ');

  const blankSuppl: Supplement = { id: 0, name: '', qty: 1, unit: '', notes: '', created_at: '' };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold text-text">{t('suppl.title')}</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <button className={tabBtn('manage')}  onClick={() => setTab('manage')}>{t('suppl.manage')}</button>
        <button className={tabBtn('history')} onClick={() => setTab('history')}>{t('suppl.history')}</button>
      </div>

      {/* ── MANAGE TAB ─────────────────────────────────────────────────── */}
      {tab === 'manage' && (
          <div className="flex flex-col gap-4">

            {/* Collapsible add form */}
            <div className="border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setAddOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-text hover:bg-card-hover/40 cursor-pointer transition-colors"
              >
                <span>{t('suppl.addTitle')}</span>
                <span className="text-text-sec text-xs">{addOpen ? '▲' : '▼'}</span>
              </button>
              {addOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-border bg-card-hover/20">
                  <EditForm
                    supplement={blankSuppl}
                    onSave={handleAdd}
                    onCancel={() => setAddOpen(false)}
                    t={t}
                  />
                </div>
              )}
            </div>

            {/* Supplement list */}
            {supplements.length === 0 ? (
              <p className="text-text-sec text-sm py-4 text-center">{t('suppl.noSupplements')}</p>
            ) : (
              <div className="flex flex-col divide-y divide-border/50">
                {supplements.map(s => (
                  <div key={s.id} className="py-3">
                    {editId === s.id ? (
                      <EditForm
                        supplement={s}
                        onSave={handleUpdate}
                        onCancel={() => setEditId(null)}
                        t={t}
                      />
                    ) : (
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="font-medium text-text">{s.name}</span>
                            <span className="text-xs text-text-sec">
                              {s.qty}{s.unit ? ` ${s.unit}` : ''} / day
                            </span>
                          </div>
                          {s.notes && (
                            <p className="text-xs text-text-sec mt-0.5 truncate">{s.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => { setEditId(s.id); setAddOpen(false); }}
                            className="text-text-sec hover:text-text px-1.5 py-1 cursor-pointer transition-colors text-sm"
                            title={t('common.edit')}
                          >
                            <span style={{ display: 'inline-block', transform: 'scaleX(-1) rotate(15deg)' }}>✎</span>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(s)}
                            className="text-text-sec hover:text-red px-1.5 py-1 cursor-pointer transition-colors text-sm"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      {/* ── HISTORY TAB ────────────────────────────────────────────────── */}
      {tab === 'history' && (
          <div className="flex flex-col gap-5">
            {/* Range selector */}
            <div className="flex gap-1">
              {([7, 30, 90] as HistoryRange[]).map(d => (
                <button
                  key={d}
                  onClick={() => setRange(d)}
                  className={[
                    'px-3 py-1 rounded-full text-xs font-medium border cursor-pointer transition-colors',
                    range === d
                      ? 'bg-accent text-white border-accent'
                      : 'border-border text-text-sec hover:border-accent/50 hover:text-text',
                  ].join(' ')}
                >
                  {d}d
                </button>
              ))}
            </div>

            {histLoading ? (
              <p className="text-text-sec text-sm py-4 text-center">…</p>
            ) : adherence.length === 0 ? (
              <p className="text-text-sec text-sm py-4 text-center">{t('suppl.noHistory')}</p>
            ) : (
              <div className="flex flex-col gap-4">
                {adherence.map(s => (
                  <div key={s.id} className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium text-text text-sm">{s.name}</span>
                        {s.unit && <span className="text-xs text-text-sec">{s.qty} {s.unit}/day</span>}
                        {!s.unit && <span className="text-xs text-text-sec">{s.qty}/day</span>}
                      </div>
                      <span className="text-xs text-text-sec tabular-nums">{s.daysTaken} / {s.daysExpected} {t('suppl.daysTaken').toLowerCase()}</span>
                    </div>
                    <AdherenceBar pct={s.adherencePct} />
                    {/* Mini log dots — last 30 entries max, newest right */}
                    {s.logs.length > 0 && (
                      <div className="flex gap-0.5 flex-wrap mt-0.5">
                        {[...s.logs].reverse().slice(0, 60).map((log, i) => {
                          const full = log.count >= s.qty;
                          const partial = log.count > 0 && !full;
                          return (
                            <div
                              key={i}
                              title={`${log.date}: ${log.count}/${s.qty}`}
                              className="w-2 h-2 rounded-sm"
                              style={{
                                backgroundColor: full
                                  ? 'var(--accent)'
                                  : partial
                                    ? 'color-mix(in srgb, var(--accent) 40%, transparent)'
                                    : 'var(--border)',
                              }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      {deleteTarget && (
        <ConfirmDialog
          message={`Delete "${deleteTarget.name}"?`}
          confirmLabel={t('common.delete') ?? 'Delete'}
          dangerous
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
