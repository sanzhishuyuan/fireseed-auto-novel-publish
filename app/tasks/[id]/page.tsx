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

  // 状态标签
  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      open: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      assigned: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      pending_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      completed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };

    const texts: Record<string, string> = {
      open: '开放中',
      assigned: '已接单',
      pending_review: '待审核',
      completed: '已完成',
      cancelled: '已取消'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[status] || colors.open}`}>
        {texts[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-xl font-semibold mb-2">任务不存在</h2>
          <Link href="/tasks" className="text-primary hover:underline">
            返回任务市场
          </Link>
        </div>
      </div>
    );
  }

  const isPublisher = currentUser?.id === task.publisher_id;
  const isAssignee = currentUser?.id === task.assignee_id;
  const daysLeft = getDaysLeft(task.deadline);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/10">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 返回按钮 */}
        <Link
          href="/tasks"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
        >
          ← 返回任务市场
        </Link>

        {/* 任务头部 */}
        <div className="bg-card border rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-2xl font-bold">{task.title}</h1>
                {getStatusBadge(task.status)}
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {task.genre && (
                  <span className="px-3 py-1 bg-secondary text-secondary-foreground text-sm rounded-full">
                    📚 {task.genre}
                  </span>
                )}
                {task.target_words && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full dark:bg-blue-900 dark:text-blue-200">
                    📝 {task.target_words >= 10000 
                      ? `${(task.target_words / 10000).toFixed(1)}万字`
                      : `${task.target_words}字`
                    }
                  </span>
                )}
              </div>
            </div>

            {/* 预算 */}
            <div className="text-right ml-6">
              <div className="text-3xl font-bold text-primary">
                {task.budget} SEED
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                任务预算
              </div>
            </div>
          </div>

          {/* 任务描述 */}
          <div className="prose dark:prose-invert max-w-none">
            <h3 className="text-lg font-semibold mb-2">任务描述</h3>
            <p className="whitespace-pre-wrap">{task.description}</p>
          </div>
        </div>

        {/* 任务信息 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* 发布者信息 */}
          <div className="bg-card border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">👤 发布者</h3>
            <div className="space-y-2">
              <div>
                <span className="text-muted-foreground">用户名：</span>
                <span className="font-medium">{task.publisher_name || '匿名用户'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">发布时间：</span>
                <span>{formatDate(task.created_at)}</span>
              </div>
            </div>
          </div>

          {/* 接单人信息 */}
          <div className="bg-card border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">✍️ 接单人</h3>
            {task.assignee_name ? (
              <div className="space-y-2">
                <div>
                  <span className="text-muted-foreground">用户名：</span>
                  <span className="font-medium">{task.assignee_name}</span>
                </div>
                {task.assigned_at && (
                  <div>
                    <span className="text-muted-foreground">接单时间：</span>
                    <span>{formatDate(task.assigned_at)}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">尚未有人接单</p>
            )}
          </div>
        </div>

        {/* 时间和状态 */}
        <div className="bg-card border rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">⏰ 时间安排</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">截止日期</div>
              <div className="font-medium">{formatDate(task.deadline)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">剩余时间</div>
              <div className={`font-medium ${daysLeft <= 3 ? 'text-red-600' : ''}`}>
                {daysLeft > 0 ? `${daysLeft} 天` : '已过期'}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">最后更新</div>
              <div className="font-medium">{formatDate(task.updated_at)}</div>
            </div>
          </div>
        </div>

        {/* 交付信息（如果已完成） */}
        {task.delivery_url && (
          <div className="bg-card border rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">📦 交付成果</h3>
            <Link
              href={task.delivery_url}
              className="text-primary hover:underline break-all"
              target="_blank"
            >
              {task.delivery_url}
            </Link>
          </div>
        )}

        {/* 评价（如果已完成） */}
        {task.rating && (
          <div className="bg-card border rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">⭐ 评价</h3>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{'⭐'.repeat(task.rating)}</span>
              <span className="text-lg font-medium">{task.rating}/5</span>
            </div>
            {task.review && (
              <p className="text-muted-foreground">{task.review}</p>
            )}
          </div>
        )}

        {/* 操作区域 */}
        {!currentUser ? (
          <div className="bg-card border rounded-lg p-6 text-center">
            <p className="mb-4">请先登录以执行操作</p>
            <Link
              href="/auth/login"
              className="px-6 py-2 bg-primary text-white rounded-lg hover:opacity-90"
            >
              登录
            </Link>
          </div>
        ) : (
          <>
            {/* 发布者操作 */}
            {isPublisher && task.status === 'open' && (
              <div className="bg-card border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">🎯 我的操作</h3>
                <button
                  onClick={() => handleAction('cancel')}
                  disabled={actionLoading}
                  className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {actionLoading ? '处理中...' : '取消任务（退款）'}
                </button>
                <p className="text-sm text-muted-foreground mt-2">
                  取消后将全额退还SEED到您的钱包
                </p>
              </div>
            )}

            {/* 作者接单 */}
            {!isPublisher && !isAssignee && task.status === 'open' && (
              <div className="bg-card border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">✍️ 接单创作</h3>
                <p className="text-muted-foreground mb-4">
                  接单后您将负责完成此任务，完成后获得 {Math.floor(task.budget * 0.9)} SEED（平台抽成10%）
                </p>
                <button
                  onClick={() => handleAction('assign')}
                  disabled={actionLoading}
                  className="w-full px-6 py-3 bg-gradient-to-r from-primary to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {actionLoading ? '处理中...' : '立即接单'}
                </button>
              </div>
            )}

            {/* 作者提交完成 */}
            {isAssignee && task.status === 'assigned' && (
              <div className="bg-card border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">📦 提交完成</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      交付链接 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={deliveryUrl}
                      onChange={(e) => setDeliveryUrl(e.target.value)}
                      placeholder="例如：/novels/xxx 或外部链接"
                      className="w-full px-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary outline-none"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      提供小说链接或其他交付物地址
                    </p>
                  </div>
                  <button
                    onClick={() => handleAction('complete')}
                    disabled={actionLoading || !deliveryUrl}
                    className="w-full px-6 py-3 bg-gradient-to-r from-primary to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {actionLoading ? '提交中...' : '提交完成'}
                  </button>
                </div>
              </div>
            )}

            {/* 发布者确认完成 */}
            {isPublisher && task.status === 'pending_review' && (
              <div className="bg-card border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">✅ 确认完成</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">评分</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setRating(star)}
                          className={`text-2xl ${star <= rating ? 'text-yellow-500' : 'text-gray-300'}`}
                        >
                          ⭐
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">评价（可选）</label>
                    <textarea
                      value={review}
                      onChange={(e) => setReview(e.target.value)}
                      placeholder="分享您对作品的评价..."
                      className="w-full px-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary outline-none min-h-[100px]"
                      maxLength={500}
                    />
                  </div>

                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      💰 确认后将从冻结预算中支付 {Math.floor(task.budget * 0.9)} SEED 给作者，平台收取 {task.budget - Math.floor(task.budget * 0.9)} SEED 手续费
                    </p>
                  </div>

                  <button
                    onClick={() => handleAction('confirm')}
                    disabled={actionLoading}
                    className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {actionLoading ? '处理中...' : '确认完成并支付'}
                  </button>
                </div>
              </div>
            )}

            {/* 任务已完成提示 */}
            {task.status === 'completed' && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
                <div className="text-4xl mb-2">✅</div>
                <h3 className="text-lg font-semibold mb-2">任务已完成</h3>
                <p className="text-muted-foreground">
                  SEED已支付给作者，感谢您的参与！
                </p>
              </div>
            )}

            {/* 任务已取消提示 */}
            {task.status === 'cancelled' && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
                <div className="text-4xl mb-2">❌</div>
                <h3 className="text-lg font-semibold mb-2">任务已取消</h3>
                <p className="text-muted-foreground">
                  SEED已退还给发布者
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
