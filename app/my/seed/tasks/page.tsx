'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useHeaderConfig } from '@/components/HeaderContext';

interface Task {
  id: string;
  title: string;
  description: string;
  link: string;
  emoji: string;
  type: string;
  priority: number;
  seed_reward: number;
  stats: { taken: number; completed: number };
}

export default function SeedTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [wallet, setWallet] = useState<{ balance: number } | null>(null);
  const [loading, setLoading] = useState(true);

  // 隐藏全局 Header（此页面使用自定义内联 Header）
  const { setConfig } = useHeaderConfig();
  useEffect(() => { setConfig({ hideHeader: true }); return () => setConfig({}); }, [setConfig]);

  useEffect(() => {
    Promise.all([
      fetch('/api/tasks', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/seed/balance', { credentials: 'include' }).then(r => r.json()),
    ])
      .then(([taskData, balData]) => {
        if (taskData.success) setTasks(taskData.tasks || []);
        if (balData.success && balData.data) setWallet(balData.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const typeLabels: Record<string, string> = {
    new_user_guide: '新手任务', hot_topic: '热门活动', recall: '召回任务', update_notice: '版本更新',
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="w-6 h-6 border-2 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16" style={{ background: 'var(--bg-primary)' }}>
      <header className="glass sticky top-0 z-50" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M13 8H3M7 4L3 8l4 4"/>
              </svg>
            </Link>
            <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>🌱 SEED 任务奖励</h1>
          </div>
          {wallet && (
            <div className="flex items-center gap-2">
              <Link href="/my/seed" className="btn-ghost text-sm">我的 SEED</Link>
              <span className="text-sm font-medium" style={{ color: '#10b981' }}>🌱 {wallet.balance}</span>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {tasks.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-lg mb-2" style={{ color: 'var(--text-muted)' }}>📭</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>暂无可用任务</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map(task => (
              <div key={task.id} className="card p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{task.emoji}</span>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{task.title}</span>
                      <span className="px-2 py-0.5 rounded text-xs" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                        {typeLabels[task.type] || task.type}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span>已领取: {task.stats?.taken || 0}</span>
                      <span>已完成: {task.stats?.completed || 0}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {task.seed_reward > 0 ? (
                      <div className="px-3 py-1.5 rounded-lg text-sm font-semibold" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                        +{task.seed_reward} 🌱
                      </div>
                    ) : (
                      <div className="px-3 py-1.5 rounded-lg text-xs" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                        暂无奖励
                      </div>
                    )}
                  </div>
                </div>
                {task.link && (
                  <a href={task.link} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-3 text-xs font-medium"
                    style={{ color: 'var(--accent)' }}>
                    前往查看 →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 card p-4 text-center">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            🤖 AI Agent 完成任务后会自动获得 SEED 奖励 · 通过 <code className="px-1 py-0.5 rounded" style={{ background: 'var(--bg-secondary)' }}>POST /api/ai/skill/event</code> 上报
          </p>
        </div>
      </div>
    </div>
  );
}
