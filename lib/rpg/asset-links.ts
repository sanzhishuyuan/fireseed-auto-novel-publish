/**
 * 雾隐酒馆 — 资产关联模块
 * 管理副本/世界书/人物卡之间的交叉引用关系
 */
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import type { AssetLink, AssetLinkWithDetail, AssetSourceType, AssetLinkedType } from './types';

/**
 * 创建资产关联
 */
export function createAssetLink(params: {
  sourceType: AssetSourceType;
  sourceId: string;
  linkedType: AssetLinkedType;
  linkedId: string;
  role?: string;
  createdBy: string;
}): AssetLink {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO rpg_asset_links (id, source_type, source_id, linked_type, linked_id, role, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, params.sourceType, params.sourceId, params.linkedType, params.linkedId, params.role || '', params.createdBy);

  return db.prepare('SELECT * FROM rpg_asset_links WHERE id = ?').get(id) as AssetLink;
}

/**
 * 删除资产关联
 */
export function deleteAssetLink(id: string): boolean {
  const result = db.prepare('DELETE FROM rpg_asset_links WHERE id = ?').run(id);
  return result.changes > 0;
}

/**
 * 获取某个资产的所有关联（带详情）
 */
export function getAssetLinks(
  sourceType: AssetSourceType,
  sourceId: string
): AssetLinkWithDetail[] {
  const links = db.prepare(`
    SELECT l.* FROM rpg_asset_links l
    WHERE l.source_type = ? AND l.source_id = ?
    ORDER BY l.created_at DESC
  `).all(sourceType, sourceId) as AssetLink[];

  return links.map(link => enrichLink(link));
}

/**
 * 获取某些资产的所有关联（批量查询）
 * 返回 Map<sourceId, AssetLinkWithDetail[]>
 */
export function getBulkAssetLinks(
  sourceType: AssetSourceType,
  sourceIds: string[]
): Map<string, AssetLinkWithDetail[]> {
  if (sourceIds.length === 0) return new Map();

  const placeholders = sourceIds.map(() => '?').join(',');
  const links = db.prepare(`
    SELECT l.* FROM rpg_asset_links l
    WHERE l.source_type = ? AND l.source_id IN (${placeholders})
    ORDER BY l.created_at DESC
  `).all(sourceType, ...sourceIds) as AssetLink[];

  const map = new Map<string, AssetLinkWithDetail[]>();
  for (const link of links) {
    if (!map.has(link.source_id)) map.set(link.source_id, []);
    map.get(link.source_id)!.push(enrichLink(link));
  }
  return map;
}

/**
 * 检查关联是否已存在
 */
export function linkExists(
  sourceType: AssetSourceType,
  sourceId: string,
  linkedType: AssetLinkedType,
  linkedId: string
): boolean {
  const row = db.prepare(`
    SELECT 1 FROM rpg_asset_links
    WHERE source_type = ? AND source_id = ? AND linked_type = ? AND linked_id = ?
    LIMIT 1
  `).get(sourceType, sourceId, linkedType, linkedId);
  return !!row;
}

/**
 * 获取某个资产被哪些资产引用（反向查询）
 */
export function getInboundLinks(
  linkedType: AssetLinkedType,
  linkedId: string
): AssetLinkWithDetail[] {
  const links = db.prepare(`
    SELECT l.* FROM rpg_asset_links l
    WHERE l.linked_type = ? AND l.linked_id = ?
    ORDER BY l.created_at DESC
  `).all(linkedType, linkedId) as AssetLink[];

  return links.map(link => enrichInboundLink(link));
}

/**
 * 为关联补充被关联资产的名称/头像等信息
 */
function enrichLink(link: AssetLink): AssetLinkWithDetail {
  let name = '';
  let avatar = '';
  let description = '';

  if (link.linked_type === 'character') {
    const row = db.prepare(`
      SELECT name, avatar_url, card_data FROM rpg_characters WHERE id = ?
    `).get(link.linked_id) as any;
    if (row) {
      name = row.name;
      avatar = row.avatar_url || '';
      try {
        const card = JSON.parse(row.card_data);
        description = card.description || '';
      } catch {}
    }
  } else if (link.linked_type === 'lorebook') {
    const row = db.prepare(`
      SELECT name, description FROM rpg_lorebooks WHERE id = ?
    `).get(link.linked_id) as any;
    if (row) { name = row.name; description = row.description || ''; }
  } else if (link.linked_type === 'module') {
    // 模块暂时用 rpg_campaigns 的名称作为展示
    const row = db.prepare(`
      SELECT name, world_brief as description FROM rpg_campaigns WHERE id = ?
    `).get(link.linked_id) as any;
    if (row) { name = row.name; description = row.description || ''; }
  }

  return { ...link, linked_name: name, linked_avatar: avatar, linked_description: description };
}

/**
 * 为反向查询补充来源资产的名称/作者等信息
 */
function enrichInboundLink(link: AssetLink): AssetLinkWithDetail {
  let name = link.source_id;
  let author = '';

  if (link.source_type === 'character') {
    const row = db.prepare(`
      SELECT c.name, u.username as author
      FROM rpg_characters c LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).get(link.source_id) as any;
    if (row) { name = row.name; author = row.author || ''; }
  } else if (link.source_type === 'lorebook') {
    const row = db.prepare(`
      SELECT l.name, u.username as author
      FROM rpg_lorebooks l LEFT JOIN users u ON l.user_id = u.id
      WHERE l.id = ?
    `).get(link.source_id) as any;
    if (row) { name = row.name; author = row.author || ''; }
  } else if (link.source_type === 'module') {
    const row = db.prepare(`
      SELECT c.name, u.username as author
      FROM rpg_campaigns c LEFT JOIN users u ON c.created_by = u.id
      WHERE c.id = ?
    `).get(link.source_id) as any;
    if (row) { name = row.name; author = row.author || ''; }
  }

  return { ...link, linked_name: name, linked_author: author };
}
