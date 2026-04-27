import { useState, useEffect } from 'react';
import { useT } from '../../i18n/useT';
import { api } from '../../api';
import { addDays } from '../../lib/dateUtil';
import Modal from '../Modal';
import ConfirmDialog from '../ConfirmDialog';

interface SwapDaysModalProps {
  isOpen: boolean;
  initialDate: string;
  onClose: () => void;
  onSwapped: (swapped: number) => void;
}

export default function SwapDaysModal({ isOpen, initialDate, onClose, onSwapped }: SwapDaysModalProps) {
  const { t } = useT();
  const [dateA, setDateA] = useState(initialDate);
  const [dateB, setDateB] = useState(addDays(initialDate, 1));
  const [countA, setCountA] = useState(0);
  const [countB, setCountB] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Reset dates to the current context when the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    setDateA(initialDate);
    setDateB(addDays(initialDate, 1));
  }, [isOpen, initialDate]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    async function fetchCounts() {
      const [a, b] = await Promise.all([
        dateA ? api.log.getDay(dateA) : Promise.resolve([]),
        dateB ? api.log.getDay(dateB) : Promise.resolve([]),
      ]);
      if (cancelled) return;
      setCountA(a.filter(e => e.status === 'planned').length);
      setCountB(b.filter(e => e.status === 'planned').length);
    }
    fetchCounts();
    return () => { cancelled = true; };
  }, [isOpen, dateA, dateB]);

  const sameDate = !!dateA && !!dateB && dateA === dateB;
  const bothEmpty = countA === 0 && countB === 0;
  const canSwap = !!dateA && !!dateB && !sameDate && !bothEmpty;

  const inputCls = "w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent";

  async function handleConfirm() {
    const { swapped } = await api.log.swapDays({ dateA, dateB });
    setConfirmOpen(false);
    onSwapped(swapped);
    onClose();
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={t('swap.title')}>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-sec">{t('swap.dateA')}</label>
              <input type="date" value={dateA} onChange={e=>setDateA(e.target.value)} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-sec">{t('swap.dateB')}</label>
              <input type="date" value={dateB} onChange={e=>setDateB(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="text-xs bg-bg rounded-lg px-3 py-2 text-text-sec text-center">
            {sameDate
              ? <span className="text-yellow">{t('swap.sameDate')}</span>
              : <span><span className="text-text font-medium">{countA}</span> {t('dash.planned')} ↔ <span className="text-text font-medium">{countB}</span> {t('dash.planned')}</span>
            }
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="px-4 py-2 text-sm text-text-sec border border-border rounded-lg cursor-pointer hover:text-text">{t('common.cancel')}</button>
            <button onClick={()=>setConfirmOpen(true)} disabled={!canSwap} className="px-4 py-2 text-sm bg-accent text-white rounded-lg cursor-pointer hover:opacity-90 disabled:opacity-40 font-medium">{t('swap.submit')}</button>
          </div>
        </div>
      </Modal>
      {confirmOpen && (
        <ConfirmDialog
          message={t('swap.confirmMsg')
            .replace('{a}', String(countA))
            .replace('{dateA}', dateA)
            .replace('{b}', String(countB))
            .replace('{dateB}', dateB)}
          confirmLabel={t('swap.submit')}
          cancelLabel={t('common.cancel')}
          onConfirm={handleConfirm}
          onCancel={()=>setConfirmOpen(false)}
        />
      )}
    </>
  );
}
