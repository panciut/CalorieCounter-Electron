import { useSettings } from '../hooks/useSettings';
import { useT } from '../i18n/useT';

export default function SettingsPage() {
  const { t } = useT();
  const { settings, updateSettings } = useSettings();

  const currentTheme = settings.theme    ?? 'dark';
  const currentLang  = settings.language ?? 'en';

  const sectionTitle = 'text-sm font-semibold text-text-sec uppercase tracking-wider mb-3';

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10">
      <h1 className="text-2xl font-bold text-text">{t('nav.settings')}</h1>

      {/* ── Language ───────────────────────────────────────────────────────── */}
      <section>
        <h2 className={sectionTitle}>{t('settings.language')}</h2>
        <div className="flex gap-3">
          {(['en', 'it'] as const).map(lang => (
            <button
              key={lang}
              onClick={() => updateSettings({ language: lang })}
              className={[
                'px-4 py-2 rounded-md text-sm font-medium border transition-all cursor-pointer',
                currentLang === lang
                  ? 'bg-accent text-white border-accent'
                  : 'bg-transparent text-text-sec border-border hover:border-accent/50 hover:text-text',
              ].join(' ')}
            >
              {lang === 'en' ? '🇬🇧 English' : '🇮🇹 Italiano'}
            </button>
          ))}
        </div>
      </section>

      {/* ── Theme ──────────────────────────────────────────────────────────── */}
      <section>
        <h2 className={sectionTitle}>{t('settings.theme')}</h2>
        <div className="flex gap-3">
          {(['dark', 'light'] as const).map(theme => (
            <button
              key={theme}
              onClick={() => updateSettings({ theme })}
              className={[
                'px-4 py-2 rounded-md text-sm font-medium border transition-all cursor-pointer',
                currentTheme === theme
                  ? 'bg-accent text-white border-accent'
                  : 'bg-transparent text-text-sec border-border hover:border-accent/50 hover:text-text',
              ].join(' ')}
            >
              {theme === 'dark' ? `🌙 ${t('settings.dark')}` : `☀️ ${t('settings.light')}`}
            </button>
          ))}
        </div>
      </section>

      {/* ── Pantry ─────────────────────────────────────────────────────────── */}
      <section>
        <h2 className={sectionTitle}>{t('settings.pantrySection')}</h2>
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => updateSettings({ pantry_enabled: settings.pantry_enabled === 0 ? 1 : 0 })}
              className={[
                'w-10 h-6 rounded-full transition-colors cursor-pointer flex items-center',
                settings.pantry_enabled !== 0 ? 'bg-accent' : 'bg-border',
              ].join(' ')}
            >
              <div className={[
                'w-5 h-5 rounded-full bg-white shadow transition-transform mx-0.5',
                settings.pantry_enabled !== 0 ? 'translate-x-4' : 'translate-x-0',
              ].join(' ')} />
            </div>
            <span className="text-sm text-text">{t('settings.pantryEnabled')}</span>
          </label>
          {settings.pantry_enabled !== 0 && (
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-text-sec">{t('settings.pantryWarnDays')}</label>
                <input
                  type="number" min={0} max={30}
                  value={settings.pantry_warn_days}
                  onChange={e => updateSettings({ pantry_warn_days: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent w-24"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-text-sec">{t('settings.pantryUrgentDays')}</label>
                <input
                  type="number" min={0} max={30}
                  value={settings.pantry_urgent_days}
                  onChange={e => updateSettings({ pantry_urgent_days: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent w-24"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Apple Health ───────────────────────────────────────────────────── */}
      <section>
        <h2 className={sectionTitle}>Apple Health</h2>
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <p className="text-sm text-text-sec">
            Sync workouts, active calories, and body fat% from Apple Health to CalorieCounter.
          </p>
          <div className="flex items-center gap-3">
            <button disabled className="px-4 py-2 rounded-md text-sm font-medium bg-card border border-border text-text-sec opacity-50 cursor-not-allowed">
              Connect Apple Health
            </button>
            <span className="text-xs text-text-sec bg-border/50 px-2 py-0.5 rounded-full">Coming soon</span>
          </div>
          <p className="text-xs text-text-sec">Available on macOS. Requires HealthKit permission.</p>
        </div>
      </section>
    </div>
  );
}
