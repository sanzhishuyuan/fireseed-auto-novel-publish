'use client';

import { useState, useEffect, useCallback } from 'react';
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
}

export default function ChapterEditor({ novels, defaultNovel = '', adminRole }: { novels: Novel[]; defaultNovel?: string; adminRole?: string }) {
  const router = useRouter();
  const [selectedNovel, setSelectedNovel] = useState(defaultNovel);
  const [chapters, setChapters] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    content: '',
    order: 1,
    branch: 'main',
    choices: [] as { text: string; branch: string }[]
  });

  // 角色权限判断
  const canDelete = ['admin', 'super_admin'].includes(adminRole || 'admin');
  const canEdit = ['editor', 'admin', 'super_admin'].includes(adminRole || 'admin');
  const canCreate = ['editor', 'admin', 'super_admin'].includes(adminRole || 'admin');

  const [newChoice, setNewChoice] = useState({ text: '', branch: '' });

  // ---- 排序相关状态 ----
  // chapterId → 用户当前填写的序号（初始值=列表排序位置 1..N）
  const [chapterOrders, setChapterOrders] = useState<Record<string, number>>({});
  // chapterId → 初始列表排序位置（用于检测改动）
  const [originalOrders, setOriginalOrders] = useState<Record<string, number>>({});
  const [isOrderDirty, setIsOrderDirty] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [orderMessage, setOrderMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 获取章节 ID（兼容数据库章节和文件系统章节）
  const getChapterId = useCallback((chapter: any): string => {
    return chapter.id || chapter.filePath?.replace(/\.md$/, '');
  }, []);

  // 获取章节显示标题
  const getChapterTitle = useCallback((chapter: any): string => {
    return chapter.title || chapter.meta?.title || '未命名章节';
  }, []);

  // 加载章节列表 —— 初始序号 = 列表排序后的位置（1..N），与阅读页显示一致
  const loadChapters = useCallback(() => {
    if (!selectedNovel) return;
    fetch(`/api/novels/${selectedNovel}/chapters`)
      .then(res => res.json())
      .then(data => {
        const list = data.chapters || [];
        setChapters(list);
        const orders: Record<string, number> = {};
        const originals: Record<string, number> = {};
        list.forEach((ch: any, idx: number) => {
          const id = getChapterId(ch);
          const pos = idx + 1; // 列表位置 = 阅读页实际显示序号
          orders[id] = pos;
          originals[id] = pos;
        });
        setChapterOrders(orders);
        setOriginalOrders(originals);
        setIsOrderDirty(false);
        setOrderMessage(null);
      });
  }, [selectedNovel, getChapterId]);

  // 当 selectedNovel 变化时加载章节
  useEffect(() => {
    if (selectedNovel) {
      loadChapters();
    }
  }, [selectedNovel, loadChapters]);

  // 检测是否有章节序号被改动
  const hasOrderChanges = useCallback((): boolean => {
    return Object.keys(chapterOrders).some((id) => {
      const current = chapterOrders[id];
      const original = originalOrders[id];
      return original !== undefined && current !== original;
    });
  }, [chapterOrders, originalOrders]);

  useEffect(() => {
    if (chapters.length > 0) {
      setIsOrderDirty(hasOrderChanges());
    }
  }, [chapterOrders, chapters.length, hasOrderChanges]);

  // 处理排序号输入
  const handleOrderChange = (chapterId: string, value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1) return;
    setChapterOrders(prev => ({ ...prev, [chapterId]: num }));
    setOrderMessage(null);
  };

  // 保存排序 —— 只提交被改动的章节（diff），后端自动做插入+补位
  const handleSaveOrder = async () => {
    if (!selectedNovel) return;

    if (!hasOrderChanges()) {
      setOrderMessage({ type: 'error', text: '没有需要保存的改动' });
      return;
    }

    // 构建 diff：只发送用户改过的章节
    const diff: Record<string, number> = {};
    for (const [id, current] of Object.entries(chapterOrders)) {
      const original = originalOrders[id];
      if (original !== undefined && current !== original) {
        diff[id] = current;
      }
    }

    if (Object.keys(diff).length === 0) {
      setOrderMessage({ type: 'error', text: '没有需要保存的改动' });
      return;
    }

    setIsSavingOrder(true);
    setOrderMessage(null);

    try {
      const res = await fetch(`/api/admin/novels/${selectedNovel}/chapters/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders: diff }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setOrderMessage({
          type: 'success',
          text: `✅ 排序已更新：${Object.keys(diff).length} 个章节移动，其余自动补位`,
        });
        setIsOrderDirty(false);
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

  // 重置排序
  const handleResetOrder = () => {
    setChapterOrders({ ...originalOrders });
    setIsOrderDirty(false);
    setOrderMessage(null);
  };

  // ---- 原有方法 ----
  const handleAddChoice = () => {
    if (newChoice.text && newChoice.branch) {
      setForm({ ...form, choices: [...form.choices, { ...newChoice }] });
      setNewChoice({ text: '', branch: '' });
    }
  };

  const handleRemoveChoice = (index: number) => {
    setForm({ ...form, choices: form.choices.filter((_, i) => i !== index) });
  };

  // 删除章节（支持 DB ID 和文件系统 ID）
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

  // 按当前排序号排列
  const sortedChapters = [...chapters].sort((a, b) => {
    const orderA = chapterOrders[getChapterId(a)] ?? originalOrders[getChapterId(a)] ?? 0;
    const orderB = chapterOrders[getChapterId(b)] ?? originalOrders[getChapterId(b)] ?? 0;
    return orderA - orderB;
  });

  return (
    <div className="space-y-6">
      {/* 选择小说 */}
      <div className="codex-card p-6">
        <h2 className="font-bold text-lg mb-4" style={{ color: C.text, fontFamily: fontDisplay }}>选择小说</h2>
        <select
          value={selectedNovel}
          onChange={(e) => setSelectedNovel(e.target.value)}
          className="codex-select w-full"
        >
          <option value="">请选择小说</option>
          {novels.map(novel => (
            <option key={novel.id} value={novel.id}>{novel.title}</option>
          ))}
        </select>
      </div>

      {/* 章节列表 */}
      {selectedNovel && (
        <div className="codex-card overflow-hidden">
          {/* 标题栏 */}
          <div className="p-4 flex flex-wrap items-center justify-between gap-3" style={{ borderBottom: `1px solid ${C.border}` }}>
            <h2 className="font-bold" style={{ color: C.text, fontFamily: fontDisplay }}>章节列表</h2>
            <div className="flex items-center gap-2">
              {canCreate && (
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="codex-btn-gold text-sm"
                >
                  {showForm ? '取消' : '+ 新建章节'}
                </button>
              )}
            </div>
          </div>

          {/* 新建章节表单 */}
          {showForm && (
            <div className="p-6" style={{ borderBottom: `1px solid ${C.border}`, background: C.card }}>
              <h3 className="font-bold mb-4" style={{ color: C.text, fontFamily: fontDisplay }}>新建章节</h3>
              <div className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm mb-1" style={{ color: C.dim }}>章节标题</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="codex-input w-full"
                      placeholder="例如：第一章 觉醒"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1" style={{ color: C.dim }}>排序号</label>
                    <input
                      type="number"
                      value={form.order}
                      onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) })}
                      className="codex-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1" style={{ color: C.dim }}>分支</label>
                    <select
                      value={form.branch}
                      onChange={(e) => setForm({ ...form, branch: e.target.value })}
                      className="codex-select w-full"
                    >
                      <option value="main">主线</option>
                      <option value="branch">支线</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm mb-1" style={{ color: C.dim }}>章节内容 (Markdown)</label>
                  <textarea
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    className="codex-input w-full font-mono text-sm"
                    rows={10}
                    placeholder="请输入章节正文内容..."
                  />
                </div>

                {/* 分支选择配置 */}
                <div>
                  <label className="block text-sm mb-2" style={{ color: C.dim }}>剧情分支选项 (可选)</label>
                  {form.choices.map((choice, index) => (
                    <div key={index} className="flex items-center gap-2 mb-2">
                      <span className="text-sm" style={{ color: C.dim }}>选项{index + 1}:</span>
                      <input
                        type="text"
                        value={choice.text}
                        readOnly
                        className="codex-input flex-1 text-sm px-3 py-1"
                      />
                      <input
                        type="text"
                        value={choice.branch}
                        readOnly
                        className="codex-input w-24 text-sm px-3 py-1"
                      />
                      <button onClick={() => handleRemoveChoice(index)} className="codex-btn-danger text-xs px-2 py-1">✕</button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newChoice.text}
                      onChange={(e) => setNewChoice({ ...newChoice, text: e.target.value })}
                      className="codex-input flex-1 text-sm px-3 py-1"
                      placeholder="选项文字"
                    />
                    <input
                      type="text"
                      value={newChoice.branch}
                      onChange={(e) => setNewChoice({ ...newChoice, branch: e.target.value })}
                      className="codex-input w-24 text-sm px-3 py-1"
                      placeholder="分支ID"
                    />
                    <button onClick={handleAddChoice} className="codex-btn-success text-sm px-3 py-1">添加</button>
                  </div>
                </div>

                <button onClick={handleSubmit} className="codex-btn-gold w-full py-3 font-semibold">保存章节</button>
              </div>
            </div>
          )}

          {/* 排序提示条 */}
          <div className="codex-tip-info px-4 py-2 text-xs flex items-center gap-1.5" style={{ borderBottom: `1px solid ${C.border}` }}>
            <span>💡</span>
            <span>修改左侧数字即可调整顺序，重复序号会自动插入补位，只需改想移动的章节</span>
          </div>

          {/* 排序操作栏 */}
          {sortedChapters.length > 0 && (
            <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3" style={{ borderBottom: `1px solid ${C.border}`, background: C.card }}>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveOrder}
                  disabled={!isOrderDirty || isSavingOrder}
                  className={`codex-btn text-sm font-medium ${
                    isOrderDirty ? 'codex-btn-success' : 'codex-btn-ghost opacity-50 cursor-not-allowed'
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
                  className="codex-btn-ghost text-sm disabled:opacity-40"
                >
                  重置
                </button>
              </div>
              {isOrderDirty && (
                <span className="text-xs" style={{ color: C.gold }}>
                  有未保存的排序改动
                </span>
              )}
            </div>
          )}

          {/* 消息提示 */}
          {orderMessage && (
            <div className={`px-4 py-2.5 text-sm ${
              orderMessage.type === 'success' ? 'codex-tip-success' : 'codex-tip-danger'
            }`} style={{ borderBottom: `1px solid ${C.border}` }}>
              {orderMessage.text}
            </div>
          )}

          {/* 章节列表行 */}
          <div>
            {sortedChapters.map((chapter) => {
              const chapterId = getChapterId(chapter);
              const chapterTitle = getChapterTitle(chapter);
              const chapterBranch = chapter.branch || chapter.meta?.branch || 'main';
              const chapterWords = chapter.word_count || chapter.content?.length || 0;
              const chapterChoices = chapter.meta?.choices?.length || 0;

              const currentOrder = chapterOrders[chapterId];
              const originalOrder = originalOrders[chapterId];
              const isOrderChanged = currentOrder !== originalOrder;

              return (
                <div
                  key={chapter.filePath || chapter.id}
                  className="p-3 flex items-center gap-3 transition-colors"
                  style={{
                    background: isOrderChanged ? C.goldGlow : 'transparent',
                    borderBottom: `1px solid ${C.border}`
                  }}
                >
                  {/* 排序号输入框 */}
                  <div className="flex-shrink-0 w-14">
                    <input
                      type="number"
                      min={1}
                      max={chapters.length + 5}
                      value={currentOrder}
                      onChange={(e) => handleOrderChange(chapterId, e.target.value)}
                      className="w-14 px-2 py-1.5 text-center text-sm font-mono font-bold rounded-lg border transition-all focus:outline-none focus:ring-2"
                      title="修改数字调整顺序，系统会自动插入补位"
                      style={isOrderChanged ? {
                        borderColor: C.gold,
                        background: C.goldGlow,
                        color: C.goldLight
                      } : {
                        borderColor: C.border,
                        background: C.card,
                        color: C.text
                      }}
                    />
                  </div>

                  {/* 章节信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-sm" style={{ color: C.text }}>
                      {chapterTitle}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: C.muted }}>
                      {chapterBranch === 'main' ? '主线' : '支线'} · 
                      {chapterWords} 字
                      {chapterChoices > 0 && (
                        <span className="ml-2 codex-badge-purple">🔀 {chapterChoices}个分支</span>
                      )}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <a
                      href={`/novels/${selectedNovel}/${chapter.filePath || chapter.id}`}
                      target="_blank"
                      className="codex-btn-ghost px-2 py-1 text-xs"
                    >
                      预览
                    </a>
                    {canDelete && (
                      <button
                        onClick={() => {
                          const id = chapter.id || chapter.filePath;
                          if (!id) {
                            alert('无法删除：缺少章节标识');
                            return;
                          }
                          handleDeleteChapter(id, chapterTitle);
                        }}
                        className="codex-btn-danger px-2 py-1 text-xs"
                      >
                        删除
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {sortedChapters.length === 0 && (
              <div className="codex-empty p-8 text-center">暂无章节</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
