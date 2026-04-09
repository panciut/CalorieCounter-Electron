async function settingsOnEnter() {
  const s = await api.settings.get();
  document.getElementById('s-cal').value    = Math.round(s.cal_goal);
  document.getElementById('s-protein').value = Math.round(s.protein_goal);
  document.getElementById('s-carbs').value   = Math.round(s.carbs_goal);
  document.getElementById('s-fat').value     = Math.round(s.fat_goal);
  document.getElementById('s-weight').value  = s.weight_goal || '';
  document.getElementById('s-water').value   = Math.round(s.water_goal || 2000);
}

function settingsInitEvents() {
  document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await api.settings.save({
      cal_goal:     +document.getElementById('s-cal').value     || 2000,
      protein_goal: +document.getElementById('s-protein').value || 150,
      carbs_goal:   +document.getElementById('s-carbs').value   || 250,
      fat_goal:     +document.getElementById('s-fat').value     || 70,
      weight_goal:  +document.getElementById('s-weight').value  || 0,
      water_goal:   +document.getElementById('s-water').value   || 2000,
    });
    const saved = document.getElementById('settings-saved');
    saved.style.display = '';
    setTimeout(() => { saved.style.display = 'none'; }, 2000);
  });
}
