'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Token {
  id: string;
  name: string;
  permissions: string[];
  created_at: string;
  last_used: string | null;
  is_active: number;
}

export default function MyTokensPage() {
  const router = useRouter();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newToken, setNewToken] = useState({ name: '', permissions: ['create_novel', 'create_chapter'] });
  const [createdToken, setCreatedToken] = useState<{ id: string; token: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      const res = await fetch('/api/ai/token');
      if (res.ok) {
        const data = await res.json();
        setTokens(data.tokens || []);
      } else if (res.status === 401) {
        setError('请先登录');
      }
    } catch (e) {
      setError('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    const res = await fetch('/api/ai/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newToken)
    });

    if (res.ok) {
      const data = await res.json();
      setCreatedToken(data.token);
      fetchTokens();
    } else {
      const data = await res.json();
      setError(data.error || '创建失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此 Token？删除后使用此 Token 的 AI 将无法再发布作品。')) return;
    
    const res = await fetch(`/api/ai/token?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchTokens();
    }
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    alert('Token 已复制到剪贴板');
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '从未';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error && tokens.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg text-red-700 dark:text-red-400">
          {error} - <a href="/login" className="underline">前往登录</a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 🎁 免费 Token 领取信息栏 */}
      <div
        className="rounded-xl p-5 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)',
        }}
      >
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🎁</span>
            <h2 className="font-bold text-white text-base">免费大模型 API Token 领取</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">NEW</span>
          </div>
          <div className="space-y-2 text-sm text-white/80">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
              <span className="text-lg shrink-0 mt-0.5">🔥</span>
              <div>
                <p className="font-medium text-white">SiliconCloud 全平台通用代金券 16 元</p>
                <p className="text-xs mt-1 text-white/60">完成实名认证即可领取。免费调用 deepseek / qwen / glm5 等全品类大模型</p>
                <a
                  href="https://cloud.siliconflow.cn/i/lQsiPTpO"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs font-medium underline underline-offset-2 hover:text-white transition-colors"
                  style={{ color: '#60a5fa' }}
                >
                  立即领取
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 9l6-6M5 3h4v4"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
          <p className="text-xs mt-3 text-white/40">⏰ 活动有效期至 2026 年 12 月 31 日</p>
        </div>
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">AI 写作 Token</h1>
          <p className="text-gray-500 mt-1">管理用于 AI 写作助手的授权令牌</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          + 创建 Token
        </button>
      </div>

      {/* 创建 Token */}
      {showCreate && !createdToken && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h2 className="font-bold text-lg text-gray-800 dark:text-white mb-4">创建新 Token</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Token 名称</label>
              <input
                type="text"
                value={newToken.name}
                onChange={(e) => setNewToken({ ...newToken, name: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="例如：我的写作助手"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">权限</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newToken.permissions.includes('create_novel')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNewToken({ ...newToken, permissions: [...newToken.permissions, 'create_novel'] });
                      } else {
                        setNewToken({ ...newToken, permissions: newToken.permissions.filter(p => p !== 'create_novel') });
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-300">创建作品</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newToken.permissions.includes('create_chapter')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNewToken({ ...newToken, permissions: [...newToken.permissions, 'create_chapter'] });
                      } else {
                        setNewToken({ ...newToken, permissions: newToken.permissions.filter(p => p !== 'create_chapter') });
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-300">发布章节</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCreate}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                创建
              </button>
              <button
                onClick={() => { setShowCreate(false); setError(null); }}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 显示新创建的 Token */}
      {createdToken && (
        <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-6">
          <h2 className="font-bold text-lg text-green-700 dark:text-green-400 mb-4">Token 创建成功！</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            请立即复制保存，关闭后将无法再次查看此 Token。
          </p>
          <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded break-all mb-4">
            <code className="text-sm text-gray-800 dark:text-gray-200">{createdToken.token}</code>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => copyToken(createdToken.token)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              复制 Token
            </button>
            <button
              onClick={() => { setCreatedToken(null); setShowCreate(false); }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg"
            >
              完成
            </button>
          </div>
        </div>
      )}

      {/* Token 列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <div className="p-4 border-b dark:border-gray-700">
          <h2 className="font-bold text-gray-800 dark:text-white">我的 Token</h2>
        </div>

        <div className="divide-y dark:divide-gray-700">
          {tokens.map((token) => (
            <div key={token.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800 dark:text-white">{token.name}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      token.is_active 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {token.is_active ? '启用' : '禁用'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    权限: {token.permissions?.join(', ') || '无'}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    创建于 {formatDate(token.created_at)} | 
                    最后使用 {formatDate(token.last_used)}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(token.id)}
                  className="px-3 py-1 bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 rounded text-sm hover:bg-red-200"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
          
          {tokens.length === 0 && !showCreate && (
            <div className="p-8 text-center text-gray-500">
              <p>暂无 Token</p>
              <p className="text-sm mt-1">创建 Token 后，AI 写作助手可以使用它来发布作品到你的账号</p>
            </div>
          )}
        </div>
      </div>

      {/* 使用说明 */}
      <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4">
        <h3 className="font-medium text-blue-700 dark:text-blue-400 mb-2">使用说明</h3>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>• Token 用于授权 AI 写作助手访问你的账号</li>
          <li>• 每个 Token 都可以独立管理权限</li>
          <li>• 建议为不同的 AI 助手创建不同的 Token</li>
          <li>• 删除 Token 后，使用该 Token 的 AI 将无法再发布作品</li>
        </ul>
      </div>
    </div>
  );
}
