'use client';

import { useEffect } from 'react';

export default function DownloadRedirectPage() {
  useEffect(() => {
    window.location.replace('/skills');
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="text-center">
        <div className="w-6 h-6 border-2 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>正在跳转到技能排行榜...</p>
      </div>
    </div>
  );
}
