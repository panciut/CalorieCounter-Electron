import { useState, useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { useT } from '../i18n/useT';
import { useToast } from '../components/Toast';
import { useSettings } from '../hooks/useSettings';
import { api } from '../api';
import ConfirmDialog from '../components/ConfirmDialog';
import FoodSearch from '../components/FoodSearch';
import AddFoodForm from '../components/AddFoodForm';
import type { SearchItem } from '../components/FoodSearch';
import type { Food, FoodPackage } from '../types';

interface FoodFormState {
  name: string; calories: string; protein: string; carbs: string;
  fat: string; fiber: string; piece_grams: string; is_liquid: boolean; is_bulk: boolean; barcode: string;
  opened_days: string; discard_threshold_pct: string; price_per_100g: string; image_url: string;
}

const emptyForm = (): FoodFormState => ({ name:'', calories:'', protein:'', carbs:'', fat:'', fiber:'', piece_grams:'', is_liquid: false, is_bulk: true, barcode: '', opened_days: '7', discard_threshold_pct: '5', price_per_100g: '', image_url: '' });
const foodToForm = (f: Food): FoodFormState => ({ name:f.name, calories:String(f.calories), protein:String(f.protein), carbs:String(f.carbs), fat:String(f.fat), fiber:String(f.fiber), piece_grams:f.piece_grams!=null?String(f.piece_grams):'', is_liquid:f.is_liquid===1, is_bulk: f.is_bulk===1, barcode: f.barcode ?? '', opened_days: f.opened_days != null ? String(f.opened_days) : '', discard_threshold_pct: f.discard_threshold_pct != null ? String(f.discard_threshold_pct) : '5', price_per_100g: f.price_per_100g != null ? String(f.price_per_100g) : '', image_url: f.image_url ?? '' });
const formToData = (f: FoodFormState): Omit<Food,'id'> => ({ name:f.name.trim(), calories:parseFloat(f.calories)||0, protein:parseFloat(f.protein)||0, carbs:parseFloat(f.carbs)||0, fat:parseFloat(f.fat)||0, fiber:parseFloat(f.fiber)||0, piece_grams: f.is_bulk ? null : (f.piece_grams!==''?parseFloat(f.piece_grams):null), is_liquid:f.is_liquid?1:0, is_bulk: f.is_bulk?1:0, barcode: f.barcode.trim() || null, opened_days: f.opened_days !== '' ? parseInt(f.opened_days, 10) : null, discard_threshold_pct: parseFloat(f.discard_threshold_pct) || 5, price_per_100g: f.price_per_100g !== '' ? parseFloat(f.price_per_100g) : null, image_url: f.image_url.trim() || null });

// ── Style tokens (Dashboard + Apple Fitness) ──────────────────────────────────

const eyebrow: CSSProperties = {
  fontSize: 10, fontWeight: 600, letterSpacing: 1.4,
  textTransform: 'uppercase', color: 'var(--fb-text-3)',
};

const serifItalic: CSSProperties = {
  fontFamily: 'var(--font-serif)', fontStyle: 'italic',
};

const cardOuter: CSSProperties = {
  background: 'var(--fb-card)',
  border: '1px solid var(--fb-border)',
  borderRadius: 18,
  padding: 20,
  display: 'flex', flexDirection: 'column', gap: 14,
};

const tinyInput: CSSProperties = {
  width: '100%',
  background: 'var(--fb-card)', border: '1px solid var(--fb-border)',
  color: 'var(--fb-text)',
  borderRadius: 10, padding: '7px 10px',
  fontSize: 13, outline: 'none',
  fontFeatureSettings: '"tnum"',
  transition: 'border-color .25s ease, box-shadow .25s ease',
};

// macro dot colors per column
const MACRO_DOT: Record<string, string> = {
  kcal:    'var(--fb-orange)',
  fat:     'var(--fb-green)',
  carbs:   'var(--fb-amber)',
  fiber:   'var(--fb-text-2)',
  protein: 'var(--fb-red)',
};

// ── FormFields for table edit row ────────────────────────────────────────────

interface FormFieldsProps { form: FoodFormState; patch: (p: Partial<FoodFormState>) => void; }

function FormFields({ form, patch }: FormFieldsProps) {
  const { t } = useT();
  const macros: { key: keyof FoodFormState; label: string; dot: string }[] = [
    { key: 'calories',    label: 'kcal',                  dot: MACRO_DOT.kcal },
    { key: 'fat',         label: t('th.fat'),             dot: MACRO_DOT.fat },
    { key: 'carbs',       label: t('th.carbs'),           dot: MACRO_DOT.carbs },
    { key: 'fiber',       label: t('th.fiber'),           dot: MACRO_DOT.fiber },
    { key: 'protein',     label: t('th.protein'),         dot: MACRO_DOT.protein },
    { key: 'piece_grams', label: t('foods.piecePlaceholder'), dot: 'var(--fb-text-3)' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {form.image_url && (
          <div style={{ flexShrink: 0, padding: 2, background: 'var(--fb-bg)', border: '1px solid var(--fb-border)', borderRadius: 12 }}>
            <img src={form.image_url} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', display: 'block', background: 'white' }} />
          </div>
        )}
        <input
          type="text" value={form.name} onChange={e => patch({ name: e.target.value })}
          placeholder={t('foods.namePlaceholder')}
          style={{
            flex: 1,
            background: 'transparent', border: 0, outline: 'none',
            color: 'var(--fb-text)',
            fontFamily: 'var(--font-serif)', fontStyle: 'italic',
            fontSize: 18, fontWeight: 400, letterSpacing: -0.2,
            borderBottom: '1px solid var(--fb-border-strong)',
            paddingBottom: 5,
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }} className="foods-edit-macros">
        {macros.map(({ key, label, dot }) => (
          <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--fb-text-3)' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: dot, flexShrink: 0 }} />
              {label}
            </span>
            <input
              type="text" inputMode="decimal"
              value={(form as unknown as Record<string,string>)[key]}
              onChange={e => patch({ [key]: e.target.value })}
              placeholder="0"
              className="tnum"
              style={{ ...tinyInput, textAlign: 'center', fontWeight: 600 }}
            />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 2 }}>
        <ToggleInline checked={form.is_liquid} onChange={v => patch({ is_liquid: v })} label={`${t('foods.liquid')} 💧`} />
        <ToggleInline checked={form.is_bulk} onChange={v => patch({ is_bulk: v, piece_grams: v ? '' : form.piece_grams })} label={`${t('foods.bulk')} ⚖️`} title={t('foods.bulkHelp')} />
      </div>
    </div>
  );
}

function ToggleInline({ checked, onChange, label, title }: { checked: boolean; onChange: (v: boolean) => void; label: string; title?: string }) {
  return (
    <label title={title} style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      fontSize: 11.5, fontWeight: 500, color: 'var(--fb-text-2)',
      cursor: 'pointer', userSelect: 'none',
    }}>
      <span
        role="switch" aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          position: 'relative', width: 32, height: 18, borderRadius: 99,
          background: checked ? 'var(--fb-accent)' : 'var(--fb-bg-2)',
          border: '1px solid ' + (checked ? 'var(--fb-accent)' : 'var(--fb-border-strong)'),
          transition: 'background .3s cubic-bezier(0.32,0.72,0,1)',
          flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute', top: 1, left: checked ? 15 : 1,
          width: 14, height: 14, borderRadius: '50%',
          background: 'white',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          transition: 'left .3s cubic-bezier(0.32,0.72,0,1)',
        }} />
      </span>
      {label}
    </label>
  );
}

// ── FoodsPage ─────────────────────────────────────────────────────────────────

type FoodsTab = 'foods' | 'packs';

export default function FoodsPage() {
  const { t } = useT();
  const { showToast } = useToast();
  const { settings } = useSettings();

  const [foods, setFoods] = useState<Food[]>([]);
  const [editId, setEditId] = useState<number|null>(null);
  const [editForm, setEditForm] = useState<FoodFormState>(emptyForm());
  const [newPackGrams, setNewPackGrams] = useState('');
  const [newPackPrice, setNewPackPrice] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [detailMode, setDetailMode] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deletePackId, setDeletePackId] = useState<number | null>(null);
  const [tab, setTab] = useState<FoodsTab>('foods');
  const [packFood, setPackFood] = useState<Food | null>(null);
  const [packGramsInput, setPackGramsInput] = useState('');
  const [packUnit, setPackUnit] = useState<'g' | 'pcs'>('g');
  const [packSearchKey, setPackSearchKey] = useState(0);
  const packGramsRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadFoods(); }, []);

  async function loadFoods() { setFoods(await api.foods.getAll()); }

  function patchEdit(p: Partial<FoodFormState>) { setEditForm(f=>({...f,...p})); }

  async function handleAddPack() {
    const g = parseFloat(newPackGrams);
    if (!g || g <= 0 || !editId) return;
    const price = newPackPrice !== '' ? parseFloat(newPackPrice) : null;
    await api.foods.addPackage({ food_id: editId, grams: g, price: price && price > 0 ? price : null });
    setNewPackGrams('');
    setNewPackPrice('');
    loadFoods();
  }

  async function handleDeletePack(id: number) {
    const res = await api.foods.deletePackage(id);
    setDeletePackId(null);
    if (!res.ok && res.error === 'pack_in_use') {
      showToast(t('foods.packInUse').replace('{n}', String(res.batch_count ?? 0)), 'error');
      return;
    }
    loadFoods();
  }

  function startEdit(food: Food) { setEditId(food.id); setEditForm(foodToForm(food)); }
  function cancelEdit() { setEditId(null); }

  async function handleSaveEdit(food: Food) {
    await api.foods.update({ ...formToData(editForm), id: food.id, favorite: food.favorite });
    showToast(t('common.saved')); cancelEdit(); loadFoods();
  }

  async function handleDelete(id: number) { await api.foods.delete(id); setDeleteId(null); loadFoods(); }
  async function handleToggleFavorite(id: number) { await api.foods.toggleFavorite(id); loadFoods(); }

  async function handleAddPackToFood() {
    const v = parseFloat(packGramsInput);
    if (!packFood || !v || v <= 0) return;
    const grams = packUnit === 'pcs' && packFood.piece_grams ? v * packFood.piece_grams : v;
    await api.foods.addPackage({ food_id: packFood.id, grams });
    setPackGramsInput('');
    setPackFood(null);
    setPackSearchKey(k => k + 1);
    loadFoods();
  }

  async function handleImport() {
    const filePath = await api.import.selectFile();
    if (!filePath) return;
    try {
      const { imported, skipped } = await api.import.foods(filePath);
      showToast(`${t('import.success').replace('{n}', String(imported)).replace('{s}', String(skipped))}`, 'success');
      loadFoods();
    } catch { showToast(t('import.error'), 'error'); }
  }

  const filteredFoods = useMemo(()=>{
    const q = searchQuery.toLowerCase();
    return q ? foods.filter(f=>f.name.toLowerCase().includes(q)) : foods;
  },[foods, searchQuery]);

  const foodSearchItems: SearchItem[] = useMemo(
    () => foods.map(f => ({ ...f, isRecipe: false as const, _freq: 0 })),
    [foods]
  );

  const packRows = useMemo(() => {
    const rows: { food: Food; pkg: FoodPackage }[] = [];
    for (const f of foods) {
      for (const p of f.packages ?? []) rows.push({ food: f, pkg: p });
    }
    const q = searchQuery.toLowerCase();
    const filtered = q ? rows.filter(r => r.food.name.toLowerCase().includes(q)) : rows;
    return filtered.sort((a, b) => a.food.name.localeCompare(b.food.name) || a.pkg.grams - b.pkg.grams);
  }, [foods, searchQuery]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--fb-bg)', color: 'var(--fb-text)', fontFamily: 'var(--font-body)' }}>

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <header style={{ flexShrink: 0, padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--fb-border)', background: 'var(--fb-bg)' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1.6, textTransform: 'uppercase', color: 'var(--fb-accent)' }}>Database</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, fontStyle: 'italic', letterSpacing: -0.4, color: 'var(--fb-text)', lineHeight: 1.1 }}>My Foods</div>
        </div>
        <div style={{
          position: 'relative',
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          padding: 4,
          background: 'var(--fb-bg-2)', border: '1px solid var(--fb-border)',
          borderRadius: 99, minWidth: 220,
        }}>
          <span style={{
            position: 'absolute', top: 4, bottom: 4,
            left: tab === 'foods' ? 4 : 'calc(50% + 0px)',
            width: 'calc(50% - 4px)',
            background: 'var(--fb-card)',
            border: '1px solid var(--fb-border-strong)',
            borderRadius: 99,
            transition: 'left .4s cubic-bezier(0.32,0.72,0,1)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
          }} />
          {(['foods', 'packs'] as FoodsTab[]).map(id => (
            <button
              key={id} onClick={() => setTab(id)}
              style={{
                position: 'relative', zIndex: 1,
                padding: '7px 16px',
                background: 'transparent', border: 0, cursor: 'pointer',
                fontSize: 12, fontWeight: 600, letterSpacing: 0.2,
                color: tab === id ? 'var(--fb-text)' : 'var(--fb-text-2)',
                transition: 'color .3s ease',
              }}
            >
              {id === 'foods' ? t('foods.tabFoods') : t('foods.tabPacks')}
            </button>
          ))}
        </div>
      </header>

      {/* ── BODY ─────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 20, gap: 18 }}>

          {tab === 'foods' && (
            <>
              <div style={{ flexShrink: 0 }}>
                <AddFoodForm
                  existingFoods={foods}
                  onAdded={loadFoods}
                  onImport={handleImport}
                />
              </div>

              <section style={{ ...cardOuter, flex: 1, minHeight: 0, padding: 18 }}>
                {/* Search + detail toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
                  <SearchField value={searchQuery} onChange={setSearchQuery} placeholder={t('foods.searchPlaceholder')} />
                  <button
                    type="button" onClick={() => setDetailMode(v => !v)}
                    style={{
                      padding: '8px 16px', borderRadius: 99,
                      background: detailMode ? 'var(--fb-accent-soft)' : 'var(--fb-bg)',
                      border: '1px solid ' + (detailMode ? 'var(--fb-accent)' : 'var(--fb-border)'),
                      color: detailMode ? 'var(--fb-accent)' : 'var(--fb-text-2)',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      transition: 'all .3s cubic-bezier(0.32,0.72,0,1)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t('foods.detailMode')}
                  </button>
                </div>

                {filteredFoods.length === 0 ? (
                  <EmptyState message={t('foods.noFoods')} />
                ) : (
                  <div style={{
                    flex: 1, minHeight: 0,
                    overflow: 'auto',
                    background: 'var(--fb-bg)',
                    border: '1px solid var(--fb-border)',
                    borderRadius: 14,
                  }} className="hide-scrollbar">
                    <table style={{ width: '100%', minWidth: 800, borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead style={{
                        position: 'sticky', top: 0, zIndex: 1,
                        background: 'var(--fb-card)',
                      }}>
                        <tr>
                          <Th width={36} />
                          <Th width={56} />
                          <Th align="left">{t('th.food')}</Th>
                          <Th align="right" dot={MACRO_DOT.kcal}>{t('th.kcal')}</Th>
                          <Th align="right" dot={MACRO_DOT.fat}>{t('th.fat')}</Th>
                          <Th align="right" dot={MACRO_DOT.carbs}>{t('th.carbs')}</Th>
                          <Th align="right" dot={MACRO_DOT.fiber}>{t('th.fiber')}</Th>
                          <Th align="right" dot={MACRO_DOT.protein}>{t('th.protein')}</Th>
                          <Th align="right">{t('th.piece')}</Th>
                          <Th align="center">{t('th.liquid')}</Th>
                          {detailMode && <Th align="left">{t('th.barcode')}</Th>}
                          {detailMode && <Th align="right">{t('foods.openedDays')}</Th>}
                          {detailMode && <Th align="right">{t('foods.discardThreshold')}</Th>}
                          {detailMode && <Th align="right">{t('foods.pricePer100g').replace('{cur}', settings.currency_symbol ?? '€')}</Th>}
                          <Th width={64} />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredFoods.map(food => (
                          editId === food.id ? (
                            <tr key={food.id} style={{ background: 'var(--fb-card)' }}>
                              <td style={{ padding: '14px 10px', verticalAlign: 'top', textAlign: 'center' }}>
                                <FavBtn active={food.favorite === 1} onClick={() => handleToggleFavorite(food.id)} />
                              </td>
                              <td colSpan={detailMode ? 13 : 9} style={{ padding: '12px 10px' }}>
                                <FormFields form={editForm} patch={patchEdit} />
                                {detailMode && (
                                  <div style={{
                                    display: 'flex', flexWrap: 'wrap', gap: 12,
                                    marginTop: 14, padding: 10,
                                    background: 'var(--fb-bg)', border: '1px solid var(--fb-border)',
                                    borderRadius: 12,
                                  }}>
                                    {[
                                      { label: t('th.barcode'), key: 'barcode', placeholder: 'e.g. 8001234567890', width: 200 },
                                      { label: t('foods.openedDays'), key: 'opened_days', placeholder: 'days', width: 90 },
                                      { label: t('foods.discardThreshold'), key: 'discard_threshold_pct', placeholder: '%', width: 90 },
                                      { label: t('foods.pricePer100g').replace('{cur}', settings.currency_symbol ?? '€'), key: 'price_per_100g', placeholder: '0.00', width: 100 },
                                    ].map(({ label, key, placeholder, width }) => (
                                      <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <span style={{ ...eyebrow, fontSize: 9 }}>{label}</span>
                                        <input
                                          value={(editForm as unknown as Record<string,string>)[key]}
                                          onChange={e => patchEdit({ [key]: e.target.value })}
                                          placeholder={placeholder}
                                          style={{ ...tinyInput, width }}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div style={{
                                  marginTop: 14, padding: 12,
                                  background: 'var(--fb-bg)', border: '1px solid var(--fb-border)',
                                  borderRadius: 12,
                                }}>
                                  <div style={{ ...eyebrow, marginBottom: 8 }}>{t('foods.packs')}</div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {(food.packages ?? []).map(pkg => (
                                      <EditablePackRow key={pkg.id} pkg={pkg} currency={settings.currency_symbol ?? '€'} onSaved={loadFoods} onDelete={() => setDeletePackId(pkg.id)} showError={(msg) => showToast(msg, 'error')} tLocked={t('foods.packInUse')} />
                                    ))}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                                      <input
                                        type="text" inputMode="decimal" value={newPackGrams}
                                        onChange={e => setNewPackGrams(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddPack()}
                                        placeholder="+ g"
                                        style={{ ...tinyInput, width: 80, textAlign: 'center' }}
                                      />
                                      <input
                                        type="text" inputMode="decimal" value={newPackPrice}
                                        onChange={e => setNewPackPrice(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddPack()}
                                        placeholder={`${settings.currency_symbol ?? '€'} opt.`}
                                        style={{ ...tinyInput, width: 100 }}
                                      />
                                      <button type="button" onClick={handleAddPack} style={pillGhost}>+ {t('foods.addPack')}</button>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '14px 10px', verticalAlign: 'top' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  <button type="button" onClick={() => handleSaveEdit(food)} style={pillPrimary}>Save</button>
                                  <button type="button" onClick={cancelEdit} style={pillGhost}>Cancel</button>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            <ViewRow
                              key={food.id}
                              food={food}
                              detailMode={detailMode}
                              currency={settings.currency_symbol ?? '€'}
                              onToggleFav={() => handleToggleFavorite(food.id)}
                              onEdit={() => startEdit(food)}
                              onDelete={() => setDeleteId(food.id)}
                            />
                          )
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}

          {tab === 'packs' && (
            <section style={{ ...cardOuter, flex: 1, minHeight: 0 }}>

              {/* Add pack to food */}
              <div style={{
                background: 'var(--fb-bg)', border: '1px solid var(--fb-border)',
                borderRadius: 14, padding: 14,
                display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0,
              }}>
                <span style={eyebrow}>{t('foods.addPackToFood')}</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                  <div style={{ flex: '1 1 240px', minWidth: 240 }}>
                    <FoodSearch
                      key={packSearchKey}
                      items={foodSearchItems}
                      onSelect={item => {
                        const food = foods.find(f => f.id === item.id) ?? null;
                        setPackFood(food);
                        setPackUnit(food?.piece_grams ? 'pcs' : 'g');
                        setPackGramsInput('');
                        setTimeout(() => packGramsRef.current?.focus(), 0);
                      }}
                      onClear={() => setPackFood(null)}
                      placeholder={t('foods.searchPlaceholder')}
                    />
                  </div>
                  {packFood && (
                    <div style={{
                      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10,
                      padding: 8, background: 'var(--fb-card)', border: '1px solid var(--fb-border-strong)',
                      borderRadius: 12,
                    }}>
                      {packFood.piece_grams && (
                        <div style={{
                          display: 'inline-flex', padding: 3,
                          background: 'var(--fb-bg)', border: '1px solid var(--fb-border)',
                          borderRadius: 99,
                        }}>
                          {(['g', 'pcs'] as const).map(u => (
                            <button
                              key={u} type="button"
                              onClick={() => { setPackUnit(u); setPackGramsInput(''); if (u === 'pcs') packGramsRef.current?.focus(); }}
                              style={{
                                padding: '4px 14px', borderRadius: 99, border: 0,
                                fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                                background: packUnit === u ? 'var(--fb-accent-soft)' : 'transparent',
                                color: packUnit === u ? 'var(--fb-accent)' : 'var(--fb-text-2)',
                                transition: 'all .25s ease',
                              }}
                            >{u}</button>
                          ))}
                        </div>
                      )}
                      <input
                        ref={packGramsRef} type="text" inputMode="decimal"
                        value={packGramsInput}
                        onChange={e => setPackGramsInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddPackToFood()}
                        placeholder={packUnit === 'pcs' ? 'pieces' : 'grams'}
                        style={{ ...tinyInput, width: 100 }}
                      />
                      {packUnit === 'pcs' && packFood.piece_grams && packGramsInput && parseFloat(packGramsInput) > 0 && (
                        <span className="tnum" style={{ fontSize: 11, color: 'var(--fb-text-3)', whiteSpace: 'nowrap' }}>
                          = {Math.round(parseFloat(packGramsInput) * packFood.piece_grams)} g
                        </span>
                      )}
                      <button type="button" onClick={handleAddPackToFood} disabled={!parseFloat(packGramsInput)} style={{ ...pillPrimary, opacity: !parseFloat(packGramsInput) ? 0.4 : 1 }}>
                        {t('common.add')}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <SearchField value={searchQuery} onChange={setSearchQuery} placeholder="Search packs by food name…" />

              {packRows.length === 0 ? (
                <EmptyState message={t('foods.noPacks')} />
              ) : (
                <div style={{
                  flex: 1, minHeight: 0,
                  overflow: 'auto',
                  background: 'var(--fb-bg)', border: '1px solid var(--fb-border)',
                  borderRadius: 14,
                }} className="hide-scrollbar">
                  <table style={{ width: '100%', minWidth: 400, borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--fb-card)' }}>
                      <tr>
                        <Th align="left">{t('th.food')}</Th>
                        <Th align="right">{t('foods.packSize')}</Th>
                        <Th width={64} />
                      </tr>
                    </thead>
                    <tbody>
                      {packRows.map(({ food, pkg }) => (
                        <tr key={pkg.id} className="foods-row">
                          <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--fb-divider)', ...serifItalic, fontSize: 14, color: 'var(--fb-text)' }}>
                            {food.name}
                          </td>
                          <td className="tnum" style={{ padding: '12px 16px', borderBottom: '1px solid var(--fb-divider)', textAlign: 'right', fontWeight: 600, color: 'var(--fb-text)' }}>
                            {pkg.grams} g
                          </td>
                          <td style={{ padding: '8px 16px', borderBottom: '1px solid var(--fb-divider)', textAlign: 'right' }}>
                            <IconBtn label="Delete pack" tone="red" onClick={() => setDeletePackId(pkg.id)}>✕</IconBtn>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

        </div>
      </div>

      {deleteId !== null && (
        <ConfirmDialog message={t('foods.confirmDelete')} confirmLabel={t('common.delete')} cancelLabel={t('common.cancel')} dangerous onConfirm={() => handleDelete(deleteId)} onCancel={() => setDeleteId(null)} />
      )}
      {deletePackId !== null && (
        <ConfirmDialog message={t('foods.confirmDeletePack')} confirmLabel={t('common.delete')} cancelLabel={t('common.cancel')} dangerous onConfirm={() => handleDeletePack(deletePackId)} onCancel={() => setDeletePackId(null)} />
      )}

      <style>{`
        .foods-row:hover { background: color-mix(in srgb, var(--fb-card) 60%, transparent); }
        .foods-row .row-actions { opacity: 0; transition: opacity .25s ease; }
        .foods-row:hover .row-actions { opacity: 1; }
        @media (max-width: 720px) {
          .foods-edit-macros { grid-template-columns: repeat(3, 1fr) !important; }
          .foods-row .row-actions { opacity: 1 !important; }
        }
      `}</style>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

const pillPrimary: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  padding: '7px 16px', borderRadius: 99,
  background: 'var(--fb-accent)', color: 'white', border: 0,
  fontSize: 12, fontWeight: 600, cursor: 'pointer',
  transition: 'all .25s cubic-bezier(0.32,0.72,0,1)',
  whiteSpace: 'nowrap',
};

const pillGhost: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  padding: '7px 16px', borderRadius: 99,
  background: 'transparent', color: 'var(--fb-text-2)',
  border: '1px solid var(--fb-border-strong)',
  fontSize: 12, fontWeight: 600, cursor: 'pointer',
  transition: 'all .25s ease',
  whiteSpace: 'nowrap',
};

function SearchField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div style={{
      flex: 1, minWidth: 220,
      background: 'var(--fb-bg)', border: '1px solid var(--fb-border)',
      borderRadius: 14, padding: 3,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--fb-card)', borderRadius: 11,
        padding: '8px 12px',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--fb-text-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          type="text" value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1, minWidth: 0,
            background: 'transparent', border: 0, outline: 'none',
            color: 'var(--fb-text)',
            fontFamily: 'var(--font-serif)', fontStyle: 'italic',
            fontSize: 14.5, fontWeight: 400, letterSpacing: -0.1,
          }}
        />
        {value && (
          <button
            type="button" onClick={() => onChange('')}
            aria-label="Clear"
            style={{
              width: 20, height: 20, borderRadius: 99, border: 0,
              background: 'var(--fb-bg-2)', color: 'var(--fb-text-3)',
              fontSize: 11, lineHeight: 1, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >✕</button>
        )}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{
      flex: 1, minHeight: 160,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
      background: 'var(--fb-bg)',
      border: '1px dashed var(--fb-border-strong)',
      borderRadius: 14,
      padding: '32px 16px',
    }}>
      <span style={eyebrow}>Empty</span>
      <span style={{ ...serifItalic, fontSize: 16, color: 'var(--fb-text-2)' }}>{message}</span>
    </div>
  );
}

function Th({ children, align = 'left', dot, width }: { children?: React.ReactNode; align?: 'left' | 'right' | 'center'; dot?: string; width?: number }) {
  return (
    <th style={{
      padding: '10px 12px',
      textAlign: align,
      fontSize: 9.5, fontWeight: 600, letterSpacing: 1.2,
      textTransform: 'uppercase', color: 'var(--fb-text-3)',
      borderBottom: '1px solid var(--fb-divider)',
      width: width != null ? width : undefined,
      whiteSpace: 'nowrap',
    }}>
      {dot ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, justifyContent: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: dot }} />
          {children}
        </span>
      ) : children}
    </th>
  );
}

function ViewRow({ food, detailMode, currency, onToggleFav, onEdit, onDelete }:
  { food: Food; detailMode: boolean; currency: string; onToggleFav: () => void; onEdit: () => void; onDelete: () => void }) {
  const td: CSSProperties = {
    padding: '11px 12px',
    borderBottom: '1px solid var(--fb-divider)',
    color: 'var(--fb-text-2)',
  };
  const tdNum: CSSProperties = { ...td, textAlign: 'right' };
  return (
    <tr className="foods-row">
      <td style={{ ...td, textAlign: 'center' }}>
        <FavBtn active={food.favorite === 1} onClick={onToggleFav} />
      </td>
      <td style={td}>
        {food.image_url ? (
          <div style={{ padding: 2, background: 'var(--fb-bg)', border: '1px solid var(--fb-border)', borderRadius: 10, display: 'inline-block' }}>
            <img src={food.image_url} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', display: 'block', background: 'white' }} />
          </div>
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--fb-bg)', border: '1px solid var(--fb-border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--fb-text-3)' }}>🍽️</div>
        )}
      </td>
      <td style={{ ...td, ...serifItalic, fontSize: 14.5, color: 'var(--fb-text)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {food.name}
      </td>
      <td className="tnum" style={{ ...tdNum, color: 'var(--fb-text)', fontWeight: 600 }}>{food.calories}</td>
      <td className="tnum" style={tdNum}>{food.fat}</td>
      <td className="tnum" style={tdNum}>{food.carbs}</td>
      <td className="tnum" style={tdNum}>{food.fiber}</td>
      <td className="tnum" style={tdNum}>{food.protein}</td>
      <td className="tnum" style={{ ...tdNum, color: 'var(--fb-text-3)' }}>{food.piece_grams != null ? `${food.piece_grams}g` : '—'}</td>
      <td style={{ ...td, textAlign: 'center' }}>{food.is_liquid === 1 ? '💧' : ''}</td>
      {detailMode && <td className="tnum" style={{ ...td, fontSize: 11, color: 'var(--fb-text-3)' }}>{food.barcode ?? '—'}</td>}
      {detailMode && <td className="tnum" style={{ ...tdNum, fontSize: 11, color: 'var(--fb-text-3)' }}>{food.opened_days != null ? `${food.opened_days}d` : '—'}</td>}
      {detailMode && <td className="tnum" style={{ ...tdNum, fontSize: 11, color: 'var(--fb-text-3)' }}>{food.discard_threshold_pct != null ? `${food.discard_threshold_pct}%` : '—'}</td>}
      {detailMode && <td className="tnum" style={{ ...tdNum, fontSize: 11, color: 'var(--fb-text-3)' }}>{food.price_per_100g != null ? `${currency}${food.price_per_100g}` : '—'}</td>}
      <td style={{ ...td, textAlign: 'right' }}>
        <span className="row-actions" style={{ display: 'inline-flex', gap: 6 }}>
          <IconBtn label="Edit" onClick={onEdit}>✎</IconBtn>
          <IconBtn label="Delete" tone="red" onClick={onDelete}>✕</IconBtn>
        </span>
      </td>
    </tr>
  );
}

function FavBtn({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick}
      style={{
        background: 'transparent', border: 0, cursor: 'pointer',
        fontSize: 16, lineHeight: 1, padding: 0,
        color: active ? 'var(--fb-accent)' : 'var(--fb-text-3)',
        transition: 'transform .25s cubic-bezier(0.32,0.72,0,1)',
      }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
    >
      {active ? '★' : '☆'}
    </button>
  );
}

function IconBtn({ children, onClick, label, tone }: { children: React.ReactNode; onClick: () => void; label: string; tone?: 'red' }) {
  return (
    <button
      type="button" onClick={onClick} title={label} aria-label={label}
      style={{
        width: 28, height: 28, borderRadius: 99,
        background: 'var(--fb-card)', border: '1px solid var(--fb-border)',
        color: tone === 'red' ? 'var(--fb-red)' : 'var(--fb-text-2)',
        fontSize: 12, lineHeight: 1, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all .25s cubic-bezier(0.32,0.72,0,1)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = tone === 'red' ? 'var(--fb-red)' : 'var(--fb-accent)';
        e.currentTarget.style.color = tone === 'red' ? 'var(--fb-red)' : 'var(--fb-accent)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--fb-border)';
        e.currentTarget.style.color = tone === 'red' ? 'var(--fb-red)' : 'var(--fb-text-2)';
      }}
    >
      {children}
    </button>
  );
}

// ── EditablePackRow ───────────────────────────────────────────────────────────

interface EditablePackRowProps {
  pkg: FoodPackage;
  currency: string;
  onSaved: () => void;
  onDelete: () => void;
  showError: (msg: string) => void;
  tLocked: string;
}

function EditablePackRow({ pkg, currency, onSaved, onDelete, showError, tLocked }: EditablePackRowProps) {
  const [grams, setGrams] = useState(String(pkg.grams));
  const [price, setPrice] = useState(pkg.price != null ? String(pkg.price) : '');

  useEffect(() => { setGrams(String(pkg.grams)); }, [pkg.grams]);
  useEffect(() => { setPrice(pkg.price != null ? String(pkg.price) : ''); }, [pkg.price]);

  async function commit() {
    const g = parseFloat(grams);
    const p = price !== '' ? parseFloat(price) : null;
    if (!g || g <= 0) { setGrams(String(pkg.grams)); return; }
    const samePrice = (p ?? null) === (pkg.price ?? null);
    if (g === pkg.grams && samePrice) return;
    const res = await api.foods.updatePackage({ id: pkg.id, grams: g, price: p });
    if (!res.ok && res.error === 'pack_in_use') {
      showError(tLocked.replace('{n}', String(res.batch_count ?? 0)));
      setGrams(String(pkg.grams));
      setPrice(pkg.price != null ? String(pkg.price) : '');
      return;
    }
    onSaved();
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text" inputMode="decimal" value={grams}
          onChange={e => setGrams(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          style={{ ...tinyInput, width: 80, textAlign: 'center', fontWeight: 600, paddingRight: 22 }}
        />
        <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--fb-text-3)', pointerEvents: 'none' }}>g</span>
      </div>
      <input
        type="text" inputMode="decimal" value={price}
        onChange={e => setPrice(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        placeholder={`${currency} opt.`}
        style={{ ...tinyInput, width: 100 }}
      />
      <IconBtn label="Delete pack" tone="red" onClick={onDelete}>✕</IconBtn>
    </div>
  );
}
