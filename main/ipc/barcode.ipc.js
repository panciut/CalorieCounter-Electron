const { ipcMain } = require('electron');
const { queryCustomDbBarcode, queryCustomDbName } = require('./customdb.ipc');

// Parse "500 g", "1.5 kg", "330 ml", "6 × 200 g" → grams. Returns null if unparseable.
function parseGrams(str) {
  if (!str || typeof str !== 'string') return null;
  const re = /(\d+(?:[.,]\d+)?)\s*(kg|g|ml|cl|l)\b/gi;
  let match, last = null;
  while ((match = re.exec(str)) !== null) last = match;
  if (!last) return null;
  const num = parseFloat(last[1].replace(',', '.'));
  switch (last[2].toLowerCase()) {
    case 'kg': return num * 1000;
    case 'g':  return num;
    case 'l':  return num * 1000;
    case 'cl': return num * 10;
    case 'ml': return num;
    default:   return null;
  }
}

function registerBarcodeIpc() {
  ipcMain.handle('barcode:lookup', async (_, { barcode }) => {
    const custom = queryCustomDbBarcode(barcode);
    if (custom) return custom;
    try {
      const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}?fields=product_name,product_name_en,product_name_it,nutriments,quantity,serving_size,categories_tags,image_front_small_url`;
      const resp = await fetch(url);
      const json = await resp.json();
      if (json.status !== 1 || !json.product) return null;
      const p = json.product;
      const n = p.nutriments || {};
      // Detect liquid: match exact category tags known to be beverages
      const liquidTags = new Set([
        'en:beverages', 'en:drinks', 'en:sodas', 'en:juices', 'en:fruit-juices',
        'en:waters', 'en:mineral-waters', 'en:spring-waters',
        'en:beers', 'en:wines', 'en:spirits', 'en:liquors',
        'en:milks', 'en:plant-milks', 'en:oat-milks', 'en:almond-milks', 'en:soy-milks',
        'en:teas', 'en:coffees', 'en:energy-drinks', 'en:sports-drinks',
        'en:smoothies', 'en:nectars', 'en:syrups',
      ]);
      const isLiquid = (p.categories_tags || []).some(tag => liquidTags.has(tag.toLowerCase()));
      const r2 = v => Math.round((v || 0) * 100) / 100;
      return {
        name:     p.product_name || '',
        name_en:  p.product_name_en || p.product_name || '',
        name_it:  p.product_name_it || p.product_name || '',
        calories: r2(n['energy-kcal_100g']),
        protein:  r2(n.proteins_100g),
        carbs:    r2(n.carbohydrates_100g),
        fat:      r2(n.fat_100g),
        fiber:    r2(n.fiber_100g),
        is_liquid: isLiquid,
        pack_grams: parseGrams(p.quantity),
        image_url: p.image_front_small_url || null,
      };
    } catch (e) {
      console.error('Barcode lookup error:', e.message);
      return null;
    }
  });

  ipcMain.handle('barcode:search', async (_, { query }) => {
    const customResults = queryCustomDbName(query);
    try {
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&fields=product_name,product_name_en,product_name_it,nutriments,quantity,serving_size,categories_tags,image_front_small_url,code&page_size=10`;
      const resp = await fetch(url);
      const json = await resp.json();
      if (!Array.isArray(json.products)) return customResults;
      const r2 = v => Math.round((v || 0) * 100) / 100;
      const liquidTags = new Set([
        'en:beverages', 'en:drinks', 'en:sodas', 'en:juices', 'en:fruit-juices',
        'en:waters', 'en:mineral-waters', 'en:spring-waters',
        'en:beers', 'en:wines', 'en:spirits', 'en:liquors',
        'en:milks', 'en:plant-milks', 'en:oat-milks', 'en:almond-milks', 'en:soy-milks',
        'en:teas', 'en:coffees', 'en:energy-drinks', 'en:sports-drinks',
        'en:smoothies', 'en:nectars', 'en:syrups',
      ]);
      const apiResults = json.products
        .filter(p => p.product_name)
        .map(p => {
          const n = p.nutriments || {};
          const isLiquid = (p.categories_tags || []).some(tag => liquidTags.has(tag.toLowerCase()));
          return {
            name:       p.product_name || '',
            name_en:    p.product_name_en || p.product_name || '',
            name_it:    p.product_name_it || p.product_name || '',
            calories:   r2(n['energy-kcal_100g']),
            protein:    r2(n.proteins_100g),
            carbs:      r2(n.carbohydrates_100g),
            fat:        r2(n.fat_100g),
            fiber:      r2(n.fiber_100g),
            is_liquid:  isLiquid,
            pack_grams: parseGrams(p.quantity),
            image_url:  p.image_front_small_url || null,
            barcode:    p.code || '',
          };
        });
      return [...customResults, ...apiResults];
    } catch (e) {
      console.error('Barcode search error:', e.message);
      return customResults;
    }
  });
}

module.exports = registerBarcodeIpc;
