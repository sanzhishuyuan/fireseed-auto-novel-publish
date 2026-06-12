/**
 * FireSeed 权限管理系统
 *
 * 角色层级（从低到高）：
 *   reader       → 普通注册用户（读者+作者），不进后台
 *   viewer       → 数据观察员，只可查看后台数据面板
 *   editor       → 内容管理员，可创建/编辑内容，不可删除
 *   admin        → 高级管理员，可管理除超级管理之外的所有功能
 *   super_admin  → 超级管理员，全部权限
 */

export type Role = 'reader' | 'viewer' | 'editor' | 'admin' | 'super_admin';

// 有效管理角色（可进入后台）
export const ADMIN_ROLES: Role[] = ['viewer', 'editor', 'admin', 'super_admin'];

// 权限点定义
export type Permission =
  // 后台查看类
  | 'dashboard.view'
  | 'content.view'
  // 内容管理类
  | 'content.create'
  | 'content.edit'
  | 'content.delete'
  // 运营管理类
  | 'token.manage'
  | 'skill.manage'
  | 'music.manage'
  // 超级管理类
  | 'cleanup.execute'
  | 'admin.manage'
  | 'audit.view'
  | 'system.settings';

// 各角色拥有的权限
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  reader:       [],
  viewer:       ['dashboard.view', 'content.view'],
  editor:       ['dashboard.view', 'content.view', 'content.create', 'content.edit'],
  admin:        [
    'dashboard.view', 'content.view', 'content.create', 'content.edit',
    'content.delete', 'token.manage', 'skill.manage', 'music.manage',
  ],
  super_admin:  [], // 通配符，在 checkPermission 中特殊处理
};

/**
 * 检查角色是否拥有指定权限
 */
export function checkPermission(role: Role, permission: Permission): boolean {
  if (role === 'super_admin') return true;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * 检查角色是否可进入管理后台（>= viewer）
 */
export function canAccessAdmin(role: Role): boolean {
  return ADMIN_ROLES.includes(role);
}

/**
 * 角色中文名
 */
export const ROLE_LABELS: Record<Role, string> = {
  reader:       '注册用户',
  viewer:       '数据观察员',
  editor:       '内容管理员',
  admin:        '高级管理员',
  super_admin:  '超级管理员',
};

/**
 * 角色等级数值（用于比较）
 */
const ROLE_LEVEL: Record<Role, number> = {
  reader:       0,
  viewer:       1,
  editor:       2,
  admin:        3,
  super_admin:  4,
};

/**
 * 检查 role1 的等级是否 >= role2
 */
export function isRoleAtLeast(role1: Role, role2: Role): boolean {
  return (ROLE_LEVEL[role1] ?? 0) >= (ROLE_LEVEL[role2] ?? 0);
}

/**
 * 获取所有可分配的管理角色（排除 reader，供超级管理员选择）
 */
export function getAssignableRoles(): { value: Role; label: string }[] {
  return [
    { value: 'viewer', label: '数据观察员' },
    { value: 'editor', label: '内容管理员' },
    { value: 'admin', label: '高级管理员' },
    { value: 'super_admin', label: '超级管理员' },
  ];
}

/**
 * 所有权限点列表（含中文标签）
 */
export const ALL_PERMISSIONS: { value: Permission; label: string }[] = [
  { value: 'dashboard.view', label: '查看仪表盘' },
  { value: 'content.view', label: '查看内容' },
  { value: 'content.create', label: '创建内容' },
  { value: 'content.edit', label: '编辑内容' },
  { value: 'content.delete', label: '删除内容' },
  { value: 'token.manage', label: '管理 Token' },
  { value: 'skill.manage', label: '管理技能' },
  { value: 'music.manage', label: '管理音乐' },
  { value: 'cleanup.execute', label: '执行清理' },
  { value: 'admin.manage', label: '管理管理员' },
  { value: 'audit.view', label: '查看审计' },
  { value: 'system.settings', label: '系统设置' },
];
