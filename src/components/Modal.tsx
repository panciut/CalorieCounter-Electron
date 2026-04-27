import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  width?: string;
}

export default function Modal({ isOpen, onClose, title, children, width = 'max-w-lg' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onMouseDown={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className={`bg-card border border-border rounded-2xl shadow w-full mx-4 ${width} max-h-[90vh] flex flex-col`}>
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
            <h2 className="text-xl font-semibold text-text">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-text-sec hover:text-text text-xl leading-none cursor-pointer transition-colors"
            >✕</button>
          </div>
        )}
        <div className="overflow-y-auto flex-1 p-5">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
