import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmDialogProps {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  dangerous?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  dangerous = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onConfirm, onCancel]);

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-card border border-border rounded-2xl shadow-DEFAULT p-6 w-full max-w-sm mx-4 space-y-5">
        <p className="text-text text-sm leading-relaxed">{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            autoFocus
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium text-text-sec bg-card border border-border hover:bg-card-hover transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={[
              'px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer',
              dangerous
                ? 'bg-red text-white hover:opacity-85'
                : 'bg-accent text-white hover:opacity-85',
            ].join(' ')}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
