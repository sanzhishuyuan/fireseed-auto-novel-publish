'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getTasksMetadata } from '@/lib/seo';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { SectionHeader } from '@/components/ui/SectionHeader';

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

  // 状态 badge variant
  const getStatusVariant = (status: string): React.ComponentProps<typeof Badge>['variant'] => {
    switch (status) {
      case 'open': return 'success';
      case 'reviewing': return 'warning';
      case 'completed': return 'default';
      case 'cancelled': return 'danger';
      default: return 'default';
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
        <div className="tasks-header">
          <SectionHeader
            title="任务市场"
            subtitle="发布小说创作需求，或接单赚取 SEED 奖励"
            action={
              <Button onClick={() => setShowPublishModal(true)}>
                + 发布任务
              </Button>
            }
          />

          {/* 统计信息 */}
          <div className="tasks-stats-grid">
            <Card>
              <div className="codex-stat-label">总任务数</div>
              <div className="codex-stat-num" style={{ marginTop: 6 }}>{total}</div>
            </Card>
            <Card>
              <div className="codex-stat-label">开放中</div>
              <div className="codex-stat-num" style={{ marginTop: 6, color: 'var(--codex-green)' }}>
                {tasks.filter(t => t.status === 'open').length}
              </div>
            </Card>
            <Card>
              <div className="codex-stat-label">今日新增</div>
              <div className="codex-stat-num" style={{ marginTop: 6, color: 'var(--codex-blue)' }}>--</div>
            </Card>
          </div>

          {/* 筛选器 */}
          <Card className="tasks-filter">
            <div className="tasks-filter-group">
              <div>
                <label className="tasks-filter-label">
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
                <label className="tasks-filter-label">
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
          </Card>
        </div>

        {/* 任务列表 */}
        {loading ? (
          <div className="tasks-list" style={{ alignItems: 'center', padding: '64px 0' }}>
            <Skeleton circle width={48} height={48} />
            <p className="codex-mono" style={{ marginTop: 16, fontSize: 13, color: 'var(--codex-text-muted)' }}>加载中...</p>
          </div>
        ) : tasks.length === 0 ? (
          <Card>
            <EmptyState
              icon="📝"
              title="暂无任务"
              description="成为第一个发布任务的人吧！"
              action={{
                label: '发布任务',
                onClick: () => setShowPublishModal(true)
              }}
            />
          </Card>
        ) : (
          <>
            <div className="tasks-list">
              {tasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="task-card"
                >
                  <Card hover clickable>
                    <div className="task-card-header">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 className="task-card-title">
                          {task.title}
                        </h3>
                        <p className="task-card-desc">
                          {task.description}
                        </p>

                        {/* 标签 */}
                        <div className="task-card-tags">
                          {task.genre && (
                            <span className="codex-pill" style={{ cursor: 'default', fontSize: 11 }}>
                              {task.genre}
                            </span>
                          )}
                          {task.target_words && (
                            <Badge variant="info">
                              {task.target_words >= 10000
                                ? `${(task.target_words / 10000).toFixed(1)}万字`
                                : `${task.target_words}字`
                              }
                            </Badge>
                          )}
                          <Badge variant={getStatusVariant(task.status)}>
                            {getStatusText(task.status)}
                          </Badge>
                        </div>
                      </div>

                      {/* 预算 */}
                      <div className="task-card-budget">
                        <div className="task-card-budget-num">
                          {task.budget} <span style={{ fontSize: 13, fontWeight: 500 }}>SEED</span>
                        </div>
                        <div className="task-card-budget-label">
                          预算
                        </div>
                      </div>
                    </div>

                    {/* 底部信息 */}
                    <div className="task-card-footer">
                      <div className="task-card-meta">
                        <span className="task-card-meta-item">
                          {task.publisher_name || '匿名用户'}
                        </span>
                        {(task.assignee_count !== undefined) && (
                          <span className="task-card-meta-item">
                            接单进度: {task.assignee_count}/{task.max_assignees || 9}人
                          </span>
                        )}
                      </div>
                      <div className="task-card-meta">
                        <span className="task-card-meta-item">
                          {formatDate(task.created_at)}
                        </span>
                        {(task.status === 'open' || task.status === 'reviewing') && (
                          <span className={`task-card-meta-item ${getDaysLeft(task.deadline) <= 3 ? 'urgent' : ''}`}>
                            剩余 {getDaysLeft(task.deadline)} 天
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="tasks-pagination">
                <Button
                  variant="ghost"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  上一页
                </Button>

                <span className="codex-mono" style={{ padding: '8px 16px', fontSize: 13, color: 'var(--codex-text-dim)' }}>
                  第 {page} / {totalPages} 页 (共 {total} 个任务)
                </span>

                <Button
                  variant="ghost"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  下一页
                </Button>
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
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="tasks-modal-close"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handlePublish}>
              <div className="codex-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label className="tasks-filter-label">
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
                  <label className="tasks-filter-label">
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
                    <label className="tasks-filter-label">
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
                    <label className="tasks-filter-label">
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
                    <label className="tasks-filter-label">
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
                    <label className="tasks-filter-label">
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
                    <label className="tasks-filter-label">
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
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowPublishModal(false)}
                  style={{ flex: 1 }}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={publishing}
                  style={{ flex: 1, opacity: publishing ? 0.5 : 1 }}
                >
                  {publishing ? '发布中...' : '发布任务'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
