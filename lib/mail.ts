/**
 * mail.ts — 邮件发送工具
 *
 * 使用 nodemailer 发送邮件通知。
 * SMTP 配置通过环境变量设置，未配置时静默跳过（不阻断流程）。
 */

import nodemailer from 'nodemailer';

interface MailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  adminEmail: string;
}

function getMailConfig(): MailConfig | null {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '465');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!host || !user || !pass || !adminEmail) {
    return null;
  }
  return { host, port, user, pass, adminEmail };
}

/**
 * 发送新用户注册通知给管理员
 * SMTP 未配置时静默跳过
 */
export async function sendNewUserNotification(newUser: {
  username: string;
  email?: string;
  userId: string;
  createdAt: string;
}): Promise<void> {
  const config = getMailConfig();
  if (!config) return; // 未配置 SMTP，跳过

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.user, pass: config.pass },
    });

    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://fireseed.online';

    await transporter.sendMail({
      from: config.user,
      to: config.adminEmail,
      subject: `🔥 FireSeed 新用户注册: ${newUser.username}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366f1;">🔥 FireSeed 新用户通知</h2>
          <table style="border-collapse: collapse; width: 100%;">
            <tr><td style="padding: 8px; font-weight: bold;">用户名</td><td style="padding: 8px;">${newUser.username}</td></tr>
            ${newUser.email ? `<tr><td style="padding: 8px; font-weight: bold;">邮箱</td><td style="padding: 8px;">${newUser.email}</td></tr>` : ''}
            <tr><td style="padding: 8px; font-weight: bold;">注册时间</td><td style="padding: 8px;">${newUser.createdAt}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">用户 ID</td><td style="padding: 8px; font-size: 12px; color: #666;">${newUser.userId}</td></tr>
          </table>
          <p style="margin-top: 20px;">
            <a href="${baseUrl}/admin/users" style="display: inline-block; padding: 10px 20px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px;">
              查看用户管理
            </a>
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error('[Mail] 发送新用户通知失败:', error);
    // 不阻断注册流程
  }
}
