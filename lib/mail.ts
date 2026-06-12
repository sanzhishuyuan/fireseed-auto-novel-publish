/**
 * FireSeed 邮件通知模块（存根）
 *
 * SMTP 未配置时所有功能静默跳过。
 * 如需启用邮件功能，请配置 SMTP 环境变量并完善本模块。
 */

export async function sendNewUserNotification(_info: {
  username: string;
  userId: string;
  email?: string;
  createdAt: string;
}): Promise<void> {
  // SMTP 未配置，静默跳过
  if (!process.env.SMTP_HOST) return;
  // TODO: 实现管理员新用户通知
}

export async function sendWelcomeEmail(_info: {
  username: string;
  userId: string;
  email?: string;
}): Promise<void> {
  // SMTP 未配置，静默跳过
  if (!process.env.SMTP_HOST) return;
  // TODO: 实现新用户欢迎邮件
}

export async function sendBulkNotification(_subject: string, _htmlBody: string): Promise<number> {
  // SMTP 未配置，静默跳过
  if (!process.env.SMTP_HOST) return 0;
  // TODO: 实现批量通知
  return 0;
}
