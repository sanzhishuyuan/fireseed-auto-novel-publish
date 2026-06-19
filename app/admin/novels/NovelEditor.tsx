'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const FIXED_CATEGORIES = [
  { value: '', label: '未分类' },
  { value: '玄幻', label: '⚡ 玄幻' },
  { value: '仙侠', label: '🏯 仙侠' },
  { value: '都市', label: '🏙 都市' },
  { value: '科幻', label: '🚀 科幻' },
  { value: '悬疑', label: '🔮 悬疑' },
  { value: '历史', label: '📜 历史' },
  { value: '恐怖', label: '👻 恐怖' },
  { value: '军事', label: '⚔️ 军事' },
  { value: '奇幻', label: '🐉 奇幻' },
  { value: '武侠', label: '⚡ 武侠' },
  { value: '言情', label: '💕 言情' },
  { value: '青春', label: '🌱 青春' },
];

interface Novel {
  id: string;
  title: string;
  author?: string;
  description?: string;
  cover_url?: string;
  status?: string;
  tags?: string;
  category?: string;
  chapter_count: number;
  total_words: number;
  orphan?: boolean;
}

interface Props {
  novels: Novel[];
  adminRole: string;
}

export default function NovelEditor({ novels, adminRole }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    author: '',
    description: '',
    status: 'ongoing',
    tags: '',
    category: ''
  });

  // 编辑状态
  const [editingNovel, setEditingNovel] = useState<Novel | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    author: '',
    description: '',
    status: '',
    category: '',
    tags: '',
    cover_image: '' as string,
    coverPreview: '' as string
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // 角色权限检查
  const canDelete = ['admin', 'super_admin'].includes(adminRole);
  const canEdit = ['editor', 'admin', 'super_admin'].includes(adminRole);
  const canCreate = ['editor', 'admin', 'super_admin'].includes(adminRole);

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
      setForm({ title: '', author: '', description: '', status: 'ongoing', tags: '', category: '' });
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
      category: novel.category || '',
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
        tags: editForm.tags.trim(),
        category: editForm.category
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg text-gray-800 dark:text-white">小说列表</h2>
          {canCreate && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
            >
              {showForm ? '取消' : '+ 新建小说'}
            </button>
          )}
        </div>

        {showForm && (
          <div className="mb-6 p-4 border rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <h3 className="font-bold text-gray-800 dark:text-white mb-4">创建新小说</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">书名 *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="例如：火种觉醒"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">作者</label>
                <input
                  type="text"
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="作者名称"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">简介</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  rows={3}
                  placeholder="小说简介..."
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">分类 *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    {FIXED_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">状态</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="ongoing">连载中</option>
                    <option value="completed">已完结</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">标签（可选）</label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="科幻,穿越,热血 (逗号分隔，用于细化描述)"
                />
              </div>
              <button
                onClick={handleSubmit}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
              >
                创建小说
              </button>
            </div>
          </div>
        )}

        {/* 小说列表 */}
        <div className="space-y-4">
          {novels.map((novel) => (
            <div key={novel.id} className="flex items-center justify-between p-4 border rounded-lg dark:border-gray-700">
              <div className="flex items-center gap-3 min-w-0">
                {novel.cover_url ? (
                  <img
                    src={novel.cover_url}
                    alt=""
                    className="w-10 h-14 object-cover rounded flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-10 h-14 bg-gray-100 dark:bg-gray-700 rounded flex-shrink-0 flex items-center justify-center text-xs text-gray-400">
                    无封面
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-bold text-gray-800 dark:text-white truncate">
                    {novel.title}
                    {novel.orphan && (
                      <span className="ml-2 px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-700">仅文件系统</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                    <span>{novel.author || 'AI创作'}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      novel.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {novel.status === 'completed' ? '已完结' : '连载中'}
                    </span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-400">{novel.chapter_count} 章</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-400">
                      {novel.total_words >= 10000
                        ? (novel.total_words / 10000).toFixed(1) + '万'
                        : novel.total_words >= 1000
                          ? (novel.total_words / 1000).toFixed(1) + 'k'
                          : novel.total_words} 字
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => openEdit(novel)}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                >
                  编辑
                </button>
                <a
                  href={`/admin/chapters?novel=${novel.id}`}
                  className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded text-sm"
                >
                  章节管理
                </a>
                <a
                  href={`/novels/${novel.id}`}
                  target="_blank"
                  className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm"
                >
                  预览
                </a>
                <button
                  onClick={() => handleDelete(novel.id, novel.title)}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
          {novels.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              暂无小说，点击上方按钮创建
            </div>
          )}
        </div>
      </div>

      {/* 编辑对话框 */}
      {editingNovel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !editLoading && setEditingNovel(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 dark:text-white">编辑小说信息</h3>
              <button
                onClick={() => setEditingNovel(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* 封面预览与上传 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">封面图片</label>
                <div className="flex items-start gap-4">
                  {editForm.coverPreview ? (
                    <img
                      src={editForm.coverPreview}
                      alt="封面预览"
                      className="w-24 h-32 object-cover rounded-lg border dark:border-gray-600 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-24 h-32 bg-gray-100 dark:bg-gray-700 rounded-lg border dark:border-gray-600 flex items-center justify-center text-xs text-gray-400 flex-shrink-0">
                      无封面
                    </div>
                  )}
                  <div className="flex-1">
                    <label className="cursor-pointer inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
                      选择图片
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleCoverFile}
                      />
                    </label>
                    <p className="text-xs text-gray-400 mt-1">支持 JPG/PNG/WebP，最大 5MB</p>
                    {editForm.cover_image && (
                      <p className="text-xs text-green-600 mt-1">✅ 已选择新图片，保存时将上传</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 标题 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">书名 *</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              {/* 作者 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">作者</label>
                <input
                  type="text"
                  value={editForm.author}
                  onChange={(e) => setEditForm({ ...editForm, author: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              {/* 简介 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">简介</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  rows={3}
                />
              </div>

              {/* 分类 + 状态 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">分类</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    {FIXED_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">状态</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="ongoing">连载中</option>
                    <option value="completed">已完结</option>
                    <option value="draft">草稿</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">标签（可选）</label>
                <input
                  type="text"
                  value={editForm.tags}
                  onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="科幻,穿越,热血 (逗号分隔，用于细化描述)"
                />
              </div>

              {/* 错误提示 */}
              {editError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                  {editError}
                </div>
              )}

              {/* 按钮组 */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleEditSave}
                  disabled={editLoading}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {editLoading ? '保存中...' : '保存修改'}
                </button>
                <button
                  onClick={() => setEditingNovel(null)}
                  disabled={editLoading}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
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
