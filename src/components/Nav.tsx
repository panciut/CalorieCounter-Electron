import { useNavigate } from '../hooks/useNavigate';
import { useT } from '../i18n/useT';
import { getThisMonday } from '../lib/dateUtil';
import type { PageName } from '../types';

interface NavItem {
  page: PageName;
  labelKey: string;
  shortcut: string;
}

const NAV_ITEMS: NavItem[] = [
  { page: 'dashboard',    labelKey: 'nav.today',        shortcut: '1' },
  { page: 'week',         labelKey: 'nav.week',          shortcut: '2' },
  { page: 'foods',        labelKey: 'nav.foods',         shortcut: '3' },
  { page: 'recipes',      labelKey: 'nav.recipes',       shortcut: '4' },
  { page: 'history',      labelKey: 'nav.history',       shortcut: '5' },
  { page: 'weight',       labelKey: 'nav.weight',        shortcut: '6' },
  { page: 'supplements',  labelKey: 'nav.supplements',   shortcut: '7' },
  { page: 'measurements', labelKey: 'nav.measurements',  shortcut: '8' },
  { page: 'goals',        labelKey: 'nav.goals',         shortcut: '9' },
  { page: 'settings',     labelKey: 'nav.settings',      shortcut: '0' },
];

interface NavProps {
  activePage: PageName;
}

export default function Nav({ activePage }: NavProps) {
  const { navigate } = useNavigate();
  const { t } = useT();

  return (
    <nav className="flex flex-col w-48 shrink-0 bg-nav-bg border-r border-border py-4 gap-0.5 overflow-y-auto">
      <div className="px-4 pb-4 text-accent font-bold text-lg tracking-tight select-none">
        CalorieCounter
      </div>
      {NAV_ITEMS.map(({ page, labelKey, shortcut }) => (
        <button
          key={page}
          onClick={() => page === 'week' ? navigate('week', { weekStart: getThisMonday() }) : navigate(page)}
          className={[
            'flex items-center gap-2.5 px-4 py-2 text-md text-left w-full rounded-none',
            'transition-colors duration-150 cursor-pointer',
            activePage === page
              ? 'bg-accent/15 text-accent font-medium'
              : 'text-text-sec hover:bg-card-hover hover:text-text',
          ].join(' ')}
        >
          <kbd className={[
            'text-xs px-1.5 py-0.5 rounded font-mono shrink-0',
            activePage === page
              ? 'bg-accent/20 text-accent'
              : 'bg-card text-text-sec border border-border',
          ].join(' ')}>
            {shortcut}
          </kbd>
          <span>{t(labelKey)}</span>
        </button>
      ))}
    </nav>
  );
}
