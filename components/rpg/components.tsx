/**
 * RPG 模块共享 UI 组件
 */
import { C, SYS_LABEL, SYS_ICON, STATUS_COLORS, MODE_LABEL, MODE_ICON } from './theme';

// ===== 规则系统徽章 =====
export function SystemBadge({ system }: { system: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
      background: C.card, border: `1px solid ${C.border}`, color: C.textSec,
    }}>
      <span>{SYS_ICON[system] || '✨'}</span>
      {SYS_LABEL[system] || system}
    </span>
  );
}

// ===== 战役状态徽章 =====
export function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || C.textDim;
  const labels: Record<string, string> = {
    recruiting: '招募中', active: '进行中', paused: '暂停', completed: '已完成',
  };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
      background: color + '18', color, border: `1px solid ${color}40`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />
      {labels[status] || status}
    </span>
  );
}

// ===== 模式徽章 =====
export function ModeBadge({ mode }: { mode: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 4, fontSize: 11,
      background: C.purple + '18', color: C.purple, border: `1px solid ${C.purple}40`,
    }}>
      <span>{MODE_ICON[mode] || '🎮'}</span>
      {MODE_LABEL[mode] || mode}
    </span>
  );
}

// ===== 空状态组件 =====
export function EmptyState({ icon, title, subtitle, action }: {
  icon: string;
  title: string;
  subtitle?: string;
  action?: { label: string; href?: string; onClick?: () => void };
}) {
  return (
    <div style={{
      textAlign: 'center', padding: '48px 20px',
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
    }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 6 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, color: C.textDim, marginBottom: 16 }}>{subtitle}</div>}
      {action && (
        action.href ? (
          <a href={action.href} style={{
            display: 'inline-block', padding: '8px 20px', borderRadius: 6,
            background: C.gold, color: '#000', fontWeight: 600, fontSize: 13,
            textDecoration: 'none',
          }}>{action.label}</a>
        ) : (
          <button onClick={action.onClick} style={{
            padding: '8px 20px', borderRadius: 6, border: 'none', cursor: 'pointer',
            background: C.gold, color: '#000', fontWeight: 600, fontSize: 13,
          }}>{action.label}</button>
        )
      )}
    </div>
  );
}

// ===== 卡片容器 =====
export function RpgCard({ children, style, onClick }: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  return (
    <div onClick={onClick} style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
      padding: 16, cursor: onClick ? 'pointer' : undefined,
      transition: 'border-color 0.15s',
      ...style,
    }}>
      {children}
    </div>
  );
}

// ===== 金色按钮 =====
export function GoldButton({ children, onClick, href, disabled, style }: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '10px 20px', borderRadius: 8, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    background: disabled ? C.textDim : C.gold, color: '#000', fontWeight: 700, fontSize: 14,
    textDecoration: 'none', opacity: disabled ? 0.6 : 1,
    transition: 'all 0.15s',
    ...style,
  };
  if (href) {
    return <a href={href} style={baseStyle}>{children}</a>;
  }
  return <button onClick={onClick} disabled={disabled} style={baseStyle}>{children}</button>;
}

// ===== 幽灵按钮 =====
export function GhostButton({ children, onClick, href, style }: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  style?: React.CSSProperties;
}) {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '8px 16px', borderRadius: 6, cursor: 'pointer',
    background: 'transparent', color: C.textSec, fontSize: 13,
    border: `1px solid ${C.border}`, textDecoration: 'none',
    transition: 'all 0.15s',
    ...style,
  };
  if (href) {
    return <a href={href} style={baseStyle}>{children}</a>;
  }
  return <button onClick={onClick} style={baseStyle}>{children}</button>;
}
