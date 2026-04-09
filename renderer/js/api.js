const api = {
  foods: {
    getAll:         ()     => window.electronAPI.invoke('foods:getAll'),
    getFavorites:   ()     => window.electronAPI.invoke('foods:getFavorites'),
    add:            (data) => window.electronAPI.invoke('foods:add', data),
    delete:         (id)   => window.electronAPI.invoke('foods:delete', { id }),
    update:         (data) => window.electronAPI.invoke('foods:update', data),
    toggleFavorite: (id)   => window.electronAPI.invoke('foods:toggleFavorite', { id }),
  },
  log: {
    getDay:             (date)      => window.electronAPI.invoke('log:getDay', { date }),
    add:                (data)      => window.electronAPI.invoke('log:add', data),
    addQuick:           (data)      => window.electronAPI.invoke('log:addQuick', data),
    update:             (data)      => window.electronAPI.invoke('log:update', data),
    delete:             (id)        => window.electronAPI.invoke('log:delete', { id }),
    getWeeklySummaries: ()          => window.electronAPI.invoke('log:getWeeklySummaries'),
    getWeekDetail:      (weekStart) => window.electronAPI.invoke('log:getWeekDetail', { weekStart }),
  },
  recipes: {
    getAll:  ()     => window.electronAPI.invoke('recipes:getAll'),
    get:     (id)   => window.electronAPI.invoke('recipes:get', { id }),
    create:  (data) => window.electronAPI.invoke('recipes:create', data),
    delete:  (id)   => window.electronAPI.invoke('recipes:delete', { id }),
    log:     (data) => window.electronAPI.invoke('recipes:log', data),
    updateIngredients: (data) => window.electronAPI.invoke('recipes:updateIngredients', data),
  },
  water: {
    getDay: (date) => window.electronAPI.invoke('water:getDay', { date }),
    add:    (data) => window.electronAPI.invoke('water:add', data),
    delete: (id)   => window.electronAPI.invoke('water:delete', { id }),
  },
  weight: {
    getAll: ()     => window.electronAPI.invoke('weight:getAll'),
    add:    (data) => window.electronAPI.invoke('weight:add', data),
    delete: (id)   => window.electronAPI.invoke('weight:delete', { id }),
  },
  supplements: {
    getAll:  ()     => window.electronAPI.invoke('supplements:getAll'),
    add:     (data) => window.electronAPI.invoke('supplements:add', data),
    update:  (data) => window.electronAPI.invoke('supplements:update', data),
    delete:  (id)   => window.electronAPI.invoke('supplements:delete', { id }),
    getDay:  (date) => window.electronAPI.invoke('supplements:getDay', { date }),
    take:    (data) => window.electronAPI.invoke('supplements:take', data),
  },
  settings: {
    get:  ()     => window.electronAPI.invoke('settings:get'),
    save: (data) => window.electronAPI.invoke('settings:save', data),
  },
};
