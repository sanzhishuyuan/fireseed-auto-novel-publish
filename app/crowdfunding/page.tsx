'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

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
        const payload = (data as any).data || data;
        setProjects(payload.projects || []);
        setTotalPages(payload.totalPages || 1);
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
        const errMsg = typeof data.error === 'string' ? data.error : data.error?.message || JSON.stringify(data.error);
        alert(`创建失败: ${errMsg}`);
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
    <>
      <div className="codex-bg" />
      <div className="codex-shell" style={{ paddingTop: 48, paddingBottom: 48 }}>

        {/* 头部 */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h1 className="codex-display" style={{ fontSize: 32, fontWeight: 700, color: 'var(--codex-text)', marginBottom: 8 }}>
                众筹广场
              </h1>
              <p className="codex-mono" style={{ fontSize: 13, color: 'var(--codex-text-dim)' }}>
                支持喜爱的创作项目，成为早期支持者获得专属权益
              </p>
            </div>
            <button onClick={handleCreateClick} className="codex-btn codex-btn-gold" style={{ whiteSpace: 'nowrap' }}>
              + 发起众筹
            </button>
          </div>

          {/* 筛选器 */}
          <div className="codex-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <label className="codex-mono" style={{ display: 'block', fontSize: 12, color: 'var(--codex-text-dim)', marginBottom: 8 }}>
                  状态
                </label>
                <select value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  className="codex-select">
                  <option value="active">进行中</option>
                  <option value="successful">已成功</option>
                  <option value="failed">已失败</option>
                </select>
              </div>
              <div>
                <label className="codex-mono" style={{ display: 'block', fontSize: 12, color: 'var(--codex-text-dim)', marginBottom: 8 }}>
                  排序
                </label>
                <select value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                  className="codex-select">
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="codex-card" style={{ padding: 24 }}>
                <div className="codex-skeleton" style={{ height: 8, marginBottom: 16 }} />
                <div className="codex-skeleton" style={{ height: 24, marginBottom: 12 }} />
                <div className="codex-skeleton" style={{ height: 48, marginBottom: 16 }} />
                <div className="codex-skeleton" style={{ height: 60 }} />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="codex-card">
            <div className="codex-empty">
              <div className="codex-empty-icon">🚀</div>
              <h3 className="codex-empty-title">暂无众筹项目</h3>
              <p className="codex-empty-desc">
                {permission?.canCreate
                  ? '成为第一个发起众筹的人吧！'
                  : '开通 VIP 会员即可发起众筹项目'}
              </p>
              <button onClick={handleCreateClick} className="codex-btn codex-btn-gold">
                {permission?.canCreate ? '发起众筹' : '了解 VIP'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
              {projects.map((project) => (
                <Link key={project.id} href={`/crowdfunding/${project.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="codex-card codex-animate">
                    <div className="codex-progress">
                      <div className="codex-progress-bar"
                        style={{ width: `${Math.min(project.progress_percentage || 0, 100)}%` }} />
                    </div>
                    <div style={{ padding: 24 }}>
                      <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--codex-text)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {project.title}
                      </h3>
                      <p style={{ fontSize: 13, color: 'var(--codex-text-dim)', marginBottom: 16, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {project.description}
                      </p>
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                          <span style={{ color: 'var(--codex-text-dim)' }}>已筹集</span>
                          <span className="codex-mono" style={{ fontWeight: 700, color: 'var(--codex-gold)' }}>
                            {project.current_amount} / {project.target_amount} SEED
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                          <span style={{ color: 'var(--codex-text-dim)' }}>进度</span>
                          <span style={{ color: 'var(--codex-text)' }}>{project.progress_percentage || 0}%</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <span style={{ color: 'var(--codex-text-dim)' }}>支持者</span>
                          <span style={{ color: 'var(--codex-text)' }}>{project.supporter_count} 人</span>
                        </div>
                      </div>
                      <div className="codex-divider" style={{ marginBottom: 12 }} />
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--codex-text-dim)' }}>
                        <span>{project.author_name}</span>
                        <span className="codex-mono" style={project.days_left && project.days_left <= 3 ? { color: 'var(--codex-red)' } : {}}>
                          {project.days_left} 天
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 40 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="codex-btn codex-btn-ghost" style={{ opacity: page === 1 ? 0.5 : 1 }}>
                  上一页
                </button>
                <span className="codex-mono" style={{ padding: '10px 16px', fontSize: 13, color: 'var(--codex-text-dim)' }}>
                  第 {page} / {totalPages} 页
                </span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="codex-btn codex-btn-ghost" style={{ opacity: page === totalPages ? 0.5 : 1 }}>
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══════ VIP 引导弹窗 ═══════ */}
      {showVipTip && (
        <div className="codex-modal-overlay" onClick={() => setShowVipTip(false)}>
          <div className="codex-modal" onClick={e => e.stopPropagation()}>
            <div className="codex-modal-header">
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>👑</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--codex-text)', marginBottom: 4 }}>
                  发起众筹需要 VIP
                </h3>
                <p className="codex-mono" style={{ fontSize: 12, color: 'var(--codex-text-dim)' }}>
                  开通月卡或年卡 VIP 即可发起众筹项目
                </p>
              </div>
            </div>

            <div className="codex-modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                <div style={{ padding: 16, borderRadius: 10, border: '1px solid var(--codex-purple-border)', background: 'var(--codex-purple-bg)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--codex-text)' }}>月卡 VIP</span>
                    <span className="codex-mono" style={{ fontWeight: 700, fontSize: 14, color: 'var(--codex-gold)' }}>29.9 /月</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {['发起众筹', '解锁分支剧情', '无限收藏', '去广告'].map(t => (
                      <span key={t} className="codex-badge codex-badge-purple" style={{ fontSize: 11 }}>{t}</span>
                    ))}
                  </div>
                </div>
                <div style={{ padding: 16, borderRadius: 10, border: '1px solid var(--codex-gold-border)', background: 'var(--codex-gold-bg)', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: -8, right: 12, fontSize: 11, padding: '2px 10px', borderRadius: 12, background: 'var(--codex-gold)', color: 'var(--codex-gold-btn-text)', fontWeight: 600 }}>
                    推荐
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--codex-text)' }}>年卡 VIP</span>
                    <span className="codex-mono" style={{ fontWeight: 700, fontSize: 14, color: 'var(--codex-gold)' }}>199 /年</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {['含月卡全部', '众筹推荐位', '专属身份标识', '付费章节解锁'].map(t => (
                      <span key={t} className="codex-badge codex-badge-gold" style={{ fontSize: 11 }}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="codex-modal-footer">
              <button onClick={() => setShowVipTip(false)} className="codex-btn codex-btn-ghost" style={{ flex: 1 }}>
                稍后再说
              </button>
              <Link href="/vip" onClick={() => setShowVipTip(false)} className="codex-btn codex-btn-gold" style={{ flex: 1, textDecoration: 'none' }}>
                开通 VIP
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ 创建众筹弹窗 ═══════ */}
      {showCreateModal && (
        <div className="codex-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="codex-modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="codex-modal-header">
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--codex-text)' }}>发起众筹</h2>
                <p className="codex-mono" style={{ fontSize: 11, color: 'var(--codex-text-dim)', marginTop: 4 }}>
                  {permission?.via === 'admin' ? '管理员权限' : 'VIP 会员权限'}
                </p>
              </div>
              <button onClick={() => setShowCreateModal(false)} style={{ fontSize: 24, color: 'var(--codex-text-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>
                ×
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="codex-modal-body">
                <div style={{ marginBottom: 16 }}>
                  <label className="codex-mono" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--codex-text-dim)', marginBottom: 8 }}>
                    项目标题 <span style={{ color: 'var(--codex-red)' }}>*</span>
                  </label>
                  <input type="text" value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="例如：《星际迷航》系列互动小说众筹"
                    className="codex-input"
                    required minLength={5} maxLength={100} />
                  <p className="codex-mono" style={{ fontSize: 11, color: 'var(--codex-text-muted)', marginTop: 6 }}>5-100 个字符</p>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label className="codex-mono" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--codex-text-dim)', marginBottom: 8 }}>
                    项目描述 <span style={{ color: 'var(--codex-red)' }}>*</span>
                  </label>
                  <textarea value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="详细介绍你的创作计划、目标、回报方案等..."
                    className="codex-input"
                    style={{ minHeight: 120, resize: 'vertical' }}
                    required minLength={20} maxLength={5000} />
                  <p className="codex-mono" style={{ fontSize: 11, color: 'var(--codex-text-muted)', marginTop: 6 }}>20-5000 个字符</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label className="codex-mono" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--codex-text-dim)', marginBottom: 8 }}>
                      目标金额 (SEED) <span style={{ color: 'var(--codex-red)' }}>*</span>
                    </label>
                    <input type="number" value={form.targetAmount}
                      onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                      placeholder="例如：5000"
                      className="codex-input"
                      required min={100} max={100000} />
                    <p className="codex-mono" style={{ fontSize: 11, color: 'var(--codex-text-muted)', marginTop: 6 }}>100-100000 SEED</p>
                  </div>
                  <div>
                    <label className="codex-mono" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--codex-text-dim)', marginBottom: 8 }}>
                      截止日期 <span style={{ color: 'var(--codex-red)' }}>*</span>
                    </label>
                    <input type="date" value={form.deadline}
                      onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                      className="codex-input"
                      required min={minDate} max={maxDate} />
                    <p className="codex-mono" style={{ fontSize: 11, color: 'var(--codex-text-muted)', marginTop: 6 }}>7-90 天后</p>
                  </div>
                </div>

                <div className="codex-tip codex-tip-info">
                  众筹达标后 SEED 将转入你的账户（平台抽成 10%）。未达标则全额退还支持者。每人最多同时发起 3 个活跃项目。
                </div>
              </div>

              <div className="codex-modal-footer">
                <button type="button" onClick={() => setShowCreateModal(false)} className="codex-btn codex-btn-ghost" style={{ flex: 1 }}>
                  取消
                </button>
                <button type="submit" disabled={creating} className="codex-btn codex-btn-gold" style={{ flex: 1, opacity: creating ? 0.5 : 1 }}>
                  {creating ? '创建中...' : '发起众筹'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
