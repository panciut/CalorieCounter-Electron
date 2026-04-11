import { useEffect } from 'react';
import { api } from '../api';

export function useUndo(showToast: (msg: string) => void, undoneMsg: string) {
  useEffect(() => {
    async function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        const result = await api.undo.pop();
        if (result?.ok) showToast(undoneMsg);
      }
    }

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showToast, undoneMsg]);
}
