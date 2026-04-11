import { createContext, useContext, useState } from 'react';
import { createElement } from 'react';
import type { ReactNode } from 'react';
import type { PageName, NavParam } from '../types';

interface NavigationState {
  page: PageName;
  param?: NavParam;
}

interface NavigationContextValue extends NavigationState {
  navigate: (page: PageName, param?: NavParam) => void;
}

export const NavigationContext = createContext<NavigationContextValue>({
  page: 'dashboard',
  navigate: () => {},
});

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [nav, setNav] = useState<NavigationState>({ page: 'dashboard' });

  function navigate(page: PageName, param?: NavParam) {
    setNav({ page, param });
  }

  return createElement(
    NavigationContext.Provider,
    { value: { ...nav, navigate } },
    children,
  );
}

export function useNavigate() {
  return useContext(NavigationContext);
}
