import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { api } from '../api';
import type { PantryLocation } from '../types';

const STORAGE_KEY = 'activePantryId';
// One-time migration from the old per-page key. We delete the legacy key
// after first read so it doesn't drift back if the user's two pages disagree.
const LEGACY_KEY = 'dashPantry';

interface PantryContextValue {
  /** Active pantry id, or null while still loading or if no pantries exist. */
  activeId: number | null;
  setActiveId: (id: number) => void;
  /** All available pantries, sorted by id. Empty array while loading. */
  pantries: PantryLocation[];
  /** Re-fetch the pantry list (call after manage-pantries CRUD). */
  refresh: () => void;
}

export const PantryContext = createContext<PantryContextValue>({
  activeId: null,
  setActiveId: () => {},
  pantries: [],
  refresh: () => {},
});

function readStoredId(): number | null {
  const cur = localStorage.getItem(STORAGE_KEY);
  if (cur) return Number(cur) || null;
  // One-time legacy migration
  const legacy = localStorage.getItem(LEGACY_KEY);
  if (legacy) {
    localStorage.setItem(STORAGE_KEY, legacy);
    localStorage.removeItem(LEGACY_KEY);
    return Number(legacy) || null;
  }
  return null;
}

export function PantryProvider({ children }: { children: ReactNode }) {
  const [pantries, setPantries] = useState<PantryLocation[]>([]);
  const [activeId, setActiveIdState] = useState<number | null>(null);
  const [rev, setRev] = useState(0);

  useEffect(() => {
    api.pantries.getAll().then(list => {
      setPantries(list);
      const stored = readStoredId();
      const exists = list.find(p => p.id === stored);
      const def    = list.find(p => p.is_default) ?? list[0];
      const next   = (exists ?? def)?.id ?? null;
      setActiveIdState(next);
      if (next != null && next !== stored) {
        localStorage.setItem(STORAGE_KEY, String(next));
      }
    });
  }, [rev]);

  const setActiveId = useCallback((id: number) => {
    setActiveIdState(id);
    localStorage.setItem(STORAGE_KEY, String(id));
  }, []);

  const refresh = useCallback(() => setRev(r => r + 1), []);

  return createElement(
    PantryContext.Provider,
    { value: { activeId, setActiveId, pantries, refresh } },
    children,
  );
}

export function usePantry() {
  return useContext(PantryContext);
}
