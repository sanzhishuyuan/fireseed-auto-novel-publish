/**
 * 雾隐酒馆 × SEED 经济 — 核心逻辑
 *
 * 包含：市场挂牌 / 购买结算 / 信誉等级 / 创作任务 / AI GM 计费
 */
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { transferBetweenUsers, transferSeed, getBalance } from '@/lib/seed';

// ===== 常量 =====

/** 平台交易抽成比例 (10%) */
export const PLATFORM_FEE_RATE = 0.1;
/** 战役模组抽成比例 (15%) */
export const MODULE_FEE_RATE = 0.15;
/** 创作者基金比例 (5%) */
export const CREATOR_FUND_RATE = 0.05;
/** AI GM 单人战役每次消耗 */
export const GM_SOLO_COST = 1;
/** AI GM 多人战役每人每次消耗 */
export const GM_COOP_COST = 0.5;
/** AI GM 成本的 50% 覆盖 LLM API */
export const GM_API_COST_RATIO = 0.5;

/** 信誉等级门槛 */
export const CREATOR_LEVELS: { level: number; score: number; label: string }[] = [
  { level: 0, score: 0, label: '见习冒险者' },
  { level: 1, score: 50, label: '熟练旅人' },
  { level: 2, score: 200, label: '资深创作者' },
  { level: 3, score: 800, label: '大师匠人' },
  { level: 4, score: 3000, label: '传说工匠' },
  { level: 5, score: 10000, label: '千古巨匠' },
];

/** 各等级可用的功能 */
export const LEVEL_PERMISSIONS: Record<number, string[]> = {
  0: ['personal_create', 'join_campaign'],
  1: ['share_asset', 'rate_others', 'create_commission', 'public_free'],
  2: ['sell_asset', 'max_price_500'],
  3: ['sell_module', 'unlimited_price', 'arbitrate'],
  4: ['fund_vote', 'featured_slot'],
  5: ['custom_royalty', 'advisor'],
};

/** 各等级专业资产定价上限 */
export function getMaxPrice(level: number): number {
  if (level >= 3) return Infinity;
  if (level >= 2) return 500;
  return 0;
}

// ===== 信誉等级 =====

export interface CreatorProfile {
  userId: string;
  username: string;
  score: number;
  level: number;
  totalContributions: number;
  totalSales: number;
  avgRating: number;
  ratingCount: number;
}

/** 计算用户信誉等级 */
export function calcCreatorLevel(score: number): number {
  let level = 0;
  for (const l of CREATOR_LEVELS) {
    if (score >= l.score) level = l.level;
  }
  return level;
}

/** 获取创作者资料 */
export function getCreatorProfile(userId: string): CreatorProfile | null {
  const user = db.prepare(`
    SELECT id, username, creator_score, creator_level,
           total_public_contributions, total_sales_volume,
           total_rating_sum, total_rating_count
    FROM users WHERE id = ?
  `).get(userId) as any;
  if (!user) return null;
  return {
    userId: user.id,
    username: user.username,
    score: user.creator_score || 0,
    level: user.creator_level || 0,
    totalContributions: user.total_public_contributions || 0,
    totalSales: user.total_sales_volume || 0,
    avgRating: user.total_rating_count > 0
      ? Math.round((user.total_rating_sum / user.total_rating_count) * 10) / 10
      : 0,
    ratingCount: user.total_rating_count || 0,
  };
}

/** 增加用户信誉积分并更新等级 */
export function addCreatorScore(userId: string, points: number): { score: number; level: number; leveledUp: boolean } {
  const user = db.prepare('SELECT creator_score, creator_level FROM users WHERE id = ?').get(userId) as any;
  if (!user) throw new Error('用户不存在');

  const newScore = (user.creator_score || 0) + points;
  const newLevel = calcCreatorLevel(newScore);
  const leveledUp = newLevel > (user.creator_level || 0);

  db.prepare('UPDATE users SET creator_score = ?, creator_level = ? WHERE id = ?')
    .run(newScore, newLevel, userId);

  return { score: newScore, level: newLevel, leveledUp };
}

/** 检查用户是否有权限执行某项操作 */
export function checkLevelPermission(userId: string, permission: string): boolean {
  const user = db.prepare('SELECT creator_level FROM users WHERE id = ?').get(userId) as any;
  if (!user) return false;
  const level = user.creator_level || 0;
  const perms = LEVEL_PERMISSIONS[level] || [];
  return perms.includes(permission);
}

// ===== 市场挂牌 =====

export interface MarketListing {
  id: string;
  asset_type: string;
  asset_id: string;
  seller_id: string;
  price: number;
  license_mode: string;
  status: string;
  platform_fee: number;
  creator_share: number;
  buyer_id: string | null;
  sold_at: string | null;
  created_at: string;
}

export interface AssetSummary {
  id: string;
  name: string;
  type: string;
  description: string;
  price: number;
  sellerName: string;
  sellerId: string;
  rating: number;
  ratingCount: number;
  createdAt: string;
}

/** 上架资产到市场 */
export function listAsset(
  sellerId: string,
  assetType: 'character' | 'lorebook' | 'module',
  assetId: string,
  price: number,
  licenseMode: 'full_copy' | 'reference_only' = 'full_copy'
): MarketListing {
  // 验证卖家等级
  const seller = db.prepare('SELECT creator_level, username FROM users WHERE id = ?').get(sellerId) as any;
  if (!seller) throw new Error('用户不存在');

  const level = seller.creator_level || 0;
  const maxPrice = getMaxPrice(level);
  if (maxPrice === 0) throw new Error('当前等级不能发布专业资产，需要 L2 以上');
  if (price > maxPrice) throw new Error(`定价超出等级上限：${maxPrice} SEED`);

  // 验证资产存在且属于该用户
  let assetExists = false;
  if (assetType === 'character') {
    const ch = db.prepare('SELECT id, user_id, license_type FROM rpg_characters WHERE id = ?').get(assetId) as any;
    if (!ch) throw new Error('角色卡不存在');
    if (ch.user_id !== sellerId) throw new Error('只能出售自己的资产');
    assetExists = true;
  } else if (assetType === 'lorebook') {
    const lb = db.prepare('SELECT id, user_id, license_type FROM rpg_lorebooks WHERE id = ?').get(assetId) as any;
    if (!lb) throw new Error('世界书不存在');
    if (lb.user_id !== sellerId) throw new Error('只能出售自己的资产');
    assetExists = true;
  } else if (assetType === 'module') {
    // 战役模组暂用 campaigns 表，未来可扩展
    const cp = db.prepare('SELECT id, created_by FROM rpg_campaigns WHERE id = ?').get(assetId) as any;
    if (!cp) throw new Error('战役模组不存在');
    if (cp.created_by !== sellerId) throw new Error('只能出售自己的资产');
    assetExists = true;
  }
  if (!assetExists) throw new Error('资产不存在');

  // 检查是否已挂牌
  const existing = db.prepare(`
    SELECT id FROM rpg_market_listings
    WHERE asset_id = ? AND asset_type = ? AND status = 'active'
  `).get(assetId, assetType) as any;
  if (existing) throw new Error('该资产已在市场中挂牌');

  // 计算费用
  const feeRate = assetType === 'module' ? MODULE_FEE_RATE : PLATFORM_FEE_RATE;
  const platformFee = Math.floor(price * feeRate);
  const creatorShare = price - platformFee;

  const id = uuidv4();
  db.prepare(`
    INSERT INTO rpg_market_listings (id, asset_type, asset_id, seller_id, price, license_mode, status, platform_fee, creator_share)
    VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `).run(id, assetType, assetId, sellerId, price, licenseMode, platformFee, creatorShare);

  // 更新资产 license_type
  if (assetType === 'character') {
    db.prepare("UPDATE rpg_characters SET license_type = 'public_full' WHERE id = ?").run(assetId);
  } else if (assetType === 'lorebook') {
    db.prepare("UPDATE rpg_lorebooks SET license_type = 'public_full' WHERE id = ?").run(assetId);
  } else if (assetType === 'module') {
    db.prepare("UPDATE rpg_campaigns SET license_type = 'public_full' WHERE id = ?").run(assetId);
  }

  return {
    id, asset_type: assetType, asset_id: assetId, seller_id: sellerId,
    price, license_mode: licenseMode, status: 'active',
    platform_fee: platformFee, creator_share: creatorShare,
    buyer_id: null, sold_at: null, created_at: new Date().toISOString(),
  };
}

/** 购买资产 */
export function buyAsset(
  buyerId: string,
  listingId: string
): { success: boolean; listing: MarketListing; assetData?: any } {
  const listing = db.prepare('SELECT * FROM rpg_market_listings WHERE id = ? AND status = ?')
    .get(listingId, 'active') as any;
  if (!listing) throw new Error('该商品已下架或不存在');
  if (listing.seller_id === buyerId) throw new Error('不能购买自己的资产');

  // 检查买家余额
  const balance = getBalance(buyerId);
  if (balance < listing.price) {
    throw new Error(`SEED 余额不足！当前 ${balance} 🌱，需要 ${listing.price} 🌱`);
  }

  // 获取资产信息
  let assetName = '';
  let assetData: any = null;
  if (listing.asset_type === 'character') {
    assetData = db.prepare('SELECT id, name, card_data FROM rpg_characters WHERE id = ?').get(listing.asset_id);
    assetName = assetData?.name || '角色卡';
  } else if (listing.asset_type === 'lorebook') {
    assetData = db.prepare('SELECT id, name, description, entries FROM rpg_lorebooks WHERE id = ?').get(listing.asset_id);
    assetName = assetData?.name || '世界书';
    if (listing.license_mode === 'reference_only') {
      assetData = { ...assetData, _referenceOnly: true };
    }
  } else if (listing.asset_type === 'module') {
    assetData = db.prepare('SELECT id, name, world_brief FROM rpg_campaigns WHERE id = ?').get(listing.asset_id);
    assetName = assetData?.name || '战役模组';
  }

  if (!assetData) throw new Error('资产数据不存在');

  // 在事务中执行所有操作，确保原子性
  const libId = uuidv4();
  const fundAmount = Math.floor(listing.price * CREATOR_FUND_RATE);

  db.transaction(() => {
    // 1. 执行交易（SEED 转移）
    transferBetweenUsers(buyerId, listing.seller_id, listing.price, 'rpg_purchase', {
      refId: listingId,
      description: `购买 ${listing.asset_type === 'character' ? '角色卡' : listing.asset_type === 'lorebook' ? '世界书' : '战役模组'}：${assetName}`,
      platformShare: listing.platform_fee,
    });

    // 2. 更新挂牌状态
    db.prepare(`
      UPDATE rpg_market_listings SET status = 'sold', buyer_id = ?, sold_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(buyerId, listingId);

    // 3. 添加到买家资产库（关键：必须成功才能显示已购买）
    db.prepare(`
      INSERT INTO rpg_asset_library (id, user_id, asset_type, asset_id, license_mode, source, source_listing_id)
      VALUES (?, ?, ?, ?, ?, 'purchased', ?)
    `).run(libId, buyerId, listing.asset_type, listing.asset_id, listing.license_mode, listingId);

    // 4. 更新下载/复制计数（含副本）
    if (listing.asset_type === 'character') {
      db.prepare('UPDATE rpg_characters SET download_count = download_count + 1, copy_count = copy_count + 1 WHERE id = ?').run(listing.asset_id);
    } else if (listing.asset_type === 'lorebook') {
      db.prepare('UPDATE rpg_lorebooks SET download_count = download_count + 1, copy_count = copy_count + 1 WHERE id = ?').run(listing.asset_id);
    } else if (listing.asset_type === 'module') {
      db.prepare('UPDATE rpg_campaigns SET download_count = download_count + 1, copy_count = copy_count + 1 WHERE id = ?').run(listing.asset_id);
    }

    // 5. 给创作者加信誉积分
    addCreatorScore(listing.seller_id, 5);
    // 6. 增加创作者的销售额统计
    db.prepare('UPDATE users SET total_sales_volume = total_sales_volume + ? WHERE id = ?')
      .run(listing.price, listing.seller_id);

    // 7. 创作者基金（5%）
    if (fundAmount > 0) {
      transferSeed('platform', fundAmount, 'rpg_purchase', {
        refId: listingId,
        description: `创作者基金注入：${assetName}`,
      });
    }
  })();

  return {
    success: true,
    listing: { ...listing, status: 'sold', buyer_id: buyerId },
    assetData: listing.license_mode === 'reference_only'
      ? { id: assetData.id, name: assetData.name, description: assetData.description, _referenceOnly: true }
      : assetData,
  };
}

/** 下架资产 */
export function delistAsset(sellerId: string, listingId: string): void {
  const listing = db.prepare('SELECT * FROM rpg_market_listings WHERE id = ? AND seller_id = ?')
    .get(listingId, sellerId) as any;
  if (!listing) throw new Error('挂牌不存在或无权操作');

  db.prepare("UPDATE rpg_market_listings SET status = 'cancelled' WHERE id = ?").run(listingId);

  // 恢复资产 license_type
  if (listing.asset_type === 'character') {
    db.prepare("UPDATE rpg_characters SET license_type = 'personal' WHERE id = ?").run(listing.asset_id);
  } else if (listing.asset_type === 'lorebook') {
    db.prepare("UPDATE rpg_lorebooks SET license_type = 'personal' WHERE id = ?").run(listing.asset_id);
  } else if (listing.asset_type === 'module') {
    db.prepare("UPDATE rpg_campaigns SET license_type = 'personal' WHERE id = ?").run(listing.asset_id);
  }
}

/** 获取市场列表（带筛选和分页） */
export function browseMarket(options: {
  assetType?: string;
  sort?: 'newest' | 'popular' | 'price_low' | 'price_high' | 'rating';
  page?: number;
  limit?: number;
  search?: string;
} = {}): { items: AssetSummary[]; total: number; page: number; totalPages: number } {
  const { assetType, sort = 'newest', page = 1, limit = 20, search } = options;
  const offset = (page - 1) * limit;

  let where = "ml.status = 'active'";
  const params: any[] = [];

  if (assetType && assetType !== 'all') {
    where += ' AND ml.asset_type = ?';
    params.push(assetType);
  }
  if (search) {
    where += ' AND (a.name LIKE ? OR a.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  // 不同资产类型关联不同表
  const countSQL = `
    SELECT COUNT(*) as total FROM rpg_market_listings ml WHERE ${where}
  `;
  const total = (db.prepare(countSQL).get(...params) as any).total;

  // 子查询联合：人物卡、世界书、模组
  const orderMap: Record<string, string> = {
    newest: 'ml.created_at DESC',
    popular: 'sales DESC',
    price_low: 'ml.price ASC',
    price_high: 'ml.price DESC',
    rating: 'avg_rating DESC',
  };
  const orderBy = orderMap[sort] || 'ml.created_at DESC';

  const itemsSQL = `
    SELECT
      ml.id as listing_id, ml.asset_type, ml.asset_id, ml.price, ml.license_mode,
      ml.seller_id, ml.created_at,
      COALESCE(c.name, l.name, cp.name) as name,
      COALESCE(json_extract(c.card_data, '$.description'), l.description, cp.world_brief) as description,
      u.username as seller_name,
      COALESCE(c.avg_rating, l.avg_rating, cp.avg_rating, 0) as avg_rating,
      COALESCE(c.rating_count, l.rating_count, cp.rating_count, 0) as rating_count,
      COALESCE(c.download_count, l.download_count, cp.download_count, 0) as sales
    FROM rpg_market_listings ml
    LEFT JOIN rpg_characters c ON ml.asset_type = 'character' AND ml.asset_id = c.id
    LEFT JOIN rpg_lorebooks l ON ml.asset_type = 'lorebook' AND ml.asset_id = l.id
    LEFT JOIN rpg_campaigns cp ON ml.asset_type = 'module' AND ml.asset_id = cp.id
    LEFT JOIN users u ON ml.seller_id = u.id
    WHERE ${where}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;

  const rows = db.prepare(itemsSQL).all(...params, limit, offset) as any[];

  return {
    items: rows.map(r => ({
      id: r.listing_id,
      name: r.name,
      type: r.asset_type,
      description: (r.description || '').slice(0, 200),
      price: r.price,
      sellerName: r.seller_name,
      sellerId: r.seller_id,
      rating: r.avg_rating || 0,
      ratingCount: r.rating_count || 0,
      createdAt: r.created_at,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/** 获取已购买的资产列表 */
export function getPurchasedAssets(userId: string): any[] {
  return db.prepare(`
    SELECT al.*, c.name as char_name, l.name as lore_name, cp.name as campaign_name
    FROM rpg_asset_library al
    LEFT JOIN rpg_characters c ON al.asset_type = 'character' AND al.asset_id = c.id
    LEFT JOIN rpg_lorebooks l ON al.asset_type = 'lorebook' AND al.asset_id = l.id
    LEFT JOIN rpg_campaigns cp ON al.asset_type = 'module' AND al.asset_id = cp.id
    WHERE al.user_id = ? AND al.source = 'purchased'
    ORDER BY al.acquired_at DESC
  `).all(userId);
}

/** 获取用户挂牌列表 */
export function getUserListings(userId: string): MarketListing[] {
  return db.prepare(`
    SELECT ml.*, c.name as char_name, l.name as lore_name, cp.name as campaign_name
    FROM rpg_market_listings ml
    LEFT JOIN rpg_characters c ON ml.asset_type = 'character' AND ml.asset_id = c.id
    LEFT JOIN rpg_lorebooks l ON ml.asset_type = 'lorebook' AND ml.asset_id = l.id
    LEFT JOIN rpg_campaigns cp ON ml.asset_type = 'module' AND ml.asset_id = cp.id
    WHERE ml.seller_id = ?
    ORDER BY ml.created_at DESC
  `).all(userId) as MarketListing[];
}

// ===== 评价系统 =====

/** 提交评价 */
export function submitRating(
  listingId: string,
  raterId: string,
  rating: number,
  review?: string
): void {
  if (rating < 1 || rating > 5) throw new Error('评价分数需在 1-5 之间');

  const listing = db.prepare('SELECT * FROM rpg_market_listings WHERE id = ?').get(listingId) as any;
  if (!listing) throw new Error('交易不存在');
  if (listing.buyer_id !== raterId) throw new Error('只有买家可以评价');

  // 检查是否已评价
  const existing = db.prepare('SELECT id FROM rpg_creator_ratings WHERE listing_id = ? AND rater_id = ?')
    .get(listingId, raterId);
  if (existing) throw new Error('已评价过该交易');

  // 插入评价
  db.prepare(`
    INSERT INTO rpg_creator_ratings (id, listing_id, rater_id, ratee_id, rating, review)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), listingId, raterId, listing.seller_id, rating, review || null);

  // 更新创作者评价统计
  const sellerStats = db.prepare(`
    SELECT total_rating_sum, total_rating_count FROM users WHERE id = ?
  `).get(listing.seller_id) as any;

  const newSum = (sellerStats.total_rating_sum || 0) + rating;
  const newCount = (sellerStats.total_rating_count || 0) + 1;
  db.prepare('UPDATE users SET total_rating_sum = ?, total_rating_count = ? WHERE id = ?')
    .run(newSum, newCount, listing.seller_id);

  // 更新资产 avg_rating
  const avgRating = Math.round((newSum / newCount) * 10) / 10;
  if (listing.asset_type === 'character') {
    db.prepare('UPDATE rpg_characters SET avg_rating = ?, rating_count = ? WHERE id = ?')
      .run(avgRating, newCount, listing.asset_id);
  } else if (listing.asset_type === 'lorebook') {
    db.prepare('UPDATE rpg_lorebooks SET avg_rating = ?, rating_count = ? WHERE id = ?')
      .run(avgRating, newCount, listing.asset_id);
  } else if (listing.asset_type === 'module') {
    db.prepare('UPDATE rpg_campaigns SET avg_rating = ?, rating_count = ? WHERE id = ?')
      .run(avgRating, newCount, listing.asset_id);
  }

  // 评价后给双方加信誉分
  addCreatorScore(listing.seller_id, 2);
  addCreatorScore(raterId, 1);
}

/** 获取创作者的评价列表 */
export function getCreatorRatings(userId: string, page = 1, limit = 10): any {
  const offset = (page - 1) * limit;
  const total = (db.prepare('SELECT COUNT(*) as c FROM rpg_creator_ratings WHERE ratee_id = ?').get(userId) as any).c;
  const ratings = db.prepare(`
    SELECT cr.*, u.username as rater_name
    FROM rpg_creator_ratings cr
    LEFT JOIN users u ON cr.rater_id = u.id
    WHERE cr.ratee_id = ?
    ORDER BY cr.created_at DESC
    LIMIT ? OFFSET ?
  `).all(userId, limit, offset);

  return { ratings, total, page, totalPages: Math.ceil(total / limit) };
}

// ===== 创作任务 =====

export interface CommissionTask {
  id: string;
  asset_type: string;
  title: string;
  description: string;
  requester_id: string;
  budget: number;
  deadline: string | null;
  status: string;
  assignee_id: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  delivery_asset_id: string | null;
  created_at: string;
}

/** 发布创作任务 */
export function createCommission(
  requesterId: string,
  data: {
    assetType: string;
    title: string;
    description: string;
    budget: number;
    deadline?: string;
  }
): CommissionTask {
  if (data.budget < 10) throw new Error('预算至少 10 SEED');

  // 冻结预算到平台
  transferSeed(requesterId, -data.budget, 'rpg_commission_pub', {
    description: `发布创作任务：${data.title}`,
  });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO rpg_commission_tasks (id, asset_type, title, description, requester_id, budget, deadline, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'open')
  `).run(id, data.assetType, data.title.trim(), data.description.trim(), requesterId, data.budget, data.deadline || null);

  return {
    id, asset_type: data.assetType, title: data.title, description: data.description,
    requester_id: requesterId, budget: data.budget, deadline: data.deadline || null,
    status: 'open', assignee_id: null, submitted_at: null, completed_at: null,
    delivery_asset_id: null, created_at: new Date().toISOString(),
  };
}

/** 接单 */
export function assignCommission(commissionId: string, assigneeId: string, requesterId?: string): void {
  const task = db.prepare('SELECT * FROM rpg_commission_tasks WHERE id = ?').get(commissionId) as any;
  if (!task) throw new Error('任务不存在');
  if (task.status !== 'open') throw new Error('任务已被接取');
  if (task.requester_id === assigneeId) throw new Error('不能接自己的任务');

  // 如果指定了 requesterId，验证权限
  if (requesterId && task.requester_id !== requesterId) throw new Error('无权操作');

  // 检查接单人是否有能力（L1+）
  const assignee = db.prepare('SELECT creator_level FROM users WHERE id = ?').get(assigneeId) as any;
  if (!assignee || (assignee.creator_level || 0) < 1) throw new Error('信誉等级不足，需要 L1 以上');

  db.prepare("UPDATE rpg_commission_tasks SET status = 'assigned', assignee_id = ? WHERE id = ?")
    .run(assigneeId, commissionId);
}

/** 提交交付物 */
export function submitCommission(commissionId: string, assigneeId: string, deliveryAssetId: string): void {
  const task = db.prepare('SELECT * FROM rpg_commission_tasks WHERE id = ? AND assignee_id = ?')
    .get(commissionId, assigneeId) as any;
  if (!task) throw new Error('任务不存在或无权操作');
  if (task.status !== 'assigned') throw new Error('任务状态不正确');

  db.prepare(`
    UPDATE rpg_commission_tasks SET status = 'submitted', submitted_at = CURRENT_TIMESTAMP, delivery_asset_id = ? WHERE id = ?
  `).run(deliveryAssetId, commissionId);
}

/** 确认完成（发布者验收） */
export function approveCommission(commissionId: string, requesterId: string): void {
  const task = db.prepare('SELECT * FROM rpg_commission_tasks WHERE id = ? AND requester_id = ?')
    .get(commissionId, requesterId) as any;
  if (!task) throw new Error('任务不存在或无权操作');
  if (task.status !== 'submitted') throw new Error('任务状态不正确，需要已提交');

  const fee = Math.floor(task.budget * PLATFORM_FEE_RATE);
  const creatorPayout = task.budget - fee;

  // 从平台托管释放 SEED 给创作者
  // budget 已经在发布时从发布者扣除，现在平台释放给创作者
  db.transaction(() => {
    // 平台释放冻结资金给创作者
    transferSeed(task.assignee_id, creatorPayout, 'rpg_commission_pay', {
      refId: commissionId,
      description: `创作任务完成：${task.title}`,
    });
    // 平台抽成
    if (fee > 0) {
      transferSeed('platform', fee, 'rpg_commission_pay', {
        refId: commissionId,
        description: `创作任务平台抽成：${task.title}`,
      });
    }
    // 更新任务状态
    db.prepare(`
      UPDATE rpg_commission_tasks SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(commissionId);
  })();

  // 给创作者加分
  addCreatorScore(task.assignee_id, 10 + Math.floor(task.budget / 10));
  addCreatorScore(requesterId, 3);

  // 增加销售额
  db.prepare('UPDATE users SET total_sales_volume = total_sales_volume + ? WHERE id = ?')
    .run(creatorPayout, task.assignee_id);
}

/** 拒绝交付/发起争议 */
export function disputeCommission(commissionId: string, requesterId: string): void {
  const task = db.prepare('SELECT * FROM rpg_commission_tasks WHERE id = ? AND requester_id = ?')
    .get(commissionId, requesterId) as any;
  if (!task) throw new Error('任务不存在或无权操作');
  if (task.status !== 'submitted') throw new Error('任务状态不正确');

  db.prepare("UPDATE rpg_commission_tasks SET status = 'disputed' WHERE id = ?").run(commissionId);
}

/** 争议退款（仲裁后） */
export function refundCommission(commissionId: string): void {
  const task = db.prepare('SELECT * FROM rpg_commission_tasks WHERE id = ? AND status = ?')
    .get(commissionId, 'disputed') as any;
  if (!task) throw new Error('任务不存在或状态不正确');

  db.transaction(() => {
    // 从平台退还发布者
    transferSeed(task.requester_id, task.budget, 'rpg_commission_refund', {
      refId: commissionId,
      description: `创作任务退款：${task.title}`,
    });
    db.prepare("UPDATE rpg_commission_tasks SET status = 'cancelled' WHERE id = ?").run(commissionId);
  })();
}

/** 取消开放中的任务 */
export function cancelCommission(commissionId: string, requesterId: string): void {
  const task = db.prepare('SELECT * FROM rpg_commission_tasks WHERE id = ? AND requester_id = ? AND status = ?')
    .get(commissionId, requesterId, 'open') as any;
  if (!task) throw new Error('任务不存在或无权操作');

  db.transaction(() => {
    // 退还预算
    transferSeed(task.requester_id, task.budget, 'rpg_commission_refund', {
      refId: commissionId,
      description: `取消创作任务退款：${task.title}`,
    });
    db.prepare("UPDATE rpg_commission_tasks SET status = 'cancelled' WHERE id = ?").run(commissionId);
  })();
}

/** 获取任务列表 */
export function browseCommissions(options: {
  status?: string;
  assetType?: string;
  page?: number;
  limit?: number;
} = {}): { tasks: CommissionTask[]; total: number } {
  const { status, assetType, page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const params: any[] = [];

  if (status) { conditions.push('status = ?'); params.push(status); }
  if (assetType) { conditions.push('asset_type = ?'); params.push(assetType); }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const total = (db.prepare(`SELECT COUNT(*) as c FROM rpg_commission_tasks ${where}`).get(...params) as any).c;
  const tasks = db.prepare(`
    SELECT ct.*, u.username as requester_name, a.username as assignee_name
    FROM rpg_commission_tasks ct
    LEFT JOIN users u ON ct.requester_id = u.id
    LEFT JOIN users a ON ct.assignee_id = a.id
    ${where}
    ORDER BY ct.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as CommissionTask[];

  return { tasks, total };
}

// ===== AI GM 计费 =====

export interface GMBillingResult {
  deducted: boolean;
  balanceAfter: number | null;
  cost: number;
  message: string;
}

/**
 * AI GM 交互时检查并扣除 SEED
 * @returns 计费结果，如果余额不足会抛出错误
 */
export function chargeGMInteraction(
  userId: string,
  campaignId: string,
  campaignMode: 'solo' | 'coop' | 'human_gm' | 'hybrid'
): GMBillingResult {
  // 真人 GM 不收费
  if (campaignMode === 'human_gm') {
    return { deducted: false, balanceAfter: null, cost: 0, message: '真人 GM 模式不计费' };
  }

  const cost = campaignMode === 'solo' ? GM_SOLO_COST : GM_COOP_COST;

  // 检查余额
  const balance = getBalance(userId);
  if (balance < cost) {
    throw new Error(`SEED 余额不足！当前 ${balance} 🌱，每次 AI GM 响应需要 ${cost} 🌱。请获取更多 SEED。`);
  }

  // 扣除
  const balanceAfter = transferSeed(userId, -cost, 'rpg_gm_interact', {
    targetId: campaignId,
    description: `AI GM 交互消耗（${campaignMode === 'solo' ? '单人' : '多人'}战役）`,
  });

  // 50% 覆盖 API 成本，50% 平台收入（其中 50% 销毁）
  const apiCost = Math.floor(cost * GM_API_COST_RATIO * 100) / 100;
  const platformRevenue = cost - apiCost;

  if (platformRevenue > 0) {
    const burnAmount = Math.floor(platformRevenue * 0.5);
    if (burnAmount > 0) {
      transferSeed('platform', burnAmount, 'rpg_gm_interact', {
        description: `AI GM 收入销毁（${burnAmount} SEED）`,
      });
    }
  }

  return { deducted: true, balanceAfter, cost, message: `消耗 ${cost} 🌱` };
}

/** 检查用户是否有足够的 SEED 进行 AI GM 交互 */
export function canAffordGM(userId: string, campaignMode: 'solo' | 'coop'): boolean {
  const cost = campaignMode === 'solo' ? GM_SOLO_COST : GM_COOP_COST;
  return getBalance(userId) >= cost;
}
