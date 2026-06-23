/**
 * RPG 模块共享主题常量和组件
 * 统一雾隐酒馆的视觉风格，避免各页面重复定义
 */

// ===== 颜色常量 =====
export const C = {
  bg: 'var(--codex-bg)',
  card: 'var(--codex-bg-card)',
  cardHover: 'var(--codex-bg-elevated)',
  border: 'var(--codex-border)',
  borderHover: 'var(--codex-border-gold)',
  gold: 'var(--codex-gold)',
  goldDim: 'var(--codex-gold)',
  goldBright: 'var(--codex-gold-light)',
  text: 'var(--codex-text)',
  textSec: 'var(--codex-text-dim)',
  textDim: 'var(--codex-text-muted)',
  danger: 'var(--codex-red)',
  success: 'var(--codex-green)',
  warning: 'var(--codex-yellow)',
  info: 'var(--codex-blue)',
  purple: 'var(--codex-purple)',
  blue: 'var(--codex-blue)',
  inputBg: 'var(--codex-input-bg)',
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
