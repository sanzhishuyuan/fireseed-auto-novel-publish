'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const C = {
  bg: '#0b0b0f', card: '#131318', border: '#1e1e24',
  gold: '#c9a55c', goldDim: '#a6823a', inputBg: '#1a1a20',
  text: '#f0ece4', textSec: '#8a8682', textDim: '#5a5652',
  danger: '#ef4444', success: '#22c55e',
};

export default function NewTaskPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    asset_type: 'character',
    title: '',
    description: '',
    budget: 50,
    deadline: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.title || !form.description) { setError('请填写标题和描述'); return; }
    if (form.budget < 10) { setError('预算至少 10 SEED'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/rpg/commissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (d.success) {
        router.push('/rpg/market');
      } else {
        setError(d.error || '发布失败');
      }
    } catch { setError('网络错误'); }
    setSubmitting(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/rpg/market" style={{ color: C.textSec, fontSize: 13, textDecoration: 'none' }}>
          ← 返回市场
        </Link>

        <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", color: C.gold, fontSize: 24, margin: '16px 0 24px' }}>
          发布创作任务
        </h1>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: C.textSec, display: 'block', marginBottom: 4 }}>资产类型</label>
            <select value={form.asset_type} onChange={e => setForm(f => ({ ...f, asset_type: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, background: C.inputBg, border: `1px solid ${C.border}`, color: C.text, fontSize: 13 }}>
              <option value="character">人物卡</option>
              <option value="lorebook">世界书</option>
              <option value="module">战役模组</option>
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: C.textSec, display: 'block', marginBottom: 4 }}>任务标题</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="例如：需要一个赛博朋克风格的调查员角色卡"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, background: C.inputBg, border: `1px solid ${C.border}`, color: C.text, fontSize: 13 }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: C.textSec, display: 'block', marginBottom: 4 }}>详细需求</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={5} placeholder="描述你需要的具体内容、风格要求、参考信息等"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, background: C.inputBg, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, resize: 'vertical' }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: C.textSec, display: 'block', marginBottom: 4 }}>预算（SEED）</label>
            <input type="number" min={10} value={form.budget} onChange={e => setForm(f => ({ ...f, budget: parseInt(e.target.value) || 0 }))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, background: C.inputBg, border: `1px solid ${C.border}`, color: C.text, fontSize: 13 }} />
            <div style={{ color: C.textDim, fontSize: 11, marginTop: 4 }}>建议：角色卡 20-100 SEED，世界书 50-300 SEED，模组 100-500 SEED</div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 12, color: C.textSec, display: 'block', marginBottom: 4 }}>截止日期（可选）</label>
            <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, background: C.inputBg, border: `1px solid ${C.border}`, color: C.text, fontSize: 13 }} />
          </div>

          {error && <div style={{ color: C.danger, fontSize: 13, marginBottom: 16 }}>{error}</div>}

          <button onClick={handleSubmit} disabled={submitting}
            style={{
              width: '100%', padding: '10px', borderRadius: 8, cursor: submitting ? 'default' : 'pointer',
              background: `linear-gradient(135deg, ${C.gold}, ${C.goldDim})`, color: '#0b0b0f',
              border: 'none', fontSize: 15, fontWeight: 600, opacity: submitting ? 0.6 : 1,
            }}>
            {submitting ? '发布中...' : `发布任务（冻结 ${form.budget} 🌱）`}
          </button>
        </div>
      </div>
    </div>
  );
}
