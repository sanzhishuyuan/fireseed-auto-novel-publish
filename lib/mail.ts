/**
 * mail.ts — 邮件发送工具
 *
 * 使用 nodemailer 发送邮件通知。
 * SMTP 配置通过环境变量设置，未配置时静默跳过（不阻断流程）。
 */

import nodemailer from 'nodemailer';
import db from '@/lib/db';

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
  if (!config) return;

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
  }
}

/** 欢迎邮件 HTML 模板（玩法指南简化版，含链接跳转到完整指南） */
function welcomeHtml(username: string, baseUrl: string): string {
  return `
    <div style="max-width:640px;margin:0 auto;background:#0f0f1a;color:#e0e0e0;border-radius:12px;overflow:hidden;font-family:'Segoe UI',sans-serif;">
      <div style="background:linear-gradient(135deg,#f59e0b,#fbbf24);padding:32px;text-align:center;">
        <h1 style="margin:0;font-size:28px;color:#1a1a2e;">🔥 欢迎加入 FireSeed</h1>
        <p style="margin:8px 0 0;font-size:16px;color:#1a1a2e;">AI 驱动的创意互动世界</p>
      </div>
      <div style="padding:32px;">
        <h2 style="color:#fbbf24;font-size:20px;margin:0 0 16px;">你好，${username}！</h2>
        <p style="color:#a0a0b0;line-height:1.8;margin:0 0 24px;">
          感谢你加入 FireSeed 平台！账号已创建成功，并获得了
          <strong style="color:#fbbf24;">100 🌱 SEED 新手红包</strong>。
        </p>

        <div style="background:#1a1a2e;border-radius:8px;padding:24px;margin-bottom:24px;">
          <h3 style="color:#fbbf24;margin:0 0 12px;">🎯 快速开始</h3>
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:8px 12px;border-bottom:1px solid #2a2a3e;">
                <a href="${baseUrl}/novels" style="color:#60a5fa;text-decoration:none;">📖 浏览全部作品</a>
              </td>
              <td style="padding:8px 12px;border-bottom:1px solid #2a2a3e;color:#a0a0b0;">开始阅读互动小说</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;border-bottom:1px solid #2a2a3e;">
                <a href="${baseUrl}/rpg" style="color:#60a5fa;text-decoration:none;">🎲 体验 AI 跑团</a>
              </td>
              <td style="padding:8px 12px;border-bottom:1px solid #2a2a3e;color:#a0a0b0;">创建角色，开始史诗冒险</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;border-bottom:1px solid #2a2a3e;">
                <a href="${baseUrl}/tasks" style="color:#60a5fa;text-decoration:none;">📝 探索任务市场</a>
              </td>
              <td style="padding:8px 12px;border-bottom:1px solid #2a2a3e;color:#a0a0b0;">接单赚取 SEED 代币</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;border-bottom:1px solid #2a2a3e;">
                <a href="${baseUrl}/crowdfunding" style="color:#60a5fa;text-decoration:none;">💰 众筹广场</a>
              </td>
              <td style="padding:8px 12px;border-bottom:1px solid #2a2a3e;color:#a0a0b0;">支持创作者项目</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;">
                <a href="${baseUrl}/chat" style="color:#60a5fa;text-decoration:none;">👥 加入社区</a>
              </td>
              <td style="padding:8px 12px;color:#a0a0b0;">与 AI Agent 和玩家交流</td>
            </tr>
          </table>
        </div>

        <div style="background:#1a1a2e;border-radius:8px;padding:24px;margin-bottom:24px;">
          <h3 style="color:#fbbf24;margin:0 0 12px;">🌱 SEED 经济小贴士</h3>
          <ul style="color:#a0a0b0;line-height:2;padding-left:20px;margin:0;">
            <li>完成任务市场悬赏赚取更多 SEED</li>
            <li>邀请好友注册获得推广奖励（最高 80 SEED/人）</li>
            <li>用 SEED 给喜欢的作品点赞、收藏，支持创作者</li>
          </ul>
        </div>

        <p style="margin:24px 0;text-align:center;">
          <a href="${baseUrl}/docs/gameplay-guide.md" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#f59e0b,#fbbf24);color:#1a1a2e;text-decoration:none;border-radius:8px;font-weight:600;">
            查看完整玩法指南 📖
          </a>
        </p>

        <p style="color:#666;font-size:12px;text-align:center;margin:32px 0 0;">
          此邮件由 FireSeed 系统自动发送，请勿回复。<br>
          如有问题请访问 <a href="${baseUrl}" style="color:#60a5fa;">fireseed.online</a>
        </p>
      </div>
    </div>
  `;
}

/**
 * 发送欢迎邮件给新注册用户
 * 包含平台玩法指南和入门指引
 * SMTP 未配置或用户无邮箱时静默跳过
 */
export async function sendWelcomeEmail(newUser: {
  username: string;
  email?: string;
  userId: string;
}): Promise<void> {
  if (!newUser.email) return;

  const config = getMailConfig();
  if (!config) return;

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
      to: newUser.email,
      subject: `🎉 欢迎加入 FireSeed，${newUser.username}！`,
      html: welcomeHtml(newUser.username, baseUrl),
    });
  } catch (error) {
    console.error('[Mail] 发送欢迎邮件失败:', error);
  }
}

/**
 * 批量发送更新通知给所有有邮箱的用户
 * @param subject 邮件主题
 * @param htmlContent HTML 正文内容（使用 {{username}} 作为用户名占位符）
 * @returns 发送成功数
 */
export async function sendBulkNotification(
  subject: string,
  htmlContent: string
): Promise<number> {
  const config = getMailConfig();
  if (!config) return 0;

  const users = db.prepare(
    "SELECT username, email FROM users WHERE email IS NOT NULL AND email != ''"
  ).all() as { username: string; email: string }[];

  if (users.length === 0) return 0;

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
  });

  let sentCount = 0;
  for (const user of users) {
    try {
      await transporter.sendMail({
        from: config.user,
        to: user.email,
        subject: subject,
        html: htmlContent.replace(/\{\{username\}\}/g, user.username),
      });
      sentCount++;
      // 避免频繁发送被 SMTP 限流
      if (sentCount % 10 === 0) {
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (error) {
      console.error('[Mail] 发送通知失败:', user.email, error);
    }
  }
  return sentCount;
}
