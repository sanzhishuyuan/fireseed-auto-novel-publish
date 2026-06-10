'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * /my/settings 已合并到 /my 的「账户设置」Tab
 * 保留此页面做向后兼容重定向
 */
export default function SettingsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/my');
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
    </div>
  );
}
