import { useSettings } from '../hooks/useSettings';
import { useT } from '../i18n/useT';
import { api } from '../api';
import { useToast } from '../components/Toast';

export default function SettingsPage() {
  const { t } = useT();
  const { settings, updateSettings } = useSettings();
  const { showToast } = useToast();

  const currentTheme = settings.theme ?? 'dark';
  const currentLang  = settings.language ?? 'en';

  async function handleExport(format: 'json' | 'csv') {
    const result = await api.export.data(format);
    if (result.ok) showToast(t('export.success'));
  }

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-2xl font-bold text-text mb-8">{t('nav.settings')}</h1>

      {/* Language */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-text-sec uppercase tracking-wider mb-3">{t('settings.language')}</h2>
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

      {/* Theme */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-text-sec uppercase tracking-wider mb-3">{t('settings.theme')}</h2>
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

      {/* Export */}
      <section>
        <h2 className="text-sm font-semibold text-text-sec uppercase tracking-wider mb-3">{t('export.title')}</h2>
        <div className="flex gap-3">
          <button
            onClick={() => handleExport('json')}
            className="px-4 py-2 rounded-md text-sm font-medium bg-card border border-border text-text hover:border-accent/50 cursor-pointer transition-all"
          >
            {t('export.json')}
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="px-4 py-2 rounded-md text-sm font-medium bg-card border border-border text-text hover:border-accent/50 cursor-pointer transition-all"
          >
            {t('export.csv')}
          </button>
        </div>
      </section>
    </div>
  );
}
