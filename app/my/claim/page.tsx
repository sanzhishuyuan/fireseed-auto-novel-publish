'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ClaimPage() {
  const router = useRouter();
  const [guestId, setGuestId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    claimed?: number;
    results?: Array<{ title: string; chapter_count: number; success: boolean }>;
    error?: string;
  } | null>(null);

  const handleClaim = async () => {
    if (!guestId.trim()) {
      setResult({ success: false, error: '请输入访客 ID' });
      return;
    }

    setLoading(true);
    try {
      // 获取当前用户
      const userRes = await fetch('/api/user/me');
      if (!userRes.ok) {
        setResult({ success: false, error: '请先登录' });
        return;
      }
      const userData = await userRes.json();
      
      // 获取访客作品
      const novelsRes = await fetch(`/api/guest/session?guest_id=${encodeURIComponent(guestId.trim())}`);
      if (!novelsRes.ok) {
        setResult({ success: false, error: '访客 ID 无效' });
        return;
      }
      const novelsData = await novelsRes.json();
      
      if (!novelsData.novels || novelsData.novels.length === 0) {
        setResult({ success: false, error: '该访客 ID 下没有作品' });
        return;
      }

      // 认领作品
      const claimRes = await fetch(`/api/guest/${encodeURIComponent(guestId.trim())}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_id: guestId.trim(),
          guest_novel_ids: novelsData.novels.map((n: { id: string }) => n.id),
          user_id: userData.user?.id
        })
      });

      const claimData = await claimRes.json();
      setResult({
        success: claimData.success,
        claimed: claimData.claimed,
        results: claimData.results,
        error: claimData.error
      });

      if (claimData.success) {
        setTimeout(() => router.push('/my/novels'), 2000);
      }
    } catch (e) {
      setResult({ success: false, error: '认领失败，请稍后重试' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">认领访客作品</h1>
        <p className="text-gray-500 mt-1">将您作为访客创作的作品绑定到当前账号</p>
      </div>

      {/* 输入访客 ID */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
          访客 ID
        </label>
        <input
          type="text"
          value={guestId}
          onChange={(e) => setGuestId(e.target.value)}
          placeholder="请输入您保存的访客 ID（guest_xxx）"
          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
        <p className="text-xs text-gray-500 mt-2">
          提示：您可以在 AI 写作助手处获取您的访客 ID
        </p>
      </div>

      {/* 认领按钮 */}
      <button
        onClick={handleClaim}
        disabled={loading}
        className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? '认领中...' : '认领作品'}
      </button>

      {/* 结果 */}
      {result && (
        <div className={`rounded-xl p-4 ${result.success ? 'bg-green-50 dark:bg-green-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
          {result.success ? (
            <>
              <h3 className="font-medium text-green-700 dark:text-green-400">
                认领成功！已认领 {result.claimed} 部作品
              </h3>
              {result.results && (
                <ul className="mt-2 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  {result.results.map((r, i) => (
                    <li key={i}>
                      {r.success ? '✓' : '✗'} {r.title} ({r.chapter_count} 章)
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-sm text-gray-500 mt-2">正在跳转到我的作品...</p>
            </>
          ) : (
            <h3 className="font-medium text-red-700 dark:text-red-400">
              认领失败：{result.error}
            </h3>
          )}
        </div>
      )}

      {/* 帮助说明 */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
        <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">什么是访客创作？</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          当您没有登录就开始创作时，作品会暂时保存在访客空间中。
          使用访客 ID 认领后，作品将永久绑定到您的账号。
        </p>
      </div>
    </div>
  );
}
