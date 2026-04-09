document.addEventListener('keydown', async (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
    const tag = document.activeElement?.tagName;
    if (['INPUT','TEXTAREA','SELECT'].includes(tag)) return; // let native undo work
    e.preventDefault();
    const result = await api.undo.pop();
    if (result) {
      _showToast(t('undo.undone') + ': ' + result.description);
      navigate(getCurrentPage()); // refresh current page
    }
  }
});

function _showToast(msg) {
  const el = document.getElementById('undo-toast');
  el.textContent = msg;
  el.style.display = '';
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.style.display = 'none'; }, 3000);
}
