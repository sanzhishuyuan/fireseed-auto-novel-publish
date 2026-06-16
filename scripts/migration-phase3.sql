-- Phase 3: 副本全局状态表
-- 存储每个副本的全局变量（势力值、季节、区域安全度等）
CREATE TABLE IF NOT EXISTS rpg_campaign_state (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL UNIQUE,
  variables TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_campaign_state_campaign ON rpg_campaign_state(campaign_id);
