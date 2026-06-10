'use client';

import { useState, type ReactNode } from 'react';
import { HeaderContext, type HeaderConfig } from './HeaderContext';
import Header from './Header';

/**
 * Wraps the app and provides both the HeaderContext and the Header component.
 * Place this in the global layout (layout.tsx).
 *
 * Pages can use `useHeaderConfig()` to customize the header:
 *   const { setConfig } = useHeaderConfig();
 *   useEffect(() => { setConfig({ title: novel.title }); }, [novel]);
 */
export function HeaderProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<HeaderConfig>({});

  return (
    <HeaderContext.Provider value={{ config, setConfig }}>
      <Header />
      {children}
    </HeaderContext.Provider>
  );
}
