import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../api';
import { useT } from '../i18n/useT';
import { useToast } from './Toast';
import Modal from './Modal';
import FoodMatchModal, { type Candidate } from './FoodMatchModal';
import type { Food, BarcodeResult } from '../types';

const card = 'bg-card border border-border rounded-xl p-4 space-y-3';
const sectionTitle = 'text-base font-semibold text-text';
const desc = 'text-sm text-text-sec';

export default function UnmatchedFoodsList() {
  const { t } = useT();
  const { showToast } = useToast();
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchingId, setSearchingId] = useState<number | null>(null);
  const [matchModal, setMatchModal] = useState<{ food: Food; candidates: Candidate[] } | null>(null);
  const [manualSearch, setManualSearch] = useState<{ food: Food } | null>(null);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const all = await api.foods.getAll();
    setFoods(all.filter(f => !f.barcode || !f.barcode.trim()));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleFind(food: Food) {
    setSearchingId(food.id);
    try {
      const cands = await api.openfoodfacts.findCandidates({
        name: food.name,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        nameMin: 0.2,
        macroPct: 0.10,
        requireKcalConsistent: true,
        limit: 30,
      });
      setSearchingId(null);
      if (cands.length === 0) {
        // No automatic match — open manual search instead
        setManualSearch({ food });
        return;
      }
      setMatchModal({ food, candidates: cands });
    } catch {
      setSearchingId(null);
      setManualSearch({ food });
    }
  }

  async function applyToFood(food: Food, c: BarcodeResult) {
    await api.foods.update({
      ...food,
      name: food.name, // keep user's name; user can rename later if desired
      barcode: c.barcode || food.barcode,
      sugar: food.sugar ?? c.sugar ?? null,
      saturated_fat: food.saturated_fat ?? c.saturated_fat ?? null,
      sodium_mg: food.sodium_mg ?? c.sodium_mg ?? null,
    });
    showToast(t('common.saved'));
    setMatchModal(null);
    setManualSearch(null);
    load();
  }

  const visible = filter
    ? foods.filter(f => f.name.toLowerCase().includes(filter.toLowerCase()))
    : foods;

  return (
    <div className={card}>
      <div className="flex items-center justify-between gap-3">
        <p className={sectionTitle}>{t('data.unmatched.title')}</p>
        <span className="text-xs text-text-sec tabular-nums">
          {foods.length} {t('data.unmatched.count')}
        </span>
      </div>
      <p className={desc}>{t('data.unmatched.description')}</p>

      {foods.length > 0 && (
        <input
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder={t('data.unmatched.filterPlaceholder')}
          className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-text text-sm outline-none focus:border-accent"
        />
      )}

      {loading ? (
        <p className="text-sm text-text-sec text-center py-6">…</p>
      ) : foods.length === 0 ? (
        <p className="text-sm text-text-sec text-center py-6">{t('data.unmatched.empty')}</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-text-sec text-center py-6">{t('data.unmatched.noFilterMatch')}</p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden divide-y divide-border/50 max-h-[60vh] overflow-y-auto">
          {visible.map((food, i) => (
            <div
              key={food.id}
              className={`flex items-center gap-3 px-3 py-2 ${i % 2 === 0 ? 'bg-bg/40' : 'bg-bg/20'} hover:bg-bg/60 transition-colors`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text font-medium truncate">{food.name}</p>
                <p className="text-[11px] text-text-sec tabular-nums">
                  {food.calories} kcal · F {food.fat}g · C {food.carbs}g · P {food.protein}g
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleFind(food)}
                disabled={searchingId === food.id}
                className="px-3 py-1.5 rounded-lg border border-border text-text-sec text-xs hover:border-accent hover:text-accent cursor-pointer disabled:opacity-50 disabled:cursor-wait shrink-0"
              >
                {searchingId === food.id ? '…' : `🔎 ${t('foods.findOffMatch')}`}
              </button>
              <button
                type="button"
                onClick={() => setManualSearch({ food })}
                className="px-3 py-1.5 rounded-lg border border-border text-text-sec text-xs hover:border-accent hover:text-accent cursor-pointer shrink-0"
                title={t('data.unmatched.manualSearch')}
              >
                ✏
              </button>
            </div>
          ))}
        </div>
      )}

      {matchModal && (
        <FoodMatchModal
          isOpen
          title={matchModal.food.name}
          current={{
            name: matchModal.food.name,
            calories: matchModal.food.calories,
            protein: matchModal.food.protein,
            carbs: matchModal.food.carbs,
            fat: matchModal.food.fat,
          }}
          candidates={matchModal.candidates}
          onApply={(c) => applyToFood(matchModal.food, c)}
          onClose={() => setMatchModal(null)}
        />
      )}

      {manualSearch && (
        <ManualSearchModal
          food={manualSearch.food}
          onApply={(c) => applyToFood(manualSearch.food, c)}
          onClose={() => setManualSearch(null)}
        />
      )}
    </div>
  );
}

// ── Manual search modal ──────────────────────────────────────────────────────

interface ManualSearchModalProps {
  food: Food;
  onApply: (c: BarcodeResult) => void;
  onClose: () => void;
}

function ManualSearchModal({ food, onApply, onClose }: ManualSearchModalProps) {
  const { t } = useT();
  const [query, setQuery] = useState(food.name);
  const [results, setResults] = useState<BarcodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const reqIdRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 1) { setResults([]); return; }
    const myId = ++reqIdRef.current;
    setLoading(true);
    const handle = setTimeout(async () => {
      const r = await api.openfoodfacts.searchByName(trimmed, 30);
      if (myId === reqIdRef.current) {
        setResults(r);
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <Modal isOpen onClose={onClose} title={`${t('data.unmatched.manualSearch')} — ${food.name}`} width="max-w-2xl">
      <div className="flex flex-col gap-3">
        <div className="bg-bg border border-border rounded-lg p-3 flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-text-sec font-medium">{t('data.unmatched.yourFood')}</span>
          <p className="text-sm text-text font-medium truncate">{food.name}</p>
          <p className="text-xs text-text-sec tabular-nums">
            {food.calories} kcal · F {food.fat}g · C {food.carbs}g · P {food.protein}g
          </p>
        </div>

        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
          placeholder={t('data.unmatched.searchPlaceholder')}
          className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-text text-sm outline-none focus:border-accent"
        />

        <div className="text-xs text-text-sec">
          {loading ? '…' : `${results.length} ${t('data.unmatched.results')}`}
        </div>

        <div className="rounded-lg border border-border overflow-hidden divide-y divide-border/40 max-h-[50vh] overflow-y-auto">
          {results.length === 0 && !loading ? (
            <p className="text-sm text-text-sec text-center py-6">{t('foods.noOffMatch')}</p>
          ) : results.map((r, i) => (
            <div
              key={`${r.barcode || ''}-${i}`}
              className="flex items-center gap-3 px-3 py-2 hover:bg-bg/60 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-text font-medium truncate">{r.name}</span>
                  {r.brand && <span className="text-[11px] text-text-sec/80 truncate">· {r.brand}</span>}
                  {r.barcode && <span className="text-[10px] text-text-sec/60 tabular-nums ml-auto">#{r.barcode}</span>}
                </div>
                <div className="text-[11px] text-text-sec tabular-nums">
                  <span className="text-text">{r.calories}</span> kcal · F {r.fat}g · C {r.carbs}g · P {r.protein}g
                </div>
              </div>
              <button
                type="button"
                onClick={() => onApply(r)}
                className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:opacity-90 cursor-pointer shrink-0"
              >
                {t('foods.useMatch')}
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border text-text-sec text-sm hover:border-accent/50 hover:text-text cursor-pointer"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
