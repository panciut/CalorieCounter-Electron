import { useState } from 'react';
import { api } from '../api';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { copyToClipboard } from '../lib/exportText';

// ── Shared styles ─────────────────────────────────────────────────────────────

const btn = (variant: 'default' | 'danger' = 'default') => [
  'px-4 py-2 rounded-lg text-sm font-medium border transition-all cursor-pointer',
  variant === 'danger'
    ? 'bg-card border-border text-red hover:border-red/60'
    : 'bg-card border-border text-text hover:border-accent/60',
].join(' ');

const card = 'bg-card border border-border rounded-xl p-5 space-y-3';
const sectionTitle = 'text-base font-semibold text-text';
const desc = 'text-sm text-text-sec';

// ── AI prompt guide ───────────────────────────────────────────────────────────

const AI_PROMPT = `Generate a JSON array of foods for a calorie tracking app.
Each food object must have:
  - "name": string (food name, in English)
  - "calories": number (kcal per 100g or 100ml)
  - "protein": number (g per 100g)
  - "carbs": number (g per 100g)
  - "fat": number (g per 100g)
  - "fiber": number (g per 100g, optional, default 0)
  - "piece_grams": number or null (grams per piece, e.g. 60 for an egg, null if N/A)
  - "is_liquid": 0 or 1 (1 for drinks/liquids measured in ml, 0 otherwise)

Rules:
- All macro values are PER 100g (or per 100ml for liquids)
- Only "name" and "calories" are strictly required; all others default to 0/null
- Return ONLY the raw JSON array, no markdown, no explanation

Example output:
[
  { "name": "Chicken Breast", "calories": 165, "protein": 31, "carbs": 0, "fat": 3.6, "fiber": 0, "piece_grams": null, "is_liquid": 0 },
  { "name": "Whole Egg", "calories": 155, "protein": 13, "carbs": 1.1, "fat": 11, "fiber": 0, "piece_grams": 60, "is_liquid": 0 },
  { "name": "Whole Milk", "calories": 61, "protein": 3.2, "carbs": 4.8, "fat": 3.3, "fiber": 0, "piece_grams": null, "is_liquid": 1 },
  { "name": "Brown Rice (cooked)", "calories": 123, "protein": 2.7, "carbs": 25.6, "fat": 1, "fiber": 1.8, "piece_grams": null, "is_liquid": 0 }
]

Now generate foods for: [DESCRIBE YOUR FOODS HERE]`;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DataPage() {
  const { showToast } = useToast();

  const [importing, setImporting]         = useState(false);
  const [pasteText, setPasteText]         = useState('');
  const [pasteError, setPasteError]       = useState('');
  const [promptCopied, setPromptCopied]   = useState(false);
  const [foodsCopied, setFoodsCopied]     = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [restorePath, setRestorePath]     = useState('');

  // ── Export ──────────────────────────────────────────────────────────────────

  async function handleExportData(format: 'json' | 'csv') {
    const result = await api.export.data(format);
    if (result.ok) showToast('Exported successfully');
  }

  async function handleExportFoods() {
    const result = await api.export.foods();
    if (result.ok) showToast(`Exported ${result.count} foods`);
  }

  async function handleCopyFoods() {
    const foods = await api.foods.getAll();
    const json = JSON.stringify(foods.map(({ name, calories, protein, carbs, fat, fiber, piece_grams, is_liquid, barcode, favorite }) =>
      ({ name, calories, protein, carbs, fat, fiber, piece_grams, is_liquid, barcode, favorite })
    ), null, 2);
    await copyToClipboard(json);
    setFoodsCopied(true);
    setTimeout(() => setFoodsCopied(false), 2000);
  }

  async function handleExportBackup() {
    const result = await api.export.backup();
    if (result.ok) showToast('Database backup saved');
  }

  // ── Import ──────────────────────────────────────────────────────────────────

  async function handleImportFoods() {
    const filePath = await api.import.selectFile(['csv', 'json']);
    if (!filePath) return;
    setImporting(true);
    try {
      const result = await api.import.foods(filePath);
      showToast(`Imported ${result.imported} foods (${result.skipped} skipped)`);
    } finally { setImporting(false); }
  }

  async function handlePasteImport() {
    if (!pasteText.trim()) return;
    setPasteError('');
    setImporting(true);
    try {
      const result = await api.import.foodsFromText(pasteText);
      if (!result.ok) {
        setPasteError(result.error ?? 'Import failed');
      } else {
        showToast(`Imported ${result.imported} foods (${result.skipped} skipped)`);
        setPasteText('');
      }
    } finally { setImporting(false); }
  }

  async function handleImportFullJson() {
    const filePath = await api.import.selectFile(['json']);
    if (!filePath) return;
    setImporting(true);
    try {
      const result = await api.import.fullJson(filePath);
      if (result.ok) {
        const s = result.stats;
        showToast(`Imported: ${s.foods} foods, ${s.log} log, ${s.weight} weight, ${s.exercises} exercises`);
      }
    } finally { setImporting(false); }
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
  }

  async function copyPrompt() {
    await copyToClipboard(AI_PROMPT);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-text">Data</h1>

      {/* ── Export ─────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-text-sec uppercase tracking-wider">Export</h2>

        <div className={card}>
          <p className={sectionTitle}>Export data</p>
          <p className={desc}>Food log, weight, exercises, water and supplements. Use JSON to re-import later; CSV for spreadsheets.</p>
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => handleExportData('json')} className={btn()}>Export JSON</button>
            <button onClick={() => handleExportData('csv')}  className={btn()}>Export CSV</button>
          </div>
        </div>

        <div className={card}>
          <p className={sectionTitle}>Export food database</p>
          <p className={desc}>Save your entire food database as a JSON file. Can be imported back via "Import foods" on another device or after a fresh install.</p>
          <div className="flex gap-3 flex-wrap">
            <button onClick={handleExportFoods} className={btn()}>Export foods (.json)</button>
            <button onClick={handleCopyFoods} className={btn()}>
              {foodsCopied ? '✓ Copied' : 'Copy to clipboard'}
            </button>
          </div>
        </div>

        <div className={card}>
          <p className={sectionTitle}>Database backup</p>
          <p className={desc}>Save a complete copy of the raw database file (.db). Use this to move data between machines or keep a full snapshot.</p>
          <button onClick={handleExportBackup} className={btn()}>Save backup (.db)</button>
        </div>
      </section>

      {/* ── Import ─────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-text-sec uppercase tracking-wider">Import</h2>

        {/* Foods — paste or file */}
        <div className={card}>
          <p className={sectionTitle}>Import foods</p>
          <p className={desc}>
            Add foods to your database from a file or by pasting JSON. Existing foods (matched by name) are skipped — safe to run multiple times.
          </p>

          {/* AI guide */}
          <div className="rounded-lg border border-border bg-bg p-4 space-y-3">
            <p className="text-sm font-medium text-text">Generate with AI</p>
            <p className="text-sm text-text-sec">
              Copy the prompt below, paste it into any AI (ChatGPT, Claude, Gemini…), describe the foods you want, and paste the result back here.
            </p>
            <div className="relative">
              <pre className="text-xs text-text-sec font-mono bg-card border border-border rounded-lg p-3 whitespace-pre-wrap overflow-x-auto max-h-40 overflow-y-auto">{AI_PROMPT}</pre>
              <button
                onClick={copyPrompt}
                className="absolute top-2 right-2 text-xs px-2 py-1 rounded border border-border bg-bg text-text-sec hover:border-accent hover:text-accent cursor-pointer transition-colors"
              >
                {promptCopied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Format reference */}
          <details className="group">
            <summary className="text-xs text-text-sec cursor-pointer hover:text-text select-none">JSON format reference ▸</summary>
            <div className="mt-2 rounded-lg border border-border bg-bg p-3 space-y-2">
              <p className="text-xs text-text-sec">A plain JSON array. Only <code className="text-accent">name</code> and <code className="text-accent">calories</code> are required. All values are per 100g (or 100ml for liquids).</p>
              <pre className="text-xs font-mono text-text-sec overflow-x-auto">{`[
  {
    "name": "Chicken Breast",   // required
    "calories": 165,            // required — kcal per 100g
    "protein": 31,              // optional, default 0
    "carbs": 0,                 // optional, default 0
    "fat": 3.6,                 // optional, default 0
    "fiber": 0,                 // optional, default 0
    "piece_grams": null,        // optional — g per piece (e.g. 60 for egg)
    "is_liquid": 0              // optional — 1 for drinks, 0 otherwise
  }
]`}</pre>
            </div>
          </details>

          {/* Paste area */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-text">Paste JSON or import from file</p>
            <textarea
              value={pasteText}
              onChange={e => { setPasteText(e.target.value); setPasteError(''); }}
              placeholder={'[\n  { "name": "Chicken Breast", "calories": 165, "protein": 31, "carbs": 0, "fat": 3.6 },\n  ...\n]'}
              rows={7}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text font-mono placeholder:text-text-sec/40 focus:outline-none focus:border-accent resize-y"
            />
            {pasteError && <p className="text-xs text-red">{pasteError}</p>}
            <div className="flex gap-3 flex-wrap">
              <button onClick={handlePasteImport} disabled={importing || !pasteText.trim()} className={btn()}>
                {importing ? 'Importing…' : 'Import pasted JSON'}
              </button>
              <button onClick={handleImportFoods} disabled={importing} className={btn()}>
                {importing ? 'Importing…' : 'Import from file'}
              </button>
            </div>
          </div>
        </div>

        {/* Full JSON export re-import */}
        <div className={card}>
          <p className={sectionTitle}>Import full export (JSON)</p>
          <p className={desc}>
            Re-import a full JSON export — restores foods, food log, weight records, and exercises.
            Records that already exist are skipped.
          </p>
          <button onClick={handleImportFullJson} disabled={importing} className={btn()}>
            {importing ? 'Importing…' : 'Import full JSON export'}
          </button>
        </div>

        {/* Restore DB */}
        <div className={card}>
          <p className={sectionTitle}>Restore database backup</p>
          <p className={desc}>
            Restore from a <code>.db</code> backup file.{' '}
            <span className="text-red font-medium">This replaces all current data</span> and restarts the app.
          </p>
          <button onClick={handlePickRestoreFile} className={btn('danger')}>
            Restore from backup…
          </button>
        </div>
      </section>

      {confirmRestore && (
        <ConfirmDialog
          message="Restore database from backup? All current data will be replaced and the app will restart."
          confirmLabel="Restore & Restart"
          dangerous
          onConfirm={handleConfirmRestore}
          onCancel={() => setConfirmRestore(false)}
        />
      )}
    </div>
  );
}
