/**
 * RPG 模块共享主题常量和组件
 * 统一雾隐酒馆的视觉风格，避免各页面重复定义
 */

// ===== 颜色常量 =====
export const C = {
  bg: '#0b0b0f',
  card: '#131318',
  cardHover: '#1a1a22',
  border: '#1e1e24',
  borderHover: '#2e2e38',
  gold: '#c9a55c',
  goldDim: '#a6823a',
  goldBright: '#e6c47a',
  text: '#f0ece4',
  textSec: '#8a8682',
  textDim: '#5a5652',
  danger: '#ef4444',
  success: '#22c55e',
  warning: '#f59e0b',
  info: '#60a5fa',
  purple: '#a78bfa',
  blue: '#3b82f6',
  inputBg: '#0e0e14',
};

// ===== 标签映射 =====
export const SYS_LABEL: Record<string, string> = {
  dnd5e: 'D&D 5e',
  coc7th: 'CoC 7th',
  shadowrun: '暗影狂奔',
  custom: '自由',
};

export const MODE_LABEL: Record<string, string> = {
  solo: '单人',
  coop: '合作',
  human_gm: '真人GM',
  hybrid: '混合',
};

export const STATUS_COLORS: Record<string, string> = {
  recruiting: '#60a5fa',
  active: '#22c55e',
  paused: '#f59e0b',
  completed: '#8a8682',
};

// ===== 系统图标 =====
export const SYS_ICON: Record<string, string> = {
  dnd5e: '🐉',
  coc7th: '🐙',
  shadowrun: '🤖',
  custom: '✨',
};

// ===== 模式图标 =====
export const MODE_ICON: Record<string, string> = {
  solo: '🧙',
  coop: '👥',
  human_gm: '🎭',
  hybrid: '⚡',
};
