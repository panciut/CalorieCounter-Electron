// ── Internationalization ─────────────────────────────────────────────────────
// When adding new UI strings, ALWAYS add both 'en' and 'it' translations here.

const _translations = {
  en: {
    // ── Nav ──
    'nav.today':     'Today',
    'nav.foods':     'Foods',
    'nav.recipes':   'Recipes',
    'nav.history':   'History',
    'nav.weight':    'Weight',
    'nav.goals':     'Goals',
    'nav.settings':  'Settings',
    'nav.supplements': 'Supplements',

    // ── Supplements ──
    'suppl.title':       'Supplements',
    'suppl.addTitle':    'Add supplement',
    'suppl.namePlaceholder': 'Name (e.g. Multivitamin)',
    'suppl.noSupplements': 'No supplements added yet.',
    'suppl.name':        'Name',
    'suppl.qty':         '# / day',
    'suppl.dashTitle':   'Supplements',
    'suppl.allTaken':    'All taken!',
    'suppl.remaining':   'remaining',

    // ── Common macros ──
    'macro.kcal':    'kcal',
    'macro.protein': 'protein',
    'macro.carbs':   'carbs',
    'macro.fat':     'fat',
    'macro.fiber':   'fiber',

    // ── Common labels ──
    'common.add':       'Add',
    'common.save':      'Save',
    'common.cancel':    'Cancel',
    'common.delete':    'Delete',
    'common.edit':      'Edit',
    'common.name':      'Name',
    'common.grams':     'grams',
    'common.pieces':    'pieces',
    'common.meal':      'Meal',
    'common.per100g':   'per 100g',
    'common.total':     'Total',
    'common.opt':       '(opt.)',
    'common.saved':     'Saved!',
    'common.back':      'Back',

    // ── Meals ──
    'meal.breakfast': 'Breakfast',
    'meal.lunch':     'Lunch',
    'meal.dinner':    'Dinner',
    'meal.snack':     'Snack',

    // ── Dashboard ──
    'dash.water':           'Water',
    'dash.quickAdd':        'Quick add',
    'dash.logFood':         'Log food',
    'dash.newFood':         '+ New food',
    'dash.searchPlaceholder': 'Search food or recipe…',
    'dash.todayEntries':    "Today's entries",
    'dash.nothingLogged':   'Nothing logged yet today.',
    'dash.switchToGrams':   'switch to grams',
    'dash.switchToPieces':  'switch to pieces',
    'dash.logRecipe':       'Log recipe',
    'dash.remaining':       'remaining',
    'dash.overBy':          'Over by',
    'barcode.addByBarcode': 'Add by barcode',
    'barcode.placeholder':  'Enter barcode...',
    'barcode.lookup':       'Lookup',
    'barcode.notFound':     'Product not found',
    'barcode.found':        'Product found!',
    'barcode.scanTitle':    'Scan Barcode',
    'barcode.pointCamera':  'Point camera at barcode...',
    'barcode.selectCamera': 'Select a camera and press Start',
    'barcode.startScan':    'Start',
    'barcode.cameraError':  'Could not access camera',
    'streak.current':       'Current streak',
    'streak.best':          'Best streak',
    'streak.days':          'days',
    'dash.notes':           'Notes',
    'dash.notesPlaceholder':'Add notes for today...',
    'dash.frequent':        'Frequent',
    'dash.custom':          '+ Custom',

    // ── Foods page ──
    'foods.title':          'Food database',
    'foods.addTitle':       'Add food',
    'foods.valuesPerLabel': 'values per 100g',
    'foods.namePlaceholder':'Name',
    'foods.kcalPlaceholder':'kcal',
    'foods.proteinPlaceholder': 'protein g (opt.)',
    'foods.carbsPlaceholder':   'carbs g (opt.)',
    'foods.fatPlaceholder':     'fat g (opt.)',
    'foods.fiberPlaceholder':   'fiber g (opt.)',
    'foods.piecePlaceholder':   'g/piece (opt.)',
    'foods.estimateMacros':     'Estimate macros:',
    'foods.balanced':       'Balanced',
    'foods.highProtein':    'High-protein',
    'foods.highCarb':       'High-carb',
    'foods.keto':           'Keto',
    'foods.noFoods':        'No foods added yet.',
    'foods.piece':          'piece',

    // ── Recipes page ──
    'recipes.title':        'Recipes',
    'recipes.new':          '+ New recipe',
    'recipes.noRecipes':    'No recipes yet. Create one to get started.',
    'recipes.ingredients':  'ingredients',
    'recipes.log':          'Log',

    // ── Recipe create dialog ──
    'rc.title':             'Add new food & log it',
    'rc.newRecipe':         'New Recipe',
    'rc.recipeName':        'Recipe name',
    'rc.recipeNamePlaceholder': 'e.g. Chicken & Rice Bowl',
    'rc.description':       'Description',
    'rc.descOptional':      'optional',
    'rc.addIngredient':     'Add ingredient',
    'rc.searchFood':        'Search food…',
    'rc.createRecipe':      'Create Recipe',

    // ── Recipe log dialog ──
    'rl.logRecipe':         'Log Recipe',
    'rl.scale':             'Scale (portions)',
    'rl.willLog':           'Will log',

    // ── Quick food dialog ──
    'qf.title':             'Add new food & log it',
    'qf.foodName':          'Food name',
    'qf.foodNamePlaceholder':'e.g. Cottage Cheese',
    'qf.kcalPer100':        'kcal / 100g',
    'qf.gramsToLog':        'Grams to log',
    'qf.gPerPiece':         'g / piece',
    'qf.addAndLog':         'Add & log',

    // ── History page ──
    'history.title':        'History',
    'history.noHistory':    'No history yet. Start logging food today!',
    'history.weekOf':       'Week of',
    'history.daysLogged':   'Days logged',
    'history.avgKcal':      'Avg kcal',
    'history.avgProtein':   'Avg protein',
    'history.avgCarbs':     'Avg carbs',
    'history.avgFat':       'Avg fat',
    'history.avgFiber':     'Avg fiber',

    // ── Week page ──
    'week.backToHistory':   '← Back to History',
    'week.noEntries':       'No entries for this week.',
    'week.date':            'Date',
    'week.avgPerDay':       'avg kcal/day',
    'week.avgProtein':      'avg protein',
    'week.avgCarbs':        'avg carbs',
    'week.avgFat':          'avg fat',
    'week.avgFiber':        'avg fiber',

    // ── Day page ──
    'day.back':             '← Back',
    'day.addEntry':         'Add entry',
    'day.entries':          'Entries',
    'day.nothingLogged':    'Nothing logged this day.',

    // ── Weight page ──
    'weight.title':         'Weight',
    'weight.logWeight':     'Log weight',
    'weight.kgPlaceholder': 'kg',
    'weight.current':       'current',
    'weight.goal':          'goal',
    'weight.predictedDate': 'predicted date',
    'weight.noEntries':     'No weight entries yet. Log your first one above.',
    'weight.dateCol':       'Date',
    'weight.weightCol':     'Weight (kg)',
    'weight.reached':       'reached!',
    'weight.wrongWay':      'trend going wrong way',
    'weight.needData':      'need more data',
    'weight.legendWeight':  'Weight',
    'weight.legendTrend':   'Trend',
    'weight.legendGoal':    'Goal',

    // ── Settings / Goals page ──
    'settings.title':       'Goals',
    'settings.dailyCal':    'Daily calories',
    'settings.protein':     'Protein (g)',
    'settings.carbs':       'Carbs (g)',
    'settings.fat':         'Fat (g)',
    'settings.fiber':       'Fiber (g)',
    'settings.goalWeight':  'Goal weight (kg)',
    'settings.waterGoal':   'Daily water goal (ml)',
    'settings.language':    'Language',
    'settings.theme':       'Theme',
    'settings.dark':        'Dark',
    'settings.light':       'Light',

    // ── Water dialog ──
    'water.addWater':       'Add water',
    'water.amountMl':       'Amount (ml)',

    // ── Table headers ──
    'th.food':     'Food',
    'th.g':        'g',
    'th.kcal':     'kcal',
    'th.protein':  'protein',
    'th.carbs':    'carbs',
    'th.fat':      'fat',
    'th.fiber':    'fiber',
    'th.piece':    'piece',
    'th.liquid':   '💧',
    'foods.liquid': 'Liquid',

    // ── Templates ──
    'nav.templates':       'Templates',
    'templates.title':     'Meal Templates',
    'templates.saveToday': 'Save today as template',
    'templates.apply':     'Apply',
    'templates.noTemplates': 'No templates yet.',
    'templates.name':      'Template name',
    'templates.applied':   'Template applied!',
    'templates.items':     'items',

    // ── Import ──
    'import.foods':   'Import',
    'import.success': 'Imported {n} foods, {s} skipped',
    'import.error':   'Import failed',

    // ── Export ──
    'export.title':   'Export Data',
    'export.json':    'Export JSON',
    'export.csv':     'Export CSV',
    'export.success': 'Data exported successfully',

    // ── Measurements ──
    'nav.measurements': 'Measurements',
    'meas.title':       'Body Measurements',
    'meas.addTitle':    'Log Measurements',
    'meas.waist':       'Waist (cm)',
    'meas.chest':       'Chest (cm)',
    'meas.arms':        'Arms (cm)',
    'meas.thighs':      'Thighs (cm)',
    'meas.hips':        'Hips (cm)',
    'meas.neck':        'Neck (cm)',
    'meas.noEntries':   'No measurements yet.',

    // ── Undo ──
    'undo.undone':      'Undone',
  },

  it: {
    // ── Nav ──
    'nav.today':     'Oggi',
    'nav.foods':     'Cibi',
    'nav.recipes':   'Ricette',
    'nav.history':   'Storico',
    'nav.weight':    'Peso',
    'nav.goals':     'Obiettivi',
    'nav.settings':  'Impostazioni',
    'nav.supplements': 'Integratori',

    // ── Supplements ──
    'suppl.title':       'Integratori',
    'suppl.addTitle':    'Aggiungi integratore',
    'suppl.namePlaceholder': 'Nome (es. Multivitaminico)',
    'suppl.noSupplements': 'Nessun integratore aggiunto.',
    'suppl.name':        'Nome',
    'suppl.qty':         '# / giorno',
    'suppl.dashTitle':   'Integratori',
    'suppl.allTaken':    'Tutti presi!',
    'suppl.remaining':   'rimanenti',

    // ── Common macros ──
    'macro.kcal':    'kcal',
    'macro.protein': 'proteine',
    'macro.carbs':   'carboidrati',
    'macro.fat':     'grassi',
    'macro.fiber':   'fibre',

    // ── Common labels ──
    'common.add':       'Aggiungi',
    'common.save':      'Salva',
    'common.cancel':    'Annulla',
    'common.delete':    'Elimina',
    'common.edit':      'Modifica',
    'common.name':      'Nome',
    'common.grams':     'grammi',
    'common.pieces':    'pezzi',
    'common.meal':      'Pasto',
    'common.per100g':   'per 100g',
    'common.total':     'Totale',
    'common.opt':       '(opz.)',
    'common.saved':     'Salvato!',
    'common.back':      'Indietro',

    // ── Meals ──
    'meal.breakfast': 'Colazione',
    'meal.lunch':     'Pranzo',
    'meal.dinner':    'Cena',
    'meal.snack':     'Spuntino',

    // ── Dashboard ──
    'dash.water':           'Acqua',
    'dash.quickAdd':        'Aggiungi rapido',
    'dash.logFood':         'Registra cibo',
    'dash.newFood':         '+ Nuovo cibo',
    'dash.searchPlaceholder': 'Cerca cibo o ricetta…',
    'dash.todayEntries':    'Registrazioni di oggi',
    'dash.nothingLogged':   'Nessuna registrazione oggi.',
    'dash.switchToGrams':   'cambia a grammi',
    'dash.switchToPieces':  'cambia a pezzi',
    'dash.logRecipe':       'Registra ricetta',
    'dash.remaining':       'rimanenti',
    'dash.overBy':          'Oltre di',
    'barcode.addByBarcode': 'Aggiungi tramite codice a barre',
    'barcode.placeholder':  'Inserisci codice a barre...',
    'barcode.lookup':       'Cerca',
    'barcode.notFound':     'Prodotto non trovato',
    'barcode.found':        'Prodotto trovato!',
    'barcode.scanTitle':    'Scansiona Codice a Barre',
    'barcode.pointCamera':  'Punta la fotocamera sul codice a barre...',
    'barcode.selectCamera': 'Seleziona una fotocamera e premi Avvia',
    'barcode.startScan':    'Avvia',
    'barcode.cameraError':  'Impossibile accedere alla fotocamera',
    'streak.current':       'Serie attuale',
    'streak.best':          'Miglior serie',
    'streak.days':          'giorni',
    'dash.notes':           'Note',
    'dash.notesPlaceholder':'Aggiungi note per oggi...',
    'dash.frequent':        'Frequenti',
    'dash.custom':          '+ Personalizzato',

    // ── Foods page ──
    'foods.title':          'Database cibi',
    'foods.addTitle':       'Aggiungi cibo',
    'foods.valuesPerLabel': 'valori per 100g',
    'foods.namePlaceholder':'Nome',
    'foods.kcalPlaceholder':'kcal',
    'foods.proteinPlaceholder': 'proteine g (opz.)',
    'foods.carbsPlaceholder':   'carbo g (opz.)',
    'foods.fatPlaceholder':     'grassi g (opz.)',
    'foods.fiberPlaceholder':   'fibre g (opz.)',
    'foods.piecePlaceholder':   'g/pezzo (opz.)',
    'foods.estimateMacros':     'Stima macro:',
    'foods.balanced':       'Bilanciato',
    'foods.highProtein':    'Iperproteico',
    'foods.highCarb':       'Alto in carbo',
    'foods.keto':           'Keto',
    'foods.noFoods':        'Nessun cibo aggiunto.',
    'foods.piece':          'pezzo',

    // ── Recipes page ──
    'recipes.title':        'Ricette',
    'recipes.new':          '+ Nuova ricetta',
    'recipes.noRecipes':    'Nessuna ricetta. Creane una per iniziare.',
    'recipes.ingredients':  'ingredienti',
    'recipes.log':          'Registra',

    // ── Recipe create dialog ──
    'rc.title':             'Aggiungi nuovo cibo e registralo',
    'rc.newRecipe':         'Nuova Ricetta',
    'rc.recipeName':        'Nome ricetta',
    'rc.recipeNamePlaceholder': 'es. Pollo e Riso',
    'rc.description':       'Descrizione',
    'rc.descOptional':      'opzionale',
    'rc.addIngredient':     'Aggiungi ingrediente',
    'rc.searchFood':        'Cerca cibo…',
    'rc.createRecipe':      'Crea Ricetta',

    // ── Recipe log dialog ──
    'rl.logRecipe':         'Registra Ricetta',
    'rl.scale':             'Scala (porzioni)',
    'rl.willLog':           'Registrer\u00e0',

    // ── Quick food dialog ──
    'qf.title':             'Aggiungi nuovo cibo e registralo',
    'qf.foodName':          'Nome cibo',
    'qf.foodNamePlaceholder':'es. Ricotta',
    'qf.kcalPer100':        'kcal / 100g',
    'qf.gramsToLog':        'Grammi da registrare',
    'qf.gPerPiece':         'g / pezzo',
    'qf.addAndLog':         'Aggiungi e registra',

    // ── History page ──
    'history.title':        'Storico',
    'history.noHistory':    'Nessuno storico. Inizia a registrare oggi!',
    'history.weekOf':       'Settimana del',
    'history.daysLogged':   'Giorni registrati',
    'history.avgKcal':      'Media kcal',
    'history.avgProtein':   'Media proteine',
    'history.avgCarbs':     'Media carbo',
    'history.avgFat':       'Media grassi',
    'history.avgFiber':     'Media fibre',

    // ── Week page ──
    'week.backToHistory':   '\u2190 Torna allo Storico',
    'week.noEntries':       'Nessuna registrazione questa settimana.',
    'week.date':            'Data',
    'week.avgPerDay':       'media kcal/giorno',
    'week.avgProtein':      'media proteine',
    'week.avgCarbs':        'media carbo',
    'week.avgFat':          'media grassi',
    'week.avgFiber':        'media fibre',

    // ── Day page ──
    'day.back':             '\u2190 Indietro',
    'day.addEntry':         'Aggiungi registrazione',
    'day.entries':          'Registrazioni',
    'day.nothingLogged':    'Nessuna registrazione questo giorno.',

    // ── Weight page ──
    'weight.title':         'Peso',
    'weight.logWeight':     'Registra peso',
    'weight.kgPlaceholder': 'kg',
    'weight.current':       'attuale',
    'weight.goal':          'obiettivo',
    'weight.predictedDate': 'data prevista',
    'weight.noEntries':     'Nessuna registrazione. Inserisci il primo peso qui sopra.',
    'weight.dateCol':       'Data',
    'weight.weightCol':     'Peso (kg)',
    'weight.reached':       'raggiunto!',
    'weight.wrongWay':      'tendenza sbagliata',
    'weight.needData':      'servono pi\u00f9 dati',
    'weight.legendWeight':  'Peso',
    'weight.legendTrend':   'Tendenza',
    'weight.legendGoal':    'Obiettivo',

    // ── Settings / Goals page ──
    'settings.title':       'Obiettivi',
    'settings.dailyCal':    'Calorie giornaliere',
    'settings.protein':     'Proteine (g)',
    'settings.carbs':       'Carboidrati (g)',
    'settings.fat':         'Grassi (g)',
    'settings.fiber':       'Fibre (g)',
    'settings.goalWeight':  'Peso obiettivo (kg)',
    'settings.waterGoal':   'Obiettivo acqua (ml)',
    'settings.language':    'Lingua',
    'settings.theme':       'Tema',
    'settings.dark':        'Scuro',
    'settings.light':       'Chiaro',

    // ── Water dialog ──
    'water.addWater':       'Aggiungi acqua',
    'water.amountMl':       'Quantit\u00e0 (ml)',

    // ── Table headers ──
    'th.food':     'Cibo',
    'th.g':        'g',
    'th.kcal':     'kcal',
    'th.protein':  'proteine',
    'th.carbs':    'carbo',
    'th.fat':      'grassi',
    'th.fiber':    'fibre',
    'th.piece':    'pezzo',
    'th.liquid':   '💧',
    'foods.liquid': 'Liquido',

    // ── Templates ──
    'nav.templates':       'Modelli',
    'templates.title':     'Modelli pasto',
    'templates.saveToday': 'Salva oggi come modello',
    'templates.apply':     'Applica',
    'templates.noTemplates': 'Nessun modello.',
    'templates.name':      'Nome modello',
    'templates.applied':   'Modello applicato!',
    'templates.items':     'elementi',

    // ── Import ──
    'import.foods':   'Importa',
    'import.success': 'Importati {n} cibi, {s} saltati',
    'import.error':   'Importazione fallita',

    // ── Export ──
    'export.title':   'Esporta Dati',
    'export.json':    'Esporta JSON',
    'export.csv':     'Esporta CSV',
    'export.success': 'Dati esportati con successo',

    // ── Measurements ──
    'nav.measurements': 'Misure',
    'meas.title':       'Misure Corporee',
    'meas.addTitle':    'Registra Misure',
    'meas.waist':       'Vita (cm)',
    'meas.chest':       'Petto (cm)',
    'meas.arms':        'Braccia (cm)',
    'meas.thighs':      'Cosce (cm)',
    'meas.hips':        'Fianchi (cm)',
    'meas.neck':        'Collo (cm)',
    'meas.noEntries':   'Nessuna misura registrata.',

    // ── Undo ──
    'undo.undone':      'Annullato',
  },
};

let _currentLang = 'en';

/** Get translation for key */
function t(key) {
  const lang = _translations[_currentLang];
  return (lang && lang[key]) || _translations.en[key] || key;
}

/** Get translated meal name */
function tMeal(meal) {
  const map = {
    'Breakfast': 'meal.breakfast',
    'Lunch':     'meal.lunch',
    'Dinner':    'meal.dinner',
    'Snack':     'meal.snack',
  };
  return map[meal] ? t(map[meal]) : meal;
}

/** Get internal meal name from translated name */
function mealFromTranslated(translated) {
  const meals = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
  for (const m of meals) {
    if (tMeal(m) === translated) return m;
  }
  return translated; // fallback
}

/** Set language and refresh UI */
function setLanguage(lang) {
  _currentLang = lang;
  _applyStaticTranslations();
}

function getCurrentLang() {
  return _currentLang;
}

/** Sweep all elements with data-i18n attributes */
function _applyStaticTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  _populateMealSelects();
}

/** Fill all .meal-select dropdowns with translated meal names */
function _populateMealSelects() {
  const meals = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
  document.querySelectorAll('.meal-select').forEach(sel => {
    const curVal = sel.value;
    sel.innerHTML = meals.map(m =>
      `<option value="${m}"${m === (curVal || 'Snack') ? ' selected' : ''}>${tMeal(m)}</option>`
    ).join('');
  });
}
