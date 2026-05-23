'use client';

import { useState, useEffect, useCallback } from 'react';

interface Props {
  novelId: string;
  chapterId: string;
}

interface VoteData {
  useful_count: number;
  useless_count: number;
  user_vote: string | null;
}

export default function VoteButtons({ novelId, chapterId }: Props) {
  const [voteData, setVoteData] = useState<VoteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [reason, setReason] = useState('');
  const [submittingReason, setSubmittingReason] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // 加载投票数据
  const fetchVotes = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/chapters/${chapterId}/vote?novel_id=${novelId}`,
        { credentials: 'include' }
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setVoteData(json.data);
        }
      }
    } catch {
      setLoadError(true);
    }
  }, [chapterId, novelId]);

  useEffect(() => {
    fetchVotes();
  }, [fetchVotes]);

  // 提交投票
  const submitVote = async (vote: 'useful' | 'useless') => {
    // 如果投"无用"且尚未输入原因，先显示输入框
    if (vote === 'useless' && !showReasonInput) {
      setShowReasonInput(true);
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      const body: any = { novel_id: novelId, vote };
      if (vote === 'useless' && reason.trim()) {
        body.reason = reason.trim().slice(0, 500);
      }

      const res = await fetch(`/api/chapters/${chapterId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setVoteData({
          useful_count: json.data.useful_count,
          useless_count: json.data.useless_count,
          user_vote: json.data.user_vote,
        });
        setShowReasonInput(false);
        setReason('');
      } else {
        // 未登录或余额不足
        if (res.status === 401) {
          window.location.href = '/auth/login';
          return;
        }
        alert(json.error?.message || json.error || '操作失败');
      }
    } catch {
      alert('网络错误，请稍后重试');
    } finally {
      setLoading(false);
      setSubmittingReason(false);
    }
  };

  // 提交"无用"原因
  const handleUselessConfirm = async () => {
    setSubmittingReason(true);
    await submitVote('useless');
  };

  // 取消无用投票
  const cancelUseless = () => {
    setShowReasonInput(false);
    setReason('');
  };

  // 点击切换投票
  const handleSwitchVote = async (vote: 'useful' | 'useless') => {
    if (voteData?.user_vote === vote) {
      // 点击已选的投票 → 不做任何事（幂等）
      return;
    }
    await submitVote(vote);
  };

  // 加载出错或暂无数据
  if (loadError) return null;

  // 还没加载完成
  if (!voteData) {
    return (
      <div className="flex justify-center py-6">
        <div className="flex items-center gap-3 animate-pulse">
          <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    );
  }

  const total = voteData.useful_count + voteData.useless_count;
  const usefulPercent = total > 0 ? (voteData.useful_count / total) * 100 : 0;

  return (
    <div
      className="mt-10 p-5 sm:p-6 rounded-xl"
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
    >
      <div className="text-center mb-4">
        <p className="text-xs font-medium tracking-wider" style={{ color: 'var(--text-muted)' }}>
          本章评分
        </p>
      </div>

      {/* 按钮区域 */}
      <div className="flex items-center justify-center gap-4 mb-3">
        {/* 有用按钮 */}
        <button
          onClick={() => handleSwitchVote('useful')}
          disabled={loading}
          className={`
            flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium
            transition-all duration-200 hover:scale-105 active:scale-95
            disabled:opacity-50 disabled:cursor-not-allowed
            ${voteData.user_vote === 'useful'
              ? 'shadow-sm'
              : 'hover:shadow-sm'
            }
          `}
          style={{
            background: voteData.user_vote === 'useful'
              ? 'rgba(16,185,129,0.15)'
              : 'var(--bg-card)',
            border: `1.5px solid ${
              voteData.user_vote === 'useful' ? '#10b981' : 'var(--border-light)'
            }`,
            color: voteData.user_vote === 'useful' ? '#10b981' : 'var(--text-secondary)',
          }}
        >
          <span className="text-base">👍</span>
          <span>有用</span>
          <span className="text-xs opacity-70" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {voteData.useful_count}
          </span>
        </button>

        {/* 无用按钮 */}
        <button
          onClick={() => handleSwitchVote('useless')}
          disabled={loading}
          className={`
            flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium
            transition-all duration-200 hover:scale-105 active:scale-95
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          style={{
            background: voteData.user_vote === 'useless'
              ? 'rgba(239,68,68,0.12)'
              : 'var(--bg-card)',
            border: `1.5px solid ${
              voteData.user_vote === 'useless' ? '#ef4444' : 'var(--border-light)'
            }`,
            color: voteData.user_vote === 'useless' ? '#ef4444' : 'var(--text-secondary)',
          }}
        >
          <span className="text-base">👎</span>
          <span>无用</span>
          <span className="text-xs opacity-70" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {voteData.useless_count}
          </span>
        </button>
      </div>

      {/* 有用率进度条 */}
      {total > 0 && (
        <div className="max-w-xs mx-auto mb-3">
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: 'var(--border-light)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${usefulPercent}%`,
                background: 'linear-gradient(90deg, #10b981, #34d399)',
              }}
            />
          </div>
          <p className="text-xs text-center mt-1.5" style={{ color: 'var(--text-muted)' }}>
            {usefulPercent.toFixed(0)}% 的读者认为本章有用
          </p>
        </div>
      )}

      {/* "无用"原因输入框 */}
      {showReasonInput && (
        <div className="mt-3 max-w-sm mx-auto animate-fade-in">
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="你觉得本章哪里不好？（选填，最多500字）"
            rows={3}
            maxLength={500}
            className="w-full p-3 rounded-lg text-sm resize-none"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-light)',
              color: 'var(--text-primary)',
            }}
          />
          <div className="flex items-center justify-end gap-2 mt-2">
            <button
              onClick={cancelUseless}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ color: 'var(--text-muted)' }}
            >
              取消
            </button>
            <button
              onClick={handleUselessConfirm}
              disabled={submittingReason}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                background: 'rgba(239,68,68,0.12)',
                color: '#ef4444',
              }}
            >
              {submittingReason ? '提交中...' : '确认'}
            </button>
          </div>
        </div>
      )}

      {/* 提示文字 */}
      <p className="text-xs text-center mt-3" style={{ color: 'var(--text-muted)' }}>
        {voteData.user_vote
          ? '你的评分已记录，点击可切换'
          : '评分帮助其他读者发现好内容，作者将获得 🌱 奖励'}
      </p>
    </div>
  );
}
