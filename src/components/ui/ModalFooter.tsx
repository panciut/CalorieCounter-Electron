import type { ReactNode } from 'react';

interface ModalFooterProps {
  onCancel: () => void;
  onConfirm: () => void;
  cancelLabel?: ReactNode;
  confirmLabel?: ReactNode;
  confirmDisabled?: boolean;
  /** Render the confirm button as red/danger instead of accent. */
  dangerous?: boolean;
  /** Optional content rendered to the left of the buttons (e.g. a 'don't show again' checkbox). */
  leadingSlot?: ReactNode;
  className?: string;
}

/**
 * Standard cancel + confirm button row at the bottom of every modal.
 * Right-aligned by default; pass `leadingSlot` to add left-aligned content.
 */
export default function ModalFooter({
  onCancel, onConfirm,
  cancelLabel = 'Cancel',
  confirmLabel = 'Save',
  confirmDisabled = false,
  dangerous = false,
  leadingSlot,
  className = '',
}: ModalFooterProps) {
  const confirmCls = dangerous
    ? 'px-4 py-2 rounded-xl text-sm text-red border border-red/30 hover:bg-red/10 cursor-pointer disabled:opacity-40 transition-colors'
    : 'px-4 py-2 rounded-xl bg-accent text-white text-sm font-semibold hover:opacity-90 cursor-pointer disabled:opacity-40 transition-opacity';
  return (
    <div className={`flex gap-2 items-center ${leadingSlot ? 'justify-between' : 'justify-end'} ${className}`}>
      {leadingSlot}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl text-sm text-text-sec border border-border hover:bg-card-hover hover:text-text cursor-pointer transition-colors"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={confirmDisabled}
          className={confirmCls}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
