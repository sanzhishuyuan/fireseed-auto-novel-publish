'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getTasksMetadata } from '@/lib/seo';


interface Task {
  id: string;
  title: string;
  description: string;
  genre?: string;
  target_words?: number;
  budget: number;
  deadline: string;
  status: string;
  publisher_name?: string;
  assignee_name?: string;
  assignee_count?: number;
  max_assignees?: number;
  created_at: string;
}

interface TasksResponse {
  success: boolean;
  tasks: Task[];
  total: number;
  page: number;
  totalPages: number;
}

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [genreFilter, setGenreFilter] = useState<string>('');
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // 发布任务表单
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    genre: '',
    target_words: '100000',
    budget: '500',
    deadline: '',
    max_assignees: '9'
  });

  // 默认截止日期：30 天后
  const defaultDeadline = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  const minDeadline = new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0];
  const maxDeadline = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];

  // 加载任务列表
  const loadTasks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: statusFilter,
        page: page.toString(),
        limit: '20'
      });
      
      if (genreFilter) {
        params.append('genre', genreFilter);
      }

      const res = await fetch(`/api/tasks/novel?${params}`);
      const data: TasksResponse = await res.json();

      if (data.success) {
        const payload = (data as any).data || data;
        setTasks(payload.tasks || []);
        setTotal(payload.total || 0);
        setTotalPages(payload.totalPages || 1);
      }
    } catch (error) {
      console.error('加载任务失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [page, statusFilter, genreFilter]);

  // 处理发布任务
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.budget || !formData.deadline) {
      alert('请填写所有必填字段');
      return;
    }

    try {
      setPublishing(true);
      const res = await fetch('/api/tasks/novel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          budget: parseInt(formData.budget),
          target_words: formData.target_words ? parseInt(formData.target_words) : undefined
        })
      });

      const data = await res.json();

      if (data.success) {
        alert('任务发布成功！');
        setShowPublishModal(false);
        setFormData({
          title: '',
          description: '',
          genre: '',
          target_words: '100000',
          budget: '500',
          deadline: '',
          max_assignees: '9'
        });
        loadTasks(); // 刷新列表
      } else {
        const errMsg = typeof data.error === 'string' ? data.error : data.error?.message || JSON.stringify(data.error);
        alert(`发布失败: ${errMsg}`);
      }
    } catch (error) {
      console.error('发布任务失败:', error);
      alert('发布失败，请重试');
    } finally {
      setPublishing(false);
    }
  };

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // 计算剩余天数
  const getDaysLeft = (deadline: string) => {
    const now = new Date();
    const end = new Date(deadline);
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // 状态 badge class
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return 'codex-badge codex-badge-green';
      case 'reviewing': return 'codex-badge codex-badge-yellow';
      case 'completed': return 'codex-badge codex-badge-gray';
      case 'cancelled': return 'codex-badge codex-badge-red';
      default: return 'codex-badge codex-badge-gray';
    }
  };

  // 状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return '开放中';
      case 'reviewing': return '审核中';
      case 'completed': return '已完成';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };

  return (
    <>
      <div className="codex-bg" />
      <div className="codex-shell" style={{ paddingTop: 40, paddingBottom: 60 }}>

        {/* 头部 */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h1 className="codex-display" style={{ fontSize: 32, fontWeight: 800, color: 'var(--codex-text)', marginBottom: 8 }}>
                任务市场
              </h1>
              <p className="codex-mono" style={{ fontSize: 13, color: 'var(--codex-text-dim)' }}>
                发布小说创作需求，或接单赚取 SEED 奖励
              </p>
            </div>
            <button
              onClick={() => setShowPublishModal(true)}
              className="codex-btn codex-btn-gold"
            >
              + 发布任务
            </button>
          </div>

          {/* 统计信息 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ marginBottom: 24 }}>
            <div className="codex-card" style={{ padding: '20px 24px' }}>
              <div className="codex-stat-label">总任务数</div>
              <div className="codex-stat-num" style={{ marginTop: 6 }}>{total}</div>
            </div>
            <div className="codex-card" style={{ padding: '20px 24px' }}>
              <div className="codex-stat-label">开放中</div>
              <div className="codex-stat-num" style={{ marginTop: 6, color: 'var(--codex-green)' }}>
                {tasks.filter(t => t.status === 'open').length}
              </div>
            </div>
            <div className="codex-card" style={{ padding: '20px 24px' }}>
              <div className="codex-stat-label">今日新增</div>
              <div className="codex-stat-num" style={{ marginTop: 6, color: 'var(--codex-blue)' }}>--</div>
            </div>
          </div>

          {/* 筛选器 */}
          <div className="codex-card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
              <div>
                <label className="codex-mono" style={{ display: 'block', fontSize: 11, letterSpacing: 1, color: 'var(--codex-text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                  状态
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="codex-select"
                >
                  <option value="active">进行中</option>
                  <option value="open">开放中</option>
                  <option value="reviewing">审核中</option>
                  <option value="completed">已完成</option>
                  <option value="all">全部</option>
                </select>
              </div>

              <div>
                <label className="codex-mono" style={{ display: 'block', fontSize: 11, letterSpacing: 1, color: 'var(--codex-text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                  题材
                </label>
                <select
                  value={genreFilter}
                  onChange={(e) => {
                    setGenreFilter(e.target.value);
                    setPage(1);
                  }}
                  className="codex-select"
                >
                  <option value="">全部题材</option>
                  <option value="科幻">科幻</option>
                  <option value="奇幻">奇幻</option>
                  <option value="悬疑">悬疑</option>
                  <option value="言情">言情</option>
                  <option value="武侠">武侠</option>
                  <option value="历史">历史</option>
                  <option value="都市">都市</option>
                  <option value="其他">其他</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 任务列表 */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 0' }}>
            <div className="codex-skeleton" style={{ width: 48, height: 48, borderRadius: '50%' }} />
            <p className="codex-mono" style={{ marginTop: 16, fontSize: 13, color: 'var(--codex-text-muted)' }}>加载中...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="codex-card">
            <div className="codex-empty">
              <div className="codex-empty-icon">📝</div>
              <div className="codex-empty-title">暂无任务</div>
              <div className="codex-empty-desc">成为第一个发布任务的人吧！</div>
              <button
                onClick={() => setShowPublishModal(true)}
                className="codex-btn codex-btn-gold"
              >
                发布任务
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gap: 16 }}>
              {tasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="codex-card codex-animate"
                  style={{ display: 'block', padding: 24, textDecoration: 'none', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: 17, fontWeight: 600, color: 'var(--codex-text)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {task.title}
                      </h3>
                      <p style={{ fontSize: 13, color: 'var(--codex-text-dim)', lineHeight: 1.6, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {task.description}
                      </p>

                      {/* 标签 */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {task.genre && (
                          <span className="codex-pill" style={{ cursor: 'default', fontSize: 11 }}>
                            {task.genre}
                          </span>
                        )}
                        {task.target_words && (
                          <span className="codex-badge codex-badge-blue">
                            {task.target_words >= 10000
                              ? `${(task.target_words / 10000).toFixed(1)}万字`
                              : `${task.target_words}字`
                            }
                          </span>
                        )}
                        <span className={getStatusBadge(task.status)}>
                          {getStatusText(task.status)}
                        </span>
                      </div>
                    </div>

                    {/* 预算 */}
                    <div style={{ textAlign: 'right', marginLeft: 16, flexShrink: 0 }}>
                      <div className="codex-display" style={{ fontSize: 24, fontWeight: 800, color: 'var(--codex-gold)' }}>
                        {task.budget} <span style={{ fontSize: 13, fontWeight: 500 }}>SEED</span>
                      </div>
                      <div className="codex-mono" style={{ fontSize: 10, color: 'var(--codex-text-muted)', letterSpacing: 1, marginTop: 4 }}>
                        预算
                      </div>
                    </div>
                  </div>

                  {/* 底部信息 */}
                  <div className="codex-divider" style={{ margin: '12px 0' }} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span className="codex-mono" style={{ color: 'var(--codex-text-dim)' }}>
                        {task.publisher_name || '匿名用户'}
                      </span>
                      {(task.assignee_count !== undefined) && (
                        <span className="codex-mono" style={{ color: 'var(--codex-text-dim)' }}>
                          接单进度: {task.assignee_count}/{task.max_assignees || 9}人
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span className="codex-mono" style={{ color: 'var(--codex-text-muted)' }}>
                        {formatDate(task.created_at)}
                      </span>
                      {(task.status === 'open' || task.status === 'reviewing') && (
                        <span className="codex-mono" style={{ color: getDaysLeft(task.deadline) <= 3 ? 'var(--codex-red)' : 'var(--codex-text-muted)', fontWeight: getDaysLeft(task.deadline) <= 3 ? 600 : 400 }}>
                          剩余 {getDaysLeft(task.deadline)} 天
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 40 }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="codex-btn codex-btn-ghost"
                  style={{ opacity: page === 1 ? 0.4 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer' }}
                >
                  上一页
                </button>

                <span className="codex-mono" style={{ padding: '8px 16px', fontSize: 13, color: 'var(--codex-text-dim)' }}>
                  第 {page} / {totalPages} 页 (共 {total} 个任务)
                </span>

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="codex-btn codex-btn-ghost"
                  style={{ opacity: page === totalPages ? 0.4 : 1, cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* 发布任务弹窗 */}
      {showPublishModal && (
        <div className="codex-modal-overlay">
          <div className="codex-modal codex-scrollbar">
            <div className="codex-modal-header">
              <h2 className="codex-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--codex-text)' }}>
                发布新任务
              </h2>
              <button
                onClick={() => setShowPublishModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--codex-text-muted)', fontSize: 24, cursor: 'pointer', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handlePublish}>
              <div className="codex-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label className="codex-mono" style={{ display: 'block', fontSize: 11, letterSpacing: 1, color: 'var(--codex-text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                    任务标题 <span style={{ color: 'var(--codex-red)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="例如：创作一部科幻小说"
                    className="codex-input"
                    required
                    minLength={5}
                    maxLength={100}
                  />
                  <p className="codex-mono" style={{ fontSize: 11, color: 'var(--codex-text-muted)', marginTop: 6 }}>5-100 个字符</p>
                </div>

                <div>
                  <label className="codex-mono" style={{ display: 'block', fontSize: 11, letterSpacing: 1, color: 'var(--codex-text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                    任务描述 <span style={{ color: 'var(--codex-red)' }}>*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="详细描述你的需求，包括题材、风格、要求等..."
                    className="codex-input"
                    style={{ minHeight: 120, resize: 'vertical' }}
                    required
                    minLength={20}
                    maxLength={2000}
                  />
                  <p className="codex-mono" style={{ fontSize: 11, color: 'var(--codex-text-muted)', marginTop: 6 }}>20-2000 个字符</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="codex-mono" style={{ display: 'block', fontSize: 11, letterSpacing: 1, color: 'var(--codex-text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                      题材分类
                    </label>
                    <select
                      value={formData.genre}
                      onChange={(e) => setFormData({...formData, genre: e.target.value})}
                      className="codex-select"
                      style={{ width: '100%' }}
                    >
                      <option value="">不限</option>
                      <option value="科幻">科幻</option>
                      <option value="奇幻">奇幻</option>
                      <option value="悬疑">悬疑</option>
                      <option value="言情">言情</option>
                      <option value="武侠">武侠</option>
                      <option value="历史">历史</option>
                      <option value="都市">都市</option>
                      <option value="其他">其他</option>
                    </select>
                  </div>

                  <div>
                    <label className="codex-mono" style={{ display: 'block', fontSize: 11, letterSpacing: 1, color: 'var(--codex-text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                      目标字数
                    </label>
                    <input
                      type="number"
                      value={formData.target_words}
                      onChange={(e) => setFormData({...formData, target_words: e.target.value})}
                      placeholder="例如：100000"
                      className="codex-input"
                      min={1000}
                      max={1000000}
                    />
                    <p className="codex-mono" style={{ fontSize: 11, color: 'var(--codex-text-muted)', marginTop: 6 }}>1,000 - 1,000,000 字</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="codex-mono" style={{ display: 'block', fontSize: 11, letterSpacing: 1, color: 'var(--codex-text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                      接单人数上限
                    </label>
                    <input
                      type="number"
                      value={formData.max_assignees}
                      onChange={(e) => setFormData({...formData, max_assignees: e.target.value})}
                      className="codex-input"
                      min={1}
                      max={9}
                    />
                    <p className="codex-mono" style={{ fontSize: 11, color: 'var(--codex-text-muted)', marginTop: 6 }}>最多 9 人同时接单，1 人为独占模式</p>
                  </div>

                  <div>
                    <label className="codex-mono" style={{ display: 'block', fontSize: 11, letterSpacing: 1, color: 'var(--codex-text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                      预算 (SEED) <span style={{ color: 'var(--codex-red)' }}>*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.budget}
                      onChange={(e) => setFormData({...formData, budget: e.target.value})}
                      placeholder="例如：500"
                      className="codex-input"
                      required
                      min={50}
                      max={50000}
                    />
                    <p className="codex-mono" style={{ fontSize: 11, color: 'var(--codex-text-muted)', marginTop: 6 }}>50 - 50,000 SEED</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="codex-mono" style={{ display: 'block', fontSize: 11, letterSpacing: 1, color: 'var(--codex-text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                      截止日期 <span style={{ color: 'var(--codex-red)' }}>*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                      className="codex-input"
                      required
                      min={minDeadline}
                      max={maxDeadline}
                    />
                    <p className="codex-mono" style={{ fontSize: 11, color: 'var(--codex-text-muted)', marginTop: 6 }}>1 - 90 天</p>
                  </div>
                </div>

                <div className="codex-tip codex-tip-info">
                  发布任务将立即冻结预算 SEED，任务完成后支付给作者（平台抽成 10%）。新用户注册赠送 100 SEED。
                </div>
              </div>

              <div className="codex-modal-footer">
                <button
                  type="button"
                  onClick={() => setShowPublishModal(false)}
                  className="codex-btn codex-btn-ghost"
                  style={{ flex: 1 }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={publishing}
                  className="codex-btn codex-btn-gold"
                  style={{ flex: 1, opacity: publishing ? 0.5 : 1 }}
                >
                  {publishing ? '发布中...' : '发布任务'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
