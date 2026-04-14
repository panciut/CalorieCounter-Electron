import { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface ToastContextValue {
  show: (text: string, type?: ToastMessage['type']) => void;
}

const ToastContext = createContext<ToastContextValue>({ show: () => {} });

let nextId = 0;

const INDICATOR: Record<ToastMessage['type'], string> = {
  success: 'bg-green',
  error:   'bg-red',
  info:    'bg-accent',
  warning: 'bg-yellow',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const show = useCallback((text: string, type: ToastMessage['type'] = 'success') => {
    const id = ++nextId;
    setToasts(t => [...t, { id, text, type }]);
    setTimeout(() => setToasts(t => t.filter(m => m.id !== id)), 2500);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {createPortal(
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-[100] pointer-events-none">
          {toasts.map(toast => (
            <div
              key={toast.id}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-card border border-border shadow-DEFAULT text-sm font-medium text-text animate-[fadeInUp_0.2s_ease-out] min-w-[180px]"
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${INDICATOR[toast.type]}`} />
              {toast.text}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  return { show: ctx.show, showToast: ctx.show };
}
