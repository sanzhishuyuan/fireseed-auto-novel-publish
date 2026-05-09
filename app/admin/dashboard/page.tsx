'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SkillManager from '../skills/SkillManager';
import MusicManager from '../music/MusicManager';

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
  const [skillData, setSkillData] = useState<{ missions: any[]; activationStats: any; activeUsers?: any[] } | null>(null);
  const [skillExpanded, setSkillExpanded] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [adminInfo, setAdminInfo] = useState<{ username: string; nickname?: string; role: string; roleLabel: string } | null>(null);
  const [usersExpanded, setUsersExpanded] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [userSearch, setUserSearch] = useState('');
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [userMessage, setUserMessage] = useState('');
  const [openCount, setOpenCount] = useState(0);
  const [taskEvents, setTaskEvents] = useState<any[]>([]);
  const [taskSummary, setTaskSummary] = useState({ unique_workers: 0, total_takes: 0, total_completes: 0 });

  useEffect(() => {
    fetchAdminInfo();
    fetchStats();
    fetchTasksStats();
    const interval = setInterval(() => {
      if (autoRefresh) { fetchStats(); }
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const fetchAdminInfo = async () => {
    try {
      const res = await fetch('/api/admin/me');
      if (res.ok) {
        const data = await res.json();
        if (data.loggedIn && data.admin) {
          setAdminInfo(data.admin);
        }
      }
    } catch {
      // 忽略，不影响主功能
    }
  };

  const fetchStats = async () => {
    setRefreshing(true);
    try {
      // 并发获取管理员信息、统计数据、清理清单、技能数据
      const [statsRes, cleanupRes, skillRes, feedbackRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/cleanup'),
        fetch('/api/admin/skill-dashboard'),
        fetch('/api/admin/feedback'),
      ]);
      
      if (!statsRes.ok) {
        if (statsRes.status === 403 || statsRes.status === 401) {
          router.push('/admin');
          return;
        }
        throw new Error('获取统计失败');
      }
      const statsData = await statsRes.json();
      setStats(statsData.data);

      if (cleanupRes.ok) {
        const cleanupData = await cleanupRes.json();
        setCleanupList(cleanupData.data?.ready_to_cleanup || []);
      }

      if (skillRes.ok) {
        const skillData = await skillRes.json();
        setSkillData({ missions: skillData.missions, activationStats: skillData.activationStats, activeUsers: skillData.activeUsers });
      }

      if (feedbackRes.ok) {
        const feedbackData = await feedbackRes.json();
        setOpenCount(feedbackData.openCount || 0);
      }
    } catch (err) {
      setError('加载数据失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTasksStats = async () => {
    try {
      const res = await fetch('/api/tasks/stats');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTaskSummary(data.summary);
          setTaskEvents(data.recent_events || []);
        }
      }
    } catch {
      // 不影响主流程
    }
  };

  const fetchUsers = async (search = '') => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('limit', '100');
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setUsers(data.users);
          setUsersTotal(data.total);
        }
      }
    } catch {
      // 忽略
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setChangingRole(userId);
    setUserMessage('');
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (data.success) {
        setUserMessage(data.message);
        fetchUsers(userSearch);
      } else {
        setUserMessage(data.error || '操作失败');
      }
    } catch {
      setUserMessage('网络错误');
    } finally {
      setChangingRole(null);
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
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {adminInfo ? `${adminInfo.nickname || adminInfo.username} · ${adminInfo.roleLabel}` : 'FireSeed 平台'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/novels" className="btn-ghost text-sm">小说管理</Link>
            <Link href="/admin/chapters" className="btn-ghost text-sm">章节管理</Link>
            <Link href="/admin/tokens" className="btn-ghost text-sm">Token管理</Link>
            <Link href="/admin/skills" className="btn-ghost text-sm">技能管理</Link>
            <Link href="/admin/feedback" className="btn-ghost text-sm">反馈管理</Link>
            <div className="flex items-center gap-1">
              <button
                onClick={fetchStats}
                disabled={refreshing}
                className="btn-ghost text-sm flex items-center gap-1"
                title="手动刷新"
              >
                <svg className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {refreshing ? '刷新中' : '刷新'}
              </button>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`btn-ghost text-sm ${autoRefresh ? 'text-green-600' : ''}`}
                title={autoRefresh ? '自动刷新已开启（10分钟）' : '自动刷新已关闭'}
              >
                {autoRefresh ? '⏱️ 自动' : '⏱️ 手动'}
              </button>
            </div>
            <button onClick={async () => {
              await fetch('/api/admin/logout', { method: 'POST' });
              router.push('/admin');
            }} className="btn-ghost text-sm">退出</button>
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

        {/* 技能管理（任务编辑 + 激活监控）— 默认展开 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>🤖 技能管理</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                转化: {skillData ? ((skillData.activationStats?.authorsWithNovels || 0) / Math.max(skillData.activationStats?.totalUsers || 1, 1) * 100).toFixed(1) : '?'}%
              </span>
              <Link href="/admin/skills" className="btn-ghost text-xs" target="_blank">新窗口打开</Link>
              <button 
                onClick={() => setSkillExpanded(!skillExpanded)}
                className="btn-ghost text-xs px-2"
              >
                {skillExpanded ? '折叠' : '展开'}
              </button>
            </div>
          </div>
          {skillExpanded && skillData && (
            <SkillManager missions={skillData.missions} activationStats={skillData.activationStats} activeUsers={skillData.activeUsers} />
          )}
          {skillExpanded && !skillData && (
            <div className="card p-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              <div className="w-6 h-6 border-2 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}></div>
              加载技能数据...
            </div>
          )}
        </div>

        {/* 待处理任务 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>⚠️ 待处理任务</h2>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
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
            <TaskCard 
              title="用户反馈" 
              count={openCount}
              description="用户提交的意见与问题"
              action={
                <Link href="/admin/feedback" className="btn-primary text-sm">
                  {openCount > 0 ? `待处理 ${openCount} 条` : '查看'}
                </Link>
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

        {/* 背景音乐管理 */}
        <div className="mb-8">
          <MusicManager />
        </div>

        {/* 快捷操作 */}
        <div>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>⚡ 快捷操作</h2>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
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
            <Link href="/admin/skills" className="card p-4 hover:scale-[1.02] transition-transform">
              <p className="text-lg mb-1">🤖</p>
              <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>技能管理</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>任务编辑 / 激活监控</p>
            </Link>
            <Link href="/admin/feedback" className="card p-4 hover:scale-[1.02] transition-transform">
              <p className="text-lg mb-1">💬</p>
              <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>反馈管理</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{openCount > 0 ? `待处理 ${openCount} 条` : '用户反馈'}</p>
            </Link>
            <a href="/" target="_blank" className="card p-4 hover:scale-[1.02] transition-transform">
              <p className="text-lg mb-1">🌐</p>
              <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>访问前台</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>fireseed.online</p>
            </a>
          </div>
        </div>

        {/* 用户管理（仅 super_admin 可见） */}
        {adminInfo?.role === 'super_admin' && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>👥 用户管理</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>共 {usersTotal} 人</span>
                <button
                  onClick={() => {
                    setUsersExpanded(!usersExpanded);
                    if (!usersExpanded) fetchUsers();
                  }}
                  className="btn-ghost text-xs px-2"
                >
                  {usersExpanded ? '折叠' : '展开'}
                </button>
              </div>
            </div>

            {usersExpanded && (
              <div className="card overflow-hidden">
                {/* 搜索栏 */}
                <div className="p-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchUsers(userSearch)}
                      className="input flex-1"
                      placeholder="搜索用户名..."
                    />
                    <button onClick={() => fetchUsers(userSearch)} className="btn-primary text-sm px-4">搜索</button>
                  </div>
                  {userMessage && (
                    <p className="text-xs mt-2" style={{ color: userMessage.includes('已更新') || userMessage.includes('成功') ? '#10b981' : '#ef4444' }}>
                      {userMessage}
                    </p>
                  )}
                </div>

                {/* 用户表格 */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>用户名</th>
                        <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>当前角色</th>
                        <th className="text-center px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>作品数</th>
                        <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>注册时间</th>
                        <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user: any) => (
                        <tr key={user.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>
                            {user.nickname || user.username}
                            {user.username === '__admin__' && (
                              <span className="text-xs ml-1" style={{ color: '#64748b' }}>(系统)</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              user.role === 'super_admin' ? 'text-purple-400 bg-purple-400/10' :
                              user.role === 'admin' ? 'text-blue-400 bg-blue-400/10' :
                              user.role === 'editor' ? 'text-green-400 bg-green-400/10' :
                              user.role === 'viewer' ? 'text-yellow-400 bg-yellow-400/10' :
                              'text-gray-400 bg-gray-400/10'
                            }`}>
                              {user.roleLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-center" style={{ color: 'var(--text-muted)' }}>{user.novelsCount}</td>
                          <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                            {new Date(user.registeredAt).toLocaleDateString('zh-CN')}
                          </td>
                          <td className="px-4 py-3">
                            {user.username !== '__admin__' && user.role !== 'super_admin' ? (
                              <select
                                value={user.role}
                                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                disabled={changingRole === user.id}
                                className="text-xs px-2 py-1 rounded"
                                style={{
                                  background: 'var(--bg-secondary)',
                                  color: 'var(--text-primary)',
                                  border: '1px solid var(--border-light)',
                                }}
                              >
                                <option value="reader">注册用户</option>
                                <option value="viewer">数据观察员</option>
                                <option value="editor">内容管理员</option>
                                <option value="admin">高级管理员</option>
                              </select>
                            ) : user.role === 'super_admin' ? (
                              <span className="text-xs" style={{ color: '#a78bfa' }}>—</span>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
                            无匹配用户
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 任务执行监控 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>🎯 任务执行监控</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchTasksStats()}
                disabled={refreshing}
                className="btn-ghost text-xs"
              >
                {refreshing ? '刷新中' : '刷新'}
              </button>
            </div>
          </div>

          {/* 摘要 */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="card p-3 text-center">
              <p className="text-xl font-bold" style={{ color: 'var(--accent)' }}>{taskSummary.unique_workers}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>执行者数</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-xl font-bold" style={{ color: '#3b82f6' }}>{taskSummary.total_takes}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>任务领取次数</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-xl font-bold" style={{ color: '#10b981' }}>{taskSummary.total_completes}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>任务完成次数</p>
            </div>
          </div>

          {/* 最近事件 */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>最近执行记录</p>
            </div>
            {taskEvents.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                暂无任务执行记录。AI 客户端领取任务后记录会出现在这里。
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>时间</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>用户</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>操作</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>任务</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taskEvents.slice(0, 20).map((ev: any) => (
                      <tr key={ev.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                          {new Date(ev.created_at).toLocaleString('zh-CN')}
                        </td>
                        <td className="px-4 py-2.5" style={{ color: 'var(--text-primary)' }}>{ev.username || '匿名'}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                            ev.event_type === 'task_take'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {ev.event_type === 'task_take' ? '领取' : '完成'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {ev.task_title || ev.task_id || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
