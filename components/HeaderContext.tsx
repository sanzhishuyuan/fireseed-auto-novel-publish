'use client';

import { createContext, useContext } from 'react';

export interface HeaderConfig {
  /** Page title shown in back-arrow variant */
  title?: string;
  /** Back navigation href (defaults to route-based detection) */
  backHref?: string;
  /** Extra elements rendered on the right side of the header */
  rightContent?: React.ReactNode;
  /** Completely hide the global header (admin, reading, my pages) */
  hideHeader?: boolean;
  /** Force full nav variant (override route detection) */
  forceFullNav?: boolean;
}

interface HeaderContextValue {
  config: HeaderConfig;
  setConfig: (config: HeaderConfig) => void;
}

export const HeaderContext = createContext<HeaderContextValue>({
  config: {},
  setConfig: () => {},
});

export function useHeaderConfig() {
  return useContext(HeaderContext);
}
