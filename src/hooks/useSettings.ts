import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { api } from '../api';
import type { Settings } from '../types';

// ── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: Settings = {
  cal_min: 1800, cal_max: 2200, cal_rec: 2000,
  protein_min: 120, protein_max: 180, protein_rec: 150,
  carbs_min: 200, carbs_max: 300, carbs_rec: 250,
  fat_min: 55, fat_max: 85, fat_rec: 70,
  fiber_min: 20, fiber_max: 35, fiber_rec: 30,
  weight_goal: 0, water_goal: 2000,
  tol_1: 5, tol_2: 10, tol_3: 20,
  language: 'en', theme: 'dark',
  pantry_enabled: 1, pantry_warn_days: 3, pantry_urgent_days: 1,
};

// ── Context ───────────────────────────────────────────────────────────────────

interface SettingsContextValue {
  settings: Settings;
  loading: boolean;
  updateSettings: (partial: Partial<Settings>) => Promise<void>;
  invalidate: () => void;
}

export const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  loading: true,
  updateSettings: async () => {},
  invalidate: () => {},
});

// ── Provider ─────────────────────────────────────────────────────────────────

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading]   = useState(true);
  const [rev, setRev]           = useState(0);

  useEffect(() => {
    api.settings.get().then(s => {
      setSettings(s);
      setLoading(false);
      // Apply theme to body
      document.body.classList.toggle('light', s.theme === 'light');
    });
  }, [rev]);

  const updateSettings = useCallback(async (partial: Partial<Settings>) => {
    await api.settings.save(partial);
    setRev(r => r + 1);
  }, []);

  const invalidate = useCallback(() => setRev(r => r + 1), []);

  return createElement(
    SettingsContext.Provider,
    { value: { settings, loading, updateSettings, invalidate } },
    children,
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useSettings() {
  return useContext(SettingsContext);
}
