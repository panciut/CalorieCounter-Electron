class FoodSearch {
  constructor(inputId, resultsId, onSelect) {
    this.input    = document.getElementById(inputId);
    this.results  = document.getElementById(resultsId);
    this.onSelect = onSelect;
    this.fuse     = null;
    this.activeIndex = -1;
    this._bind();
  }

  setItems(items) {
    this.fuse = new Fuse(items, {
      keys: ['name'],
      threshold: 0.4,
      distance: 100,
      minMatchCharLength: 1,
    });
    this._items = items;
  }

  _bind() {
    this.input.addEventListener('input',   () => this._onInput());
    this.input.addEventListener('keydown', (e) => this._onKeydown(e));
    document.addEventListener('click', (e) => {
      if (!this.results.contains(e.target) && e.target !== this.input) this._hide();
    });
  }

  _onInput() {
    const q = this.input.value.trim();
    if (!q || !this.fuse) { this._hide(); return; }
    const hits = this.fuse.search(q).slice(0, 15).map(r => r.item);
    // Boost frequent foods to the top while keeping fuzzy relevance
    hits.sort((a, b) => (b._freq || 0) - (a._freq || 0));
    this._render(hits.slice(0, 10));
  }

  _render(items) {
    this.results.innerHTML = '';
    this.activeIndex = -1;
    if (!items.length) { this._hide(); return; }

    items.forEach(item => {
      const li = document.createElement('li');
      li.className = 'search-result-item';
      if (item.isRecipe) {
        const badge = document.createElement('span');
        badge.className = 'recipe-badge';
        badge.textContent = 'recipe';
        li.appendChild(badge);
        li.appendChild(document.createTextNode(' ' + item.name));
      } else {
        li.textContent = item.name;
      }
      li.addEventListener('mousedown', (e) => { e.preventDefault(); this._select(item); });
      this.results.appendChild(li);
    });

    this.results.style.display = '';
  }

  _onKeydown(e) {
    const items = this.results.querySelectorAll('li');
    if (!items.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.activeIndex = Math.min(this.activeIndex + 1, items.length - 1);
      this._updateActive(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.activeIndex = Math.max(this.activeIndex - 1, 0);
      this._updateActive(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (this.activeIndex >= 0) items[this.activeIndex].dispatchEvent(new Event('mousedown'));
    } else if (e.key === 'Escape') {
      this._hide();
    }
  }

  _updateActive(items) {
    items.forEach((li, i) => li.classList.toggle('active', i === this.activeIndex));
    if (this.activeIndex >= 0) items[this.activeIndex].scrollIntoView({ block: 'nearest' });
  }

  _select(item) {
    this.input.value = item.name;
    this._hide();
    this.onSelect(item);
  }

  _hide() {
    this.results.style.display = 'none';
    this.activeIndex = -1;
  }

  clear() {
    this.input.value = '';
    this._hide();
  }
}
