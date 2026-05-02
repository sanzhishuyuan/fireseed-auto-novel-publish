'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Novel {
  id: string;
  title: string;
}

export default function ChapterEditor({ novels }: { novels: Novel[] }) {
  const router = useRouter();
  const [selectedNovel, setSelectedNovel] = useState('');
  const [chapters, setChapters] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    content: '',
    order: 1,
    branch: 'main',
    choices: [] as { text: string; branch: string }[]
  });
  const [newChoice, setNewChoice] = useState({ text: '', branch: '' });

  useEffect(() => {
    if (selectedNovel) {
      fetch(`/api/novels/${selectedNovel}/chapters`)
        .then(res => res.json())
        .then(data => setChapters(data.chapters || []));
    }
  }, [selectedNovel]);

  const handleAddChoice = () => {
    if (newChoice.text && newChoice.branch) {
      setForm({
        ...form,
        choices: [...form.choices, { ...newChoice }]
      });
      setNewChoice({ text: '', branch: '' });
    }
  };

  const handleRemoveChoice = (index: number) => {
    setForm({
      ...form,
      choices: form.choices.filter((_, i) => i !== index)
    });
  };

  const handleDeleteChapter = async (id: string, title: string) => {
    if (!confirm(`确认删除章节「${title}」？\n\n删除后不可恢复！`)) return;

    const res = await fetch(`/api/admin/chapters/${id}`, { method: 'DELETE' });
    if (res.ok) {
      alert(`章节「${title}」已删除`);
      // 刷新章节列表
      const data = await fetch(`/api/novels/${selectedNovel}/chapters`).then(r => r.json());
      setChapters(data.chapters || []);
    } else {
      const data = await res.json();
      alert(data.error || '删除失败');
    }
  };

  const handleSubmit = async () => {
    if (!selectedNovel || !form.title || !form.content) {
      alert('请填写完整信息');
      return;
    }

    const res = await fetch(`/api/admin/novels/${selectedNovel}/chapters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });

    if (res.ok) {
      alert('章节保存成功！');
      setShowForm(false);
      setForm({ title: '', content: '', order: 1, branch: 'main', choices: [] });
      router.refresh();
      // 刷新章节列表
      const data = await fetch(`/api/novels/${selectedNovel}/chapters`).then(r => r.json());
      setChapters(data.chapters || []);
    } else {
      alert('保存失败');
    }
  };

  return (
    <div className="space-y-6">
      {/* 选择小说 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h2 className="font-bold text-lg text-gray-800 dark:text-white mb-4">选择小说</h2>
        <select
          value={selectedNovel}
          onChange={(e) => setSelectedNovel(e.target.value)}
          className="w-full px-4 py-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value="">请选择小说</option>
          {novels.map(novel => (
            <option key={novel.id} value={novel.id}>{novel.title}</option>
          ))}
        </select>
      </div>

      {/* 章节列表 */}
      {selectedNovel && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
          <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
            <h2 className="font-bold text-gray-800 dark:text-white">章节列表</h2>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
            >
              {showForm ? '取消' : '+ 新建章节'}
            </button>
          </div>

          {showForm && (
            <div className="p-6 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <h3 className="font-bold text-gray-800 dark:text-white mb-4">新建章节</h3>
              <div className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">章节标题</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="例如：第一章 觉醒"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">排序号</label>
                    <input
                      type="number"
                      value={form.order}
                      onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">分支</label>
                    <select
                      value={form.branch}
                      onChange={(e) => setForm({ ...form, branch: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="main">主线</option>
                      <option value="branch">支线</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">章节内容 (Markdown)</label>
                  <textarea
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono text-sm"
                    rows={10}
                    placeholder="请输入章节正文内容..."
                  />
                </div>

                {/* 分支选择配置 */}
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                    剧情分支选项 (可选)
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    在章节末尾添加分支选择点，读者可选择不同剧情走向
                  </p>
                  
                  {form.choices.map((choice, index) => (
                    <div key={index} className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">选项{index + 1}:</span>
                      <input
                        type="text"
                        value={choice.text}
                        readOnly
                        className="flex-1 px-3 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                      />
                      <input
                        type="text"
                        value={choice.branch}
                        readOnly
                        className="w-24 px-3 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                      />
                      <button
                        onClick={() => handleRemoveChoice(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newChoice.text}
                      onChange={(e) => setNewChoice({ ...newChoice, text: e.target.value })}
                      className="flex-1 px-3 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                      placeholder="选项文字"
                    />
                    <input
                      type="text"
                      value={newChoice.branch}
                      onChange={(e) => setNewChoice({ ...newChoice, branch: e.target.value })}
                      className="w-24 px-3 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                      placeholder="分支ID"
                    />
                    <button
                      onClick={handleAddChoice}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm"
                    >
                      添加
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
                >
                  保存章节
                </button>
              </div>
            </div>
          )}

          <div className="divide-y dark:divide-gray-700">
            {chapters.map((chapter) => {
              // 兼容数据库章节和文件系统章节两种格式
              const chapterId = chapter.id || chapter.filePath?.replace(/\.md$/, '');
              const chapterTitle = chapter.title || chapter.meta?.title || '未命名章节';
              const chapterBranch = chapter.branch || chapter.meta?.branch || 'main';
              const chapterWords = chapter.word_count || chapter.content?.length || 0;
              const chapterChoices = chapter.meta?.choices?.length || 0;
              const hasDbId = !!chapter.id;

              return (
                <div key={chapter.filePath || chapter.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-800 dark:text-white">
                      {chapterTitle}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {chapterBranch === 'main' ? '主线' : '支线'} · 
                      {chapterWords} 字
                      {chapterChoices > 0 && (
                        <span className="ml-2 text-purple-600">🔀 {chapterChoices}个分支</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`/novels/${selectedNovel}/${chapter.filePath || chapter.id}`}
                      target="_blank"
                      className="text-indigo-600 hover:underline text-sm"
                    >
                      预览
                    </a>
                    {hasDbId && (
                      <button
                        onClick={() => handleDeleteChapter(chapter.id, chapterTitle)}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                      >
                        删除
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {chapters.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                暂无章节
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
