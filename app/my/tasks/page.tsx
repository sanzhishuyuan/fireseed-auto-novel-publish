'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// ============ 类型定义 ============
interface Task {
  id: string;
  title: string;
  description: string;
  genre?: string;
  target_words?: number;
  budget: number;
  deadline: string;
  status: string;
  publisher_id: string;
  publisher_name?: string;
  assignee_count?: number;
  max_assignees?: number;
  created_at: string;
  updated_at: string;
}

interface TasksResponse {
  success: boolean;
  data: {
    tasks: Task[];
    total: number;
    page: number;
    totalPages: number;
  };
}

// ============ 工具函数 ============
const formatDate = (d: string) => {
  return new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatDateTime = (d: string) => {
  return new Date(d).toLocaleString('zh-CN');
};

const getDaysLeft = (deadline: string) => {
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open:          { label: '开放中', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  reviewing:     { label: '审核中', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  completed:     { label: '已完成', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
  cancelled:     { label: '已取消', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

const TABS: { key: string; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'published', label: '我发布的' },
  { key: 'assigned', label: '我接单的' },
];

const STATUS_FILTERS = [
  { key: '', label: '全部状态' },
  { key: 'open', label: '开放中' },
  { key: 'reviewing', label: '审核中' },
  { key: 'completed', label: '已完成' },
  { key: 'cancelled', label: '已取消' },
];

// ============ 主组件 ============
export default function MyTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [role, setRole] = useState('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');

  // 提交弹窗状态
  const [submitModalTask, setSubmitModalTask] = useState<Task | null>(null);
  const [submitTitle, setSubmitTitle] = useState('');
  const [submitContent, setSubmitContent] = useState('');
  const [submitLink, setSubmitLink] = useState('');
  const [submitMode, setSubmitMode] = useState<'content' | 'file' | 'link'>('content');
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ url: string; fileName: string; fileSize: number } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadTasks = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ role, page: page.toString(), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/my/tasks?${params}`, { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/auth/login?redirect=/my/tasks';
          return;
        }
        throw new Error('加载失败');
      }
      const data: TasksResponse = await res.json();
      if (data.success) {
        setTasks(data.data.tasks || []);
        setTotal(data.data.total || 0);
        setTotalPages(data.data.totalPages || 1);
      }
    } catch (e) {
      setError('加载任务列表失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [page, role, statusFilter]);

  // 切换角色标签时重置分页
  const switchRole = (newRole: string) => {
    setRole(newRole);
    setPage(1);
  };

  // 切换状态筛选时重置分页
  const switchStatus = (newStatus: string) => {
    setStatusFilter(newStatus);
    setPage(1);
  };

  // ===== 提交相关函数 =====

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // 上传文件
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('文件大小不能超过 10MB');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload/task', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await res.json();
      if (data.success) {
        const payload = (data as any).data || data;
        setUploadedFile({
          url: payload.url,
          fileName: payload.fileName,
          fileSize: payload.fileSize,
        });
      } else {
        const errMsg = typeof data.error === 'string' ? data.error : data.error?.message || '上传失败';
        alert(`上传失败: ${errMsg}`);
      }
    } catch (error) {
      console.error('上传失败:', error);
      alert('上传失败，请重试');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // 提交任务
  const handleSubmitTask = async () => {
    if (!submitModalTask) return;

    if (submitMode === 'content' && !submitContent) {
      alert('请填写交付内容');
      return;
    }
    if (submitMode === 'file' && !uploadedFile) {
      alert('请上传文件');
      return;
    }
    if (submitMode === 'link' && !submitLink) {
      alert('请提交链接');
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(`/api/tasks/novel/${submitModalTask.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: submitTitle,
          content: submitMode === 'content' ? submitContent || undefined : undefined,
          link_url: submitMode === 'link' ? submitLink || undefined : undefined,
          file_path: submitMode === 'file' ? uploadedFile?.url : undefined,
          file_name: submitMode === 'file' ? uploadedFile?.fileName : undefined,
          file_size: submitMode === 'file' ? uploadedFile?.fileSize : undefined,
        }),
        credentials: 'include',
      });

      const data = await res.json();
      if (data.success) {
        alert('提交成功，等待发布者审核');
        setSubmitModalTask(null);
        setSubmitTitle('');
        setSubmitContent('');
        setSubmitLink('');
        setUploadedFile(null);
        setSubmitMode('content');
        loadTasks();
      } else {
        const errMsg = typeof data.error === 'string' ? data.error : data.error?.message || '提交失败';
        alert(`提交失败: ${errMsg}`);
      }
    } catch (error) {
      console.error('提交失败:', error);
      alert('提交失败，请重试');
    } finally {
      setActionLoading(false);
    }
  };

  // 打开提交弹窗
  const openSubmitModal = (task: Task, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSubmitModalTask(task);
    setSubmitTitle('');
    setSubmitContent('');
    setSubmitLink('');
    setUploadedFile(null);
    setSubmitMode('content');
  };

  return (
    <div className="min-h-screen" style={{ background: '#0b0b0f' }}>
      {/* 页面头部 */}
      <header className="sticky top-0 z-50" style={{ background: 'rgba(11,11,15,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <Link href="/my" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,165,92,0.12)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#c9a55c" strokeWidth="1.5" strokeLinecap="round">
              <path d="M13 8H3M7 4L3 8l4 4"/>
            </svg>
          </Link>
          <h1 className="text-base font-semibold" style={{ color: '#f0ece4', fontFamily: "'Fraunces', Georgia, serif" }}>我的任务</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* 标签切换 */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => switchRole(tab.key)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
              style={{
                background: role === tab.key ? '#c9a55c' : 'rgba(255,255,255,0.04)',
                color: role === tab.key ? '#0b0b0f' : '#9a9a8e',
              }}
            >
              {tab.label}
            </button>
          ))}

          {/* 状态筛选项 */}
          <div className="ml-auto flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => switchStatus(e.target.value)}
              className="codex-select text-sm"
              style={{ padding: '6px 12px', fontSize: 13 }}
            >
              {STATUS_FILTERS.map(f => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 统计小提示 */}
        {!loading && !error && (
          <div className="text-xs mb-4" style={{ color: '#5a5a52' }}>
            共 {total} 个任务
            {role === 'published' ? '（我发布的）' : role === 'assigned' ? '（我接单的）' : ''}
          </div>
        )}

        {/* 加载中 */}
        {loading && (
          <div className="flex flex-col items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#c9a55c' }} />
            <p className="mt-4 text-sm" style={{ color: '#5a5a52' }}>加载中...</p>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="codex-card p-6 text-center">
            <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
            <button onClick={loadTasks} className="mt-3 codex-btn-gold text-sm">重试</button>
          </div>
        )}

        {/* 空状态 */}
        {!loading && !error && tasks.length === 0 && (
          <div className="codex-card p-10 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-sm font-medium" style={{ color: '#9a9a8e' }}>
              {role === 'published' ? '还没有发布过任务' : role === 'assigned' ? '还没有接单' : '暂无相关任务'}
            </p>
            {role !== 'assigned' && (
              <Link href="/tasks" className="inline-block mt-4 codex-btn-gold text-sm">
                去任务市场看看
              </Link>
            )}
          </div>
        )}

        {/* 任务列表 */}
        {!loading && !error && tasks.length > 0 && (
          <>
            <div className="space-y-3">
              {tasks.map(task => {
                const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.open;
                const daysLeft = (task.status === 'open' || task.status === 'reviewing') ? getDaysLeft(task.deadline) : 0;

                return (
                  <Link
                    key={task.id}
                    href={`/tasks/${task.id}`}
                    className="codex-card block p-5 transition-all hover:translate-y-[-1px]"
                    style={{ textDecoration: 'none', cursor: 'pointer' }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* 标题 */}
                        <h3 className="font-semibold text-base truncate" style={{ color: '#f0ece4' }}>
                          {task.title}
                        </h3>

                        {/* 描述 */}
                        <p className="text-sm mt-1.5 line-clamp-2" style={{ color: '#9a9a8e' }}>
                          {task.description}
                        </p>

                        {/* 标签行 */}
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          {/* 状态标签 */}
                          <span className="inline-block px-2.5 py-0.5 rounded text-xs font-medium" style={{ background: statusCfg.bg, color: statusCfg.color }}>
                            {statusCfg.label}
                          </span>

                          {/* 题材 */}
                          {task.genre && (
                            <span className="inline-block px-2.5 py-0.5 rounded text-xs" style={{ background: 'rgba(201,165,92,0.1)', color: '#c9a55c' }}>
                              {task.genre}
                            </span>
                          )}

                          {/* 目标字数 */}
                          {task.target_words && (
                            <span className="inline-block px-2.5 py-0.5 rounded text-xs" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                              {task.target_words >= 10000
                                ? `${(task.target_words / 10000).toFixed(1)}万字`
                                : `${task.target_words}字`
                              }
                            </span>
                          )}

                          {/* 接单进度 */}
                          {task.assignee_count !== undefined && (
                            <span className="inline-block px-2.5 py-0.5 rounded text-xs" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>
                              {task.assignee_count}/{task.max_assignees || 9}人
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 右侧：预算 */}
                      <div className="text-right flex-shrink-0">
                        <div className="text-lg font-bold" style={{ color: '#c9a55c' }}>
                          {task.budget}
                          <span className="text-xs font-normal ml-1" style={{ color: '#9a9a8e' }}>SEED</span>
                        </div>
                        {daysLeft > 0 && (
                          <div className="text-xs mt-1" style={{ color: daysLeft <= 3 ? '#ef4444' : '#5a5a52' }}>
                            剩余 {daysLeft} 天
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 底部信息 */}
                    <div className="flex items-center justify-between mt-3 pt-3 text-xs" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ color: '#5a5a52' }}>
                        {task.publisher_name && (
                          <span>发布者: {task.publisher_name}</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {role === 'assigned' && task.status === 'open' && (
                          <button
                            onClick={(e) => openSubmitModal(task, e)}
                            style={{
                              padding: '4px 12px',
                              borderRadius: 6,
                              border: '1px solid rgba(201,165,92,0.4)',
                              background: 'rgba(201,165,92,0.1)',
                              color: '#c9a55c',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'rgba(201,165,92,0.2)'; }}
                            onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'rgba(201,165,92,0.1)'; }}
                          >
                            提交成果
                          </button>
                        )}
                        <div style={{ color: '#5a5a52' }}>
                          {formatDateTime(task.created_at)}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="codex-btn-ghost text-sm px-4 py-2"
                  style={{ opacity: page <= 1 ? 0.4 : 1, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
                >
                  上一页
                </button>
                <span className="text-sm" style={{ color: '#5a5a52' }}>
                  第 {page} / {totalPages} 页
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="codex-btn-ghost text-sm px-4 py-2"
                  style={{ opacity: page >= totalPages ? 0.4 : 1, cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ====== 提交弹窗 ====== */}
      {submitModalTask && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            padding: 16,
          }}
          onClick={() => setSubmitModalTask(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 560,
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#151515',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
            }}
            className="codex-scrollbar"
          >
            {/* 弹窗头部 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 24px 0',
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    color: '#f0ece4',
                    fontFamily: "'Fraunces', Georgia, serif",
                    marginBottom: 4,
                  }}
                >
                  提交成果
                </h3>
                <p style={{ fontSize: 12, color: '#5a5a52' }}>
                  任务：{submitModalTask.title}
                </p>
              </div>
              <button
                onClick={() => setSubmitModalTask(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#5a5a52',
                  fontSize: 24,
                  cursor: 'pointer',
                  lineHeight: 1,
                  padding: '4px 8px',
                }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* 提交标题 */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 11,
                    letterSpacing: 1,
                    color: '#5a5a52',
                    textTransform: 'uppercase',
                    marginBottom: 8,
                    fontFamily: "'SF Mono', 'Fira Code', monospace",
                  }}
                >
                  提交标题（可选）
                </label>
                <input
                  type="text"
                  value={submitTitle}
                  onChange={(e) => setSubmitTitle(e.target.value)}
                  placeholder="例如：最终稿 v1.0"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.03)',
                    color: '#f0ece4',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>

              {/* 提交方式切换 */}
              <div style={{ display: 'flex', gap: 8 }}>
                {([
                  { key: 'content' as const, label: '直接写作' },
                  { key: 'file' as const, label: '上传文件' },
                  { key: 'link' as const, label: '提交链接' },
                ]).map((mode) => (
                  <button
                    key={mode.key}
                    onClick={() => setSubmitMode(mode.key)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: submitMode === mode.key ? '1px solid #c9a55c' : '1px solid rgba(255,255,255,0.08)',
                      background: submitMode === mode.key ? 'rgba(201,165,92,0.1)' : 'rgba(255,255,255,0.03)',
                      color: submitMode === mode.key ? '#c9a55c' : '#9a9a8e',
                      fontSize: 13,
                      fontWeight: submitMode === mode.key ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {mode.key === 'content' ? '直接写作' : mode.key === 'file' ? '上传文件' : '提交链接'}
                  </button>
                ))}
              </div>

              {/* 直接写作模式 */}
              {submitMode === 'content' && (
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 11,
                      letterSpacing: 1,
                      color: '#5a5a52',
                      textTransform: 'uppercase',
                      marginBottom: 8,
                      fontFamily: "'SF Mono', 'Fira Code', monospace",
                    }}
                  >
                    交付内容 <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    value={submitContent}
                    onChange={(e) => setSubmitContent(e.target.value)}
                    placeholder="在此输入小说内容 / Markdown 格式..."
                    style={{
                      width: '100%',
                      minHeight: 200,
                      padding: '12px 14px',
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(0,0,0,0.2)',
                      color: '#f0ece4',
                      fontSize: 13,
                      fontFamily: 'monospace',
                      lineHeight: 1.6,
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                  <p style={{ fontSize: 11, color: '#5a5a52', marginTop: 6, fontFamily: "'SF Mono', 'Fira Code', monospace" }}>
                    支持 Markdown 格式，可直接粘贴小说章节内容
                  </p>
                </div>
              )}

              {/* 上传文件模式 */}
              {submitMode === 'file' && (
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 11,
                      letterSpacing: 1,
                      color: '#5a5a52',
                      textTransform: 'uppercase',
                      marginBottom: 8,
                      fontFamily: "'SF Mono', 'Fira Code', monospace",
                    }}
                  >
                    附件 <span style={{ color: '#ef4444' }}>*</span>（最大 10MB）
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <label
                      style={{
                        padding: '8px 16px',
                        borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.08)',
                        cursor: 'pointer',
                        fontSize: 13,
                        color: '#f0ece4',
                        background: 'rgba(255,255,255,0.03)',
                      }}
                    >
                      {uploading ? '上传中...' : '选择文件'}
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                        disabled={uploading}
                      />
                    </label>
                    {uploadedFile && (
                      <span style={{ fontSize: 12, color: '#c9a55c' }}>
                        {uploadedFile.fileName} ({formatFileSize(uploadedFile.fileSize)})
                      </span>
                    )}
                  </div>
                  {uploadedFile && (
                    <div style={{ marginTop: 8 }}>
                      <button
                        onClick={() => setUploadedFile(null)}
                        style={{
                          fontSize: 11,
                          color: '#ef4444',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          fontFamily: "'SF Mono', 'Fira Code', monospace",
                        }}
                      >
                        移除文件
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 提交链接模式 */}
              {submitMode === 'link' && (
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 11,
                      letterSpacing: 1,
                      color: '#5a5a52',
                      textTransform: 'uppercase',
                      marginBottom: 8,
                      fontFamily: "'SF Mono', 'Fira Code', monospace",
                    }}
                  >
                    小说链接 <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="url"
                    value={submitLink}
                    onChange={(e) => setSubmitLink(e.target.value)}
                    placeholder="https://fireseed.online/novels/xxx"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.03)',
                      color: '#f0ece4',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                  <p style={{ fontSize: 11, color: '#5a5a52', marginTop: 6, fontFamily: "'SF Mono', 'Fira Code', monospace" }}>
                    提交已发布到网站的小说链接，管理员可直接查看
                  </p>
                </div>
              )}
            </div>

            {/* 弹窗底部 */}
            <div
              style={{
                display: 'flex',
                gap: 12,
                padding: '16px 24px 24px',
              }}
            >
              <button
                onClick={() => setSubmitModalTask(null)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(255,255,255,0.03)',
                  color: '#9a9a8e',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                取消
              </button>
              <button
                onClick={handleSubmitTask}
                disabled={
                  actionLoading ||
                  (submitMode === 'content' && !submitContent) ||
                  (submitMode === 'file' && !uploadedFile) ||
                  (submitMode === 'link' && !submitLink)
                }
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 10,
                  border: 'none',
                  background:
                    actionLoading ||
                    (submitMode === 'content' && !submitContent) ||
                    (submitMode === 'file' && !uploadedFile) ||
                    (submitMode === 'link' && !submitLink)
                      ? 'rgba(201,165,92,0.3)'
                      : 'linear-gradient(135deg, #c9a55c, #b8943e)',
                  color: '#0b0b0f',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor:
                    actionLoading ||
                    (submitMode === 'content' && !submitContent) ||
                    (submitMode === 'file' && !uploadedFile) ||
                    (submitMode === 'link' && !submitLink)
                      ? 'not-allowed'
                      : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {actionLoading ? '提交中...' : '提交完成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
