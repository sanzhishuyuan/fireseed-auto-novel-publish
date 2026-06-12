'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Task {
  id: string;
  publisher_id: string;
  title: string;
  description: string;
  genre?: string;
  target_words?: number;
  budget: number;
  deadline: string;
  status: string;
  assignee_id?: string;
  assigned_at?: string;
  completed_at?: string;
  delivery_url?: string;
  rating?: number;
  review?: string;
  created_at: string;
  updated_at: string;
  publisher_name?: string;
  assignee_name?: string;
}

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;
  
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // 操作表单
  const [deliveryUrl, setDeliveryUrl] = useState('');
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');

  // 加载任务详情
  const loadTask = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tasks/novel/${taskId}`);
      const data = await res.json();

      if (data.success) {
        setTask(data.task);
      } else {
        alert('任务不存在');
        router.push('/tasks');
      }
    } catch (error) {
      console.error('加载任务失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载当前用户
  const loadCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error('加载用户失败:', error);
    }
  };

  useEffect(() => {
    loadTask();
    loadCurrentUser();
  }, [taskId]);

  // 执行操作
  const handleAction = async (action: string) => {
    try {
      setActionLoading(true);

      const body: any = { action };
      
      if (action === 'complete') {
        if (!deliveryUrl) {
          alert('请提供交付链接');
          return;
        }
        body.delivery_url = deliveryUrl;
      } else if (action === 'confirm') {
        body.rating = rating;
        body.review = review;
      }

      const res = await fetch(`/api/tasks/novel/${taskId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (data.success) {
        alert(data.message);
        loadTask(); // 刷新任务状态
        
        // 清空表单
        setDeliveryUrl('');
        setReview('');
      } else {
        alert(`操作失败: ${data.error}`);
      }
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败，请重试');
    } finally {
      setActionLoading(false);
    }
  };

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 计算剩余天数
  const getDaysLeft = (deadline: string) => {
    const now = new Date();
    const end = new Date(deadline);
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // 状态 badge
  const getStatusBadge = (status: string) => {
    const badgeMap: Record<string, string> = {
      open: 'codex-badge codex-badge-green',
      assigned: 'codex-badge codex-badge-blue',
      pending_review: 'codex-badge codex-badge-yellow',
      completed: 'codex-badge codex-badge-gray',
      cancelled: 'codex-badge codex-badge-red'
    };

    const texts: Record<string, string> = {
      open: '开放中',
      assigned: '已接单',
      pending_review: '待审核',
      completed: '已完成',
      cancelled: '已取消'
    };

    return (
      <span className={badgeMap[status] || badgeMap.open}>
        {texts[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <>
        <div className="codex-bg" />
        <div className="codex-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="codex-skeleton" style={{ width: 48, height: 48, borderRadius: '50%', margin: '0 auto' }} />
            <p className="codex-mono" style={{ marginTop: 16, fontSize: 13, color: '#5a5a52' }}>加载中...</p>
          </div>
        </div>
      </>
    );
  }

  if (!task) {
    return (
      <>
        <div className="codex-bg" />
        <div className="codex-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16, color: '#5a5a52' }}>&times;</div>
            <h2 className="codex-display" style={{ fontSize: 20, fontWeight: 700, color: '#f0ece4', marginBottom: 12 }}>
              任务不存在
            </h2>
            <Link href="/tasks" style={{ color: '#c9a55c', textDecoration: 'underline' }}>
              返回任务市场
            </Link>
          </div>
        </div>
      </>
    );
  }

  const isPublisher = currentUser?.id === task.publisher_id;
  const isAssignee = currentUser?.id === task.assignee_id;
  const daysLeft = getDaysLeft(task.deadline);

  return (
    <>
      <div className="codex-bg" />
      <div className="codex-shell" style={{ paddingTop: 40, paddingBottom: 60, maxWidth: 860, margin: '0 auto' }}>

        {/* 返回按钮 */}
        <Link
          href="/tasks"
          className="codex-btn codex-btn-ghost"
          style={{ marginBottom: 28, display: 'inline-flex', padding: '8px 16px', fontSize: 12, textDecoration: 'none' }}
        >
          &larr; 返回任务市场
        </Link>

        {/* 任务头部 */}
        <div className="codex-card" style={{ padding: 28, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <h1 className="codex-display" style={{ fontSize: 24, fontWeight: 700, color: '#f0ece4' }}>
                  {task.title}
                </h1>
                {getStatusBadge(task.status)}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {task.genre && (
                  <span className="codex-pill" style={{ cursor: 'default' }}>
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
              </div>
            </div>

            {/* 预算 */}
            <div style={{ textAlign: 'right', marginLeft: 24, flexShrink: 0 }}>
              <div className="codex-display" style={{ fontSize: 32, fontWeight: 800, color: '#c9a55c', lineHeight: 1 }}>
                {task.budget} <span style={{ fontSize: 16, fontWeight: 500 }}>SEED</span>
              </div>
              <div className="codex-mono" style={{ fontSize: 10, color: '#5a5a52', letterSpacing: 1, marginTop: 6 }}>
                任务预算
              </div>
            </div>
          </div>

          {/* 任务描述 */}
          <div className="codex-divider" style={{ marginBottom: 20 }} />
          <h3 className="codex-section-title" style={{ marginBottom: 12 }}>任务描述</h3>
          <p style={{ fontSize: 14, color: '#9a9a8e', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
            {task.description}
          </p>
        </div>

        {/* 任务信息 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5" style={{ marginBottom: 24 }}>
          {/* 发布者信息 */}
          <div className="codex-card" style={{ padding: 24 }}>
            <h3 className="codex-section-title" style={{ fontSize: 16, marginBottom: 16 }}>发布者</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="codex-mono" style={{ fontSize: 12, color: '#5a5a52' }}>用户名</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#f0ece4' }}>{task.publisher_name || '匿名用户'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="codex-mono" style={{ fontSize: 12, color: '#5a5a52' }}>发布时间</span>
                <span className="codex-mono" style={{ fontSize: 12, color: '#9a9a8e' }}>{formatDate(task.created_at)}</span>
              </div>
            </div>
          </div>

          {/* 接单人信息 */}
          <div className="codex-card" style={{ padding: 24 }}>
            <h3 className="codex-section-title" style={{ fontSize: 16, marginBottom: 16 }}>接单人</h3>
            {task.assignee_name ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="codex-mono" style={{ fontSize: 12, color: '#5a5a52' }}>用户名</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#f0ece4' }}>{task.assignee_name}</span>
                </div>
                {task.assigned_at && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="codex-mono" style={{ fontSize: 12, color: '#5a5a52' }}>接单时间</span>
                    <span className="codex-mono" style={{ fontSize: 12, color: '#9a9a8e' }}>{formatDate(task.assigned_at)}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="codex-mono" style={{ fontSize: 13, color: '#5a5a52' }}>尚未有人接单</p>
            )}
          </div>
        </div>

        {/* 时间和状态 */}
        <div className="codex-card" style={{ padding: 24, marginBottom: 24 }}>
          <h3 className="codex-section-title" style={{ fontSize: 16, marginBottom: 16 }}>时间安排</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="codex-mono" style={{ fontSize: 10, color: '#5a5a52', letterSpacing: 1, marginBottom: 6 }}>截止日期</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#f0ece4' }}>{formatDate(task.deadline)}</div>
            </div>
            <div>
              <div className="codex-mono" style={{ fontSize: 10, color: '#5a5a52', letterSpacing: 1, marginBottom: 6 }}>剩余时间</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: daysLeft <= 3 ? '#ef4444' : '#f0ece4' }}>
                {daysLeft > 0 ? `${daysLeft} 天` : '已过期'}
              </div>
            </div>
            <div>
              <div className="codex-mono" style={{ fontSize: 10, color: '#5a5a52', letterSpacing: 1, marginBottom: 6 }}>最后更新</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#f0ece4' }}>{formatDate(task.updated_at)}</div>
            </div>
          </div>
        </div>

        {/* 交付信息 */}
        {task.delivery_url && (
          <div className="codex-card" style={{ padding: 24, marginBottom: 24 }}>
            <h3 className="codex-section-title" style={{ fontSize: 16, marginBottom: 12 }}>交付成果</h3>
            <Link
              href={task.delivery_url}
              style={{ color: '#c9a55c', textDecoration: 'underline', wordBreak: 'break-all', fontSize: 14 }}
              target="_blank"
            >
              {task.delivery_url}
            </Link>
          </div>
        )}

        {/* 评价 */}
        {task.rating && (
          <div className="codex-card" style={{ padding: 24, marginBottom: 24 }}>
            <h3 className="codex-section-title" style={{ fontSize: 16, marginBottom: 12 }}>评价</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 24, color: '#c9a55c', letterSpacing: 4 }}>{'\u2605'.repeat(task.rating)}</span>
              <span className="codex-display" style={{ fontSize: 18, fontWeight: 700, color: '#c9a55c' }}>{task.rating}/5</span>
            </div>
            {task.review && (
              <p style={{ fontSize: 14, color: '#9a9a8e', lineHeight: 1.7 }}>{task.review}</p>
            )}
          </div>
        )}

        {/* 操作区域 */}
        {!currentUser ? (
          <div className="codex-card" style={{ padding: 28, textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#9a9a8e', marginBottom: 16 }}>请先登录以执行操作</p>
            <Link
              href="/auth/login"
              className="codex-btn codex-btn-gold"
              style={{ textDecoration: 'none' }}
            >
              登录
            </Link>
          </div>
        ) : (
          <>
            {/* 发布者操作 - 取消任务 */}
            {isPublisher && task.status === 'open' && (
              <div className="codex-card" style={{ padding: 24 }}>
                <h3 className="codex-section-title" style={{ fontSize: 16, marginBottom: 16 }}>我的操作</h3>
                <button
                  onClick={() => handleAction('cancel')}
                  disabled={actionLoading}
                  className="codex-btn codex-btn-danger"
                  style={{ width: '100%', opacity: actionLoading ? 0.5 : 1 }}
                >
                  {actionLoading ? '处理中...' : '取消任务（退款）'}
                </button>
                <div className="codex-tip codex-tip-danger" style={{ marginTop: 12 }}>
                  取消后将全额退还 SEED 到您的钱包
                </div>
              </div>
            )}

            {/* 作者接单 */}
            {!isPublisher && !isAssignee && task.status === 'open' && (
              <div className="codex-card" style={{ padding: 24 }}>
                <h3 className="codex-section-title" style={{ fontSize: 16, marginBottom: 12 }}>接单创作</h3>
                <p style={{ fontSize: 14, color: '#9a9a8e', lineHeight: 1.7, marginBottom: 16 }}>
                  接单后您将负责完成此任务，完成后获得 {Math.floor(task.budget * 0.9)} SEED（平台抽成 10%）
                </p>
                <button
                  onClick={() => handleAction('assign')}
                  disabled={actionLoading}
                  className="codex-btn codex-btn-gold"
                  style={{ width: '100%', opacity: actionLoading ? 0.5 : 1 }}
                >
                  {actionLoading ? '处理中...' : '立即接单'}
                </button>
              </div>
            )}

            {/* 作者提交完成 */}
            {isAssignee && task.status === 'assigned' && (
              <div className="codex-card" style={{ padding: 24 }}>
                <h3 className="codex-section-title" style={{ fontSize: 16, marginBottom: 16 }}>提交完成</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label className="codex-mono" style={{ display: 'block', fontSize: 11, letterSpacing: 1, color: '#5a5a52', textTransform: 'uppercase', marginBottom: 8 }}>
                      交付链接 <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={deliveryUrl}
                      onChange={(e) => setDeliveryUrl(e.target.value)}
                      placeholder="例如：/novels/xxx 或外部链接"
                      className="codex-input"
                    />
                    <p className="codex-mono" style={{ fontSize: 11, color: '#5a5a52', marginTop: 6 }}>
                      提供小说链接或其他交付物地址
                    </p>
                  </div>
                  <button
                    onClick={() => handleAction('complete')}
                    disabled={actionLoading || !deliveryUrl}
                    className="codex-btn codex-btn-gold"
                    style={{ width: '100%', opacity: (actionLoading || !deliveryUrl) ? 0.5 : 1 }}
                  >
                    {actionLoading ? '提交中...' : '提交完成'}
                  </button>
                </div>
              </div>
            )}

            {/* 发布者确认完成 */}
            {isPublisher && task.status === 'pending_review' && (
              <div className="codex-card" style={{ padding: 24 }}>
                <h3 className="codex-section-title" style={{ fontSize: 16, marginBottom: 16 }}>确认完成</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label className="codex-mono" style={{ display: 'block', fontSize: 11, letterSpacing: 1, color: '#5a5a52', textTransform: 'uppercase', marginBottom: 8 }}>
                      评分
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setRating(star)}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: 24,
                            cursor: 'pointer',
                            color: star <= rating ? '#c9a55c' : '#5a5a52',
                            transition: 'color 0.2s ease'
                          }}
                        >
                          {'\u2605'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="codex-mono" style={{ display: 'block', fontSize: 11, letterSpacing: 1, color: '#5a5a52', textTransform: 'uppercase', marginBottom: 8 }}>
                      评价（可选）
                    </label>
                    <textarea
                      value={review}
                      onChange={(e) => setReview(e.target.value)}
                      placeholder="分享您对作品的评价..."
                      className="codex-input"
                      style={{ minHeight: 100, resize: 'vertical' }}
                      maxLength={500}
                    />
                  </div>

                  <div className="codex-tip codex-tip-success">
                    确认后将从冻结预算中支付 {Math.floor(task.budget * 0.9)} SEED 给作者，平台收取 {task.budget - Math.floor(task.budget * 0.9)} SEED 手续费
                  </div>

                  <button
                    onClick={() => handleAction('confirm')}
                    disabled={actionLoading}
                    className="codex-btn codex-btn-success"
                    style={{ width: '100%', opacity: actionLoading ? 0.5 : 1 }}
                  >
                    {actionLoading ? '处理中...' : '确认完成并支付'}
                  </button>
                </div>
              </div>
            )}

            {/* 任务已完成提示 */}
            {task.status === 'completed' && (
              <div className="codex-card">
                <div className="codex-empty">
                  <div className="codex-empty-icon" style={{ background: 'rgba(34,197,94,0.12)' }}>&#10003;</div>
                  <div className="codex-empty-title">任务已完成</div>
                  <div className="codex-empty-desc">
                    SEED 已支付给作者，感谢您的参与！
                  </div>
                </div>
              </div>
            )}

            {/* 任务已取消提示 */}
            {task.status === 'cancelled' && (
              <div className="codex-card">
                <div className="codex-empty">
                  <div className="codex-empty-icon" style={{ background: 'rgba(239,68,68,0.12)' }}>&times;</div>
                  <div className="codex-empty-title">任务已取消</div>
                  <div className="codex-empty-desc">
                    SEED 已退还给发布者
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
