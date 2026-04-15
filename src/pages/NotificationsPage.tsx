import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useT } from '../i18n/useT';
import { useNavigate } from '../hooks/useNavigate';
import { useNotifications } from '../hooks/useNotifications';
import {
  renderNotificationTitle,
  renderNotificationBody,
  sortNotifications,
} from '../components/NotificationBell';
import type {
  AppNotification,
  DismissedNotification,
  NotificationSeverity,
  NotificationType,
} from '../types';

type CategoryFilter = 'all' | 'pantry' | 'logging' | 'energy';
type SeverityFilter = 'all' | NotificationSeverity;

const SEVERITY_DOT: Record<NotificationSeverity, string> = {
  urgent: 'bg-red',
  warn: 'bg-yellow',
  info: 'bg-accent',
};

function categoryOf(type: NotificationType): Exclude<CategoryFilter, 'all'> {
  if (type === 'pantry_expiry' || type === 'pantry_opened') return 'pantry';
  if (type === 'missing_log') return 'logging';
  return 'energy';
}

export default function NotificationsPage() {
  const { t } = useT();
  const { navigate } = useNavigate();
  const { notifications, refresh, dismiss, snooze, dismissAll, undoDismiss } = useNotifications();
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [severity, setSeverity] = useState<SeverityFilter>('all');
  const [recent, setRecent] = useState<DismissedNotification[]>([]);
  const [recentOpen, setRecentOpen] = useState(false);

  useEffect(() => {
    api.notifications.recentDismissed(20).then(setRecent);
  }, [notifications]);

  const filtered = useMemo(() => {
    const sorted = sortNotifications(notifications);
    return sorted.filter(n => {
      if (category !== 'all' && categoryOf(n.type) !== category) return false;
      if (severity !== 'all' && n.severity !== severity) return false;
      return true;
    });
  }, [notifications, category, severity]);

  function handleDismissAllVisible() {
    dismissAll(filtered.map(n => n.key));
  }

  async function handleUndo(key: string) {
    await undoDismiss(key);
  }

  function handleRowClick(n: AppNotification) {
    if (n.action) navigate(n.action.page);
  }

  const CATEGORIES: { key: CategoryFilter; label: string }[] = [
    { key: 'all', label: t('notifications.filter.all') },
    { key: 'pantry', label: t('notifications.filter.pantry') },
    { key: 'logging', label: t('notifications.filter.logging') },
    { key: 'energy', label: t('notifications.filter.energy') },
  ];

  const SEVERITIES: { key: SeverityFilter; label: string }[] = [
    { key: 'all', label: t('notifications.filter.all') },
    { key: 'urgent', label: t('notifications.severity.urgent') },
    { key: 'warn', label: t('notifications.severity.warn') },
    { key: 'info', label: t('notifications.severity.info') },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-text">{t('notifications.title')}</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              className="text-xs px-3 py-1.5 rounded border border-border text-text-sec hover:border-accent hover:text-accent cursor-pointer transition-colors"
            >
              {t('notifications.refresh')}
            </button>
            {filtered.length > 0 && (
              <button
                type="button"
                onClick={handleDismissAllVisible}
                className="text-xs px-3 py-1.5 rounded border border-border text-text-sec hover:border-red hover:text-red cursor-pointer transition-colors"
              >
                {t('notifications.dismissAllVisible')}
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(c => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className={[
                  'text-xs px-3 py-1 rounded-full border cursor-pointer transition-colors',
                  category === c.key
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border text-text-sec hover:border-accent/50',
                ].join(' ')}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SEVERITIES.map(s => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSeverity(s.key)}
                className={[
                  'text-xs px-3 py-1 rounded-full border cursor-pointer transition-colors',
                  severity === s.key
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border text-text-sec hover:border-accent/50',
                ].join(' ')}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center text-text-sec">
            {t('notifications.empty')}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {filtered.map(n => (
              <div
                key={n.key}
                className="flex items-start gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-card-hover transition-colors"
              >
                <div className={`mt-2 w-2.5 h-2.5 rounded-full shrink-0 ${SEVERITY_DOT[n.severity]}`} />
                <button
                  type="button"
                  onClick={() => handleRowClick(n)}
                  className="flex-1 text-left cursor-pointer min-w-0"
                >
                  <div className="text-sm font-medium text-text">{renderNotificationTitle(n, t)}</div>
                  {renderNotificationBody(n, t) && (
                    <div className="text-xs text-text-sec mt-0.5">{renderNotificationBody(n, t)}</div>
                  )}
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => snooze(n.key, 1)}
                    title={t('notifications.snooze1d')}
                    className="text-xs px-2 py-1 rounded border border-border text-text-sec hover:border-accent hover:text-accent cursor-pointer transition-colors"
                  >
                    {t('notifications.snooze1d')}
                  </button>
                  <button
                    type="button"
                    onClick={() => dismiss(n.key)}
                    title={t('notifications.dismiss')}
                    className="text-text-sec hover:text-red cursor-pointer text-sm px-2"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recently dismissed */}
        {recent.length > 0 && (
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setRecentOpen(v => !v)}
              className="text-sm text-text-sec hover:text-text cursor-pointer flex items-center gap-1"
            >
              <span>{recentOpen ? '▾' : '▸'}</span>
              {t('notifications.recentlyDismissed')} ({recent.length})
            </button>
            {recentOpen && (
              <div className="mt-2 bg-card border border-border rounded-lg overflow-hidden">
                {recent.map(r => (
                  <div
                    key={r.key}
                    className="flex items-center gap-2 px-4 py-2 border-b border-border last:border-b-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-text-sec truncate font-mono">{r.key}</div>
                      <div className="text-[10px] text-text-sec/70">{r.dismissed_at}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUndo(r.key)}
                      className="text-xs px-2 py-1 rounded border border-border text-text-sec hover:border-accent hover:text-accent cursor-pointer transition-colors"
                    >
                      {t('notifications.undo')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
