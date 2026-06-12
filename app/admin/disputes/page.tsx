'use client';

import { useState, useEffect } from 'react';

const C = {
  bg: '#0b0b0f', card: '#131318', border: '#1e1e24',
  gold: '#c9a55c', goldDim: '#a6823a',
  text: '#f0ece4', textSec: '#8a8682', textDim: '#5a5652',
  danger: '#ef4444', success: '#22c55e',
};

export default function AdminDisputesPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const loadDisputes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/disputes?status=disputed');
      const d = await res.json();
      if (d.success) setTasks(d.data.tasks || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadDisputes(); }, []);

  const handleAction = async (commissionId: string, action: string) => {
    setProcessing(commissionId);
    try {
      await fetch('/api/admin/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, commission_id: commissionId }),
      });
      loadDisputes();
    } finally { setProcessing(null); }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", color: C.gold, fontSize: 24, marginBottom: 24 }}>
          ⚖️ 争议管理
        </h1>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: C.textDim }}>加载中...</div>
        ) : tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: C.textDim, fontSize: 14 }}>
            目前没有待处理的争议
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tasks.map((task: any) => (
              <div key={task.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{task.title}</h3>
                  <span style={{ color: C.danger, fontSize: 13, background: C.danger + '15', padding: '2px 10px', borderRadius: 4 }}>
                    争议中
                  </span>
                </div>
                <p style={{ fontSize: 13, color: C.textSec, margin: '0 0 12px', lineHeight: 1.5 }}>{task.description}</p>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: C.textDim, marginBottom: 12 }}>
                  <span>👤 发布者: {task.requester_name || '未知'}</span>
                  <span>🎨 创作者: {task.assignee_name || '未知'}</span>
                  <span>💰 预算: {task.budget} 🌱</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleAction(task.id, 'refund')} disabled={processing === task.id}
                    style={{ padding: '6px 14px', borderRadius: 6, background: C.danger + '20', border: `1px solid ${C.danger}`, color: C.danger, cursor: 'pointer', fontSize: 12 }}>
                    退款给发布者
                  </button>
                  <button onClick={() => handleAction(task.id, 'release')} disabled={processing === task.id}
                    style={{ padding: '6px 14px', borderRadius: 6, background: C.success + '20', border: `1px solid ${C.success}`, color: C.success, cursor: 'pointer', fontSize: 12 }}>
                    放款给创作者
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
