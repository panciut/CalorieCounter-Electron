import { useState } from 'react';
import { api } from '../api';
import type { BarcodeSearchResult } from '../types';

interface FoodNameSearchProps {
  onResult: (result: BarcodeSearchResult) => void;
}

export default function FoodNameSearch({ onResult }: FoodNameSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BarcodeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  async function handleSearch() {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError('');
    setSearched(false);
    try {
      const res = await api.barcode.search(q);
      setResults(res);
      setSearched(true);
    } catch {
      setError('Errore di ricerca, riprova');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Es. pasta barilla, latte intero…"
          className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-text text-sm outline-none focus:border-accent"
          autoFocus
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={!query.trim() || loading}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 cursor-pointer shrink-0"
        >
          {loading ? '…' : 'Cerca'}
        </button>
      </div>

      {error && <p className="text-red text-sm">{error}</p>}
      {searched && results.length === 0 && !error && (
        <p className="text-text-sec text-sm text-center py-4">Nessun prodotto trovato</p>
      )}
      {results.length > 0 && (
        <ul className="flex flex-col gap-1 max-h-72 overflow-y-auto">
          {results.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => onResult(r)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-card-hover transition-colors text-left cursor-pointer"
              >
                {r.image_url ? (
                  <img src={r.image_url} alt="" className="w-10 h-10 object-contain rounded shrink-0 bg-bg" />
                ) : (
                  <div className="w-10 h-10 rounded bg-bg border border-border shrink-0 flex items-center justify-center text-lg">🥫</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text truncate">{r.name}</p>
                  <p className="text-xs text-text-sec">{r.calories > 0 ? `${r.calories} kcal/100g` : 'kcal non disponibili'}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
