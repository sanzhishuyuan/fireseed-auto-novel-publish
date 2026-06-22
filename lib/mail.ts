/**
 * FireSeed 邮件通知模块
 *
 * 依赖: nodemailer
 * 配置环境变量: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, ADMIN_EMAIL
 * 不配置时所有功能静默跳过。
 */
import nodemailer from 'nodemailer';

function getTransporter() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  try {
    return nodemailer.createTransport({
      host,
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_PORT === '465' || !process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });
  } catch {
    return null;
  }
}

const fromAddr = process.env.SMTP_USER || 'noreply@fireseed.online';
const adminEmail = process.env.ADMIN_EMAIL || '';

/**
 * 发送单封邮件
 */
async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  if (!process.env.SMTP_HOST) return false;
  try {
    const transporter = getTransporter();
    if (!transporter) return false;
    await transporter.sendMail({ from: `"FireSeed" <${fromAddr}>`, to, subject, html });
    return true;
  } catch (error) {
    console.error('[Mail] send failed:', error);
    return false;
  }
}

/**
 * 发送批量邮件（逐个发送，避免SMTP限制）
 */
async function sendBulk(toList: string[], subject: string, html: string): Promise<number> {
  if (!process.env.SMTP_HOST || toList.length === 0) return 0;
  let sent = 0;
  for (const to of toList) {
    if (await sendMail(to, subject, html)) sent++;
    // 避免发送过快被SMTP限流
    await new Promise(r => setTimeout(r, 200));
  }
  return sent;
}

/**
 * 通知用户关于乱码数据
 */
export async function sendGarbledDataNotification(info: {
  to: string;
  username: string;
  novelId: string;
  novelTitle: string;
  reason: string;
}): Promise<boolean> {
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://fireseed.online';
  const html = [
    `<div style="max-width:640px;margin:0 auto;background:#0b0b0f;color:#f0ece4;border-radius:12px;overflow:hidden;font-family:sans-serif;">`,
    `<div style="background:linear-gradient(135deg,#ef4444,#dc2626);padding:32px;text-align:center;">`,
    `<h1 style="margin:0;font-size:24px;color:#fff;">⚠️ 数据编码异常通知</h1>`,
    `<p style="margin:8px 0 0;font-size:14px;color:#fef2f2;">FireSeed 平台 · 自动检测</p></div>`,
    `<div style="padding:32px;">`,
    `<p style="color:#a0a0b0;line-height:1.8;">尊敬的用户 <strong style="color:#fbbf24;">${info.username}</strong>，您好：</p>`,
    `<p style="color:#a0a0b0;line-height:1.8;">系统检测到您发布的作品存在数据编码异常：</p>`,
    `<div style="background:#1a1a22;border-radius:8px;padding:20px;margin:16px 0;border:1px solid rgba(239,68,68,0.3);">`,
    `<p style="margin:0 0 8px;"><strong style="color:#fbbf24;">📖 作品：</strong><span style="color:#e0e0e0;">${info.novelTitle}</span></p>`,
    `<p style="margin:0 0 8px;"><strong style="color:#fbbf24;">🆔 ID：</strong><span style="font-family:monospace;color:#60a5fa;">${info.novelId}</span></p>`,
    `<p style="margin:0;"><strong style="color:#fbbf24;">⚠️ 问题：</strong><span style="color:#ef4444;">${info.reason}</span></p>`,
    `</div>`,
    `<p style="color:#a0a0b0;line-height:1.8;">建议您重新上传正确的文件内容，以确保作品正常显示。由此带来的不便，敬请谅解。</p>`,
    `<div style="text-align:center;margin:32px 0;">`,
    `<a href="${baseUrl}/my" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#c9a55c,#e4cc8a);color:#1a1a2e;text-decoration:none;border-radius:8px;font-weight:600;">前往我的作品</a>`,
    `</div>`,
    `<p style="color:#666;font-size:12px;text-align:center;">此邮件由 FireSeed 系统自动发送</p>`,
    `</div></div>`,
  ].join('\n');

  return sendMail(info.to, `⚠️ 数据编码异常通知 - ${info.novelTitle}`, html);
}

/**
 * 新用户注册通知（管理员）
 */
export async function sendNewUserNotification(info: {
  username: string;
  userId: string;
  email?: string;
  createdAt: string;
}): Promise<void> {
  if (!process.env.SMTP_HOST || !adminEmail) return;
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://fireseed.online';
  const html = [
    `<div style="max-width:640px;margin:0 auto;background:#0b0b0f;color:#f0ece4;border-radius:12px;font-family:sans-serif;padding:32px;">`,
    `<h2 style="color:#c9a55c;">新用户注册</h2>`,
    `<p style="color:#a0a0b0;">用户 <strong style="color:#fbbf24;">${info.username}</strong> 已注册</p>`,
    `<p style="color:#a0a0b0;">邮箱: ${info.email || '未提供'}</p>`,
    `<a href="${baseUrl}/admin/dashboard" style="display:inline-block;padding:10px 20px;background:#c9a55c;color:#1a1a2e;text-decoration:none;border-radius:8px;">查看后台</a>`,
    `</div>`,
  ].join('\n');
  await sendMail(adminEmail, `🆕 新用户: ${info.username}`, html);
}

/**
 * 新用户欢迎邮件
 */
export async function sendWelcomeEmail(info: {
  username: string;
  userId: string;
  email?: string;
}): Promise<void> {
  if (!process.env.SMTP_HOST || !info.email) return;
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://fireseed.online';
  const html = [
    `<div style="max-width:640px;margin:0 auto;background:#0b0b0f;color:#f0ece4;border-radius:12px;font-family:sans-serif;padding:32px;">`,
    `<h2 style="color:#c9a55c;">欢迎加入 FireSeed 🎉</h2>`,
    `<p style="color:#a0a0b0;">你好 <strong style="color:#fbbf24;">${info.username}</strong>！</p>`,
    `<p style="color:#a0a0b0;">欢迎来到 FireSeed AI 互动小说平台。在这里，你可以：</p>`,
    `<ul style="color:#a0a0b0;line-height:2;">`,
    `<li>📖 使用 AI 创作你的第一部小说</li>`,
    `<li>🔀 为作品添加分支剧情，让读者选择故事走向</li>`,
    `<li>🤖 通过 API 让 AI 智能体自动发布章节</li>`,
    `</ul>`,
    `<a href="${baseUrl}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#c9a55c,#e4cc8a);color:#1a1a2e;text-decoration:none;border-radius:8px;font-weight:600;">开始创作</a>`,
    `</div>`,
  ].join('\n');
  await sendMail(info.email, '🎉 欢迎加入 FireSeed', html);
}

/**
 * 批量通知（用于版本更新等）
 */
export async function sendBulkNotification(subject: string, htmlBody: string): Promise<number> {
  if (!process.env.SMTP_HOST) return 0;
  try {
    const rows = (await import('@/lib/db')).default
      .prepare("SELECT email, username FROM users WHERE email IS NOT NULL AND email != ''")
      .all() as { email: string; username: string }[];
    const personalized = rows.map(r => ({
      to: r.email,
      html: htmlBody.replace(/\{\{username\}\}/g, r.username),
    }));
    let sent = 0;
    for (const mail of personalized) {
      if (await sendMail(mail.to, subject, mail.html)) sent++;
      await new Promise(r => setTimeout(r, 200));
    }
    return sent;
  } catch {
    return 0;
  }
}
