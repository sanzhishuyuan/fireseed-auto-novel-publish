'use client';

import { useState } from 'react';
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
  purple: '#a855f7',
} as const;
const fontDisplay = "'Fraunces', Georgia, serif";
const fontMono = "'DM Mono', 'Menlo', monospace";

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
      setCreatedToken(data.data.token);
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
      <div className="codex-card p-6">
        <h2 className="font-bold text-lg mb-4" style={{ color: C.text, fontFamily: fontDisplay }}>创建AI授权Token</h2>
        
        {createdToken ? (
          <div className="p-4 rounded-lg" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <p className="font-medium mb-2" style={{ color: C.green }}>Token创建成功！</p>
            <div className="p-3 rounded break-all" style={{ background: C.elevated }}>
              <code className="text-sm" style={{ color: C.text }}>{createdToken}</code>
            </div>
            <p className="text-xs mt-2" style={{ color: C.dim }}>请妥善保存，关闭后将无法再次查看</p>
            <button onClick={() => { setCreatedToken(null); setShowCreate(false); }}
              className="mt-4 px-4 py-2 rounded-lg text-sm" style={{ background: C.green, color: '#0b0b0f' }}>
              完成
            </button>
          </div>
        ) : showCreate ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1" style={{ color: C.dim }}>Token名称</label>
              <input
                type="text"
                value={newToken.name}
                onChange={(e) => setNewToken({ ...newToken, name: e.target.value })}
                className="codex-input w-full"
                placeholder="例如：AI写作助手-01"
              />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: C.dim }}>权限</label>
              <select
                value={newToken.permissions}
                onChange={(e) => setNewToken({ ...newToken, permissions: e.target.value })}
                className="codex-input w-full"
              >
                <option value="read">仅读取 (read)</option>
                <option value="write">写入 (write)</option>
                <option value="read,write">读写 (read,write)</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={handleCreate} className="codex-btn-gold px-6 py-2">
                生成Token
              </button>
              <button onClick={() => setShowCreate(false)} className="codex-btn-ghost px-6 py-2">
                取消
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowCreate(true)} className="codex-btn-gold px-6 py-2">
            + 创建新Token
          </button>
        )}
      </div>

      {/* Token列表 */}
      <div className="codex-card overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: C.border }}>
          <h2 className="font-bold" style={{ color: C.text, fontFamily: fontDisplay }}>已有Token列表</h2>
        </div>
        
        <div className="divide-y" style={{ borderColor: C.border }}>
          {tokens.map((token) => (
            <div key={token.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium" style={{ color: C.text }}>{token.name}</div>
                <div className="text-sm mt-1" style={{ color: C.dim }}>
                  <code className="px-2 py-0.5 rounded" style={{ background: C.elevated, color: C.dim, fontFamily: fontMono }}>{token.token.substring(0, 20)}...</code>
                </div>
                <div className="text-xs mt-1" style={{ color: C.dim }}>
                  权限: {token.permissions} | 
                  创建: {new Date(token.created_at).toLocaleDateString()} |
                  {token.last_used ? ` 最后使用: ${new Date(token.last_used).toLocaleDateString()}` : ' 未使用'}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleToggle(token.id, token.is_active)}
                  className="px-3 py-1 rounded text-sm"
                  style={{ background: C.elevated, color: token.is_active ? C.green : C.dim }}
                >
                  {token.is_active ? '启用' : '禁用'}
                </button>
                <button
                  onClick={() => handleDelete(token.id)}
                  className="px-3 py-1 rounded text-sm"
                  style={{ background: 'rgba(239,68,68,0.1)', color: C.red }}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
          {tokens.length === 0 && (
            <div className="p-8 text-center codex-empty" style={{ color: C.dim }}>
              暂无Token
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
