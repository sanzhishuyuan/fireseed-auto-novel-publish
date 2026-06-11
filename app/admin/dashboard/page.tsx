'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useHeaderConfig } from '@/components/HeaderContext';
import SkillManager from '../skills/SkillManager';
import MusicManager from '../music/MusicManager';

// ── Obsidian Codex Palette ──────────────────────────────────────────────
const C = {
  bg: '#0b0b0f',
  card: '#131318',
  elevated: '#1a1a22',
  hover: '#22222c',
  text: '#f0ece4',
  dim: '#9a9a8e',
  muted: '#5a5a52',
  gold: '#c9a55c',
  goldLight: '#e4cc8a',
  goldGlow: 'rgba(201,165,92,0.12)',
  goldBorder: 'rgba(201,165,92,0.2)',
  border: 'rgba(255,255,255,0.06)',
  green: '#22c55e',
  greenGlow: 'rgba(34,197,94,0.12)',
  red: '#ef4444',
  blue: '#3b82f6',
  purple: '#a855f7',
} as const;

const fontDisplay = "'Fraunces', Georgia, serif";
const fontMono = "'DM Mono', 'Menlo', monospace";

// ── Interfaces ──────────────────────────────────────────────────────────
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

// ── Helpers ─────────────────────────────────────────────────────────────
function formatNumber(num: number): string {
  if (num >= 10000000) return (num / 10000000).toFixed(1) + 'kw';
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}

// ── Sub-components ──────────────────────────────────────────────────────
function StatCard({ label, value, displayValue, sub, icon, color }: { label: string; value: number; displayValue?: string; sub: string; icon: string; color: string }) {
  return (
    <div
      className="codex-card"
      style={{ padding: 20 }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            background: `${color}18`,
          }}
        >
          {icon}
        </div>
      </div>
      <div
        style={{
          fontFamily: fontDisplay,
          fontSize: 28,
          fontWeight: 700,
          color: C.text,
          marginBottom: 4,
          lineHeight: 1.1,
        }}
      >
        {displayValue || formatNumber(value)}
      </div>
      <div
        style={{
          fontFamily: fontMono,
          fontSize: 11,
          color: C.muted,
          marginBottom: 4,
          letterSpacing: '0.02em',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: fontMono,
          fontSize: 11,
          color: C.gold,
          letterSpacing: '0.02em',
        }}
      >
        {sub}
      </div>
    </div>
  );
}

function MiniStat({ label, value, displayValue }: { label: string; value: number; displayValue?: string }) {
  return (
    <div
      className="codex-card"
      style={{ padding: 12, textAlign: 'center' }}
    >
      <p
        style={{
          fontFamily: fontDisplay,
          fontSize: 20,
          fontWeight: 700,
          color: C.text,
          margin: 0,
          lineHeight: 1.2,
        }}
      >
        {displayValue || formatNumber(value)}
      </p>
      <p
        style={{
          fontFamily: fontMono,
          fontSize: 11,
          color: C.muted,
          margin: '4px 0 0',
          letterSpacing: '0.02em',
        }}
      >
        {label}
      </p>
    </div>
  );
}

function TaskCard({ title, count, description, action, ready }: { title: string; count: number; description: string; action?: React.ReactNode; ready?: number }) {
  const hasReady = ready && ready > 0;

  return (
    <div
      className="codex-card"
      style={{ padding: 20 }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <h3
          style={{
            fontFamily: fontDisplay,
            fontSize: 14,
            fontWeight: 600,
            color: C.text,
            margin: 0,
          }}
        >
          {title}
        </h3>
        {hasReady && (
          <span
            className="codex-badge-gold"
            style={{ fontSize: 11 }}
          >
            {ready} 可清理
          </span>
        )}
      </div>
      <p
        style={{
          fontFamily: fontDisplay,
          fontSize: 30,
          fontWeight: 700,
          color: count > 0 ? C.gold : C.muted,
          margin: '0 0 8px',
          lineHeight: 1.1,
        }}
      >
        {count}
      </p>
      <p
        style={{
          fontFamily: fontMono,
          fontSize: 11,
          color: C.muted,
          margin: '0 0 12px',
          letterSpacing: '0.02em',
        }}
      >
        {description}
      </p>
      {action}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────
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
  const [seedExpanded, setSeedExpanded] = useState(true);
  const [seedUserId, setSeedUserId] = useState('');
  const [seedAmount, setSeedAmount] = useState('');
  const [seedReason, setSeedReason] = useState('');
  const [seedMessage, setSeedMessage] = useState('');
  const [seedLoading, setSeedLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [userSearch, setUserSearch] = useState('');
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [userMessage, setUserMessage] = useState('');
  const [openCount, setOpenCount] = useState(0);
  const [taskEvents, setTaskEvents] = useState<any[]>([]);
  const [taskSummary, setTaskSummary] = useState({ unique_workers: 0, total_takes: 0, total_completes: 0 });

  // 隐藏全局 Header（此页面使用自定义内联 Header）
  const { setConfig } = useHeaderConfig();
  useEffect(() => { setConfig({ hideHeader: true }); return () => setConfig({}); }, [setConfig]);

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
      params.set('limit', '30');
      params.set('sort', 'newest');
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

  // ── Loading state ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: C.bg,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            className="codex-animate"
            style={{
              width: 32,
              height: 32,
              border: `2px solid ${C.gold}`,
              borderTopColor: 'transparent',
              borderRadius: '50%',
              margin: '0 auto 16px',
            }}
          />
          <p
            style={{
              fontFamily: fontMono,
              fontSize: 13,
              color: C.muted,
            }}
          >
            加载中...
          </p>
        </div>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      {/* ── 顶部导航 ────────────────────────────────────────────────── */}
      <header
        className="codex-shell"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          borderBottom: `1px solid ${C.border}`,
          backdropFilter: 'blur(12px)',
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link
              href="/"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: C.goldGlow,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 36 36" fill="none">
                <path d="M11 18C11 18 13.5 11 18 11C22.5 11 25 18 25 18C25 18 22.5 25 18 25C13.5 25 11 18 11 18Z" stroke={C.gold} strokeWidth="1.5" fill="none"/>
                <circle cx="18" cy="18" r="4" fill={C.gold}/>
              </svg>
            </Link>
            <div>
              <h1
                style={{
                  fontFamily: fontDisplay,
                  fontSize: 16,
                  fontWeight: 600,
                  color: C.text,
                  margin: 0,
                }}
              >
                管理面板
              </h1>
              <p
                style={{
                  fontFamily: fontMono,
                  fontSize: 11,
                  color: C.muted,
                  margin: 0,
                }}
              >
                {adminInfo ? `${adminInfo.nickname || adminInfo.username} · ${adminInfo.roleLabel}` : 'FireSeed 平台'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Link href="/admin/novels" className="codex-btn-ghost" style={{ fontSize: 13 }}>小说管理</Link>
            <Link href="/admin/chapters" className="codex-btn-ghost" style={{ fontSize: 13 }}>章节管理</Link>
            <Link href="/admin/tokens" className="codex-btn-ghost" style={{ fontSize: 13 }}>Token管理</Link>
            <Link href="/admin/skills" className="codex-btn-ghost" style={{ fontSize: 13 }}>技能管理</Link>
            <Link href="/admin/feedback" className="codex-btn-ghost" style={{ fontSize: 13 }}>反馈管理</Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={fetchStats}
                disabled={refreshing}
                className="codex-btn-ghost"
                style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}
                title="手动刷新"
              >
                <svg
                  width={14}
                  height={14}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  className={refreshing ? 'codex-animate' : ''}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {refreshing ? '刷新中' : '刷新'}
              </button>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className="codex-btn-ghost"
                style={{ fontSize: 13, color: autoRefresh ? C.green : C.dim }}
                title={autoRefresh ? '自动刷新已开启（10分钟）' : '自动刷新已关闭'}
              >
                {autoRefresh ? '⏱️ 自动' : '⏱️ 手动'}
              </button>
            </div>
            <button
              onClick={async () => {
                await fetch('/api/admin/logout', { method: 'POST' });
                router.push('/admin');
              }}
              className="codex-btn-ghost"
              style={{ fontSize: 13 }}
            >
              退出
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>
        {error && (
          <div
            className="codex-tip-danger"
            style={{ marginBottom: 24, padding: 16, borderRadius: 12, fontSize: 14 }}
          >
            {error}
          </div>
        )}

        {/* ── 核心指标 ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <h2
            className="codex-section-title"
            style={{
              fontFamily: fontDisplay,
              fontSize: 18,
              fontWeight: 600,
              color: C.text,
              marginBottom: 16,
            }}
          >
            📊 核心指标
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 16,
            }}
          >
            <StatCard
              label="注册用户"
              value={stats?.overview.totalUsers || 0}
              sub={`今日 +${stats?.growth.newUsersToday || 0}`}
              icon="👥"
              color={C.blue}
            />
            <StatCard
              label="小说总数"
              value={stats?.overview.totalNovels || 0}
              sub={`${stats?.overview.totalChapters || 0} 章节`}
              icon="📚"
              color={C.green}
            />
            <StatCard
              label="总字数"
              value={stats?.overview.totalWords || 0}
              displayValue={formatNumber(stats?.overview.totalWords || 0)}
              sub={`今日 +${formatNumber(stats?.growth.newWordsToday || 0)}`}
              icon="✍️"
              color={C.gold}
            />
            <StatCard
              label="今日更新"
              value={stats?.growth.newChaptersToday || 0}
              sub="章节"
              icon="📝"
              color={C.purple}
            />
          </div>
        </div>

        {/* ── 增长数据 ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <h2
            className="codex-section-title"
            style={{
              fontFamily: fontDisplay,
              fontSize: 18,
              fontWeight: 600,
              color: C.text,
              marginBottom: 16,
            }}
          >
            📈 增长趋势
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: 16,
            }}
          >
            <MiniStat label="今日新增用户" value={stats?.growth.newUsersToday || 0} />
            <MiniStat label="本周新增" value={stats?.growth.newUsersThisWeek || 0} />
            <MiniStat label="本月新增" value={stats?.growth.newUsersThisMonth || 0} />
            <MiniStat label="今日章节" value={stats?.growth.newChaptersToday || 0} />
            <MiniStat label="今日字数" value={stats?.growth.newWordsToday || 0} displayValue={formatNumber(stats?.growth.newWordsToday || 0)} />
            <MiniStat label="今日API调用" value={stats?.apiUsage.callsToday || 0} />
          </div>
        </div>

        {/* ── 技能管理（任务编辑 + 激活监控）— 默认展开 ──────────────── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2
              className="codex-section-title"
              style={{
                fontFamily: fontDisplay,
                fontSize: 18,
                fontWeight: 600,
                color: C.text,
                margin: 0,
              }}
            >
              🤖 技能管理
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontFamily: fontMono,
                  fontSize: 11,
                  color: C.muted,
                }}
              >
                转化: {skillData ? ((skillData.activationStats?.authorsWithNovels || 0) / Math.max(skillData.activationStats?.totalUsers || 1, 1) * 100).toFixed(1) : '?'}%
              </span>
              <Link href="/admin/skills" className="codex-btn-ghost" style={{ fontSize: 11 }} target="_blank">新窗口打开</Link>
              <button
                onClick={() => setSkillExpanded(!skillExpanded)}
                className="codex-btn-ghost"
                style={{ fontSize: 11, padding: '2px 8px' }}
              >
                {skillExpanded ? '折叠' : '展开'}
              </button>
            </div>
          </div>
          {skillExpanded && skillData && (
            <SkillManager missions={skillData.missions} activationStats={skillData.activationStats} activeUsers={skillData.activeUsers} />
          )}
          {skillExpanded && !skillData && (
            <div
              className="codex-card"
              style={{ padding: 48, textAlign: 'center' }}
            >
              <div
                className="codex-animate"
                style={{
                  width: 24,
                  height: 24,
                  border: `2px solid ${C.gold}`,
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  margin: '0 auto 12px',
                }}
              />
              <span
                style={{
                  fontFamily: fontMono,
                  fontSize: 13,
                  color: C.muted,
                }}
              >
                加载技能数据...
              </span>
            </div>
          )}
        </div>

        {/* ── 待处理任务 ────────────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <h2
            className="codex-section-title"
            style={{
              fontFamily: fontDisplay,
              fontSize: 18,
              fontWeight: 600,
              color: C.text,
              marginBottom: 16,
            }}
          >
            ⚠️ 待处理任务
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 16,
            }}
          >
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
                    className="codex-btn-gold"
                    style={{ fontSize: 13 }}
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
                  <Link href="/admin/chapters" className="codex-btn-gold" style={{ fontSize: 13 }}>去审核</Link>
                ) : null
              }
            />
            <TaskCard
              title="API Token"
              count={stats?.apiUsage.activeTokens || 0}
              description={`今日已使用 ${stats?.apiUsage.usedTokensToday || 0} 次`}
              action={
                <Link href="/admin/tokens" className="codex-btn-ghost" style={{ fontSize: 13 }}>管理</Link>
              }
            />
            <TaskCard
              title="用户反馈"
              count={openCount}
              description="用户提交的意见与问题"
              action={
                <Link href="/admin/feedback" className="codex-btn-gold" style={{ fontSize: 13 }}>
                  {openCount > 0 ? `待处理 ${openCount} 条` : '查看'}
                </Link>
              }
            />
          </div>
        </div>

        {/* ── 待清理清单 ────────────────────────────────────────────── */}
        {cleanupList.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h2
              className="codex-section-title"
              style={{
                fontFamily: fontDisplay,
                fontSize: 18,
                fontWeight: 600,
                color: C.text,
                marginBottom: 16,
              }}
            >
              🗑️ 待清理文件
            </h2>
            <div className="codex-card" style={{ overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      <th style={{ textAlign: 'left', padding: '12px 16px', fontFamily: fontMono, fontSize: 11, fontWeight: 500, color: C.muted, letterSpacing: '0.04em' }}>小说</th>
                      <th style={{ textAlign: 'left', padding: '12px 16px', fontFamily: fontMono, fontSize: 11, fontWeight: 500, color: C.muted, letterSpacing: '0.04em' }}>作者</th>
                      <th style={{ textAlign: 'left', padding: '12px 16px', fontFamily: fontMono, fontSize: 11, fontWeight: 500, color: C.muted, letterSpacing: '0.04em' }}>删除时间</th>
                      <th style={{ textAlign: 'left', padding: '12px 16px', fontFamily: fontMono, fontSize: 11, fontWeight: 500, color: C.muted, letterSpacing: '0.04em' }}>已过天数</th>
                      <th style={{ textAlign: 'right', padding: '12px 16px', fontFamily: fontMono, fontSize: 11, fontWeight: 500, color: C.muted, letterSpacing: '0.04em' }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cleanupList.map((item) => (
                      <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: C.text }}>{item.title}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: C.muted }}>{item.author}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: C.muted, fontFamily: fontMono }}>{new Date(item.deleted_at).toLocaleDateString('zh-CN')}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13 }}>
                          <span className="codex-badge-gold" style={{ fontSize: 11 }}>{item.days_since_deleted} 天</span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button
                            onClick={() => handleCleanup(item.id)}
                            disabled={cleaningUp}
                            style={{
                              fontSize: 13,
                              color: C.red,
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              fontFamily: fontMono,
                            }}
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

        {/* ── 读者互动 ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <h2
            className="codex-section-title"
            style={{
              fontFamily: fontDisplay,
              fontSize: 18,
              fontWeight: 600,
              color: C.text,
              marginBottom: 16,
            }}
          >
            💬 读者互动
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <div
              className="codex-card"
              style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  background: 'rgba(239,68,68,0.1)',
                }}
              >
                ❤️
              </div>
              <div>
                <p style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>
                  {stats?.interaction.favorites || 0}
                </p>
                <p style={{ fontFamily: fontMono, fontSize: 11, color: C.muted, margin: '2px 0 0' }}>收藏数</p>
              </div>
            </div>
            <div
              className="codex-card"
              style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  background: 'rgba(59,130,246,0.1)',
                }}
              >
                💬
              </div>
              <div>
                <p style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>
                  {stats?.interaction.comments || 0}
                </p>
                <p style={{ fontFamily: fontMono, fontSize: 11, color: C.muted, margin: '2px 0 0' }}>评论数</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── 背景音乐管理 ──────────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <MusicManager />
        </div>

        {/* ── 快捷操作 ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <h2
            className="codex-section-title"
            style={{
              fontFamily: fontDisplay,
              fontSize: 18,
              fontWeight: 600,
              color: C.text,
              marginBottom: 16,
            }}
          >
            ⚡ 快捷操作
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16 }}>
            {[
              { href: '/admin/novels', icon: '📚', title: '小说管理', desc: '新建/编辑小说' },
              { href: '/admin/chapters', icon: '📝', title: '章节管理', desc: '发布/编辑章节' },
              { href: '/admin/tokens', icon: '🔑', title: 'Token管理', desc: 'AI授权管理' },
              { href: '/admin/skills', icon: '🤖', title: '技能管理', desc: '任务编辑 / 激活监控' },
              { href: '/admin/feedback', icon: '💬', title: '反馈管理', desc: openCount > 0 ? `待处理 ${openCount} 条` : '用户反馈' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="codex-card"
                style={{
                  padding: 16,
                  textDecoration: 'none',
                  transition: 'transform 0.15s ease, border-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)';
                  (e.currentTarget as HTMLElement).style.borderColor = C.goldBorder;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                  (e.currentTarget as HTMLElement).style.borderColor = '';
                }}
              >
                <p style={{ fontSize: 18, margin: '0 0 4px' }}>{item.icon}</p>
                <p style={{ fontFamily: fontDisplay, fontSize: 14, fontWeight: 500, color: C.text, margin: '0 0 2px' }}>{item.title}</p>
                <p style={{ fontFamily: fontMono, fontSize: 11, color: C.muted, margin: 0 }}>{item.desc}</p>
              </Link>
            ))}
            <a
              href="/"
              target="_blank"
              className="codex-card"
              style={{
                padding: 16,
                textDecoration: 'none',
                transition: 'transform 0.15s ease, border-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)';
                (e.currentTarget as HTMLElement).style.borderColor = C.goldBorder;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                (e.currentTarget as HTMLElement).style.borderColor = '';
              }}
            >
              <p style={{ fontSize: 18, margin: '0 0 4px' }}>🌐</p>
              <p style={{ fontFamily: fontDisplay, fontSize: 14, fontWeight: 500, color: C.text, margin: '0 0 2px' }}>访问前台</p>
              <p style={{ fontFamily: fontMono, fontSize: 11, color: C.muted, margin: 0 }}>fireseed.online</p>
            </a>
          </div>
        </div>

        {/* ── 🌱 SEED 充值管理（仅 super_admin 可见） ──────────────── */}
        {adminInfo?.role === 'super_admin' && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2
                className="codex-section-title"
                style={{
                  fontFamily: fontDisplay,
                  fontSize: 18,
                  fontWeight: 600,
                  color: C.text,
                  margin: 0,
                }}
              >
                🌱 SEED 充值
              </h2>
              <button
                onClick={() => setSeedExpanded(!seedExpanded)}
                className="codex-btn-ghost"
                style={{ fontSize: 11, padding: '2px 8px' }}
              >
                {seedExpanded ? '折叠' : '展开'}
              </button>
            </div>

            {seedExpanded && (
              <div className="codex-card" style={{ padding: 20 }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 16,
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontFamily: fontMono,
                        fontSize: 11,
                        color: C.muted,
                        marginBottom: 4,
                      }}
                    >
                      用户ID
                    </label>
                    <input
                      type="text"
                      value={seedUserId}
                      onChange={(e) => setSeedUserId(e.target.value)}
                      className="codex-input"
                      placeholder="输入用户ID或用户名..."
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontFamily: fontMono,
                        fontSize: 11,
                        color: C.muted,
                        marginBottom: 4,
                      }}
                    >
                      充值数量
                    </label>
                    <input
                      type="number"
                      value={seedAmount}
                      onChange={(e) => setSeedAmount(e.target.value)}
                      className="codex-input"
                      placeholder="正整数值"
                      min="1"
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontFamily: fontMono,
                        fontSize: 11,
                        color: C.muted,
                        marginBottom: 4,
                      }}
                    >
                      备注（可选）
                    </label>
                    <input
                      type="text"
                      value={seedReason}
                      onChange={(e) => setSeedReason(e.target.value)}
                      className="codex-input"
                      placeholder="如：测试奖励、活动奖励"
                    />
                  </div>
                </div>

                {seedMessage && (
                  <p
                    style={{
                      fontFamily: fontMono,
                      fontSize: 12,
                      marginBottom: 12,
                      color: seedMessage.includes('成功') ? C.green : C.red,
                    }}
                  >
                    {seedMessage}
                  </p>
                )}

                <button
                  onClick={async () => {
                    if (!seedUserId || !seedAmount) { setSeedMessage('请填写用户ID和金额'); return; }
                    const amount = parseInt(seedAmount);
                    if (isNaN(amount) || amount <= 0) { setSeedMessage('金额必须为正整数'); return; }
                    setSeedLoading(true);
                    setSeedMessage('');
                    try {
                      const res = await fetch('/api/admin/seed-credit', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          user_id: seedUserId,
                          username: seedUserId,
                          amount, reason: seedReason,
                        }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        setSeedMessage(`✅ 成功: 给 ${data.user.username} 充值 ${data.credited} 🌱，当前余额 ${data.balance} 🌱`);
                        setSeedUserId('');
                        setSeedAmount('');
                        setSeedReason('');
                      } else {
                        setSeedMessage(`❌ ${data.error || '充值失败'}`);
                      }
                    } catch {
                      setSeedMessage('❌ 网络错误');
                    } finally {
                      setSeedLoading(false);
                    }
                  }}
                  disabled={seedLoading}
                  className="codex-btn-gold"
                  style={{ fontSize: 13, padding: '8px 24px' }}
                >
                  {seedLoading ? '充值中...' : '🌱 确认充值'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── 用户管理（仅 super_admin 可见） ──────────────────────── */}
        {adminInfo?.role === 'super_admin' && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2
                className="codex-section-title"
                style={{
                  fontFamily: fontDisplay,
                  fontSize: 18,
                  fontWeight: 600,
                  color: C.text,
                  margin: 0,
                }}
              >
                👥 用户管理
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: fontMono, fontSize: 11, color: C.muted }}>共 {usersTotal} 人</span>
                <button
                  onClick={() => {
                    setUsersExpanded(!usersExpanded);
                    if (!usersExpanded) fetchUsers();
                  }}
                  className="codex-btn-ghost"
                  style={{ fontSize: 11, padding: '2px 8px' }}
                >
                  {usersExpanded ? '折叠' : '展开'}
                </button>
              </div>
            </div>

            {usersExpanded && (
              <div className="codex-card" style={{ overflow: 'hidden' }}>
                {/* 搜索栏 */}
                <div style={{ padding: 16, borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchUsers(userSearch)}
                      className="codex-input"
                      style={{ flex: 1 }}
                      placeholder="搜索用户名..."
                    />
                    <button onClick={() => fetchUsers(userSearch)} className="codex-btn-gold" style={{ fontSize: 13, padding: '0 16px' }}>搜索</button>
                  </div>
                  {userMessage && (
                    <p
                      style={{
                        fontFamily: fontMono,
                        fontSize: 12,
                        marginTop: 8,
                        color: userMessage.includes('已更新') || userMessage.includes('成功') ? C.green : C.red,
                      }}
                    >
                      {userMessage}
                    </p>
                  )}
                </div>

                {/* 用户表格 */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                        <th style={{ textAlign: 'left', padding: '12px 16px', fontFamily: fontMono, fontSize: 11, fontWeight: 500, color: C.muted, letterSpacing: '0.04em' }}>用户名</th>
                        <th style={{ textAlign: 'left', padding: '12px 16px', fontFamily: fontMono, fontSize: 11, fontWeight: 500, color: C.muted, letterSpacing: '0.04em' }}>当前角色</th>
                        <th style={{ textAlign: 'center', padding: '12px 16px', fontFamily: fontMono, fontSize: 11, fontWeight: 500, color: C.muted, letterSpacing: '0.04em' }}>作品数</th>
                        <th style={{ textAlign: 'left', padding: '12px 16px', fontFamily: fontMono, fontSize: 11, fontWeight: 500, color: C.muted, letterSpacing: '0.04em' }}>注册时间</th>
                        <th style={{ textAlign: 'left', padding: '12px 16px', fontFamily: fontMono, fontSize: 11, fontWeight: 500, color: C.muted, letterSpacing: '0.04em' }}>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user: any) => (
                        <tr key={user.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: C.text }}>
                            {user.nickname || user.username}
                            {user.username === '__admin__' && (
                              <span style={{ fontSize: 11, marginLeft: 4, color: '#64748b' }}>(系统)</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span
                              className={
                                user.role === 'super_admin' ? 'codex-badge-purple' :
                                user.role === 'admin' ? 'codex-badge-blue' :
                                user.role === 'editor' ? 'codex-badge-green' :
                                user.role === 'viewer' ? 'codex-badge-yellow' :
                                'codex-badge-gray'
                              }
                              style={{ fontSize: 11 }}
                            >
                              {user.roleLabel}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 13, textAlign: 'center', color: C.muted, fontFamily: fontMono }}>{user.novelsCount}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: C.muted, fontFamily: fontMono }}>
                            {new Date(user.registeredAt).toLocaleDateString('zh-CN')}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            {user.username !== '__admin__' && user.role !== 'super_admin' ? (
                              <select
                                value={user.role}
                                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                disabled={changingRole === user.id}
                                className="codex-select"
                                style={{ fontSize: 11, padding: '4px 8px' }}
                              >
                                <option value="reader">注册用户</option>
                                <option value="viewer">数据观察员</option>
                                <option value="editor">内容管理员</option>
                                <option value="admin">高级管理员</option>
                              </select>
                            ) : user.role === 'super_admin' ? (
                              <span style={{ fontSize: 11, color: C.purple }}>—</span>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '32px 16px', fontSize: 13, color: C.muted }}>
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

        {/* ── 任务执行监控 ──────────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2
              className="codex-section-title"
              style={{
                fontFamily: fontDisplay,
                fontSize: 18,
                fontWeight: 600,
                color: C.text,
                margin: 0,
              }}
            >
              🎯 任务执行监控
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => fetchTasksStats()}
                disabled={refreshing}
                className="codex-btn-ghost"
                style={{ fontSize: 11 }}
              >
                {refreshing ? '刷新中' : '刷新'}
              </button>
            </div>
          </div>

          {/* 摘要 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
            <div className="codex-card" style={{ padding: 12, textAlign: 'center' }}>
              <p style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 700, color: C.gold, margin: 0 }}>{taskSummary.unique_workers}</p>
              <p style={{ fontFamily: fontMono, fontSize: 11, color: C.muted, margin: '4px 0 0' }}>执行者数</p>
            </div>
            <div className="codex-card" style={{ padding: 12, textAlign: 'center' }}>
              <p style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 700, color: C.blue, margin: 0 }}>{taskSummary.total_takes}</p>
              <p style={{ fontFamily: fontMono, fontSize: 11, color: C.muted, margin: '4px 0 0' }}>任务领取次数</p>
            </div>
            <div className="codex-card" style={{ padding: 12, textAlign: 'center' }}>
              <p style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 700, color: C.green, margin: 0 }}>{taskSummary.total_completes}</p>
              <p style={{ fontFamily: fontMono, fontSize: 11, color: C.muted, margin: '4px 0 0' }}>任务完成次数</p>
            </div>
          </div>

          {/* 最近事件 */}
          <div className="codex-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
              <p style={{ fontFamily: fontDisplay, fontSize: 14, fontWeight: 500, color: C.text, margin: 0 }}>最近执行记录</p>
            </div>
            {taskEvents.length === 0 ? (
              <div className="codex-empty" style={{ padding: '32px 16px', textAlign: 'center', fontSize: 13 }}>
                暂无任务执行记录。AI 客户端领取任务后记录会出现在这里。
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      <th style={{ textAlign: 'left', padding: '10px 16px', fontFamily: fontMono, fontSize: 11, fontWeight: 500, color: C.muted, letterSpacing: '0.04em' }}>时间</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', fontFamily: fontMono, fontSize: 11, fontWeight: 500, color: C.muted, letterSpacing: '0.04em' }}>用户</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', fontFamily: fontMono, fontSize: 11, fontWeight: 500, color: C.muted, letterSpacing: '0.04em' }}>操作</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', fontFamily: fontMono, fontSize: 11, fontWeight: 500, color: C.muted, letterSpacing: '0.04em' }}>任务</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taskEvents.slice(0, 20).map((ev: any) => (
                      <tr key={ev.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: '10px 16px', fontFamily: fontMono, fontSize: 11, color: C.muted }}>
                          {new Date(ev.created_at).toLocaleString('zh-CN')}
                        </td>
                        <td style={{ padding: '10px 16px', color: C.text, fontSize: 13 }}>{ev.username || '匿名'}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <span
                            className={ev.event_type === 'task_take' ? 'codex-badge-blue' : 'codex-badge-green'}
                            style={{ fontSize: 11 }}
                          >
                            {ev.event_type === 'task_take' ? '领取' : '完成'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: 11, color: C.dim, fontFamily: fontMono }}>
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
