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
