import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api';
import type { DeductionEvent } from '../types';
import { useT } from '../i18n/useT';
import { useToast } from './Toast';

interface Props {
  event: DeductionEvent | null;
  onDone: () => void;
  pushMore: (events: DeductionEvent[]) => void;
  onPantryChanged?: () => void;
}

// Deferred-focus helper (avoids Enter-key carryover from the action that opened the modal)
function useDeferredFocus(ref: React.RefObject<HTMLButtonElement | null>) {
  useEffect(() => {
    const t = setTimeout(() => ref.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [ref]);
}

// ── Sub-modal: "just opened" ──────────────────────────────────────────────────

function OpenedModal({
  event, onDone, onPantryChanged,
}: {
  event: Extract<DeductionEvent, { kind: 'opened' }>;
  onDone: () => void;
  onPantryChanged?: () => void;
}) {
  const { t } = useT();
  const [days, setDays] = useState(event.default_days != null ? String(event.default_days) : '');
  const [saveDefault, setSaveDefault] = useState(false);
  const skipRef = useRef<HTMLButtonElement>(null);
  useDeferredFocus(skipRef);

  async function handleSave() {
    const d = parseInt(days, 10);
    if (!isNaN(d) && d > 0) {
      await api.pantry.setOpenedDays(event.batch_id, d);
      if (saveDefault) {
        await api.foods.update({
          id: event.food_id,
          // patch opened_days — pass minimal required shape; IPC uses named params
          opened_days: d,
        } as any);
      }
    }
    onPantryChanged?.();
    onDone();
  }

  const daysChanged = days !== (event.default_days != null ? String(event.default_days) : '');

  return (
    <div className="space-y-4">
      <p className="text-text text-sm font-semibold">{t('pantry.justOpened').replace('{name}', event.food_name)}</p>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-text-sec">{t('pantry.openedDaysLabel')}</label>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={days}
          onChange={e => { setDays(e.target.value); if (!daysChanged) setSaveDefault(false); }}
          placeholder="days…"
          className="w-28 bg-bg border border-border rounded-lg px-3 py-2 text-text text-sm outline-none focus:border-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          autoFocus
        />
      </div>
      {(daysChanged || event.default_days == null) && days && (
        <label className="flex items-center gap-2 text-xs text-text-sec cursor-pointer">
          <input type="checkbox" checked={saveDefault} onChange={e => setSaveDefault(e.target.checked)} />
          {t('pantry.saveAsDefault')}
        </label>
      )}
      <div className="flex gap-2 justify-end">
        <button
          ref={skipRef}
          onClick={onDone}
          className="px-4 py-2 rounded-xl text-sm font-medium text-text-sec bg-card border border-border hover:bg-card-hover transition-colors cursor-pointer"
        >{t('pantry.skip')}</button>
        <button
          onClick={handleSave}
          disabled={!days || parseInt(days, 10) <= 0}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-accent text-white hover:opacity-85 disabled:opacity-40 transition-colors cursor-pointer"
        >{t('common.save')}</button>
      </div>
    </div>
  );
}

// ── Sub-modal: "residual or new pack" ────────────────────────────────────────

function ResidualModal({
  event, onDone, pushMore, onPantryChanged,
}: {
  event: Extract<DeductionEvent, { kind: 'residual_or_new' }>;
  onDone: () => void;
  pushMore: (events: DeductionEvent[]) => void;
  onPantryChanged?: () => void;
}) {
  const { t } = useT();
  const residualRef = useRef<HTMLButtonElement>(null);
  useDeferredFocus(residualRef);

  async function handleNewPack() {
    const result = await api.pantry.resolveResidual(event.food_id, event.overflow_g, 'new_open', event.pantry_id);
    if (result.events.length > 0) pushMore(result.events);
    onPantryChanged?.();
    onDone();
  }

  return (
    <div className="space-y-4">
      <p className="text-text text-sm font-semibold">{t('pantry.residualTitle')}</p>
      <p className="text-text-sec text-sm">
        {t('pantry.residualMsg')
          .replace('{g}', String(Math.round(event.overflow_g)))
          .replace('{name}', event.food_name)}
      </p>
      <div className="flex gap-2 justify-end">
        <button
          onClick={handleNewPack}
          className="px-4 py-2 rounded-xl text-sm font-medium text-text-sec bg-card border border-border hover:bg-card-hover transition-colors cursor-pointer"
        >{t('pantry.newPack')}</button>
        <button
          ref={residualRef}
          onClick={() => { onPantryChanged?.(); onDone(); }}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-accent text-white hover:opacity-85 transition-colors cursor-pointer"
        >{t('pantry.residuals')}</button>
      </div>
    </div>
  );
}

// ── Sub-modal: "near empty" ───────────────────────────────────────────────────

function NearEmptyModal({
  event, onDone, pushMore, onPantryChanged,
}: {
  event: Extract<DeductionEvent, { kind: 'near_empty' }>;
  onDone: () => void;
  pushMore: (events: DeductionEvent[]) => void;
  onPantryChanged?: () => void;
}) {
  const { t } = useT();
  const keepRef = useRef<HTMLButtonElement>(null);
  useDeferredFocus(keepRef);

  async function handleDiscard() {
    await api.pantry.delete(event.batch_id);
    // Enqueue a 'finished' event so shopping-list prompt fires
    pushMore([{ kind: 'finished', batch_id: event.batch_id, food_id: event.food_id, food_name: event.food_name }]);
    onPantryChanged?.();
    onDone();
  }

  return (
    <div className="space-y-4">
      <p className="text-text text-sm font-semibold">{t('pantry.nearEmptyTitle')}</p>
      <p className="text-text-sec text-sm">
        {t('pantry.nearEmptyMsg')
          .replace('{g}', String(Math.round(event.remaining_g)))
          .replace('{name}', event.food_name)}
      </p>
      <div className="flex gap-2 justify-end">
        <button
          ref={keepRef}
          onClick={() => onDone()}
          className="px-4 py-2 rounded-xl text-sm font-medium text-text-sec bg-card border border-border hover:bg-card-hover transition-colors cursor-pointer"
        >{t('pantry.keep')}</button>
        <button
          onClick={handleDiscard}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-red text-white hover:opacity-85 transition-colors cursor-pointer"
        >{t('pantry.discard')}</button>
      </div>
    </div>
  );
}

// ── Sub-modal: "finished" ─────────────────────────────────────────────────────

function FinishedModal({
  event, onDone, onPantryChanged,
}: {
  event: Extract<DeductionEvent, { kind: 'finished' }>;
  onDone: () => void;
  onPantryChanged?: () => void;
}) {
  const { t } = useT();
  const notNowRef = useRef<HTMLButtonElement>(null);
  useDeferredFocus(notNowRef);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    api.pantry.getAll(event.pantry_id).then(items => {
      setRemaining(items.filter(i => i.food_id === event.food_id).length);
    });
  }, [event.food_id, event.pantry_id]);

  async function handleAdd() {
    await api.shopping.add({ food_id: event.food_id, pantry_id: event.pantry_id });
    onPantryChanged?.();
    onDone();
  }

  return (
    <div className="space-y-4">
      <p className="text-text text-sm font-semibold">
        {t('pantry.finishedTitle').replace('{name}', event.food_name)}
      </p>
      <p className="text-text-sec text-sm">
        {remaining != null
          ? (remaining > 0
              ? t('pantry.finishedMsgRemaining').replace('{n}', String(remaining))
              : t('pantry.finishedMsgNone'))
          : t('pantry.finishedMsg')}
      </p>
      <div className="flex gap-2 justify-end">
        <button
          ref={notNowRef}
          onClick={onDone}
          className="px-4 py-2 rounded-xl text-sm font-medium text-text-sec bg-card border border-border hover:bg-card-hover transition-colors cursor-pointer"
        >{t('pantry.notNow')}</button>
        <button
          onClick={handleAdd}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-accent text-white hover:opacity-85 transition-colors cursor-pointer"
        >{t('pantry.addToList')}</button>
      </div>
    </div>
  );
}

// ── Root modal shell ──────────────────────────────────────────────────────────

export default function DeductionEventModal({ event, onDone, pushMore, onPantryChanged }: Props) {
  const { t } = useT();
  const { showToast } = useToast();

  // Auto-dismiss 'opened' events when the food already has a shelf-life default —
  // show a corner toast instead of interrupting the user with a modal.
  useEffect(() => {
    if (!event || event.kind !== 'opened' || event.default_days == null) return;
    showToast(
      t('pantry.justOpenedDays')
        .replace('{name}', event.food_name)
        .replace('{n}', String(event.default_days)),
      'info',
    );
    onPantryChanged?.();
    onDone();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);

  // Close on Escape
  useEffect(() => {
    if (!event) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onDone();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [event, onDone]);

  // Don't render a modal for auto-dismissed opened events
  if (!event) return null;
  if (event.kind === 'opened' && event.default_days != null) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60">
      <div className="bg-card border border-border rounded-2xl shadow-DEFAULT p-6 w-full max-w-sm mx-4">
        {event.kind === 'opened' && (
          <OpenedModal event={event} onDone={onDone} onPantryChanged={onPantryChanged} />
        )}
        {event.kind === 'residual_or_new' && (
          <ResidualModal event={event} onDone={onDone} pushMore={pushMore} onPantryChanged={onPantryChanged} />
        )}
        {event.kind === 'near_empty' && (
          <NearEmptyModal event={event} onDone={onDone} pushMore={pushMore} onPantryChanged={onPantryChanged} />
        )}
        {event.kind === 'finished' && (
          <FinishedModal event={event} onDone={onDone} onPantryChanged={onPantryChanged} />
        )}
      </div>
    </div>,
    document.body,
  );
}
