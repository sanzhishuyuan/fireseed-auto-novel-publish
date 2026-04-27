'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Token {
  id: string;
  token: string;
  name: string;
  permissions: string;
  created_at: string;
  last_used: string | null;
  is_active: number;
}

interface Props {
  tokens: Token[];
}

export default function TokenManager({ tokens }: Props) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [newToken, setNewToken] = useState({ name: '', permissions: 'read,write' });
  const [createdToken, setCreatedToken] = useState<string | null>(null);

  const handleCreate = async () => {
    const res = await fetch('/api/admin/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newToken)
    });
    
    if (res.ok) {
      const data = await res.json();
      setCreatedToken(data.token);
      router.refresh();
    }
  };

  const handleToggle = async (id: string, isActive: number) => {
    await fetch(`/api/admin/tokens/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: isActive ? 0 : 1 })
    });
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此Token？')) return;
    await fetch(`/api/admin/tokens/${id}`, { method: 'DELETE' });
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* 创建新Token */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h2 className="font-bold text-lg text-gray-800 dark:text-white mb-4">创建AI授权Token</h2>
        
        {createdToken ? (
          <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
            <p className="text-green-700 dark:text-green-400 font-medium mb-2">Token创建成功！</p>
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded break-all">
              <code className="text-sm">{createdToken}</code>
            </div>
            <p className="text-xs text-gray-500 mt-2">请妥善保存，关闭后将无法再次查看</p>
            <button onClick={() => { setCreatedToken(null); setShowCreate(false); }}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg text-sm">
              完成
            </button>
          </div>
        ) : showCreate ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Token名称</label>
              <input
                type="text"
                value={newToken.name}
                onChange={(e) => setNewToken({ ...newToken, name: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="例如：AI写作助手-01"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">权限</label>
              <select
                value={newToken.permissions}
                onChange={(e) => setNewToken({ ...newToken, permissions: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="read">仅读取 (read)</option>
                <option value="write">写入 (write)</option>
                <option value="read,write">读写 (read,write)</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={handleCreate} className="px-6 py-2 bg-indigo-600 text-white rounded-lg">
                生成Token
              </button>
              <button onClick={() => setShowCreate(false)} className="px-6 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">
                取消
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowCreate(true)} className="px-6 py-2 bg-indigo-600 text-white rounded-lg">
            + 创建新Token
          </button>
        )}
      </div>

      {/* Token列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <div className="p-4 border-b dark:border-gray-700">
          <h2 className="font-bold text-gray-800 dark:text-white">已有Token列表</h2>
        </div>
        
        <div className="divide-y dark:divide-gray-700">
          {tokens.map((token) => (
            <div key={token.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-800 dark:text-white">{token.name}</div>
                <div className="text-sm text-gray-500 mt-1">
                  <code className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{token.token.substring(0, 20)}...</code>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  权限: {token.permissions} | 
                  创建: {new Date(token.created_at).toLocaleDateString()} |
                  {token.last_used ? ` 最后使用: ${new Date(token.last_used).toLocaleDateString()}` : ' 未使用'}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleToggle(token.id, token.is_active)}
                  className={`px-3 py-1 rounded text-sm ${
                    token.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {token.is_active ? '启用' : '禁用'}
                </button>
                <button
                  onClick={() => handleDelete(token.id)}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
          {tokens.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              暂无Token
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
