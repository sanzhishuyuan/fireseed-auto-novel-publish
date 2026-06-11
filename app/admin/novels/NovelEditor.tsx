'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
  red: '#ef4444',
  blue: '#3b82f6',
} as const;
const fontDisplay = "'Fraunces', Georgia, serif";
const fontMono = "'DM Mono', 'Menlo', monospace";

interface Novel {
  id: string;
  title: string;
  author?: string;
  description?: string;
  cover_url?: string;
  status?: string;
  tags?: string;
  orphan?: boolean;
}

interface Props {
  novels: Novel[];
}

export default function NovelEditor({ novels }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    author: '',
    description: '',
    status: 'ongoing',
    tags: ''
  });

  // 编辑状态
  const [editingNovel, setEditingNovel] = useState<Novel | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    author: '',
    description: '',
    status: '',
    tags: '',
    cover_image: '' as string,
    coverPreview: '' as string
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`确认删除小说「${title}」？\n\n删除后将在保留期（7天）后自动清理，期间可在后台进行恢复。`)) return;

    const res = await fetch(`/api/admin/novels/${id}`, { method: 'DELETE' });
    if (res.ok) {
      alert(`小说「${title}」已标记为删除`);
      router.refresh();
    } else {
      const data = await res.json();
      alert(data.error || '删除失败');
    }
  };

  const handleSubmit = async () => {
    if (!form.title) {
      alert('请填写书名');
      return;
    }

    const res = await fetch('/api/admin/novels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });

    if (res.ok) {
      alert('小说创建成功！');
      setShowForm(false);
      setForm({ title: '', author: '', description: '', status: 'ongoing', tags: '' });
      router.refresh();
    } else {
      alert('创建失败');
    }
  };

  // 打开编辑对话框
  const openEdit = (novel: Novel) => {
    setEditingNovel(novel);
    setEditForm({
      title: novel.title,
      author: novel.author || '',
      description: novel.description || '',
      status: novel.status || 'ongoing',
      tags: novel.tags || '',
      cover_image: '',
      coverPreview: novel.cover_url || ''
    });
    setEditError('');
  };

  // 处理封面文件选择
  const handleCoverFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setEditError('请选择图片文件');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setEditError('图片不能超过 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setEditForm(prev => ({ ...prev, cover_image: dataUrl, coverPreview: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  // 提交编辑
  const handleEditSave = async () => {
    if (!editForm.title.trim()) {
      setEditError('书名不能为空');
      return;
    }
    if (!editingNovel) return;

    setEditLoading(true);
    setEditError('');

    try {
      const body: Record<string, any> = {
        title: editForm.title.trim(),
        author: editForm.author.trim(),
        description: editForm.description.trim(),
        status: editForm.status,
        tags: editForm.tags.trim()
      };

      if (editForm.cover_image) {
        body.cover_image = editForm.cover_image;
      }

      const res = await fetch(`/api/admin/novels/${editingNovel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        alert('✅ 更新成功');
        setEditingNovel(null);
        router.refresh();
      } else {
        const data = await res.json();
        setEditError(data.error || '更新失败');
      }
    } catch (err) {
      setEditError('网络错误，请重试');
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 新建小说 */}
      <div className="codex-card p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg" style={{ color: C.text, fontFamily: fontDisplay }}>小说列表</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="codex-btn-gold"
          >
            {showForm ? '取消' : '+ 新建小说'}
          </button>
        </div>

        {showForm && (
          <div className="codex-card mb-6 p-4">
            <h3 className="font-bold mb-4" style={{ color: C.text, fontFamily: fontDisplay }}>创建新小说</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1" style={{ color: C.dim }}>书名 *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="codex-input w-full"
                  placeholder="例如：火种觉醒"
                />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: C.dim }}>作者</label>
                <input
                  type="text"
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                  className="codex-input w-full"
                  placeholder="作者名称"
                />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: C.dim }}>简介</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="codex-input w-full"
                  rows={3}
                  placeholder="小说简介..."
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1" style={{ color: C.dim }}>状态</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="codex-select w-full"
                  >
                    <option value="ongoing">连载中</option>
                    <option value="completed">已完结</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1" style={{ color: C.dim }}>标签</label>
                  <input
                    type="text"
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    className="codex-input w-full"
                    placeholder="科幻,穿越,热血 (逗号分隔)"
                  />
                </div>
              </div>
              <button
                onClick={handleSubmit}
                className="codex-btn-gold w-full py-3 font-semibold"
              >
                创建小说
              </button>
            </div>
          </div>
        )}

        {/* 小说列表 */}
        <div className="space-y-4">
          {novels.map((novel) => (
            <div key={novel.id} className="flex items-center justify-between p-4" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '0.75rem' }}>
              <div className="flex items-center gap-3 min-w-0">
                {novel.cover_url ? (
                  <img
                    src={novel.cover_url}
                    alt=""
                    className="w-10 h-14 object-cover rounded flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-10 h-14 rounded flex-shrink-0 flex items-center justify-center text-xs" style={{ background: C.card, color: C.muted }}>
                    无封面
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-bold truncate" style={{ color: C.text }}>
                    {novel.title}
                    {novel.orphan && (
                      <span className="ml-2 codex-badge-yellow">仅文件系统</span>
                    )}
                  </div>
                  <div className="text-sm mt-1" style={{ color: C.muted }}>
                    {novel.author || 'AI创作'} · 
                    <span className={`ml-2 ${
                      novel.status === 'completed' ? 'codex-badge-green' : 'codex-badge-yellow'
                    }`}>
                      {novel.status === 'completed' ? '已完结' : '连载中'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => openEdit(novel)}
                  className="codex-btn-ghost text-sm"
                >
                  编辑
                </button>
                <a
                  href={`/admin/chapters?novel=${novel.id}`}
                  className="codex-btn-ghost text-sm"
                >
                  章节管理
                </a>
                <a
                  href={`/novels/${novel.id}`}
                  target="_blank"
                  className="codex-btn-ghost text-sm"
                >
                  预览
                </a>
                <button
                  onClick={() => handleDelete(novel.id, novel.title)}
                  className="codex-btn-danger text-sm"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
          {novels.length === 0 && (
            <div className="codex-empty text-center py-8">
              暂无小说，点击上方按钮创建
            </div>
          )}
        </div>
      </div>

      {/* 编辑对话框 */}
      {editingNovel && (
        <div className="codex-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !editLoading && setEditingNovel(null)}>
          <div className="codex-modal w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="codex-modal-header sticky top-0 px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold" style={{ color: C.text, fontFamily: fontDisplay }}>编辑小说信息</h3>
              <button
                onClick={() => setEditingNovel(null)}
                className="codex-btn-ghost text-xl leading-none"
                style={{ color: C.muted }}
              >
                ✕
              </button>
            </div>

            <div className="codex-modal-body p-6 space-y-5">
              {/* 封面预览与上传 */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: C.dim }}>封面图片</label>
                <div className="flex items-start gap-4">
                  {editForm.coverPreview ? (
                    <img
                      src={editForm.coverPreview}
                      alt="封面预览"
                      className="w-24 h-32 object-cover rounded-lg flex-shrink-0"
                      style={{ border: `1px solid ${C.border}` }}
                    />
                  ) : (
                    <div className="w-24 h-32 rounded-lg flex items-center justify-center text-xs flex-shrink-0" style={{ background: C.card, border: `1px solid ${C.border}`, color: C.muted }}>
                      无封面
                    </div>
                  )}
                  <div className="flex-1">
                    <label className="cursor-pointer inline-block codex-btn-gold text-sm">
                      选择图片
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleCoverFile}
                      />
                    </label>
                    <p className="text-xs mt-1" style={{ color: C.muted }}>支持 JPG/PNG/WebP，最大 5MB</p>
                    {editForm.cover_image && (
                      <p className="text-xs mt-1" style={{ color: C.green }}>✅ 已选择新图片，保存时将上传</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 标题 */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: C.dim }}>书名 *</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="codex-input w-full"
                />
              </div>

              {/* 作者 */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: C.dim }}>作者</label>
                <input
                  type="text"
                  value={editForm.author}
                  onChange={(e) => setEditForm({ ...editForm, author: e.target.value })}
                  className="codex-input w-full"
                />
              </div>

              {/* 简介 */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: C.dim }}>简介</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="codex-input w-full"
                  rows={3}
                />
              </div>

              {/* 状态 + 标签 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: C.dim }}>状态</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="codex-select w-full"
                  >
                    <option value="ongoing">连载中</option>
                    <option value="completed">已完结</option>
                    <option value="draft">草稿</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: C.dim }}>标签</label>
                  <input
                    type="text"
                    value={editForm.tags}
                    onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                    className="codex-input w-full"
                    placeholder="科幻,穿越 (逗号分隔)"
                  />
                </div>
              </div>

              {/* 错误提示 */}
              {editError && (
                <div className="codex-tip-danger p-3 rounded-lg text-sm">
                  {editError}
                </div>
              )}

              {/* 按钮组 */}
              <div className="codex-modal-footer flex gap-3 pt-2">
                <button
                  onClick={handleEditSave}
                  disabled={editLoading}
                  className="codex-btn-gold flex-1 py-3 font-semibold disabled:opacity-50"
                >
                  {editLoading ? '保存中...' : '保存修改'}
                </button>
                <button
                  onClick={() => setEditingNovel(null)}
                  disabled={editLoading}
                  className="codex-btn-ghost px-6 py-3 disabled:opacity-50"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
