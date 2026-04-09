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
      // Detect liquid: check categories for beverages
      const cats = (p.categories_tags || []).join(' ').toLowerCase();
      const isLiquid = /\bbeverage|\bdrink|\bsoda|\bjuice|\bmilk[^s]|\bwater\b|\bbeer|\bwine|\bliquor/.test(cats);
      return {
        name:     p.product_name || '',
        name_en:  p.product_name_en || p.product_name || '',
        name_it:  p.product_name_it || p.product_name || '',
        calories: n['energy-kcal_100g'] || 0,
        protein:  n.proteins_100g || 0,
        carbs:    n.carbohydrates_100g || 0,
        fat:      n.fat_100g || 0,
        fiber:    n.fiber_100g || 0,
        is_liquid: isLiquid,
      };
    } catch (e) {
      console.error('Barcode lookup error:', e.message);
      return null;
    }
  });
}

module.exports = registerBarcodeIpc;
