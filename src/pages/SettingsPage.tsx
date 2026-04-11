import { useState } from 'react';
import { useSettings } from '../hooks/useSettings';
import { useT } from '../i18n/useT';
import { api } from '../api';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

export default function SettingsPage() {
  const { t } = useT();
  const { settings, updateSettings } = useSettings();
  const { showToast } = useToast();

  const [confirmRestore, setConfirmRestore] = useState(false);
  const [restorePath, setRestorePath]       = useState('');
  const [importing, setImporting]           = useState(false);

  const currentTheme = settings.theme    ?? 'dark';
  const currentLang  = settings.language ?? 'en';

  // ── Export ────────────────────────────────────────────────────────────────
  async function handleExportData(format: 'json' | 'csv') {
    const result = await api.export.data(format);
    if (result.ok) showToast('Exported successfully');
  }

  async function handleExportBackup() {
    const result = await api.export.backup();
    if (result.ok) showToast('Database backup saved');
  }

  // ── Import ────────────────────────────────────────────────────────────────
  async function handleImportFoods() {
    const filePath = await api.import.selectFile(['csv', 'json']);
    if (!filePath) return;
    setImporting(true);
    try {
      const result = await api.import.foods(filePath);
      showToast(`Imported ${result.imported} foods (${result.skipped} skipped)`);
    } finally {
      setImporting(false);
    }
  }

  async function handleImportFullJson() {
    const filePath = await api.import.selectFile(['json']);
    if (!filePath) return;
    setImporting(true);
    try {
      const result = await api.import.fullJson(filePath);
      if (result.ok) {
        const s = result.stats;
        showToast(`Imported: ${s.foods} foods, ${s.log} log entries, ${s.weight} weight, ${s.exercises} exercises`);
      }
    } finally {
      setImporting(false);
    }
  }

  async function handlePickRestoreFile() {
    const filePath = await api.import.selectFile(['db']);
    if (!filePath) return;
    setRestorePath(filePath);
    setConfirmRestore(true);
  }

  async function handleConfirmRestore() {
    setConfirmRestore(false);
    const result = await api.import.backup(restorePath);
    if (!result.ok) showToast(result.error ?? 'Restore failed');
    // On success the app relaunches — no further action needed
  }

  // ── Shared styles ─────────────────────────────────────────────────────────
  const btn = (variant: 'default' | 'danger' = 'default') => [
    'px-4 py-2 rounded-md text-sm font-medium border transition-all cursor-pointer',
    variant === 'danger'
      ? 'bg-card border-border text-red hover:border-red/50'
      : 'bg-card border-border text-text hover:border-accent/50',
  ].join(' ');

  const sectionTitle = 'text-sm font-semibold text-text-sec uppercase tracking-wider mb-3';

  return (
    <div className="p-8 max-w-lg space-y-10">
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

      {/* ── Export data ────────────────────────────────────────────────────── */}
      <section>
        <h2 className={sectionTitle}>{t('export.title')}</h2>
        <p className="text-xs text-text-sec mb-3">
          Export your food log, weight, exercises, water and supplements.
        </p>
        <div className="flex gap-3 flex-wrap">
          <button onClick={() => handleExportData('json')} className={btn()}>
            Export JSON
          </button>
          <button onClick={() => handleExportData('csv')} className={btn()}>
            Export CSV
          </button>
        </div>
      </section>

      {/* ── Import data ────────────────────────────────────────────────────── */}
      <section>
        <h2 className={sectionTitle}>Import Data</h2>
        <div className="space-y-3">
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <p className="text-sm font-medium text-text">Foods (CSV or JSON)</p>
            <p className="text-xs text-text-sec">Add new foods to your database. Existing foods are skipped.</p>
            <button onClick={handleImportFoods} disabled={importing} className={btn()}>
              {importing ? 'Importing…' : 'Import Foods'}
            </button>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <p className="text-sm font-medium text-text">Full export (JSON)</p>
            <p className="text-xs text-text-sec">
              Import a full JSON export — adds foods, log entries, weight records, and exercises.
              Existing records are skipped (no duplicates).
            </p>
            <button onClick={handleImportFullJson} disabled={importing} className={btn()}>
              {importing ? 'Importing…' : 'Import Full JSON'}
            </button>
          </div>
        </div>
      </section>

      {/* ── Database backup ────────────────────────────────────────────────── */}
      <section>
        <h2 className={sectionTitle}>Database Backup</h2>
        <div className="space-y-3">
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <p className="text-sm font-medium text-text">Export backup</p>
            <p className="text-xs text-text-sec">
              Save a complete copy of your database file (.db). Use this to transfer data
              between machines or keep a full backup.
            </p>
            <button onClick={handleExportBackup} className={btn()}>
              Export Database Backup
            </button>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <p className="text-sm font-medium text-text">Restore backup</p>
            <p className="text-xs text-text-sec">
              Restore from a .db backup file. <strong className="text-red">This replaces all current data</strong> and
              restarts the app.
            </p>
            <button onClick={handlePickRestoreFile} className={btn('danger')}>
              Restore from Backup…
            </button>
          </div>
        </div>
      </section>

      {confirmRestore && (
        <ConfirmDialog
          message={`Restore database from backup? All current data will be replaced and the app will restart.`}
          confirmLabel="Restore & Restart"
          dangerous
          onConfirm={handleConfirmRestore}
          onCancel={() => setConfirmRestore(false)}
        />
      )}
    </div>
  );
}
