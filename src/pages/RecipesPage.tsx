import { useState } from 'react';
import BundlesTab from '../components/recipes/BundlesTab';
import RecipesTab from '../components/recipes/RecipesTab';
import { PageHeader, SegmentedControl } from '../lib/fbUI';

type Tab = 'recipes' | 'bundles';

export default function RecipesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('recipes');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--fb-bg)', color: 'var(--fb-text)', fontFamily: 'var(--font-body)' }}>

      <PageHeader
        eyebrow="Kitchen"
        title="Recipes"
        right={
          <SegmentedControl<Tab>
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { value: 'recipes', label: 'Recipes' },
              { value: 'bundles', label: 'Bundles' },
            ]}
          />
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 60px' }} className="hide-scrollbar">
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          {activeTab === 'recipes' ? <RecipesTab /> : <BundlesTab />}
        </div>
      </div>
    </div>
  );
}
