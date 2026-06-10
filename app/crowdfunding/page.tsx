'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getCrowdfundingMetadata } from '@/lib/seo';

interface CrowdfundingProject {
  id: string;
  author_id: string;
  title: string;
  description: string;
  target_amount: number;
  current_amount: number;
  supporter_count: number;
  deadline: string;
  status: string;
  author_name?: string;
  progress_percentage?: number;
  days_left?: number;
}

interface PermissionInfo {
  canCreate: boolean;
  via?: string;
  reason?: string;
  reasonCode?: string;
}

export default function CrowdfundingPage() {
  const [projects, setProjects] = useState<CrowdfundingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('active');
  const [sortBy, setSortBy] = useState('newest');

  // 权限和创建表单
  const [permission, setPermission] = useState<PermissionInfo | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showVipTip, setShowVipTip] = useState(false);

  // 创建表单
  const [form, setForm] = useState({
    title: '',
    description: '',
    targetAmount: '',
    deadline: '',
  });

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: statusFilter, sort: sortBy,
        page: page.toString(), limit: '20',
      });
      const res = await fetch(`/api/crowdfunding/list?${params}`);
      const data = await res.json();
      if (data.success) {
        setProjects(data.projects);
        setTotalPages(data.totalPages);
      }
    } catch (e) { console.error('加载众筹失败:', e); }
    finally { setLoading(false); }
  }, [page, statusFilter, sortBy]);

  const loadPermission = useCallback(async () => {
    try {
      const res = await fetch('/api/crowdfunding/permission');
      const data = await res.json();
      if (data.success) {
        setPermission(data);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);
  useEffect(() => { loadPermission(); }, [loadPermission]);

  // 处理创建
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.targetAmount || !form.deadline) {
      alert('请填写所有必填字段');
      return;
    }

    try {
      setCreating(true);
      const res = await fetch('/api/crowdfunding/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          targetAmount: parseInt(form.targetAmount),
          deadline: form.deadline,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert('众筹项目创建成功！');
        setShowCreateModal(false);
        setForm({ title: '', description: '', targetAmount: '', deadline: '' });
        loadProjects();
      } else if (data.code === 'VIP_REQUIRED') {
        setShowCreateModal(false);
        setShowVipTip(true);
      } else {
        alert(`创建失败: ${data.error}`);
      }
    } catch { alert('创建失败，请重试'); }
    finally { setCreating(false); }
  };

  // 点击创建按钮
  const handleCreateClick = () => {
    if (!permission) {
      alert('请先登录');
      return;
    }
    if (permission.canCreate) {
      setShowCreateModal(true);
    } else {
      setShowVipTip(true);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });

  // 日期范围
  const minDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/10">
      <div className="container mx-auto px-4 py-8 max-w-6xl">

        {/* 头部 */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent mb-2">
                众筹广场
              </h1>
              <p className="text-muted-foreground">
                支持喜爱的创作项目，成为早期支持者获得专属权益
              </p>
            </div>
            <button
              onClick={handleCreateClick}
              className="px-5 py-2.5 bg-gradient-to-r from-primary to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity font-medium shadow-lg text-sm whitespace-nowrap"
            >
              + 发起众筹
            </button>
          </div>

          {/* 筛选器 */}
          <div className="bg-card border rounded-lg p-4">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">状态</label>
                <select value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  className="px-4 py-2 border rounded-lg bg-background">
                  <option value="active">进行中</option>
                  <option value="successful">已成功</option>
                  <option value="failed">已失败</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">排序</label>
                <select value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                  className="px-4 py-2 border rounded-lg bg-background">
                  <option value="newest">最新发布</option>
                  <option value="popular">最热门</option>
                  <option value="ending_soon">即将结束</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 项目列表 */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 bg-card border rounded-lg">
            <div className="text-6xl mb-4">🚀</div>
            <h3 className="text-xl font-semibold mb-2">暂无众筹项目</h3>
            <p className="text-muted-foreground mb-4">
              {permission?.canCreate
                ? '成为第一个发起众筹的人吧！'
                : '开通 VIP 会员即可发起众筹项目'}
            </p>
            <button onClick={handleCreateClick}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:opacity-90">
              {permission?.canCreate ? '发起众筹' : '了解 VIP'}
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Link key={project.id} href={`/crowdfunding/${project.id}`}
                  className="block bg-card border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="h-2 bg-gray-200 dark:bg-gray-700">
                    <div className="h-full bg-gradient-to-r from-primary to-purple-600 transition-all"
                      style={{ width: `${Math.min(project.progress_percentage || 0, 100)}%` }} />
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold mb-2 line-clamp-1">{project.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{project.description}</p>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">已筹集</span>
                        <span className="font-bold text-primary">
                          {project.current_amount} / {project.target_amount} SEED
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">进度</span>
                        <span className="font-medium">{project.progress_percentage || 0}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">支持者</span>
                        <span>{project.supporter_count} 人</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t">
                      <span>{project.author_name}</span>
                      <span className={project.days_left && project.days_left <= 3 ? 'text-red-600' : ''}>
                        {project.days_left} 天
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50">上一页</button>
                <span className="px-4 py-2">第 {page} / {totalPages} 页</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50">下一页</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══════ VIP 引导弹窗 ═══════ */}
      {showVipTip && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowVipTip(false)}>
          <div className="bg-card border rounded-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className="text-5xl mb-3">👑</div>
              <h3 className="text-xl font-bold mb-1">发起众筹需要 VIP</h3>
              <p className="text-sm text-muted-foreground">
                开通月卡或年卡 VIP 即可发起众筹项目
              </p>
            </div>

            <div className="space-y-3 mb-5">
              <div className="p-3 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">月卡 VIP</span>
                  <span className="text-primary font-bold text-sm">29.9 /月</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['发起众筹', '解锁分支剧情', '无限收藏', '去广告'].map(t => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-200">{t}</span>
                  ))}
                </div>
              </div>
              <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 relative">
                <div className="absolute -top-2 right-3 text-xs px-2 py-0.5 rounded-full bg-amber-500 text-white font-medium">推荐</div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">年卡 VIP</span>
                  <span className="text-primary font-bold text-sm">199 /年</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['含月卡全部', '众筹推荐位', '专属身份标识', '付费章节解锁'].map(t => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-200">{t}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowVipTip(false)}
                className="flex-1 px-4 py-2.5 border rounded-lg hover:bg-secondary text-sm">
                稍后再说
              </button>
              <Link href="/vip" onClick={() => setShowVipTip(false)}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary to-purple-600 text-white rounded-lg hover:opacity-90 text-sm text-center font-medium">
                开通 VIP
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ 创建众筹弹窗 ═══════ */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCreateModal(false)}>
          <div className="bg-card border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold">发起众筹</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {permission?.via === 'admin' ? '管理员权限' : 'VIP 会员权限'}
                  </p>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="text-2xl text-muted-foreground hover:text-foreground">×</button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    项目标题 <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="例如：《星际迷航》系列互动小说众筹"
                    className="w-full px-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary outline-none"
                    required minLength={5} maxLength={100} />
                  <p className="text-xs text-muted-foreground mt-1">5-100 个字符</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    项目描述 <span className="text-red-500">*</span>
                  </label>
                  <textarea value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="详细介绍你的创作计划、目标、回报方案等..."
                    className="w-full px-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary outline-none min-h-[120px]"
                    required minLength={20} maxLength={5000} />
                  <p className="text-xs text-muted-foreground mt-1">20-5000 个字符</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      目标金额 (SEED) <span className="text-red-500">*</span>
                    </label>
                    <input type="number" value={form.targetAmount}
                      onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                      placeholder="例如：5000"
                      className="w-full px-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary outline-none"
                      required min={100} max={100000} />
                    <p className="text-xs text-muted-foreground mt-1">100-100000 SEED</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      截止日期 <span className="text-red-500">*</span>
                    </label>
                    <input type="date" value={form.deadline}
                      onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary outline-none"
                      required min={minDate} max={maxDate} />
                    <p className="text-xs text-muted-foreground mt-1">7-90 天后</p>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    众筹达标后 SEED 将转入你的账户（平台抽成 10%）。未达标则全额退还支持者。每人最多同时发起 3 个活跃项目。
                  </p>
                </div>

                <div className="flex gap-4 pt-2">
                  <button type="button" onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-6 py-3 border rounded-lg hover:bg-secondary transition-colors">
                    取消
                  </button>
                  <button type="submit" disabled={creating}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-primary to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
                    {creating ? '创建中...' : '发起众筹'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
