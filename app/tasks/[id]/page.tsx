'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Submission {
  id: string;
  task_id: string;
  submitter_id: string;
  title: string;
  content: string | null;
  link_url: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  status: string;
  publisher_notes: string | null;
  reward_amount: number | null;
  submitter_name?: string;
  created_at: string;
  updated_at: string;
}

interface Assignee {
  id: string;
  username: string;
  assigned_at: string;
}

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
  completed_at?: string;
  created_at: string;
  updated_at: string;
  publisher_name?: string;
  max_assignees?: number;
  assignee_count?: number;
  remaining_budget?: number;
  is_assigned?: boolean;
  assignees?: Assignee[];
}

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // 提交表单
  const [submitTitle, setSubmitTitle] = useState('');
  const [submitContent, setSubmitContent] = useState('');
  const [submitLink, setSubmitLink] = useState('');
  const [submitMode, setSubmitMode] = useState<'content' | 'file' | 'link'>('content');
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ url: string; fileName: string; fileSize: number } | null>(null);

  // 提交列表
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [isPubUser, setIsPubUser] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [rejectForSubmission, setRejectForSubmission] = useState<string | null>(null);

  // 批准相关
  const [approveRewardAmount, setApproveRewardAmount] = useState('');
  const [approveForSubmission, setApproveForSubmission] = useState<string | null>(null);

  // 加载任务详情
  const loadTask = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tasks/novel/${taskId}`);
      const data = await res.json();

      if (data.success) {
        const payload = (data as any).data || data;
        setTask(payload.task || null);
      } else {
        const errMsg = typeof data.error === 'string' ? data.error : data.error?.message || '任务不存在';
        alert(errMsg);
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
        const payload = (data as any).data || data;
        setCurrentUser(payload);
      }
    } catch (error) {
      console.error('加载用户失败:', error);
    }
  };

  useEffect(() => {
    loadTask();
    loadCurrentUser();
  }, [taskId]);

  // 当任务进入 reviewing/completed 状态时自动加载提交列表
  useEffect(() => {
    if (task && (task.status === 'reviewing' || task.status === 'completed') && currentUser) {
      loadSubmissions();
    }
  }, [task?.status, currentUser?.id]);

  // 执行操作
  const handleAction = async (action: string, extraBody?: any) => {
    try {
      setActionLoading(true);

      const body: any = { action, ...extraBody };

      const res = await fetch(`/api/tasks/novel/${taskId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (data.success) {
        const payload = (data as any).data || data;
        alert(payload.message || '操作成功');
        loadTask();
        loadSubmissions();
      } else {
        const errMsg = typeof data.error === 'string' ? data.error : data.error?.message || '操作失败';
        alert(`操作失败: ${errMsg}`);
      }
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败，请重试');
    } finally {
      setActionLoading(false);
    }
  };

  // 加载提交列表
  const loadSubmissions = async () => {
    try {
      setSubmissionsLoading(true);
      const res = await fetch(`/api/tasks/novel/${taskId}/submissions`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        const payload = (data as any).data || data;
        setSubmissions(payload.submissions || []);
        setIsPubUser(payload.isPublisher || false);
      }
    } catch (error) {
      console.error('加载提交列表失败:', error);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  // 提交流表单
  const handleSubmitTask = async () => {
    // 检查提交内容
    if (submitMode === 'content' && !submitContent) {
      alert('请填写交付内容');
      return;
    }
    if (submitMode === 'file' && !uploadedFile) {
      alert('请上传文件');
      return;
    }
    if (submitMode === 'link' && !submitLink) {
      alert('请提交小说链接');
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(`/api/tasks/novel/${taskId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: submitTitle,
          content: submitMode === 'content' ? submitContent || undefined : undefined,
          link_url: submitMode === 'link' ? submitLink || undefined : undefined,
          file_path: submitMode === 'file' ? uploadedFile?.url : undefined,
          file_name: submitMode === 'file' ? uploadedFile?.fileName : undefined,
          file_size: submitMode === 'file' ? uploadedFile?.fileSize : undefined,
        })
      });

      const data = await res.json();
      if (data.success) {
        alert('提交成功，等待发布者审核');
        setSubmitTitle('');
        setSubmitContent('');
        setSubmitLink('');
        setUploadedFile(null);
        setSubmitMode('content');
        loadTask();
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

  // 文件大小格式化
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
      reviewing: 'codex-badge codex-badge-yellow',
      completed: 'codex-badge codex-badge-gray',
      cancelled: 'codex-badge codex-badge-red'
    };

    const texts: Record<string, string> = {
      open: '开放中',
      reviewing: '审核中',
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
            <p className="codex-mono" style={{ marginTop: 16, fontSize: 13, color: 'var(--codex-text-muted)' }}>加载中...</p>
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
            <div style={{ fontSize: 48, marginBottom: 16, color: 'var(--codex-text-muted)' }}>&times;</div>
            <h2 className="codex-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--codex-text)', marginBottom: 12 }}>
              任务不存在
            </h2>
            <Link href="/tasks" style={{ color: 'var(--codex-gold)', textDecoration: 'underline' }}>
              返回任务市场
            </Link>
          </div>
        </div>
      </>
    );
  }

  const isPublisher = currentUser?.id === task.publisher_id;
  const isAssignee = task.is_assigned === true;
  const daysLeft = getDaysLeft(task.deadline);
  const assigneeCount = task.assignee_count || 0;
  const maxAssignees = task.max_assignees || 9;
  const remainingBudget = task.remaining_budget ?? task.budget;

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
                <h1 className="codex-display" style={{ fontSize: 24, fontWeight: 700, color: 'var(--codex-text)' }}>
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
              <div className="codex-display" style={{ fontSize: 32, fontWeight: 800, color: 'var(--codex-gold)', lineHeight: 1 }}>
                {task.budget} <span style={{ fontSize: 16, fontWeight: 500 }}>SEED</span>
              </div>
              <div className="codex-mono" style={{ fontSize: 10, color: 'var(--codex-text-muted)', letterSpacing: 1, marginTop: 6 }}>
                任务预算
              </div>
            </div>
          </div>

          {/* 任务描述 */}
          <div className="codex-divider" style={{ marginBottom: 20 }} />
          <h3 className="codex-section-title" style={{ marginBottom: 12 }}>任务描述</h3>
          <p style={{ fontSize: 14, color: 'var(--codex-text-dim)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
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
                <span className="codex-mono" style={{ fontSize: 12, color: 'var(--codex-text-muted)' }}>用户名</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--codex-text)' }}>{task.publisher_name || '匿名用户'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="codex-mono" style={{ fontSize: 12, color: 'var(--codex-text-muted)' }}>发布时间</span>
                <span className="codex-mono" style={{ fontSize: 12, color: 'var(--codex-text-dim)' }}>{formatDate(task.created_at)}</span>
              </div>
            </div>
          </div>

          {/* 接单信息 */}
          <div className="codex-card" style={{ padding: 24 }}>
            <h3 className="codex-section-title" style={{ fontSize: 16, marginBottom: 16 }}>接单进度</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="codex-mono" style={{ fontSize: 12, color: 'var(--codex-text-muted)' }}>当前接单</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: assigneeCount >= maxAssignees ? 'var(--codex-red)' : 'var(--codex-green)' }}>
                  {assigneeCount} / {maxAssignees} 人
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="codex-mono" style={{ fontSize: 12, color: 'var(--codex-text-muted)' }}>剩余预算</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--codex-gold)' }}>{remainingBudget} SEED</span>
              </div>
              {task.assignees && task.assignees.length > 0 && (
                <div className="codex-divider" style={{ margin: '4px 0' }} />
              )}
              {task.assignees?.map((a) => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--codex-text-dim)' }}>{a.username || '匿名'}</span>
                  <span className="codex-mono" style={{ color: 'var(--codex-text-muted)', fontSize: 11 }}>{formatDate(a.assigned_at)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 时间和状态 */}
        <div className="codex-card" style={{ padding: 24, marginBottom: 24 }}>
          <h3 className="codex-section-title" style={{ fontSize: 16, marginBottom: 16 }}>时间安排</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="codex-mono" style={{ fontSize: 10, color: 'var(--codex-text-muted)', letterSpacing: 1, marginBottom: 6 }}>截止日期</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--codex-text)' }}>{formatDate(task.deadline)}</div>
            </div>
            <div>
              <div className="codex-mono" style={{ fontSize: 10, color: 'var(--codex-text-muted)', letterSpacing: 1, marginBottom: 6 }}>剩余时间</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: daysLeft <= 3 ? 'var(--codex-red)' : 'var(--codex-text)' }}>
                {daysLeft > 0 ? `${daysLeft} 天` : '已过期'}
              </div>
            </div>
            <div>
              <div className="codex-mono" style={{ fontSize: 10, color: 'var(--codex-text-muted)', letterSpacing: 1, marginBottom: 6 }}>最后更新</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--codex-text)' }}>{formatDate(task.updated_at)}</div>
            </div>
          </div>
        </div>

        {/* 操作区域 */}
        {!currentUser ? (
          <div className="codex-card" style={{ padding: 28, textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'var(--codex-text-dim)', marginBottom: 16 }}>请先登录以执行操作</p>
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
            {/* ===== 发布者操作 - 任务开放中 ===== */}
            {isPublisher && task.status === 'open' && (
              <div className="codex-card" style={{ padding: 24 }}>
                <h3 className="codex-section-title" style={{ fontSize: 16, marginBottom: 16 }}>发布者操作</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <button
                    onClick={() => handleAction('close')}
                    disabled={actionLoading}
                    className="codex-btn codex-btn-blue"
                    style={{ width: '100%', opacity: actionLoading ? 0.5 : 1 }}
                  >
                    {actionLoading ? '处理中...' : '关闭接单（开始审核）'}
                  </button>
                  <div className="codex-tip codex-tip-info">
                    关闭后将不再接受新接单，已有提交将进入审核状态
                  </div>
                  <button
                    onClick={() => handleAction('cancel')}
                    disabled={actionLoading}
                    className="codex-btn codex-btn-ghost"
                    style={{ width: '100%', opacity: actionLoading ? 0.5 : 1, color: 'var(--codex-red)' }}
                  >
                    {actionLoading ? '处理中...' : '取消任务（退还未使用SEED）'}
                  </button>
                </div>
              </div>
            )}

            {/* ===== 作者接单 ===== */}
            {!isPublisher && !isAssignee && task.status === 'open' && (
              <div className="codex-card" style={{ padding: 24 }}>
                <h3 className="codex-section-title" style={{ fontSize: 16, marginBottom: 12 }}>接单创作</h3>
                <p style={{ fontSize: 14, color: 'var(--codex-text-dim)', lineHeight: 1.7, marginBottom: 16 }}>
                  接单后您可以提交创作成果，审核通过后将获得相应 SEED 奖励（平台抽成 10%）
                  {assigneeCount >= maxAssignees && (
                    <span style={{ color: 'var(--codex-red)', display: 'block', marginTop: 8 }}>接单人数已满，无法接单</span>
                  )}
                </p>
                <button
                  onClick={() => handleAction('assign')}
                  disabled={actionLoading || assigneeCount >= maxAssignees}
                  className="codex-btn codex-btn-gold"
                  style={{ width: '100%', opacity: (actionLoading || assigneeCount >= maxAssignees) ? 0.5 : 1 }}
                >
                  {actionLoading ? '处理中...' : assigneeCount >= maxAssignees ? '接单已满' : '立即接单'}
                </button>
              </div>
            )}

            {/* ===== 已接单 → 提交表单 ===== */}
            {isAssignee && task.status === 'open' && (
              <div className="codex-card" style={{ padding: 24 }}>
                <h3 className="codex-section-title" style={{ fontSize: 16, marginBottom: 16 }}>提交完成</h3>
                <p style={{ fontSize: 14, color: 'var(--codex-text-dim)', lineHeight: 1.7, marginBottom: 16 }}>
                  请提交您的创作成果，审核通过后将获得 SEED 奖励
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* 提交标题 */}
                  <div>
                    <label className="codex-mono" style={{ display: 'block', fontSize: 11, letterSpacing: 1, color: 'var(--codex-text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                      提交标题（可选）
                    </label>
                    <input
                      type="text"
                      value={submitTitle}
                      onChange={(e) => setSubmitTitle(e.target.value)}
                      placeholder="例如：最终稿 v1.0"
                      className="codex-input"
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
                          border: submitMode === mode.key ? '1px solid var(--codex-gold)' : '1px solid var(--border)',
                          background: submitMode === mode.key ? 'rgba(201,165,92,0.1)' : 'rgba(255,255,255,0.03)',
                          color: submitMode === mode.key ? 'var(--codex-gold)' : 'var(--codex-text-dim)',
                          fontSize: 13,
                          fontWeight: submitMode === mode.key ? 600 : 400,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        {mode.key === 'content' ? '✍️ 直接写作' : mode.key === 'file' ? '📎 上传文件' : '🔗 提交链接'}
                      </button>
                    ))}
                  </div>

                  {/* 直接写作模式 */}
                  {submitMode === 'content' && (
                    <div>
                      <label className="codex-mono" style={{ display: 'block', fontSize: 11, letterSpacing: 1, color: 'var(--codex-text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                        交付内容 <span style={{ color: 'var(--codex-red)' }}>*</span>
                      </label>
                      <textarea
                        value={submitContent}
                        onChange={(e) => setSubmitContent(e.target.value)}
                        placeholder="在此输入小说内容 / Markdown 格式..."
                        className="codex-input"
                        style={{ minHeight: 200, resize: 'vertical', fontFamily: 'monospace', fontSize: 13 }}
                      />
                      <p className="codex-mono" style={{ fontSize: 11, color: 'var(--codex-text-muted)', marginTop: 6 }}>
                        支持 Markdown 格式，可直接粘贴小说章节内容
                      </p>
                    </div>
                  )}

                  {/* 上传文件模式 */}
                  {submitMode === 'file' && (
                    <div>
                      <label className="codex-mono" style={{ display: 'block', fontSize: 11, letterSpacing: 1, color: 'var(--codex-text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                        附件 <span style={{ color: 'var(--codex-red)' }}>*</span>（最大 10MB）
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <label
                          style={{
                            padding: '8px 16px',
                            borderRadius: 8,
                            border: '1px solid var(--border)',
                            cursor: 'pointer',
                            fontSize: 13,
                            color: 'var(--codex-text)',
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
                          <span style={{ fontSize: 12, color: 'var(--codex-gold)' }}>
                            {uploadedFile.fileName} ({formatFileSize(uploadedFile.fileSize)})
                          </span>
                        )}
                      </div>
                      {uploadedFile && (
                        <div style={{ marginTop: 8 }}>
                          <button
                            onClick={() => setUploadedFile(null)}
                            className="codex-mono"
                            style={{ fontSize: 11, color: 'var(--codex-red)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
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
                      <label className="codex-mono" style={{ display: 'block', fontSize: 11, letterSpacing: 1, color: 'var(--codex-text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                        小说链接 <span style={{ color: 'var(--codex-red)' }}>*</span>
                      </label>
                      <input
                        type="url"
                        value={submitLink}
                        onChange={(e) => setSubmitLink(e.target.value)}
                        placeholder="https://fireseed.online/novels/xxx"
                        className="codex-input"
                      />
                      <p className="codex-mono" style={{ fontSize: 11, color: 'var(--codex-text-muted)', marginTop: 6 }}>
                        提交已发布到网站的小说链接，管理员可直接查看
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleSubmitTask}
                    disabled={actionLoading || (submitMode === 'content' && !submitContent) || (submitMode === 'file' && !uploadedFile) || (submitMode === 'link' && !submitLink)}
                    className="codex-btn codex-btn-gold"
                    style={{ width: '100%', opacity: (actionLoading || (submitMode === 'content' && !submitContent) || (submitMode === 'file' && !uploadedFile) || (submitMode === 'link' && !submitLink)) ? 0.5 : 1 }}
                  >
                    {actionLoading ? '提交中...' : '提交完成'}
                  </button>
                </div>
              </div>
            )}

            {/* ===== 审核中：发布者审核提交 ===== */}
            {isPublisher && task.status === 'reviewing' && (
              <div className="codex-card" style={{ padding: 24, marginBottom: 24 }}>
                <h3 className="codex-section-title" style={{ fontSize: 16, marginBottom: 16 }}>提交审核</h3>
                <p style={{ fontSize: 13, color: 'var(--codex-text-dim)', marginBottom: 16 }}>
                  剩余预算：{remainingBudget} SEED。每条提交可单独批准（输入奖励金额），或驳回。审核完成后点击"完成审核"退回剩余预算。
                </p>
                {submissionsLoading ? (
                  <p className="codex-mono" style={{ fontSize: 13, color: 'var(--codex-text-muted)' }}>加载中...</p>
                ) : submissions.length === 0 ? (
                  <p className="codex-mono" style={{ fontSize: 13, color: 'var(--codex-text-muted)' }}>暂无提交记录</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {submissions.map((sub, idx) => (
                      <div
                        key={sub.id}
                        style={{
                          padding: 16,
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          background: 'rgba(255,255,255,0.02)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--codex-text)' }}>
                              {sub.title || `提交 #${submissions.length - idx}`}
                            </span>
                            <span className={`codex-badge ${sub.status === 'submitted' ? 'codex-badge-yellow' : sub.status === 'approved' ? 'codex-badge-green' : 'codex-badge-red'}`}>
                              {sub.status === 'submitted' ? '待审核' : sub.status === 'approved' ? `已通过${sub.reward_amount ? ` ${sub.reward_amount}SEED` : ''}` : '已驳回'}
                            </span>
                          </div>
                          <span className="codex-mono" style={{ fontSize: 11, color: 'var(--codex-text-muted)' }}>
                            {sub.submitter_name || '未知'} · {formatDate(sub.created_at)}
                          </span>
                        </div>

                        {/* 内容预览 */}
                        {sub.content && (
                          <div
                            style={{
                              padding: 12,
                              borderRadius: 6,
                              background: 'rgba(0,0,0,0.15)',
                              fontSize: 13,
                              color: 'var(--codex-text-dim)',
                              lineHeight: 1.6,
                              marginBottom: 12,
                              maxHeight: 200,
                              overflowY: 'auto',
                              whiteSpace: 'pre-wrap',
                              fontFamily: 'monospace',
                            }}
                          >
                            {sub.content.slice(0, 500)}{sub.content.length > 500 ? '...' : ''}
                          </div>
                        )}

                        {/* 附件 */}
                        {sub.file_path && (
                          <div style={{ marginBottom: 12 }}>
                            <Link
                              href={sub.file_path}
                              target="_blank"
                              style={{ fontSize: 12, color: 'var(--codex-gold)', textDecoration: 'underline' }}
                            >
                              {sub.file_name || '下载附件'} {sub.file_size ? `(${formatFileSize(sub.file_size)})` : ''}
                            </Link>
                          </div>
                        )}

                        {/* 提交链接 */}
                        {sub.link_url && (
                          <div style={{ marginBottom: 12 }}>
                            <Link
                              href={sub.link_url}
                              target="_blank"
                              style={{ fontSize: 12, color: 'var(--codex-blue)', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            >
                              🔗 {sub.link_url}
                            </Link>
                          </div>
                        )}

                        {/* 审批表单 */}
                        {sub.status === 'submitted' && (
                          <>
                            {/* 驳回区域 */}
                            {rejectForSubmission === sub.id && (
                              <div style={{ marginBottom: 12 }}>
                                <textarea
                                  value={rejectNotes}
                                  onChange={(e) => setRejectNotes(e.target.value)}
                                  placeholder="说明驳回原因（可选）..."
                                  className="codex-input"
                                  style={{ minHeight: 60, fontSize: 13 }}
                                />
                              </div>
                            )}
                            {/* 批准区域 */}
                            {approveForSubmission === sub.id && (
                              <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input
                                  type="number"
                                  value={approveRewardAmount}
                                  onChange={(e) => setApproveRewardAmount(e.target.value)}
                                  placeholder="奖励金额"
                                  className="codex-input"
                                  style={{ flex: 1, minHeight: 36, fontSize: 13 }}
                                  min={1}
                                  max={remainingBudget}
                                />
                                <span style={{ fontSize: 12, color: 'var(--codex-text-dim)' }}>/ {remainingBudget} SEED</span>
                              </div>
                            )}
                            {/* 操作按钮 */}
                            <div style={{ display: 'flex', gap: 8 }}>
                              {rejectForSubmission === sub.id ? (
                                <>
                                  <button
                                    onClick={() => handleAction('reject', { submission_id: sub.id, notes: rejectNotes })}
                                    disabled={actionLoading}
                                    className="codex-btn codex-btn-danger"
                                    style={{ flex: 1, padding: '6px 12px', fontSize: 12 }}
                                  >
                                    {actionLoading ? '处理中...' : '确认驳回'}
                                  </button>
                                  <button
                                    onClick={() => { setRejectForSubmission(null); setRejectNotes(''); }}
                                    className="codex-btn codex-btn-ghost"
                                    style={{ flex: 1, padding: '6px 12px', fontSize: 12 }}
                                  >
                                    取消
                                  </button>
                                </>
                              ) : approveForSubmission === sub.id ? (
                                <>
                                  <button
                                    onClick={() => {
                                      if (!approveRewardAmount || parseInt(approveRewardAmount) < 1) {
                                        alert('请输入有效的奖励金额');
                                        return;
                                      }
                                      handleAction('approve', { submission_id: sub.id, reward_amount: parseInt(approveRewardAmount) });
                                    }}
                                    disabled={actionLoading}
                                    className="codex-btn codex-btn-success"
                                    style={{ flex: 1, padding: '6px 12px', fontSize: 12 }}
                                  >
                                    {actionLoading ? '处理中...' : '确认批准'}
                                  </button>
                                  <button
                                    onClick={() => { setApproveForSubmission(null); setApproveRewardAmount(''); }}
                                    className="codex-btn codex-btn-ghost"
                                    style={{ flex: 1, padding: '6px 12px', fontSize: 12 }}
                                  >
                                    取消
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => setRejectForSubmission(sub.id)}
                                    className="codex-btn codex-btn-ghost"
                                    style={{ padding: '6px 12px', fontSize: 12 }}
                                  >
                                    驳回
                                  </button>
                                  <button
                                    onClick={() => { setApproveForSubmission(sub.id); setApproveRewardAmount(String(Math.min(remainingBudget, Math.floor(task.budget / Math.max(assigneeCount, 1))))); }}
                                    className="codex-btn codex-btn-success"
                                    style={{ padding: '6px 12px', fontSize: 12 }}
                                  >
                                    批准
                                  </button>
                                </>
                              )}
                            </div>
                          </>
                        )}

                        {/* 已审核 - 显示发布者备注 */}
                        {sub.publisher_notes && (
                          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--codex-text-dim)' }}>
                            <span className="codex-mono" style={{ color: 'var(--codex-text-muted)' }}>发布者备注：</span>{sub.publisher_notes}
                          </div>
                        )}
                        {sub.status === 'approved' && sub.reward_amount && (
                          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--codex-green)' }}>
                            奖励 {sub.reward_amount} SEED（实际到账 {Math.floor(sub.reward_amount * 0.9)} SEED）
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="codex-divider" style={{ margin: '20px 0' }} />
                {/* 完成审核按钮 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <button
                    onClick={() => handleAction('complete')}
                    disabled={actionLoading}
                    className="codex-btn codex-btn-success"
                    style={{ width: '100%', opacity: actionLoading ? 0.5 : 1 }}
                  >
                    {actionLoading ? '处理中...' : '完成审核（退回剩余SEED）'}
                  </button>
                  <div className="codex-tip codex-tip-info">
                    审核完成后，未批准的预算将退回您的钱包。已批准的金额不可更改。
                  </div>
                </div>
              </div>
            )}

            {/* ===== 任务已完成 — 展示提交历史 ===== */}
            {task.status === 'completed' && (
              <>
                <div className="codex-card" style={{ marginBottom: 24 }}>
                  <div className="codex-empty">
                    <div className="codex-empty-icon" style={{ background: 'rgba(34,197,94,0.12)' }}>&#10003;</div>
                    <div className="codex-empty-title">任务已完成</div>
                    <div className="codex-empty-desc">
                      SEED 已支付给通过的提交者，剩余预算已退回
                    </div>
                  </div>
                </div>
                {/* 显示提交记录 */}
                {(isPublisher || isAssignee) && (
                  <div className="codex-card" style={{ padding: 24 }}>
                    <h3 className="codex-section-title" style={{ fontSize: 16, marginBottom: 16 }}>提交记录</h3>
                    {submissionsLoading ? (
                      <p className="codex-mono" style={{ fontSize: 13, color: 'var(--codex-text-muted)' }}>加载中...</p>
                    ) : submissions.length === 0 ? (
                      <p className="codex-mono" style={{ fontSize: 13, color: 'var(--codex-text-muted)' }}>暂无提交记录</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {submissions.map((sub, idx) => (
                          <div
                            key={sub.id}
                            style={{
                              padding: 16,
                              borderRadius: 8,
                              border: '1px solid var(--border)',
                              background: 'rgba(255,255,255,0.02)',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--codex-text)' }}>
                                  {sub.title || `提交 #${submissions.length - idx}`}
                                </span>
                                <span className={`codex-badge ${sub.status === 'submitted' ? 'codex-badge-yellow' : sub.status === 'approved' ? 'codex-badge-green' : 'codex-badge-red'}`}>
                                  {sub.status === 'submitted' ? '待审核' : sub.status === 'approved' ? `已通过${sub.reward_amount ? ` ${sub.reward_amount}SEED` : ''}` : '已驳回'}
                                </span>
                              </div>
                              <span className="codex-mono" style={{ fontSize: 11, color: 'var(--codex-text-muted)' }}>
                                {sub.submitter_name || '未知'} · {formatDate(sub.created_at)}
                              </span>
                            </div>
                            {sub.content && (
                              <div
                                style={{
                                  padding: 12,
                                  borderRadius: 6,
                                  background: 'rgba(0,0,0,0.15)',
                                  fontSize: 13,
                                  color: 'var(--codex-text-dim)',
                                  lineHeight: 1.6,
                                  marginBottom: 12,
                                  maxHeight: 200,
                                  overflowY: 'auto',
                                  whiteSpace: 'pre-wrap',
                                  fontFamily: 'monospace',
                                }}
                              >
                                {sub.content.slice(0, 1000)}{sub.content.length > 1000 ? '...' : ''}
                              </div>
                            )}
                            {sub.file_path && (
                              <Link
                                href={sub.file_path}
                                target="_blank"
                                style={{ fontSize: 12, color: 'var(--codex-gold)', textDecoration: 'underline' }}
                              >
                                {sub.file_name || '下载附件'} {sub.file_size ? `(${formatFileSize(sub.file_size)})` : ''}
                              </Link>
                            )}
                            {sub.link_url && (
                              <Link
                                href={sub.link_url}
                                target="_blank"
                                style={{ fontSize: 12, color: 'var(--codex-blue)', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              >
                                🔗 {sub.link_url}
                              </Link>
                            )}
                            {sub.publisher_notes && (
                              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--codex-text-dim)' }}>
                                <span className="codex-mono" style={{ color: 'var(--codex-text-muted)' }}>发布者备注：</span>{sub.publisher_notes}
                              </div>
                            )}
                            {sub.status === 'approved' && sub.reward_amount && (
                              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--codex-green)' }}>
                                奖励 {sub.reward_amount} SEED（实际到账 {Math.floor(sub.reward_amount * 0.9)} SEED）
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ===== 任务已取消 ===== */}
            {task.status === 'cancelled' && (
              <div className="codex-card">
                <div className="codex-empty">
                  <div className="codex-empty-icon" style={{ background: 'rgba(239,68,68,0.12)' }}>&times;</div>
                  <div className="codex-empty-title">任务已取消</div>
                  <div className="codex-empty-desc">
                    剩余 SEED 已退还给发布者
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
