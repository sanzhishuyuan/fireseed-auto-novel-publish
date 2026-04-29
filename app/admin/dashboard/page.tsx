'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface AdminStats {
  overview: {
    totalUsers: number;
    totalNovels: number;
    totalChapters: number;
    totalWords: number;
  };
  growth: {
    newUsersToday: number;
    newUsersThisWeek: number;
    newUsersThisMonth: number;
    newChaptersToday: number;
    newWordsToday: number;
  };
  pendingTasks: {
    deletedNovelsPending: number;
    deletedNovelsReady: number;
    pendingCustomBranches: number;
  };
  apiUsage: {
    callsToday: number;
    activeTokens: number;
    usedTokensToday: number;
  };
  interaction: {
    favorites: number;
    comments: number;
  };
}

interface CleanupItem {
  id: string;
  title: string;
  author: string;
  deleted_at: string;
  cleanup_date: string;
  ready_to_cleanup: number;
  days_since_deleted: number;
}

export default function EnhancedAdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [cleanupList, setCleanupList] = useState<CleanupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cleaningUp, setCleaningUp] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // 获取统计数据（依靠登录时设置的 admin_auth cookie 认证）
      const statsRes = await fetch('/api/admin/stats');
      if (!statsRes.ok) {
        if (statsRes.status === 403) {
          router.push('/admin');
          return;
        }
        throw new Error('获取统计失败');
      }
      const statsData = await statsRes.json();
      setStats(statsData.data);

      // 获取待清理清单
      const cleanupRes = await fetch('/api/admin/cleanup');
      if (cleanupRes.ok) {
        const cleanupData = await cleanupRes.json();
        setCleanupList(cleanupData.data?.ready_to_cleanup || []);
      }
    } catch (err) {
      setError('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async (novelId?: string) => {
    if (!confirm('确认永久删除这些小说文件？此操作不可撤销！')) return;
    
    setCleaningUp(true);
    try {
      const url = novelId 
        ? `/api/admin/cleanup?novel_id=${novelId}`
        : '/api/admin/cleanup';
      
      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();
      
      if (data.success) {
        alert(data.message);
        fetchStats();
      } else {
        alert(data.error || '清理失败');
      }
    } catch {
      alert('清理失败');
    } finally {
      setCleaningUp(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}></div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* 顶部导航 */}
      <header className="glass sticky top-0 z-50" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
              <svg width="16" height="16" viewBox="0 0 36 36" fill="none">
                <path d="M11 18C11 18 13.5 11 18 11C22.5 11 25 18 25 18C25 18 22.5 25 18 25C13.5 25 11 18 11 18Z" stroke="var(--accent)" strokeWidth="1.5" fill="none"/>
                <circle cx="18" cy="18" r="4" fill="var(--accent)"/>
              </svg>
            </Link>
            <div>
              <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>管理面板</h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Spark AI 小说平台</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/novels" className="btn-ghost text-sm">小说管理</Link>
            <Link href="/admin/chapters" className="btn-ghost text-sm">章节管理</Link>
            <Link href="/admin/tokens" className="btn-ghost text-sm">Token管理</Link>
            <button onClick={() => router.push('/admin')} className="btn-ghost text-sm">退出</button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
            {error}
          </div>
        )}

        {/* 核心指标 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>📊 核心指标</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              label="注册用户" 
              value={stats?.overview.totalUsers || 0} 
              sub={`今日 +${stats?.growth.newUsersToday || 0}`}
              icon="👥"
              color="#3b82f6"
            />
            <StatCard 
              label="小说总数" 
              value={stats?.overview.totalNovels || 0} 
              sub={`${stats?.overview.totalChapters || 0} 章节`}
              icon="📚"
              color="#10b981"
            />
            <StatCard 
              label="总字数" 
              value={stats?.overview.totalWords || 0} 
              displayValue={formatNumber(stats?.overview.totalWords || 0)}
              sub={`今日 +${formatNumber(stats?.growth.newWordsToday || 0)}`}
              icon="✍️"
              color="#f59e0b"
            />
            <StatCard 
              label="今日更新" 
              value={stats?.growth.newChaptersToday || 0} 
              sub="章节"
              icon="📝"
              color="#8b5cf6"
            />
          </div>
        </div>

        {/* 增长数据 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>📈 增长趋势</h2>
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
            <MiniStat label="今日新增用户" value={stats?.growth.newUsersToday || 0} />
            <MiniStat label="本周新增" value={stats?.growth.newUsersThisWeek || 0} />
            <MiniStat label="本月新增" value={stats?.growth.newUsersThisMonth || 0} />
            <MiniStat label="今日章节" value={stats?.growth.newChaptersToday || 0} />
            <MiniStat label="今日字数" value={stats?.growth.newWordsToday || 0} displayValue={formatNumber(stats?.growth.newWordsToday || 0)} />
            <MiniStat label="今日API调用" value={stats?.apiUsage.callsToday || 0} />
          </div>
        </div>

        {/* 待处理任务 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>⚠️ 待处理任务</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <TaskCard 
              title="待清理小说" 
              count={cleanupList.length}
              ready={cleanupList.filter(n => n.ready_to_cleanup).length}
              description="已软删除超过7天，可以永久清理"
              action={
                cleanupList.length > 0 ? (
                  <button 
                    onClick={() => handleCleanup()}
                    disabled={cleaningUp}
                    className="btn-primary text-sm"
                  >
                    {cleaningUp ? '清理中...' : '立即清理'}
                  </button>
                ) : null
              }
            />
            <TaskCard 
              title="待审核分支" 
              count={stats?.pendingTasks.pendingCustomBranches || 0}
              description="读者提交的自定义剧情分支"
              action={
                (stats?.pendingTasks.pendingCustomBranches || 0) > 0 ? (
                  <Link href="/admin/chapters" className="btn-primary text-sm">去审核</Link>
                ) : null
              }
            />
            <TaskCard 
              title="API Token" 
              count={stats?.apiUsage.activeTokens || 0}
              description={`今日已使用 ${stats?.apiUsage.usedTokensToday || 0} 次`}
              action={
                <Link href="/admin/tokens" className="btn-ghost text-sm">管理</Link>
              }
            />
          </div>
        </div>

        {/* 待清理清单 */}
        {cleanupList.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>🗑️ 待清理文件</h2>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>小说</th>
                      <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>作者</th>
                      <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>删除时间</th>
                      <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>已过天数</th>
                      <th className="text-right px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cleanupList.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>{item.title}</td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{item.author}</td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{new Date(item.deleted_at).toLocaleDateString('zh-CN')}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className="badge badge-warning">{item.days_since_deleted} 天</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button 
                            onClick={() => handleCleanup(item.id)}
                            disabled={cleaningUp}
                            className="text-sm hover:underline"
                            style={{ color: '#ef4444' }}
                          >
                            删除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 读者互动 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>💬 读者互动</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="card p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: 'rgba(239,68,68,0.1)' }}>
                ❤️
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats?.interaction.favorites || 0}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>收藏数</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: 'rgba(59,130,246,0.1)' }}>
                💬
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats?.interaction.comments || 0}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>评论数</p>
              </div>
            </div>
          </div>
        </div>

        {/* 快捷操作 */}
        <div>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>⚡ 快捷操作</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/admin/novels" className="card p-4 hover:scale-[1.02] transition-transform">
              <p className="text-lg mb-1">📚</p>
              <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>小说管理</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>新建/编辑小说</p>
            </Link>
            <Link href="/admin/chapters" className="card p-4 hover:scale-[1.02] transition-transform">
              <p className="text-lg mb-1">📝</p>
              <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>章节管理</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>发布/编辑章节</p>
            </Link>
            <Link href="/admin/tokens" className="card p-4 hover:scale-[1.02] transition-transform">
              <p className="text-lg mb-1">🔑</p>
              <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Token管理</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>AI授权管理</p>
            </Link>
            <a href="/" target="_blank" className="card p-4 hover:scale-[1.02] transition-transform">
              <p className="text-lg mb-1">🌐</p>
              <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>访问前台</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>fireseed.online</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, displayValue, sub, icon, color }: { label: string; value: number; displayValue?: string; sub: string; icon: string; color: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: `${color}18` }}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{displayValue || formatNumber(value)}</div>
      <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div className="text-xs" style={{ color: 'var(--accent)' }}>{sub}</div>
    </div>
  );
}

function MiniStat({ label, value, displayValue }: { label: string; value: number; displayValue?: string }) {
  return (
    <div className="card p-3 text-center">
      <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{displayValue || formatNumber(value)}</p>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  );
}

function TaskCard({ title, count, description, action, ready }: { title: string; count: number; description: string; action?: React.ReactNode; ready?: number }) {
  const hasReady = ready && ready > 0;
  
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        {hasReady && (
          <span className="badge badge-warning text-xs">{ready} 可清理</span>
        )}
      </div>
      <p className="text-3xl font-bold mb-2" style={{ color: count > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>{count}</p>
      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{description}</p>
      {action}
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 10000000) return (num / 10000000).toFixed(1) + 'kw';
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}
