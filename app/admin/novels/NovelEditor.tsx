'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Novel {
  id: string;
  title: string;
  author?: string;
  description?: string;
  status?: string;
  tags?: string;
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

  return (
    <div className="space-y-6">
      {/* 新建小说 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg text-gray-800 dark:text-white">小说列表</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
          >
            {showForm ? '取消' : '+ 新建小说'}
          </button>
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
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">标签</label>
                  <input
                    type="text"
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="科幻,穿越,热血 (逗号分隔)"
                  />
                </div>
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
              <div>
                <div className="font-bold text-gray-800 dark:text-white">{novel.title}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {novel.author || 'AI创作'} · 
                  <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                    novel.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {novel.status === 'completed' ? '已完结' : '连载中'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
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
    </div>
  );
}
