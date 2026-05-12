'use client';

import { useState, useEffect, useCallback } from 'react';
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

  // ---- 排序相关状态 ----
  // 章节ID → 用户填入的排序号
  const [chapterOrders, setChapterOrders] = useState<Record<string, number>>({});
  // 是否有未保存的排序改动
  const [isOrderDirty, setIsOrderDirty] = useState(false);
  // 保存排序的加载状态
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  // 排序提示消息
  const [orderMessage, setOrderMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 获取章节 ID（兼容数据库章节和文件系统章节）
  const getChapterId = useCallback((chapter: any): string => {
    return chapter.id || chapter.filePath?.replace(/\.md$/, '');
  }, []);

  // 获取章节排序号（兼容两种格式）
  const getChapterOrder = useCallback((chapter: any): number => {
    return chapter.order_num || chapter.order || chapter.meta?.order || 0;
  }, []);

  // 获取章节显示标题
  const getChapterTitle = useCallback((chapter: any): string => {
    return chapter.title || chapter.meta?.title || '未命名章节';
  }, []);

  // 加载章节列表并初始化排序状态
  const loadChapters = useCallback(() => {
    if (!selectedNovel) return;
    fetch(`/api/novels/${selectedNovel}/chapters`)
      .then(res => res.json())
      .then(data => {
        const list = data.chapters || [];
        setChapters(list);
        // 初始化排序映射（按当前 order + 显示顺序）
        const orders: Record<string, number> = {};
        list.forEach((ch: any, idx: number) => {
          orders[getChapterId(ch)] = getChapterOrder(ch) || (idx + 1);
        });
        setChapterOrders(orders);
        setIsOrderDirty(false);
        setOrderMessage(null);
      });
  }, [selectedNovel, getChapterId, getChapterOrder]);

  useEffect(() => {
    if (selectedNovel) {
      loadChapters();
    }
  }, [selectedNovel, loadChapters]);

  // 检测排序冲突：哪些序号出现了多次
  const getOrderConflicts = useCallback((): Set<number> => {
    const allOrders = Object.values(chapterOrders);
    const seen = new Set<number>();
    const duplicates = new Set<number>();
    for (const o of allOrders) {
      if (seen.has(o)) {
        duplicates.add(o);
      }
      seen.add(o);
    }
    return duplicates;
  }, [chapterOrders]);

  const orderConflicts = getOrderConflicts();

  // 判断排序是否有改动
  const hasOrderChanges = useCallback((): boolean => {
    return chapters.some((ch) => {
      const id = getChapterId(ch);
      const currentOrder = chapterOrders[id];
      const originalOrder = getChapterOrder(ch);
      return currentOrder !== undefined && currentOrder !== originalOrder;
    });
  }, [chapters, chapterOrders, getChapterId, getChapterOrder]);

  // 当章节列表或排序映射变化时，检查是否有改动
  useEffect(() => {
    if (chapters.length > 0) {
      setIsOrderDirty(hasOrderChanges());
    }
  }, [chapterOrders, chapters, hasOrderChanges]);

  // 处理排序号输入变化
  const handleOrderChange = (chapterId: string, value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1) return;
    setChapterOrders(prev => ({ ...prev, [chapterId]: num }));
    setOrderMessage(null);
  };

  // 保存排序
  const handleSaveOrder = async () => {
    if (!selectedNovel || Object.keys(chapterOrders).length === 0) return;

    // 冲突检测
    if (orderConflicts.size > 0) {
      setOrderMessage({ type: 'error', text: `存在重复序号（${[...orderConflicts].join(', ')}），请修改后再保存` });
      return;
    }

    // 检查是否真的有改动
    if (!hasOrderChanges()) {
      setOrderMessage({ type: 'error', text: '没有需要保存的改动' });
      return;
    }

    setIsSavingOrder(true);
    setOrderMessage(null);

    try {
      const res = await fetch(`/api/admin/novels/${selectedNovel}/chapters/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders: chapterOrders }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setOrderMessage({ type: 'success', text: `✅ 章节排序已更新（${data.updated} 章）` });
        setIsOrderDirty(false);
        // 重新加载章节列表
        loadChapters();
      } else {
        setOrderMessage({ type: 'error', text: data.error || '保存排序失败' });
      }
    } catch (err) {
      setOrderMessage({ type: 'error', text: '网络错误，请重试' });
    } finally {
      setIsSavingOrder(false);
    }
  };

  // 重置排序为原始值
  const handleResetOrder = () => {
    const orders: Record<string, number> = {};
    chapters.forEach((ch: any, idx: number) => {
      orders[getChapterId(ch)] = getChapterOrder(ch) || (idx + 1);
    });
    setChapterOrders(orders);
    setIsOrderDirty(false);
    setOrderMessage(null);
  };

  // ---- 原有方法 ----

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
      loadChapters();
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
      loadChapters();
    } else {
      alert('保存失败');
    }
  };

  // 按当前排序号排列章节列表
  const sortedChapters = [...chapters].sort((a, b) => {
    const orderA = chapterOrders[getChapterId(a)] ?? getChapterOrder(a) ?? 0;
    const orderB = chapterOrders[getChapterId(b)] ?? getChapterOrder(b) ?? 0;
    return orderA - orderB;
  });

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
          {/* 标题栏 + 操作按钮 */}
          <div className="p-4 border-b dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold text-gray-800 dark:text-white">章节列表</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowForm(!showForm)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm"
              >
                {showForm ? '取消' : '+ 新建章节'}
              </button>
            </div>
          </div>

          {/* 新建章节表单（保持不变） */}
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

          {/* 排序提示条 */}
          <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b dark:border-gray-700 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
            <span>💡</span>
            <span>直接修改左侧数字即可调整章节顺序，修改后点击「保存排序」</span>
          </div>

          {/* 排序操作栏 */}
          {sortedChapters.length > 0 && (
            <div className="px-4 py-3 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveOrder}
                  disabled={!isOrderDirty || isSavingOrder || orderConflicts.size > 0}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isOrderDirty && orderConflicts.size === 0
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isSavingOrder ? (
                    <span className="flex items-center gap-1.5">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      保存中...
                    </span>
                  ) : (
                    '保存排序'
                  )}
                </button>
                <button
                  onClick={handleResetOrder}
                  disabled={!isOrderDirty || isSavingOrder}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"
                >
                  重置
                </button>
              </div>
              {isOrderDirty && (
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  有未保存的排序改动
                </span>
              )}
            </div>
          )}

          {/* 排序消息提示 */}
          {orderMessage && (
            <div className={`px-4 py-2.5 text-sm border-b dark:border-gray-700 ${
              orderMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300'
            }`}>
              {orderMessage.text}
            </div>
          )}

          {/* 章节列表行 */}
          <div className="divide-y dark:divide-gray-700">
            {sortedChapters.map((chapter) => {
              const chapterId = getChapterId(chapter);
              const chapterTitle = getChapterTitle(chapter);
              const chapterBranch = chapter.branch || chapter.meta?.branch || 'main';
              const chapterWords = chapter.word_count || chapter.content?.length || 0;
              const chapterChoices = chapter.meta?.choices?.length || 0;
              const hasDbId = !!chapter.id;

              // 当前输入框的值
              const currentOrder = chapterOrders[chapterId] ?? getChapterOrder(chapter);
              const originalOrder = getChapterOrder(chapter);
              const isOrderChanged = currentOrder !== originalOrder;
              const hasConflict = orderConflicts.has(currentOrder);

              return (
                <div
                  key={chapter.filePath || chapter.id}
                  className={`p-4 flex items-center gap-3 transition-colors ${
                    isOrderChanged ? 'bg-amber-50 dark:bg-amber-900/10' : ''
                  }`}
                >
                  {/* 排序号输入框 */}
                  <div className="flex-shrink-0 w-14">
                    <input
                      type="number"
                      min={1}
                      max={chapters.length}
                      value={currentOrder}
                      onChange={(e) => handleOrderChange(chapterId, e.target.value)}
                      className={`w-14 px-2 py-1.5 text-center text-sm font-mono font-bold rounded-lg border transition-all
                        ${hasConflict
                          ? 'border-red-400 bg-red-50 dark:border-red-500 dark:bg-red-900/20 text-red-600 dark:text-red-400 ring-2 ring-red-200 dark:ring-red-800'
                          : isOrderChanged
                            ? 'border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                            : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                        }
                        focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-600`}
                      title={hasConflict ? '序号冲突！请修改为不同的数字' : '点击修改排序号'}
                    />
                  </div>

                  {/* 章节信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 dark:text-white truncate">
                      {chapterTitle}
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      {chapterBranch === 'main' ? '主线' : '支线'} · 
                      {chapterWords} 字
                      {chapterChoices > 0 && (
                        <span className="ml-2 text-purple-600">🔀 {chapterChoices}个分支</span>
                      )}
                      {hasConflict && (
                        <span className="ml-2 text-red-500 font-medium">⚠ 序号冲突</span>
                      )}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a
                      href={`/novels/${selectedNovel}/${chapter.filePath || chapter.id}`}
                      target="_blank"
                      className="px-2.5 py-1 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded text-sm transition-colors"
                    >
                      预览
                    </a>
                    {hasDbId && (
                      <button
                        onClick={() => handleDeleteChapter(chapter.id, chapterTitle)}
                        className="px-2.5 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-sm transition-colors"
                      >
                        删除
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {sortedChapters.length === 0 && (
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
