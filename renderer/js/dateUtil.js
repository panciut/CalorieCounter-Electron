/** Convert YYYY-MM-DD to dd/mm/yyyy */
function fmtDate(iso) {
  if (!iso || iso.length < 10) return iso || '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}
