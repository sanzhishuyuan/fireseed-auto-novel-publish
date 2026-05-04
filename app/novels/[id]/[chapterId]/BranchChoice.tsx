'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Choice {
  text: string;
  branch: string;
  is_custom?: boolean;
}

interface Props {
  choices: Choice[];
  novelId: string;
  chapterId: string;
  currentBranch: string;
  userId: string | null;
  userBranch: string | null | undefined;
  customBranchEnabled?: boolean;
}

export default function BranchChoice({
  choices,
  novelId,
  chapterId,
  userId,
  customBranchEnabled = false
}: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<Choice | null>(null);
  const [customContent, setCustomContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [customSubmitted, setCustomSubmitted] = useState(false);

  // 判断是否有自定义分支选项
  const normalChoices = choices.filter(c => !c.is_custom);
  const hasCustom = customBranchEnabled || choices.some(c => c.is_custom);

  const handleChoice = (choice: Choice) => {
    if (choice.is_custom || choice.branch === 'custom') {
      // 点击自定义续写
      if (!userId) {
        router.push('/auth/login');
        return;
      }
      setShowCustomModal(true);
      return;
    }
    if (!userId) {
      router.push('/auth/login');
      return;
    }
    setSelectedChoice(choice);
    setShowModal(true);
  };

  const confirmChoice = async () => {
    if (!selectedChoice || !userId) return;
    try {
      await fetch('/api/user/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          novelId,
          branch: selectedChoice.branch,
          chapterId
        })
      });
      router.push(`/novels/${novelId}/branches/${selectedChoice.branch}`);
    } catch (error) {
      console.error('保存分支选择失败', error);
    }
    setShowModal(false);
  };

  const submitCustomBranch = async () => {
    if (!customContent.trim() || customContent.length < 10) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/novels/${novelId}/chapters/${chapterId}/custom-branch`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ content: customContent.trim() })
        }
      );
      if (res.ok) {
        setCustomSubmitted(true);
        setShowCustomModal(false);
        setCustomContent('');
      }
    } catch (error) {
      console.error('提交自定义分支失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div
        className="mt-16 p-6 sm:p-8 rounded-2xl"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
      >
        {/* 标题 */}
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-3"
            style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <circle cx="5" cy="5" r="5"/>
            </svg>
            剧情分歧
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            你的选择将影响后续故事走向
          </p>
        </div>

        {/* 预设选项 */}
        <div className="space-y-3">
          {normalChoices.map((choice, index) => (
            <button
              key={index}
              onClick={() => handleChoice(choice)}
              className="w-full p-4 rounded-xl text-left flex items-center gap-4 transition-all hover:scale-[1.01]"
              style={{
                background: 'var(--bg-card)',
                border: '1.5px solid var(--border-light)',
                color: 'var(--text-primary)'
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}
              >
                {String.fromCharCode(65 + index)}
              </div>
              <span className="text-sm font-medium flex-1">{choice.text}</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ))}

          {/* 自定义续写选项 */}
          {hasCustom && (
            <button
              onClick={() => handleChoice({ text: '自定义剧情走向', branch: 'custom', is_custom: true })}
              className="w-full p-4 rounded-xl text-left flex items-center gap-4 transition-all hover:scale-[1.01]"
              style={{
                background: customSubmitted ? 'rgba(16,185,129,0.08)' : 'var(--bg-card)',
                border: `1.5px solid ${customSubmitted ? '#10b981' : 'var(--border-light)'}`,
                color: 'var(--text-primary)'
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                style={{
                  background: customSubmitted ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.12)',
                  color: customSubmitted ? '#10b981' : '#f59e0b'
                }}
              >
                ✍️
              </div>
              <span className="text-sm font-medium flex-1">
                {customSubmitted ? '✅ 自定义剧情已提交，等待审核' : '自定义剧情走向（由你来续写）'}
              </span>
              {!customSubmitted && (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                  <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          )}
        </div>

        {!userId && (
          <p className="text-xs text-center mt-4" style={{ color: 'var(--text-muted)' }}>
            <a href="/auth/login" style={{ color: 'var(--accent)' }}>登录</a>后方可参与剧情选择
          </p>
        )}
      </div>

      {/* 选项确认弹窗 */}
      {showModal && selectedChoice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 animate-fade-in"
            style={{ background: 'var(--bg-card)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="var(--accent)" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="9"/>
                  <path d="M11 7v4M11 14h.01"/>
                </svg>
              </div>
              <h4 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>确认选择</h4>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                确定要「{selectedChoice.text}」吗？此选择将影响后续剧情。
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
              >
                取消
              </button>
              <button
                onClick={confirmChoice}
                className="btn-primary flex-1 justify-center py-2.5 rounded-lg text-sm"
              >
                确认选择
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 自定义续写弹窗 */}
      {showCustomModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowCustomModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl p-6 animate-fade-in"
            style={{ background: 'var(--bg-card)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.12)' }}>
                  <span className="text-lg">✍️</span>
                </div>
                <div>
                  <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>自定义剧情走向</h4>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>写下你想象中的故事走向（10-3000字）</p>
                </div>
              </div>
            </div>

            <textarea
              value={customContent}
              onChange={e => setCustomContent(e.target.value)}
              className="w-full h-40 p-4 rounded-xl text-sm resize-none"
              placeholder="李然选择了…&#10;&#10;在这里写下你心中的故事走向，无论悲欢离合，都是独一无二的人间轨迹。"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                lineHeight: '1.7'
              }}
            />

            <div className="flex items-center justify-between mt-2 mb-4">
              <p className="text-xs" style={{ color: customContent.length < 10 ? '#ef4444' : 'var(--text-muted)' }}>
                {customContent.length}/3000 {customContent.length < 10 ? '（至少10字）' : ''}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                提交后由管理员审核，通过后展示给其他读者
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCustomModal(false)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
              >
                取消
              </button>
              <button
                onClick={submitCustomBranch}
                disabled={submitting || customContent.length < 10}
                className="btn-primary flex-1 justify-center py-2.5 rounded-lg text-sm disabled:opacity-50"
              >
                {submitting ? '提交中…' : '提交剧情'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
