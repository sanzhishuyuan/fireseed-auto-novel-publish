'use client';

import { useEffect } from 'react';
import { useHeaderConfig } from '@/components/HeaderContext';

/**
 * Renders nothing visible.
 * Placed inside server-component pages so the global header is hidden
 * while the page keeps its own inline header markup.
 */
export default function HideHeader() {
  const { setConfig } = useHeaderConfig();
  useEffect(() => {
    setConfig({ hideHeader: true });
    return () => setConfig({});
  }, [setConfig]);
  return null;
}
