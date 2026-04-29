import { useEffect, useState, useRef } from 'react';
import { api } from '../api';
import { useT } from '../i18n/useT';
import Modal from './Modal';
import type { Food, BarcodeResult } from '../types';
import type { Candidate } from './FoodMatchModal';

const RATE_LIMIT_MS = 1000; // ~1 OFF request per second

// ── Refill nutrition ─────────────────────────────────────────────────────────
// Walks foods with barcode → calls barcode:lookup → fills missing
// sugar/sat-fat/sodium (and macros if `refreshMacros`).

interface RefillProps {
  isOpen: boolean;
  onClose: () => void;
  onDone: (summary: { updated: number; skipped: number; failed: number }) => void;
  refreshMacros: boolean;
}

export function BulkRefillModal({ isOpen, onClose, onDone, refreshMacros }: RefillProps) {
  const { t } = useT();
  const [progress, setProgress] = useState({ index: 0, total: 0, currentName: '' });
  const [tally, setTally] = useState({ updated: 0, skipped: 0, failed: 0 });
  const cancelRef = useRef(false);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    cancelRef.current = false;
    doneRef.current = false;
    let updated = 0, skipped = 0, failed = 0;
    (async () => {
      const all = await api.foods.getAll();
      const targets = all.filter(f => f.barcode && f.barcode.trim().length > 0);
      setProgress({ index: 0, total: targets.length, currentName: '' });
      for (let i = 0; i < targets.length; i++) {
        if (cancelRef.current) break;
        const f = targets[i];
        setProgress({ index: i + 1, total: targets.length, currentName: f.name });
        try {
          const r = await api.barcode.lookup(f.barcode!);
          if (!r) { failed++; setTally({ updated, skipped, failed }); }
          else {
            const next: Food = { ...f };
            let changed = false;
            if (f.sugar == null && r.sugar != null) { next.sugar = r.sugar; changed = true; }
            if (f.saturated_fat == null && r.saturated_fat != null) { next.saturated_fat = r.saturated_fat; changed = true; }
            if (f.sodium_mg == null && r.sodium_mg != null) { next.sodium_mg = r.sodium_mg; changed = true; }
            if (refreshMacros) {
              if (r.calories) { next.calories = r.calories; changed = true; }
              if (r.protein != null)  { next.protein = r.protein; changed = true; }
              if (r.carbs != null)    { next.carbs = r.carbs; changed = true; }
              if (r.fat != null)      { next.fat = r.fat; changed = true; }
              if (r.fiber != null)    { next.fiber = r.fiber; changed = true; }
              if (r.sugar != null)         { next.sugar = r.sugar; changed = true; }
              if (r.saturated_fat != null) { next.saturated_fat = r.saturated_fat; changed = true; }
              if (r.sodium_mg != null)     { next.sodium_mg = r.sodium_mg; changed = true; }
            }
            if (changed) { await api.foods.update(next); updated++; }
            else skipped++;
            setTally({ updated, skipped, failed });
          }
        } catch { failed++; setTally({ updated, skipped, failed }); }
        if (i < targets.length - 1 && !cancelRef.current) {
          await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
        }
      }
      if (!doneRef.current) {
        doneRef.current = true;
        onDone({ updated, skipped, failed });
      }
    })();
    return () => { cancelRef.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={() => { cancelRef.current = true; onClose(); }} title={t('data.refillNutrition')}>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-text-sec tabular-nums">
          {progress.index} / {progress.total}
        </p>
        <p className="text-sm text-text truncate">{progress.currentName || '…'}</p>
        <div className="text-xs text-text-sec tabular-nums flex gap-3">
          <span>✓ {tally.updated}</span>
          <span>· {tally.skipped} {t('data.skipped')}</span>
          <span>· {tally.failed} {t('data.failed')}</span>
        </div>
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={() => { cancelRef.current = true; onClose(); }}
            className="px-4 py-2 rounded-lg border border-border text-text-sec text-sm hover:border-accent/50 hover:text-text cursor-pointer"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Match foods to OFF (queue with optional auto-accept) ─────────────────────

interface MatchProps {
  isOpen: boolean;
  onClose: () => void;
  onDone: (summary: { auto: number; manual: number; skipped: number; none: number }) => void;
}

interface QueueItem {
  food: Food;
  candidates: Candidate[];
  autoApplied?: boolean;
}

function fmtDelta(d: number): string {
  if (Math.abs(d) < 0.05) return '0';
  return `${d > 0 ? '+' : ''}${Math.round(d * 10) / 10}`;
}

function deltaCls(d: number): string {
  return Math.abs(d) < 0.5 ? 'text-text-sec/60' : 'text-yellow';
}

export function BulkMatchModal({ isOpen, onClose, onDone }: MatchProps) {
  const { t } = useT();
  const [autoAccept, setAutoAccept] = useState(true);
  const [stage, setStage] = useState<'loading' | 'review' | 'done'>('loading');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [cursor, setCursor] = useState(0);
  const [tally, setTally] = useState({ auto: 0, manual: 0, skipped: 0, none: 0 });
  const cancelRef = useRef(false);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    cancelRef.current = false;
    doneRef.current = false;
    setStage('loading');
    setTally({ auto: 0, manual: 0, skipped: 0, none: 0 });
    setQueue([]);
    setCursor(0);
    (async () => {
      const all = await api.foods.getAll();
      const targets = all.filter(f => !f.barcode || !f.barcode.trim());
      const q: QueueItem[] = [];
      let auto = 0, none = 0;
      for (let i = 0; i < targets.length; i++) {
        if (cancelRef.current) break;
        const f = targets[i];
        let cands: Candidate[] = [];
        try {
          cands = await api.openfoodfacts.findCandidates({
            name: f.name,
            calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat,
            nameMin: 0.4, macroPct: 0.05, requireKcalConsistent: true,
          });
        } catch { /* network error: same as no candidates */ }
        if (cands.length === 0) { none++; }
        else if (autoAccept && cands.length === 1) {
          // Single confident match — auto-apply.
          const c = cands[0];
          await api.foods.update({
            ...f,
            barcode: c.barcode || f.barcode,
            sugar: f.sugar ?? c.sugar ?? null,
            saturated_fat: f.saturated_fat ?? c.saturated_fat ?? null,
            sodium_mg: f.sodium_mg ?? c.sodium_mg ?? null,
          });
          auto++;
          q.push({ food: f, candidates: cands, autoApplied: true });
        } else {
          q.push({ food: f, candidates: cands });
        }
        setTally(prev => ({ ...prev, auto, none }));
        if (i < targets.length - 1 && !cancelRef.current) {
          await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
        }
      }
      if (cancelRef.current) return;
      // Filter the queue down to items that need review.
      const review = q.filter(x => !x.autoApplied);
      setQueue(review);
      setCursor(0);
      setStage(review.length > 0 ? 'review' : 'done');
      if (review.length === 0 && !doneRef.current) {
        doneRef.current = true;
        onDone({ auto, manual: 0, skipped: 0, none });
      }
    })();
    return () => { cancelRef.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  function nextItem(deltaTally: Partial<typeof tally>) {
    const newTally = { ...tally, ...Object.fromEntries(Object.entries(deltaTally).map(([k, v]) => [k, (tally as Record<string, number>)[k] + (v as number)])) } as typeof tally;
    setTally(newTally);
    if (cursor + 1 >= queue.length) {
      setStage('done');
      if (!doneRef.current) {
        doneRef.current = true;
        onDone(newTally);
      }
    } else {
      setCursor(cursor + 1);
    }
  }

  async function applyCurrent(c: Candidate) {
    const f = queue[cursor].food;
    await api.foods.update({
      ...f,
      barcode: c.barcode || f.barcode,
      sugar: f.sugar ?? c.sugar ?? null,
      saturated_fat: f.saturated_fat ?? c.saturated_fat ?? null,
      sodium_mg: f.sodium_mg ?? c.sodium_mg ?? null,
    });
    nextItem({ manual: 1 });
  }

  function skipCurrent() {
    nextItem({ skipped: 1 });
  }

  if (!isOpen) return null;

  if (stage === 'loading') {
    return (
      <Modal isOpen onClose={() => { cancelRef.current = true; onClose(); }} title={t('data.matchBarcodes')}>
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2 text-sm text-text-sec cursor-pointer">
            <input type="checkbox" checked={autoAccept} onChange={e => setAutoAccept(e.target.checked)} />
            {t('data.autoAccept')}
          </label>
          <p className="text-sm text-text-sec">{t('data.scanning')}…</p>
          <p className="text-xs text-text-sec tabular-nums">
            {tally.auto} {t('data.autoMatched')} · {tally.none} {t('data.noCandidates')}
          </p>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => { cancelRef.current = true; onClose(); }}
              className="px-4 py-2 rounded-lg border border-border text-text-sec text-sm hover:border-accent/50 hover:text-text cursor-pointer"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  if (stage === 'done') {
    return (
      <Modal isOpen onClose={onClose} title={t('data.matchBarcodes')}>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-text">{t('common.done') || 'Done'}.</p>
          <div className="text-xs text-text-sec tabular-nums">
            <p>✓ {tally.auto} {t('data.autoMatched')}</p>
            <p>✓ {tally.manual} {t('data.manuallyMatched')}</p>
            <p>↷ {tally.skipped} {t('data.skipped')}</p>
            <p>— {tally.none} {t('data.noCandidates')}</p>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 cursor-pointer"
            >
              {t('common.close') || 'Close'}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // Review stage
  const item = queue[cursor];
  const f = item.food;
  return (
    <Modal isOpen onClose={onClose} title={t('data.matchBarcodes')} width="max-w-2xl">
      <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
        <div className="flex items-baseline justify-between">
          <p className="text-xs text-text-sec tabular-nums">{cursor + 1} / {queue.length}</p>
          <p className="text-xs text-text-sec tabular-nums">
            ✓ {tally.manual} · ↷ {tally.skipped}
          </p>
        </div>
        <div className="bg-bg border border-border rounded-lg p-3">
          <p className="text-sm text-text font-semibold">{f.name}</p>
          <p className="text-xs text-text-sec tabular-nums">
            {f.calories} kcal · F {f.fat}g · C {f.carbs}g · P {f.protein}g
          </p>
        </div>
        {item.candidates.length === 0 ? (
          <p className="text-sm text-text-sec text-center py-6">{t('foods.noOffMatch')}</p>
        ) : item.candidates.map((c, i) => (
          <div key={`${c.barcode || ''}-${i}`} className="border border-border rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-sm text-text font-semibold truncate">{c.name}</span>
              {c.brand && <span className="text-xs text-text-sec/80">· {c.brand}</span>}
              {c.barcode && <span className="text-[10px] text-text-sec/60 tabular-nums">#{c.barcode}</span>}
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent tabular-nums">
                {Math.round(c.nameScore * 100)}%
              </span>
            </div>
            <div className="text-xs text-text-sec tabular-nums">
              <span className="text-text">{c.calories}</span> kcal
              <span className={`mx-1 ${deltaCls(c.macroDeltas.calories)}`}>({fmtDelta(c.macroDeltas.calories)})</span>
              · F <span className="text-text">{c.fat}g</span>
              <span className={`mx-1 ${deltaCls(c.macroDeltas.fat)}`}>({fmtDelta(c.macroDeltas.fat)})</span>
              · C <span className="text-text">{c.carbs}g</span>
              <span className={`mx-1 ${deltaCls(c.macroDeltas.carbs)}`}>({fmtDelta(c.macroDeltas.carbs)})</span>
              · P <span className="text-text">{c.protein}g</span>
              <span className={`mx-1 ${deltaCls(c.macroDeltas.protein)}`}>({fmtDelta(c.macroDeltas.protein)})</span>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => applyCurrent(c)}
                className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:opacity-90 cursor-pointer"
              >
                {t('foods.useMatch')}
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 pt-3 border-t border-border mt-3">
        <button
          type="button"
          onClick={skipCurrent}
          className="px-4 py-2 rounded-lg border border-border text-text-sec text-sm hover:border-accent/50 hover:text-text cursor-pointer"
        >
          {t('data.skip') || 'Skip'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg border border-border text-text-sec text-sm hover:border-accent/50 hover:text-text cursor-pointer"
        >
          {t('common.cancel')}
        </button>
      </div>
    </Modal>
  );
}

// Re-export for callers that need only the candidate type
export type { BarcodeResult };
