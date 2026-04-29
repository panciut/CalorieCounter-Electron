import { useEffect, useState } from 'react';
import { api } from '../api';
import { useT } from '../i18n/useT';
import { useToast } from './Toast';
import Modal from './Modal';
import ConfirmDialog from './ConfirmDialog';
import type { OffLocalStatus, OffImportProgress } from '../types';

const card = 'bg-card border border-border rounded-xl p-4 space-y-3';
const sectionTitle = 'text-base font-semibold text-text';
const desc = 'text-sm text-text-sec';

function fmtBytes(n: number): string {
  if (n >= 1024 * 1024 * 1024) return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (n >= 1024 * 1024) return `${Math.round(n / (1024 * 1024))} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

function fmtCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

export default function OffLocalCard() {
  const { t } = useT();
  const { showToast } = useToast();
  const [status, setStatus] = useState<OffLocalStatus | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<OffImportProgress | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function loadStatus() {
    setStatus(await api.offLocal.getStatus());
  }

  useEffect(() => { loadStatus(); }, []);

  // Subscribe to progress events for the lifetime of the importing modal.
  useEffect(() => {
    if (!importing) return;
    const off = api.offLocal.onProgress((p) => setProgress(p));
    return () => { off(); };
  }, [importing]);

  async function handleDownload() {
    setProgress({ stage: 'downloading', bytesRead: 0, totalBytes: null, rowsParsed: 0, rowsKept: 0, rowsSkipped: 0 });
    setImporting(true);
    const res = await api.offLocal.download();
    setImporting(false);
    setProgress(null);
    if (res.ok) {
      showToast(t('data.offLocal.imported'));
    } else {
      showToast(`${t('data.offLocal.error')}: ${res.error || ''}`, 'error');
    }
    loadStatus();
  }

  async function handleCancel() {
    await api.offLocal.cancel();
  }

  async function handleDelete() {
    setConfirmDelete(false);
    await api.offLocal.delete();
    showToast(t('data.offLocal.deleted'));
    loadStatus();
  }

  if (status === null) return null;

  return (
    <div className={card}>
      <p className={sectionTitle}>{t('data.offLocal.title')}</p>
      <p className={desc}>{t('data.offLocal.description')}</p>

      {!status.initialized ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-yellow">⚠ {t('data.offLocal.sizeWarning')}</p>
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 cursor-pointer"
            >
              {t('data.offLocal.download')}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-text-sec">{t('data.offLocal.statusCount')}</p>
              <p className="text-text font-semibold tabular-nums">{fmtCount(status.productCount)}</p>
            </div>
            <div>
              <p className="text-xs text-text-sec">{t('data.offLocal.statusSize')}</p>
              <p className="text-text font-semibold tabular-nums">{fmtBytes(status.sizeBytes)}</p>
            </div>
            <div>
              <p className="text-xs text-text-sec">{t('data.offLocal.statusLastSynced')}</p>
              <p className="text-text font-semibold tabular-nums">{status.lastSynced || '—'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="px-4 py-2 rounded-lg border border-border text-text text-sm hover:border-accent/60 cursor-pointer"
            >
              {t('data.offLocal.refresh')}
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="px-4 py-2 rounded-lg border border-border text-red text-sm hover:border-red/60 cursor-pointer"
            >
              {t('data.offLocal.delete')}
            </button>
          </div>
        </div>
      )}

      {importing && progress && (
        <Modal isOpen onClose={() => { /* ignored — must Cancel */ }} title={t('data.offLocal.importing')}>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-text-sec">{t(`data.offLocal.${progress.stage}`)}</p>

            {progress.totalBytes != null && progress.totalBytes > 0 && (
              <div className="w-full h-2 bg-bg rounded-full overflow-hidden border border-border">
                <div
                  className="h-full bg-accent transition-all"
                  style={{ width: `${Math.min(100, Math.round((progress.bytesRead / progress.totalBytes) * 100))}%` }}
                />
              </div>
            )}

            <div className="text-xs text-text-sec tabular-nums">
              {fmtBytes(progress.bytesRead)}
              {progress.totalBytes != null && progress.totalBytes > 0
                ? ` / ${fmtBytes(progress.totalBytes)}`
                : ''}
            </div>

            <div className="text-xs text-text-sec tabular-nums flex gap-3 flex-wrap">
              <span>{t('data.offLocal.parsed')}: {progress.rowsParsed.toLocaleString()}</span>
              <span>· ✓ {progress.rowsKept.toLocaleString()} {t('data.offLocal.kept')}</span>
              <span>· ↷ {progress.rowsSkipped.toLocaleString()} {t('data.offLocal.skipped')}</span>
            </div>

            {progress.message && (
              <p className="text-xs text-red">{progress.message}</p>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-lg border border-border text-text-sec text-sm hover:border-red/50 hover:text-red cursor-pointer"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmDialog
          message={t('data.offLocal.deleteConfirm')}
          confirmLabel={t('data.offLocal.delete')}
          dangerous
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
