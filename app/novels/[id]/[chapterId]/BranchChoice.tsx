'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Choice {
  text: string;
  branch: string;
}

interface Props {
  choices: Choice[];
  novelId: string;
  currentBranch: string;
  userId: string | null;
  userBranch: string | null | undefined;
}

export default function BranchChoice({ choices, novelId, userId, userBranch }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<Choice | null>(null);

  const handleChoice = async (choice: Choice) => {
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
        body: JSON.stringify({ novelId, branch: selectedChoice.branch })
      });
      router.push(`/novels/${novelId}/${selectedChoice.branch}-1`);
    } catch (error) {
      console.error('保存分支选择失败', error);
    }
  };

  return (
    <>
      <div className="mt-16 p-6 sm:p-8 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
        {/* 标题 */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-3" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <circle cx="5" cy="5" r="5"/>
            </svg>
            剧情分支
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            你的选择将影响后续故事走向
          </p>
        </div>

        {/* 选项 */}
        <div className="space-y-3">
          {choices.map((choice, index) => (
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
        </div>
      </div>

      {/* 确认弹窗 */}
      {showModal && (
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
                确定要「{selectedChoice?.text}」吗？此选择将影响后续剧情。
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
    </>
  );
}
