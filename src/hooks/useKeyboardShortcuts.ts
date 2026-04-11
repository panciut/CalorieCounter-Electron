import { useEffect } from 'react';
import { useNavigate } from './useNavigate';
import { getThisMonday } from '../lib/dateUtil';
import type { PageName } from '../types';

// Matches NAV_ITEMS shortcuts in Nav.tsx exactly (1-0 by position)
const KEY_MAP: Record<string, PageName> = {
  '1': 'dashboard',
  '2': 'plan',
  '3': 'exercise',
  '4': 'net',
  '5': 'week',
  '6': 'foods',
  '7': 'pantry',
  '8': 'recipes',
  '9': 'history',
  '0': 'weight',
};

export function useKeyboardShortcuts() {
  const { navigate } = useNavigate();

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Don't fire when typing in an input/textarea/select
      const tag = (e.target as HTMLElement).tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const page = KEY_MAP[e.key];
      if (page) {
        e.preventDefault();
        if (page === 'week') {
          navigate('week', { weekStart: getThisMonday() });
        } else {
          navigate(page);
        }
      }
    }

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);
}
