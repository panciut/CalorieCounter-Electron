import { useState } from 'react';
import BundlesTab from '../components/recipes/BundlesTab';
import RecipesTab from '../components/recipes/RecipesTab';

type Tab = 'recipes' | 'bundles';

export default function RecipesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('recipes');

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold text-text">Recipes</h1>

      <div className="flex gap-1 border-b border-border">
        {([
          { id: 'recipes', label: 'Recipes' },
          { id: 'bundles', label: 'Bundles' },
        ] as { id: Tab; label: string }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={[
              'px-5 py-2.5 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px',
              activeTab === t.id
                ? 'border-accent text-accent'
                : 'border-transparent text-text-sec hover:text-text',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'recipes' ? <RecipesTab /> : <BundlesTab />}
    </div>
  );
}
