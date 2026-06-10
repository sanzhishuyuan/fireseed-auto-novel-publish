'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getTasksMetadata } from '@/lib/seo';
import type { Metadata } from 'next';



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
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [genreFilter, setGenreFilter] = useState<string>('');
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // 发布任务表单
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    genre: '',
    target_words: '',
    budget: '',
    deadline: ''
  });

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
        setTasks(data.tasks);
        setTotal(data.total);
        setTotalPages(data.totalPages);
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
          target_words: '',
          budget: '',
          deadline: ''
        });
        loadTasks(); // 刷新列表
      } else {
        alert(`发布失败: ${data.error}`);
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

  // 状态标签颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'assigned': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'pending_review': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'completed': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return '开放中';
      case 'assigned': return '已接单';
      case 'pending_review': return '待审核';
      case 'completed': return '已完成';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/10">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* 头部 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                🔥 任务市场
              </h1>
              <p className="text-muted-foreground mt-2">
                发布小说创作需求，或接单赚取SEED奖励
              </p>
            </div>
            <button
              onClick={() => setShowPublishModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-primary to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity font-medium shadow-lg"
            >
              + 发布任务
            </button>
          </div>

          {/* 统计信息 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-card border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">总任务数</div>
              <div className="text-2xl font-bold">{total}</div>
            </div>
            <div className="bg-card border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">开放中</div>
              <div className="text-2xl font-bold text-green-600">
                {tasks.filter(t => t.status === 'open').length}
              </div>
            </div>
            <div className="bg-card border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">今日新增</div>
              <div className="text-2xl font-bold text-blue-600">--</div>
            </div>
          </div>

          {/* 筛选器 */}
          <div className="bg-card border rounded-lg p-4 mb-6">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">状态</label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="open">开放中</option>
                  <option value="assigned">已接单</option>
                  <option value="pending_review">待审核</option>
                  <option value="completed">已完成</option>
                  <option value="all">全部</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">题材</label>
                <select
                  value={genreFilter}
                  onChange={(e) => {
                    setGenreFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary outline-none"
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
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">加载中...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 bg-card border rounded-lg">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold mb-2">暂无任务</h3>
            <p className="text-muted-foreground mb-4">成为第一个发布任务的人吧！</p>
            <button
              onClick={() => setShowPublishModal(true)}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:opacity-90"
            >
              发布任务
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-4">
              {tasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="block bg-card border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2 line-clamp-1">{task.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {task.description}
                      </p>
                      
                      {/* 标签 */}
                      <div className="flex flex-wrap gap-2 mb-2">
                        {task.genre && (
                          <span className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded">
                            {task.genre}
                          </span>
                        )}
                        {task.target_words && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded dark:bg-blue-900 dark:text-blue-200">
                            {task.target_words >= 10000 
                              ? `${(task.target_words / 10000).toFixed(1)}万字`
                              : `${task.target_words}字`
                            }
                          </span>
                        )}
                        <span className={`px-2 py-1 text-xs rounded ${getStatusColor(task.status)}`}>
                          {getStatusText(task.status)}
                        </span>
                      </div>
                    </div>

                    {/* 预算 */}
                    <div className="text-right ml-4">
                      <div className="text-2xl font-bold text-primary">
                        {task.budget} SEED
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        预算
                      </div>
                    </div>
                  </div>

                  {/* 底部信息 */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground pt-3 border-t">
                    <div className="flex items-center gap-4">
                      <span>👤 {task.publisher_name || '匿名用户'}</span>
                      {task.assignee_name && (
                        <span>✍️ {task.assignee_name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span>📅 {formatDate(task.created_at)}</span>
                      {task.status === 'open' && (
                        <span className={getDaysLeft(task.deadline) <= 3 ? 'text-red-600 font-medium' : ''}>
                          ⏰ 剩余{getDaysLeft(task.deadline)}天
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary"
                >
                  上一页
                </button>
                
                <span className="px-4 py-2">
                  第 {page} / {totalPages} 页（共 {total} 个任务）
                </span>

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">发布新任务</h2>
                <button
                  onClick={() => setShowPublishModal(false)}
                  className="text-2xl hover:text-destructive"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handlePublish} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    任务标题 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="例如：创作一部科幻小说"
                    className="w-full px-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary outline-none"
                    required
                    minLength={5}
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground mt-1">5-100个字符</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    任务描述 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="详细描述你的需求，包括题材、风格、要求等..."
                    className="w-full px-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary outline-none min-h-[120px]"
                    required
                    minLength={20}
                    maxLength={2000}
                  />
                  <p className="text-xs text-muted-foreground mt-1">20-2000个字符</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">题材分类</label>
                    <select
                      value={formData.genre}
                      onChange={(e) => setFormData({...formData, genre: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary outline-none"
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
                    <label className="block text-sm font-medium mb-2">目标字数</label>
                    <input
                      type="number"
                      value={formData.target_words}
                      onChange={(e) => setFormData({...formData, target_words: e.target.value})}
                      placeholder="例如：50000"
                      className="w-full px-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary outline-none"
                      min={1000}
                      max={500000}
                    />
                    <p className="text-xs text-muted-foreground mt-1">1000-500000字（可选）</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      预算 (SEED) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.budget}
                      onChange={(e) => setFormData({...formData, budget: e.target.value})}
                      placeholder="例如：500"
                      className="w-full px-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary outline-none"
                      required
                      min={50}
                      max={10000}
                    />
                    <p className="text-xs text-muted-foreground mt-1">50-10000 SEED</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      截止日期 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary outline-none"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      max={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    />
                    <p className="text-xs text-muted-foreground mt-1">未来30天内</p>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    💡 提示：发布任务将立即冻结预算SEED，任务完成后支付给作者（平台抽成10%）
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPublishModal(false)}
                    className="flex-1 px-6 py-3 border rounded-lg hover:bg-secondary transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={publishing}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-primary to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {publishing ? '发布中...' : '发布任务'}
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
