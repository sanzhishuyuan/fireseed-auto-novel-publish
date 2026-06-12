'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const C = {
  bg: '#0b0b0f', card: '#131318', border: '#1e1e24',
  gold: '#c9a55c', goldDim: '#a6823a', inputBg: '#1a1a20',
  text: '#f0ece4', textSec: '#8a8682', textDim: '#5a5652',
  danger: '#ef4444', success: '#22c55e', purple: '#a78bfa',
};

const TYPE_LABEL: Record<string, string> = {
  character: '人物卡', lorebook: '世界书', module: '战役模组',
};
const TYPE_ICON: Record<string, string> = {
  character: '✦', lorebook: '📖', module: '⚔️',
};

export default function RpgMarketPage() {
  const [tab, setTab] = useState<'browse' | 'my' | 'tasks'>('browse');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sort, setSort] = useState('newest');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // My listings / purchases
  const [myTab, setMyTab] = useState<'listings' | 'purchases' | 'stats'>('listings');
  const [myData, setMyData] = useState<any[]>([]);
  const [creatorStats, setCreatorStats] = useState<any>(null);

  // Detail modal
  const [detailItem, setDetailItem] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Purchase flow
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState<any>(null);
  const [purchaseError, setPurchaseError] = useState('');

  // List asset modal
  const [showListModal, setShowListModal] = useState(false);
  const [listForm, setListForm] = useState({ asset_type: 'character', asset_id: '', price: 100, license_mode: 'full_copy' });
  const [userAssets, setUserAssets] = useState<any[]>([]);

  // Tasks
  const [tasks, setTasks] = useState<any[]>([]);

  // Load market items
  const loadMarket = async (p?: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.set('type', typeFilter);
      params.set('sort', sort);
      if (search) params.set('q', search);
      params.set('page', String(p || page));
      params.set('limit', '20');
      const res = await fetch(`/api/rpg/market?${params}`);
      const d = await res.json();
      if (d.success) {
        setItems(d.items);
        setTotal(d.total);
        setTotalPages(d.totalPages);
      }
    } finally { setLoading(false); }
  };

  // Load my data
  const loadMyData = async (t: string) => {
    try {
      if (t === 'stats') {
        const res = await fetch('/api/rpg/fund');
        const d = await res.json();
        if (d.success) setCreatorStats(d.data);
        return;
      }
      const res = await fetch(`/api/rpg/market/my?tab=${t}`);
      const d = await res.json();
      if (d.success) setMyData(d.data || []);
    } catch {}
  };

  // Load tasks
  const loadTasks = async () => {
    try {
      const res = await fetch('/api/rpg/commissions?status=open');
      const d = await res.json();
      if (d.success) setTasks(d.tasks || []);
    } catch {}
  };

  // Load user characters for listing
  const loadUserAssets = async () => {
    try {
      const res = await fetch('/api/rpg/characters');
      const d = await res.json();
      if (d.success) setUserAssets(d.data.filter((c: any) => !c.license_type?.startsWith('public')));
    } catch {}
  };

  useEffect(() => {
    if (tab === 'browse') loadMarket();
    else if (tab === 'my') loadMyData(myTab);
    else if (tab === 'tasks') loadTasks();
  }, [tab, typeFilter, sort, page, myTab]);

  // Purchase
  const handlePurchase = async (listingId: string) => {
    setPurchasing(true);
    setPurchaseError('');
    setPurchaseResult(null);
    try {
      const res = await fetch(`/api/rpg/market/${listingId}`, { method: 'POST' });
      const d = await res.json();
      if (d.success) {
        setPurchaseResult(d.data);
        loadMarket();
      } else {
        setPurchaseError(d.error || '购买失败');
      }
    } catch { setPurchaseError('网络错误'); }
    setPurchasing(false);
  };

  // Delist
  const handleDelist = async (listingId: string) => {
    if (!confirm('确定下架该资产？')) return;
    try {
      const res = await fetch(`/api/rpg/market/${listingId}`, { method: 'DELETE' });
      const d = await res.json();
      if (d.success) loadMyData('listings');
    } catch {}
  };

  // List asset
  const handleListAsset = async () => {
    try {
      const res = await fetch('/api/rpg/market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listForm),
      });
      const d = await res.json();
      if (d.success) {
        setShowListModal(false);
        loadMyData('listings');
      } else {
        alert(d.error || '上架失败');
      }
    } catch { alert('网络错误'); }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", color: C.gold, fontSize: 28, margin: 0 }}>
              🏪 跑团市场
            </h1>
            <p style={{ color: C.textSec, fontSize: 14, marginTop: 4 }}>
              发现优秀的人物卡、世界书和战役模组
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/rpg" style={{ padding: '6px 14px', borderRadius: 6, background: C.card, border: `1px solid ${C.border}`, color: C.textSec, textDecoration: 'none', fontSize: 13 }}>
              ← 返回酒馆
            </Link>
            <button onClick={() => { setShowListModal(true); loadUserAssets(); }}
              style={{ padding: '6px 14px', borderRadius: 6, background: C.goldDim + '20', border: `1px solid ${C.goldDim}`, color: C.gold, cursor: 'pointer', fontSize: 13 }}>
              + 上架资产
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `1px solid ${C.border}` }}>
          {(['browse', 'my', 'tasks'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                padding: '8px 16px', background: 'transparent', border: 'none', cursor: 'pointer',
                color: tab === t ? C.gold : C.textSec, fontSize: 14, fontWeight: tab === t ? 600 : 400,
                borderBottom: tab === t ? `2px solid ${C.gold}` : '2px solid transparent',
              }}>
              {t === 'browse' ? '浏览市场' : t === 'my' ? '我的资产' : '创作任务'}
            </button>
          ))}
        </div>

        {/* ===== Browse Tab ===== */}
        {tab === 'browse' && (
          <>
            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索资产..."
                onKeyDown={e => e.key === 'Enter' && loadMarket(1)}
                style={{ flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 6, background: C.inputBg, border: `1px solid ${C.border}`, color: C.text, fontSize: 13 }} />
              <div style={{ display: 'flex', gap: 4 }}>
                {['all', 'character', 'lorebook', 'module'].map(t => (
                  <button key={t} onClick={() => { setTypeFilter(t); setPage(1); }}
                    style={{
                      padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12,
                      background: typeFilter === t ? C.goldDim + '30' : C.card,
                      border: typeFilter === t ? `1px solid ${C.goldDim}` : `1px solid ${C.border}`,
                      color: typeFilter === t ? C.gold : C.textSec,
                    }}>
                    {t === 'all' ? '全部' : TYPE_LABEL[t] || t}
                  </button>
                ))}
              </div>
              <select value={sort} onChange={e => setSort(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: 6, background: C.card, border: `1px solid ${C.border}`, color: C.text, fontSize: 12 }}>
                <option value="newest">最新</option>
                <option value="popular">最热</option>
                <option value="price_low">价格从低</option>
                <option value="price_high">价格从高</option>
                <option value="rating">评分最高</option>
              </select>
            </div>

            {/* Grid */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: 60, color: C.textDim }}>加载中...</div>
            ) : items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: C.textDim }}>
                <p style={{ fontSize: 18, marginBottom: 8 }}>🏪 暂无上架资产</p>
                <p style={{ fontSize: 13 }}>创作者们正在制作中… 你可以先浏览免费共享区，或自己创作资产上架</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                {items.map((item: any) => (
                  <div key={item.id} onClick={() => { setDetailItem(item); setShowDetail(true); }}
                    style={{
                      background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16,
                      cursor: 'pointer', transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = C.goldDim}
                    onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: C.textDim, background: C.bg, padding: '2px 8px', borderRadius: 4 }}>
                        {TYPE_ICON[item.type]} {TYPE_LABEL[item.type] || item.type}
                      </span>
                      <span style={{ color: C.gold, fontWeight: 600, fontSize: 15 }}>
                        {item.price} 🌱
                      </span>
                    </div>
                    <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 6px', color: C.text, lineHeight: 1.3 }}>
                      {item.name || '未命名'}
                    </h3>
                    <p style={{ fontSize: 12, color: C.textSec, margin: 0, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {item.description || '暂无描述'}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: 11, color: C.textDim }}>
                      <span>👤 {item.sellerName || '匿名'}</span>
                      <span>{item.ratingCount > 0 ? `⭐ ${item.rating} (${item.ratingCount})` : '暂无评分'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                  style={{ padding: '6px 14px', borderRadius: 6, background: C.card, border: `1px solid ${C.border}`, color: C.text, cursor: page <= 1 ? 'default' : 'pointer', opacity: page <= 1 ? 0.5 : 1 }}>
                  上一页
                </button>
                <span style={{ padding: '6px 14px', color: C.textSec, fontSize: 13 }}>
                  {page} / {totalPages} (共 {total} 件)
                </span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  style={{ padding: '6px 14px', borderRadius: 6, background: C.card, border: `1px solid ${C.border}`, color: C.text, cursor: page >= totalPages ? 'default' : 'pointer', opacity: page >= totalPages ? 0.5 : 1 }}>
                  下一页
                </button>
              </div>
            )}
          </>
        )}

        {/* ===== My Assets Tab ===== */}
        {tab === 'my' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {(['listings', 'purchases', 'stats'] as const).map(t => (
                <button key={t} onClick={() => { setMyTab(t); loadMyData(t); }}
                  style={{
                    padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
                    background: myTab === t ? C.goldDim + '30' : C.card,
                    border: myTab === t ? `1px solid ${C.goldDim}` : `1px solid ${C.border}`,
                    color: myTab === t ? C.gold : C.textSec,
                  }}>
                  {t === 'listings' ? '我的挂牌' : t === 'purchases' ? '已购买' : '数据统计'}
                </button>
              ))}
            </div>

            {myTab === 'stats' ? (
              creatorStats ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, textAlign: 'center' }}>
                    <div style={{ color: C.textDim, fontSize: 11, marginBottom: 4 }}>平台钱包</div>
                    <div style={{ color: C.gold, fontSize: 24, fontWeight: 700 }}>{creatorStats.platformBalance?.toLocaleString() || 0}</div>
                    <div style={{ color: C.textDim, fontSize: 11 }}>🌱 SEED</div>
                  </div>
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, textAlign: 'center' }}>
                    <div style={{ color: C.textDim, fontSize: 11, marginBottom: 4 }}>本月交易额</div>
                    <div style={{ color: C.text, fontSize: 24, fontWeight: 700 }}>{creatorStats.totalSales?.toLocaleString() || 0}</div>
                    <div style={{ color: C.textDim, fontSize: 11 }}>🌱 SEED</div>
                  </div>
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, textAlign: 'center' }}>
                    <div style={{ color: C.textDim, fontSize: 11, marginBottom: 4 }}>本月交易笔数</div>
                    <div style={{ color: C.text, fontSize: 24, fontWeight: 700 }}>{creatorStats.totalTransactions || 0}</div>
                    <div style={{ color: C.textDim, fontSize: 11 }}>笔</div>
                  </div>
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, textAlign: 'center' }}>
                    <div style={{ color: C.textDim, fontSize: 11, marginBottom: 4 }}>AI GM 收入</div>
                    <div style={{ color: C.text, fontSize: 24, fontWeight: 700 }}>{creatorStats.totalGMIncome?.toLocaleString() || 0}</div>
                    <div style={{ color: C.textDim, fontSize: 11 }}>🌱 SEED</div>
                  </div>
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, textAlign: 'center' }}>
                    <div style={{ color: C.textDim, fontSize: 11, marginBottom: 4 }}>本月预计基金注入</div>
                    <div style={{ color: C.success, fontSize: 24, fontWeight: 700 }}>{creatorStats.projectedFund?.toLocaleString() || 0}</div>
                    <div style={{ color: C.textDim, fontSize: 11 }}>🌱 SEED</div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 60, color: C.textDim, fontSize: 14 }}>加载中...</div>
              )
            ) : myData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: C.textDim, fontSize: 14 }}>
                {myTab === 'listings' ? '还没有上架任何资产。点击右上角「上架资产」开始。' : '还没有购买过资产。去市场逛逛吧！'}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {myData.map((item: any) => {
                  const name = item.char_name || item.lore_name || item.campaign_name || '未命名';
                  return (
                    <div key={item.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, color: C.textDim }}>
                          {myTab === 'listings' ? TYPE_LABEL[item.asset_type] || item.asset_type : item.source === 'purchased' ? '已购买' : item.license_mode === 'reference_only' ? '引用模式' : '完整复制'}
                        </span>
                        {myTab === 'listings' && (
                          <span style={{ color: C.gold, fontSize: 14 }}>{item.price} 🌱</span>
                        )}
                      </div>
                      <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>{name}</h3>
                      {myTab === 'listings' && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          <span style={{ fontSize: 11, color: C.textDim, padding: '2px 8px', borderRadius: 4, background: C.bg }}>
                            {item.status === 'active' ? '🟢 出售中' : item.status === 'sold' ? '🔴 已售出' : '⚪ 已下架'}
                          </span>
                          {item.status === 'active' && (
                            <button onClick={() => handleDelist(item.id)}
                              style={{ fontSize: 11, color: C.danger, background: 'transparent', border: `1px solid ${C.danger}30`, borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}>
                              下架
                            </button>
                          )}
                        </div>
                      )}
                      {myTab === 'purchases' && (
                        <div style={{ fontSize: 11, color: C.textDim, marginTop: 6 }}>
                          获取于 {new Date(item.acquired_at).toLocaleDateString('zh-CN')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ===== Tasks Tab ===== */}
        {tab === 'tasks' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ color: C.textSec, fontSize: 13, margin: 0 }}>
                发布创作需求，让社区的创作者为你量身定制角色卡、世界书或战役模组
              </p>
              <Link href="/rpg/market/tasks/new"
                style={{ padding: '6px 14px', borderRadius: 6, background: C.goldDim + '20', border: `1px solid ${C.goldDim}`, color: C.gold, textDecoration: 'none', fontSize: 13 }}>
                + 发布任务
              </Link>
            </div>
            {tasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: C.textDim, fontSize: 14 }}>
                暂无开放任务。发布一个创作任务，让创作者为你制作专属资产！
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                {tasks.map((task: any) => (
                  <div key={task.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: C.textDim, background: C.bg, padding: '2px 8px', borderRadius: 4 }}>
                        {TYPE_LABEL[task.asset_type] || task.asset_type}
                      </span>
                      <span style={{ color: C.gold, fontWeight: 600, fontSize: 14 }}>{task.budget} 🌱</span>
                    </div>
                    <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 6px' }}>{task.title}</h3>
                    <p style={{ fontSize: 12, color: C.textSec, margin: 0, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {task.description}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11, color: C.textDim }}>
                      <span>👤 {task.requester_name || '匿名'}</span>
                      {task.deadline && <span>⏰ {new Date(task.deadline).toLocaleDateString('zh-CN')}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ===== Detail Modal ===== */}
        {showDetail && detailItem && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
            onClick={e => { if (e.target === e.currentTarget) setShowDetail(false); }}>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, maxWidth: 520, width: '90%', maxHeight: '80vh', overflow: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
                <div>
                  <span style={{ fontSize: 12, color: C.textDim, background: C.bg, padding: '2px 10px', borderRadius: 4 }}>
                    {TYPE_ICON[detailItem.type]} {TYPE_LABEL[detailItem.type] || detailItem.type}
                  </span>
                  <h2 style={{ fontSize: 20, fontWeight: 600, margin: '10px 0 4px', fontFamily: "'Fraunces', Georgia, serif" }}>
                    {detailItem.name || '未命名'}
                  </h2>
                </div>
                <button onClick={() => setShowDetail(false)}
                  style={{ background: 'transparent', border: 'none', color: C.textDim, cursor: 'pointer', fontSize: 20 }}>
                  ✕
                </button>
              </div>

              <p style={{ color: C.textSec, fontSize: 13, lineHeight: 1.6, margin: '0 0 16px' }}>
                {detailItem.description || '暂无描述'}
              </p>

              <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 13, color: C.textSec }}>
                <div>
                  <div style={{ color: C.textDim, fontSize: 11 }}>创作者</div>
                  <div>👤 {detailItem.sellerName || '匿名'}</div>
                </div>
                <div>
                  <div style={{ color: C.textDim, fontSize: 11 }}>评分</div>
                  <div>{detailItem.ratingCount > 0 ? `⭐ ${detailItem.rating} (${detailItem.ratingCount})` : '暂无评分'}</div>
                </div>
                <div>
                  <div style={{ color: C.textDim, fontSize: 11 }}>模式</div>
                  <div>{detailItem.license_mode === 'reference_only' ? '引用模式' : '完整复制'}</div>
                </div>
              </div>

              <div style={{ background: C.bg, borderRadius: 8, padding: 16, marginBottom: 16, textAlign: 'center' }}>
                <div style={{ color: C.gold, fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
                  {detailItem.price} 🌱
                </div>
                {detailItem.license_mode === 'reference_only' && (
                  <div style={{ color: C.textDim, fontSize: 12 }}>
                    引用模式（只读关联战役，不可编辑复制）
                  </div>
                )}
              </div>

              {purchaseResult ? (
                <div style={{ background: C.success + '15', border: `1px solid ${C.success}30`, borderRadius: 8, padding: 16, textAlign: 'center' }}>
                  <div style={{ color: C.success, fontSize: 24, marginBottom: 8 }}>✓</div>
                  <p style={{ color: C.text, fontSize: 14, margin: 0 }}>购买成功！资产已添加到你的库中</p>
                </div>
              ) : (
                <button onClick={() => handlePurchase(detailItem.id)} disabled={purchasing}
                  style={{
                    width: '100%', padding: '10px', borderRadius: 8, cursor: purchasing ? 'default' : 'pointer',
                    background: `linear-gradient(135deg, ${C.gold}, ${C.goldDim})`, color: '#0b0b0f',
                    border: 'none', fontSize: 15, fontWeight: 600, opacity: purchasing ? 0.6 : 1,
                  }}>
                  {purchasing ? '处理中...' : `购买 - ${detailItem.price} 🌱`}
                </button>
              )}

              {purchaseError && (
                <div style={{ color: C.danger, fontSize: 13, marginTop: 12, textAlign: 'center' }}>
                  {purchaseError}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== List Asset Modal ===== */}
        {showListModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
            onClick={e => { if (e.target === e.currentTarget) setShowListModal(false); }}>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, maxWidth: 440, width: '90%' }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 16px', fontFamily: "'Fraunces', Georgia, serif", color: C.gold }}>
                上架资产
              </h2>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: C.textSec, display: 'block', marginBottom: 4 }}>资产类型</label>
                <select value={listForm.asset_type} onChange={e => setListForm(f => ({ ...f, asset_type: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, background: C.inputBg, border: `1px solid ${C.border}`, color: C.text, fontSize: 13 }}>
                  <option value="character">人物卡</option>
                  <option value="lorebook">世界书</option>
                  <option value="module">战役模组</option>
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: C.textSec, display: 'block', marginBottom: 4 }}>选择资产</label>
                {listForm.asset_type === 'character' && (
                  <select value={listForm.asset_id} onChange={e => setListForm(f => ({ ...f, asset_id: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, background: C.inputBg, border: `1px solid ${C.border}`, color: C.text, fontSize: 13 }}>
                    <option value="">-- 选择角色卡 --</option>
                    {userAssets.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name} {c.seed_price ? `(${c.seed_price}🌱)` : ''}</option>
                    ))}
                  </select>
                )}
                {listForm.asset_type !== 'character' && (
                  <input placeholder="输入资产 ID" value={listForm.asset_id} onChange={e => setListForm(f => ({ ...f, asset_id: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, background: C.inputBg, border: `1px solid ${C.border}`, color: C.text, fontSize: 13 }} />
                )}
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: C.textSec, display: 'block', marginBottom: 4 }}>价格（SEED）</label>
                <input type="number" min={1} value={listForm.price} onChange={e => setListForm(f => ({ ...f, price: parseInt(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, background: C.inputBg, border: `1px solid ${C.border}`, color: C.text, fontSize: 13 }} />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, color: C.textSec, display: 'block', marginBottom: 4 }}>许可模式</label>
                <select value={listForm.license_mode} onChange={e => setListForm(f => ({ ...f, license_mode: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, background: C.inputBg, border: `1px solid ${C.border}`, color: C.text, fontSize: 13 }}>
                  <option value="full_copy">完整复制（买家可编辑）</option>
                  <option value="reference_only">引用模式（买家只读使用，60% 价格）</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowListModal(false)}
                  style={{ flex: 1, padding: '8px', borderRadius: 6, background: 'transparent', border: `1px solid ${C.border}`, color: C.textSec, cursor: 'pointer', fontSize: 13 }}>
                  取消
                </button>
                <button onClick={handleListAsset}
                  style={{ flex: 1, padding: '8px', borderRadius: 6, background: `linear-gradient(135deg, ${C.gold}, ${C.goldDim})`, border: 'none', color: '#0b0b0f', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  上架
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
