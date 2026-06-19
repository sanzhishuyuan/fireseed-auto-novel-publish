/**
 * 核心类型定义
 * 统一全站的 TypeScript 类型，避免重复定义
 */

// ============ 用户相关 ============
export interface User {
  id: string;
  username: string;
  nickname?: string;
  email?: string;
  role: 'reader' | 'author' | 'admin';
  created_at?: string;
}

// ============ 小说相关 ============
export interface Novel {
  id: string;
  title: string;
  author: string;
  author_id?: string;
  description: string;
  cover_url?: string;
  status: 'ongoing' | 'completed' | 'paused';
  tags: string;
  category: string;
  deleted_at?: string | null;
  retention_days?: number;
  chapterCount?: number;
  created_at?: string;
  updated_at?: string;
}

// ============ 章节相关 ============
export interface Chapter {
  id: string;
  novel_id: string;
  title: string;
  content?: string;
  order_num: number;
  branch: string;
  word_count: number;
  choices?: string;
  custom_branch_enabled?: number;
  author_id?: string;
  author_name?: string;
  created_at?: string;
}

// ============ API 响应通用格式 ============
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============ 统计数据 ============
export interface StatsData {
  totalNovels: number;
  totalChapters: number;
  totalWords: number;
  totalAuthors: number;
}

// ============ VIP 相关 ============
export interface VipStatus {
  vipType: 'free' | 'monthly' | 'yearly';
  isVipActive: boolean;
  vipExpiresAt: string | null;
  vipAutoRenew: boolean;
  benefits: Array<{
    key: string;
    value: string;
    description: string;
  }>;
  subscription?: any;
}

// ============ 钱包相关 ============
export interface Wallet {
  user_id: string;
  balance: number;
  total_earned: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  target_id?: string;
  type: 'earn' | 'spend' | 'transfer' | 'reward';
  ref_id?: string;
  amount: number;
  balance_after?: number;
  description?: string;
  created_at: string;
}

// ============ 资源相关 ============
export interface TrustedResource {
  id: string;
  title: string;
  url: string;
  description?: string;
  category: string;
  tags: string;
  provider_id?: string;
  provider_name: string;
  status: 'pending' | 'verified' | 'rejected';
  useful_count: number;
  useless_count: number;
  verified_count: number;
  last_verified_at?: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

// ============ 商机动态相关 ============
export interface Opportunity {
  id: string;
  title: string;
  description?: string;
  category: string;
  url?: string;
  source_type: 'ai_agent' | 'user' | 'admin';
  author_id?: string;
  author_name: string;
  upvotes: number;
  downvotes: number;
  expires_at?: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

// ============ 评论相关 ============
export interface Comment {
  id: string;
  user_id: string;
  novel_id?: string;
  chapter_id?: string;
  content: string;
  created_at: string;
  user?: User;
}

// ============ 反馈相关 ============
export interface Feedback {
  id: string;
  user_id?: string;
  type: 'bug' | 'feature' | 'content' | 'other';
  title: string;
  message: string;
  contact?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  admin_reply?: string;
  created_at: string;
  updated_at: string;
}

// ============ 技能相关 ============
export interface SkillMarketplace {
  id: string;
  name: string;
  title: string;
  description?: string;
  author?: string;
  icon_emoji: string;
  tags: string;
  repo_url?: string;
  repo_type: 'github' | 'gitlab' | 'other';
  skill_version?: string;
  download_count: number;
  star_count: number;
  is_active: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
