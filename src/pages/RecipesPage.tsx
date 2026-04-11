import { useEffect, useState } from 'react';
import { useT } from '../i18n/useT';
import { useToast } from '../components/Toast';
import { api } from '../api';
import FoodSearch from '../components/FoodSearch';
import type { SearchItem } from '../components/FoodSearch';
import MealPills from '../components/MealPills';
import Modal from '../components/Modal';
import { today } from '../lib/dateUtil';
import type { Food, Recipe, RecipeIngredient, Meal } from '../types';

interface DraftIngredient { food: Food; grams: number; }

const INPUT_CLASS = 'bg-bg border border-border rounded-lg px-3 py-2 text-text text-sm outline-none focus:border-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

function n(v: unknown) { return Math.round(Number(v) || 0); }

export default function RecipesPage() {
  const { t } = useT();
  const { showToast } = useToast();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [draftIngredients, setDraftIngredients] = useState<DraftIngredient[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food|null>(null);
  const [selectedGrams, setSelectedGrams] = useState(100);

  // Detail / edit dialog
  const [detailRecipe, setDetailRecipe] = useState<Recipe|null>(null);
  const [detailIngredients, setDetailIngredients] = useState<(RecipeIngredient & { editGrams: number })[]>([]);
  const [addIngFood, setAddIngFood] = useState<Food|null>(null);
  const [addIngGrams, setAddIngGrams] = useState(100);
  const [editingName, setEditingName] = useState('');
  const [editingDesc, setEditingDesc] = useState('');

  // Log dialog
  const [logRecipe, setLogRecipe] = useState<Recipe|null>(null);
  const [logScale, setLogScale] = useState(1);
  const [logMeal, setLogMeal] = useState<Meal>('Breakfast');
  const [logDate, setLogDate] = useState(today());

  useEffect(() => {
    loadRecipes();
    api.foods.getAll().then(setFoods);
  }, []);

  async function loadRecipes() { setRecipes(await api.recipes.getAll()); }

  // ── Create ──────────────────────────────────────────────────────────────────

  function openCreate() {
    setNewName(''); setNewDesc(''); setDraftIngredients([]); setSelectedFood(null); setSelectedGrams(100); setShowCreate(true);
  }

  function addDraftIngredient() {
    if (!selectedFood || selectedGrams <= 0) return;
    setDraftIngredients(prev=>[...prev,{food:selectedFood,grams:selectedGrams}]);
    setSelectedFood(null); setSelectedGrams(100);
  }

  function draftMacro(field:'calories'|'protein'|'carbs'|'fat'|'fiber') {
    return draftIngredients.reduce((s,d)=>s+(Number(d.food[field])||0)*d.grams/100,0);
  }

  async function handleCreate() {
    if (!newName.trim()||!draftIngredients.length) return;
    await api.recipes.create({ name:newName.trim(), description:newDesc.trim(), ingredients:draftIngredients.map(d=>({food_id:d.food.id,grams:d.grams})) });
    setShowCreate(false); await loadRecipes();
  }

  // ── Detail / edit ────────────────────────────────────────────────────────────

  async function openDetail(recipe: Recipe) {
    const full = await api.recipes.get(recipe.id);
    setDetailRecipe(full);
    setDetailIngredients((full.ingredients||[]).map(ing=>({...ing, editGrams: Number(ing.grams)})));
    setEditingName(full.name);
    setEditingDesc(full.description||'');
    setAddIngFood(null);
    setAddIngGrams(100);
  }

  function addDetailIngredient() {
    if (!addIngFood || addIngGrams <= 0) return;
    const fake: RecipeIngredient & { editGrams: number } = {
      id: -(Date.now()), food_id: addIngFood.id, name: addIngFood.name,
      grams: addIngGrams, editGrams: addIngGrams,
      calories: (Number(addIngFood.calories)||0)*addIngGrams/100,
      protein:  (Number(addIngFood.protein)||0)*addIngGrams/100,
      carbs:    (Number(addIngFood.carbs)||0)*addIngGrams/100,
      fat:      (Number(addIngFood.fat)||0)*addIngGrams/100,
      fiber:    (Number(addIngFood.fiber)||0)*addIngGrams/100,
    };
    setDetailIngredients(prev=>[...prev, fake]);
    setAddIngFood(null); setAddIngGrams(100);
  }

  async function saveDetail() {
    if (!detailRecipe) return;
    await api.recipes.updateIngredients({
      id: detailRecipe.id,
      ingredients: detailIngredients.filter(i=>i.editGrams>0).map(i=>({ food_id: i.food_id, grams: i.editGrams })),
    });
    await api.settings.get(); // re-fetch to bust any cache — also fires a reload
    setDetailRecipe(null);
    await loadRecipes();
    showToast(t('common.saved'));
  }

  function detailTotal(field: 'calories'|'protein'|'carbs'|'fat'|'fiber') {
    return detailIngredients.reduce((s,ing)=>{
      const ratio = ing.editGrams / (ing.grams || 1);
      return s + (Number(ing[field])||0) * ratio;
    }, 0);
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  async function handleDelete(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    await api.recipes.delete(id); await loadRecipes();
  }

  // ── Log ─────────────────────────────────────────────────────────────────────

  function openLog(recipe: Recipe, e: React.MouseEvent) {
    e.stopPropagation();
    setLogRecipe(recipe); setLogScale(1); setLogMeal('Breakfast'); setLogDate(today());
  }

  async function handleLog() {
    if (!logRecipe) return;
    await api.recipes.log({ recipe_id:logRecipe.id, date:logDate, meal:logMeal, scale:logScale });
    setLogRecipe(null); showToast(t('recipes.log'));
  }

  const searchItems: SearchItem[] = foods.map(f=>({...f,isRecipe:false as const}));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text">{t('recipes.title')}</h1>
        <button onClick={openCreate} className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 cursor-pointer">{t('recipes.new')}</button>
      </div>

      {/* Recipe grid */}
      {recipes.length === 0 ? (
        <p className="text-text-sec text-center py-16">{t('recipes.noRecipes')}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map(recipe=>(
            <div
              key={recipe.id}
              onClick={()=>openDetail(recipe)}
              className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 relative cursor-pointer hover:border-accent/50 transition-colors"
            >
              <button onClick={e=>handleDelete(recipe.id,e)} className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-text-sec hover:text-red cursor-pointer transition-colors text-xs">✕</button>
              <div className="pr-6">
                <h2 className="font-semibold text-text">{recipe.name}</h2>
                {recipe.description && <p className="text-xs text-text-sec mt-0.5 line-clamp-2">{recipe.description}</p>}
              </div>
              <span className="self-start text-xs bg-bg border border-border text-text-sec px-2 py-0.5 rounded-full">{recipe.ingredient_count} {t('recipes.ingredients')}</span>
              <div className="grid grid-cols-4 gap-1 bg-bg rounded-lg p-2">
                {([
                  [t('macro.kcal'), recipe.calories, ''],
                  [t('macro.protein'), recipe.protein, 'g'],
                  [t('macro.carbs'), recipe.carbs, 'g'],
                  [t('macro.fat'), recipe.fat, 'g'],
                ] as [string, unknown, string][]).map(([label, val, unit])=>(
                  <div key={label} className="flex flex-col items-center">
                    <span className="text-xs text-text-sec">{label}</span>
                    <span className="text-sm font-medium text-text tabular-nums">{n(val)}{unit}</span>
                  </div>
                ))}
              </div>
              <button onClick={e=>openLog(recipe,e)} className="mt-auto bg-accent text-white text-sm py-1.5 rounded-lg font-medium hover:opacity-90 cursor-pointer">{t('recipes.log')}</button>
            </div>
          ))}
        </div>
      )}

      {/* ── Detail / Edit modal ─────────────────────────────────────────────── */}
      <Modal isOpen={!!detailRecipe} onClose={()=>setDetailRecipe(null)} title={detailRecipe?.name ?? ''}>
        {detailRecipe && (
          <div className="flex flex-col gap-4">
            {/* Name + desc */}
            <div className="grid grid-cols-1 gap-2">
              <input className={INPUT_CLASS} value={editingName} onChange={e=>setEditingName(e.target.value)} placeholder={t('rc.recipeName')} />
              <input className={INPUT_CLASS} value={editingDesc} onChange={e=>setEditingDesc(e.target.value)} placeholder={`${t('rc.description')} (${t('rc.descOptional')})`} />
            </div>

            {/* Ingredient list */}
            <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
              <div className="grid grid-cols-[1fr_80px_auto_auto] gap-2 px-1 text-xs text-text-sec uppercase tracking-wider mb-1">
                <span>{t('th.food')}</span>
                <span className="text-right">{t('th.g')}</span>
                <span className="text-right">{t('th.kcal')}</span>
                <span></span>
              </div>
              {detailIngredients.map((ing, i) => {
                const ratio = ing.editGrams / (ing.grams || 1);
                const ingCal = Math.round((Number(ing.calories)||0) * ratio);
                return (
                  <div key={`${ing.id}-${i}`} className="grid grid-cols-[1fr_80px_auto_auto] gap-2 items-center bg-bg rounded-lg px-3 py-2">
                    <span className="text-sm text-text truncate">{ing.name}</span>
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={ing.editGrams}
                      onChange={e=>{
                        const val = parseFloat(e.target.value)||0;
                        setDetailIngredients(prev=>prev.map((x,j)=>j===i?{...x,editGrams:val}:x));
                      }}
                      className={`w-full text-right ${INPUT_CLASS}`}
                    />
                    <span className="text-xs text-text-sec tabular-nums text-right">{ingCal} kcal</span>
                    <button onClick={()=>setDetailIngredients(prev=>prev.filter((_,j)=>j!==i))} className="text-text-sec hover:text-red cursor-pointer text-xs px-1">✕</button>
                  </div>
                );
              })}
            </div>

            {/* Add ingredient */}
            <div className="border-t border-border pt-3">
              <p className="text-xs text-text-sec uppercase tracking-wider mb-2">{t('rc.addIngredient')}</p>
              <FoodSearch items={searchItems} onSelect={item=>setAddIngFood(item as Food)} placeholder={t('rc.searchFood')} />
              {addIngFood && (
                <div className="flex gap-2 items-center mt-2">
                  <span className="flex-1 text-sm text-text truncate">{addIngFood.name}</span>
                  <input type="number" min={1} className={`w-24 ${INPUT_CLASS}`} value={addIngGrams} onChange={e=>setAddIngGrams(Number(e.target.value))} />
                  <span className="text-xs text-text-sec">g</span>
                  <button onClick={addDetailIngredient} className="bg-accent text-white px-3 py-1.5 rounded-lg text-sm cursor-pointer hover:opacity-90">{t('common.add')}</button>
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="grid grid-cols-4 gap-1 bg-bg rounded-lg p-2 border border-border">
              {([
                [t('macro.kcal'), detailTotal('calories'), ''],
                [t('macro.protein'), detailTotal('protein'), 'g'],
                [t('macro.carbs'), detailTotal('carbs'), 'g'],
                [t('macro.fat'), detailTotal('fat'), 'g'],
              ] as [string, number, string][]).map(([l,v,u])=>(
                <div key={l} className="flex flex-col items-center">
                  <span className="text-xs text-text-sec">{l}</span>
                  <span className="text-sm font-semibold text-text tabular-nums">{n(v)}{u}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center gap-2 pt-1">
              <button onClick={()=>{ setLogRecipe(detailRecipe); setDetailRecipe(null); setLogScale(1); setLogMeal('Breakfast'); setLogDate(today()); }} className="border border-border text-text-sec px-4 py-2 rounded-lg text-sm cursor-pointer hover:border-accent hover:text-accent transition-colors">{t('recipes.log')}</button>
              <div className="flex gap-2">
                <button onClick={()=>setDetailRecipe(null)} className="px-4 py-2 rounded-lg text-sm text-text-sec border border-border cursor-pointer hover:text-text">{t('common.cancel')}</button>
                <button onClick={saveDetail} className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer hover:opacity-90">{t('common.save')}</button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Create modal ──────────────────────────────────────────────────── */}
      <Modal isOpen={showCreate} onClose={()=>setShowCreate(false)} title={t('rc.newRecipe')}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-sec">{t('rc.recipeName')}</label>
            <input className={INPUT_CLASS} placeholder={t('rc.recipeNamePlaceholder')} value={newName} onChange={e=>setNewName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-sec">{t('rc.description')} <span className="opacity-60">({t('rc.descOptional')})</span></label>
            <input className={INPUT_CLASS} placeholder={t('rc.descOptional')} value={newDesc} onChange={e=>setNewDesc(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-text-sec">{t('rc.addIngredient')}</label>
            <FoodSearch items={searchItems} onSelect={item=>setSelectedFood(item as Food)} placeholder={t('rc.searchFood')} />
            {selectedFood && (
              <div className="flex gap-2 items-center">
                <span className="flex-1 text-sm text-text truncate">{selectedFood.name}</span>
                <input type="number" min={1} className={`w-24 ${INPUT_CLASS}`} value={selectedGrams} onChange={e=>setSelectedGrams(Number(e.target.value))} />
                <span className="text-xs text-text-sec">g</span>
                <button onClick={addDraftIngredient} className="bg-accent text-white px-3 py-1.5 rounded-lg text-sm cursor-pointer hover:opacity-90">{t('common.add')}</button>
              </div>
            )}
          </div>
          {draftIngredients.length > 0 && (
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
              {draftIngredients.map((d,i)=>(
                <div key={i} className="flex items-center gap-2 bg-bg rounded-lg px-3 py-1.5">
                  <span className="flex-1 text-sm text-text truncate">{d.food.name}</span>
                  <span className="text-xs text-text-sec">{d.grams}g</span>
                  <span className="text-xs text-text-sec">{n(d.food.calories*d.grams/100)}kcal</span>
                  <button onClick={()=>setDraftIngredients(p=>p.filter((_,j)=>j!==i))} className="text-text-sec hover:text-red cursor-pointer text-xs">✕</button>
                </div>
              ))}
              <div className="grid grid-cols-4 gap-1 bg-bg rounded-lg p-2 border border-border mt-1">
                {[['kcal',draftMacro('calories')],['protein',draftMacro('protein')],['carbs',draftMacro('carbs')],['fat',draftMacro('fat')]].map(([l,v])=>(
                  <div key={String(l)} className="flex flex-col items-center">
                    <span className="text-xs text-text-sec">{l}</span>
                    <span className="text-sm font-medium text-text tabular-nums">{n(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={()=>setShowCreate(false)} className="px-4 py-2 rounded-lg text-sm text-text-sec border border-border cursor-pointer hover:text-text">{t('common.cancel')}</button>
            <button onClick={handleCreate} disabled={!newName.trim()||!draftIngredients.length} className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer hover:opacity-90 disabled:opacity-40">{t('rc.createRecipe')}</button>
          </div>
        </div>
      </Modal>

      {/* ── Log modal ──────────────────────────────────────────────────────── */}
      <Modal isOpen={!!logRecipe} onClose={()=>setLogRecipe(null)} title={logRecipe?`${t('rl.logRecipe')}: ${logRecipe.name}`:t('rl.logRecipe')}>
        {logRecipe && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-sec">{t('rl.scale')}</label>
              <input type="number" min={0.1} step={0.1} className={INPUT_CLASS} value={logScale} onChange={e=>setLogScale(Number(e.target.value))} />
            </div>
            <p className="text-sm text-text-sec bg-bg border border-border rounded-lg px-3 py-2">
              {t('rl.willLog')} <span className="font-semibold text-accent">{n(Number(logRecipe.calories)*logScale)} kcal</span>
            </p>
            <MealPills selected={logMeal} onChange={setLogMeal} />
            <input type="date" className={INPUT_CLASS} value={logDate} onChange={e=>setLogDate(e.target.value)} />
            <div className="flex justify-end gap-2">
              <button onClick={()=>setLogRecipe(null)} className="px-4 py-2 rounded-lg text-sm text-text-sec border border-border cursor-pointer">{t('common.cancel')}</button>
              <button onClick={handleLog} className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer hover:opacity-90">{t('recipes.log')}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
