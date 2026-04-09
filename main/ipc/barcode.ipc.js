const { ipcMain } = require('electron');

function registerBarcodeIpc() {
  ipcMain.handle('barcode:lookup', async (_, { barcode }) => {
    try {
      const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}?fields=product_name,product_name_en,product_name_it,nutriments,quantity,serving_size,categories_tags`;
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
      };
    } catch (e) {
      console.error('Barcode lookup error:', e.message);
      return null;
    }
  });
}

module.exports = registerBarcodeIpc;
