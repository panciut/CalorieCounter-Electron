import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from '../hooks/useNavigate';
import { useT } from '../i18n/useT';
import { useNotifications } from '../hooks/useNotifications';
import type { AppNotification, NotificationSeverity } from '../types';

const SEVERITY_ORDER: Record<NotificationSeverity, number> = { urgent: 0, warn: 1, info: 2 };

const SEVERITY_DOT: Record<NotificationSeverity, string> = {
  urgent: 'bg-red',
  warn: 'bg-yellow',
  info: 'bg-accent',
};

function formatDaysRelative(t: (k: string, v?: Record<string, string | number>) => string, n: number): string {
  if (n <= 0) return t('notifications.pantryExpiry.today');
  if (n === 1) return t('notifications.pantryExpiry.tomorrow');
  return t('notifications.pantryExpiry.inDays', { n });
}

export function renderNotificationTitle(
  n: AppNotification,
  t: (k: string, v?: Record<string, string | number>) => string,
): string {
  switch (n.type) {
    case 'pantry_expiry':
    case 'pantry_opened': {
      const name = String(n.payload.food_name ?? '');
      const days = Number(n.payload.days_until ?? 0);
      const when = formatDaysRelative(t, days);
      if (n.type === 'pantry_opened') {
        return t('notifications.pantryOpened.title', { name, when });
      }
      return t('notifications.pantryExpiry.title', { name, when });
    }
    case 'missing_log':
      return t('notifications.missingLog.title');
    case 'missing_active_energy':
      return t('notifications.missingActiveEnergy.title');
    case 'low_pantry': {
      const name = String(n.payload.food_name ?? '');
      const remaining = Number(n.payload.remaining_g ?? 0);
      return t('notifications.lowPantry.title', { name, remaining });
    }
    case 'missing_weight': {
      const days = Number(n.payload.days_since ?? 0);
      return t('notifications.missingWeight.title', { days });
    }
  }
}

export function renderNotificationBody(
  n: AppNotification,
  t: (k: string, v?: Record<string, string | number>) => string,
): string {
  switch (n.type) {
    case 'missing_log':
      return t('notifications.missingLog.body');
    case 'missing_active_energy':
      return t('notifications.missingActiveEnergy.body');
    case 'low_pantry':
      return t('notifications.lowPantry.body');
    case 'missing_weight':
      return t('notifications.missingWeight.body');
    default:
      return '';
  }
}

export function sortNotifications(list: AppNotification[]): AppNotification[] {
  return [...list].sort((a, b) => {
    const s = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (s !== 0) return s;
    return b.created_at.localeCompare(a.created_at);
  });
}

function BellIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 003.4 0" />
    </svg>
  );
}

export default function NotificationBell() {
  const { t } = useT();
  const { navigate } = useNavigate();
  const { notifications, dismiss, dismissAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (popRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    function update() {
      const r = btnRef.current!.getBoundingClientRect();
      const width = 320;
      const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
      setPos({ top: r.bottom + 8, left });
    }
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  const sorted = sortNotifications(notifications);
  const top = sorted.slice(0, 5);
  const count = notifications.length;

  function handleRowClick(n: AppNotification) {
    setOpen(false);
    if (n.action) navigate(n.action.page);
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        title={t('notifications.title')}
        className="relative p-1.5 rounded text-text-sec hover:text-text hover:bg-card-hover transition-colors cursor-pointer"
      >
        <BellIcon />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-red text-white text-[10px] font-bold leading-[16px] text-center">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && createPortal(
        <div
          ref={popRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: 320 }}
          className="z-[1000] bg-card border border-border rounded-lg shadow-lg overflow-hidden"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-sm font-semibold text-text">{t('notifications.title')}</span>
            {count > 0 && (
              <button
                type="button"
                onClick={() => dismissAll()}
                className="text-xs text-text-sec hover:text-accent cursor-pointer"
              >
                {t('notifications.dismissAll')}
              </button>
            )}
          </div>

          {top.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-text-sec">
              {t('notifications.empty')}
            </div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto">
              {top.map(n => (
                <div
                  key={n.key}
                  className="flex items-start gap-2 px-3 py-2 border-b border-border last:border-b-0 hover:bg-card-hover transition-colors"
                >
                  <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${SEVERITY_DOT[n.severity]}`} />
                  <button
                    type="button"
                    onClick={() => handleRowClick(n)}
                    className="flex-1 text-left cursor-pointer min-w-0"
                  >
                    <div className="text-sm text-text truncate">{renderNotificationTitle(n, t)}</div>
                    {renderNotificationBody(n, t) && (
                      <div className="text-xs text-text-sec truncate">{renderNotificationBody(n, t)}</div>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => dismiss(n.key)}
                    title={t('notifications.dismiss')}
                    aria-label={t('notifications.dismiss')}
                    className="text-text-sec hover:text-red cursor-pointer text-sm px-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="px-3 py-2 border-t border-border">
            <button
              type="button"
              onClick={() => { setOpen(false); navigate('notifications'); }}
              className="w-full text-center text-xs text-accent hover:underline cursor-pointer"
            >
              {t('notifications.seeAll', { n: count })}
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
