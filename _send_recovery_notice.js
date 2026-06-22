/**
 * FireSeed 异常恢复通知脚本（纯邮件版）
 * 
 * 说明：用户ID在当前数据库中不存在（数据库已回滚到备份版本），
 * 因此无法发送站内通知，改为直接发送邮件通知。
 * 
 * 收件人列表来自注册邮件系统的保底信息，这些用户确实存在，
 * 只是当前数据库不包含他们的记录。
 */

const nodemailer = require('/root/ai-novel-lite/node_modules/nodemailer');

// ===== 配置 =====
const BASE_URL = 'https://fireseed.online';

const SMTP = {
  host: 'smtp.qq.com',
  port: 465,
  user: '50541358@qq.com',
  pass: 'eyycpasuftkmcabj',
};
const FROM_ADDR = '50541358@qq.com';

// ===== 收件人列表（来自系统保底邮件，这些用户确实注册过） =====
const RECIPIENTS = [
  { username: '沉默的人', email: '931482408@qq.com' },
  { username: 'sbtv587', email: '2374547044@qq.com' },
  { username: 'buran', email: '78278705@qq.com' },
  { username: 'jackey3ice@gmail.com', email: 'jackey3ice@gmail.com' },
  { username: 'mail_mq8ypots', email: 'mail_mq8ypots@test.com' },
  { username: 'aiecc608', email: 'aiecc608@163.com' },
];

// ===== 构建邮件 HTML =====
function buildEmailHtml(username) {
  const safe = username.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0b0b0f;">
<table role="presentation" style="width:100%;max-width:640px;margin:0 auto;background:#0b0b0f;font-family:'Helvetica Neue','PingFang SC','Microsoft YaHei',sans-serif;">
<tr><td style="padding:0;"><div style="height:4px;background:linear-gradient(90deg,#c9a55c,#e4cc8a,#c9a55c);"></div></td></tr>
<tr><td style="padding:32px 32px 0;text-align:center;">
<div style="width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,rgba(201,165,92,0.15),rgba(228,204,138,0.08));border:1px solid rgba(201,165,92,0.2);display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
<svg width="28" height="28" viewBox="0 0 36 36" fill="none"><path d="M11 18C11 18 13.5 11 18 11C22.5 11 25 18 25 18C25 18 22.5 25 18 25C13.5 25 11 18 11 18Z" stroke="#c9a55c" stroke-width="1.5" fill="none"/><circle cx="18" cy="18" r="3" fill="#c9a55c"/></svg>
</div>
<h1 style="color:#f0ece4;font-size:22px;font-weight:600;margin:0 0 4px;">FireSeed</h1>
<p style="color:#9a9a8e;font-size:13px;margin:0;">AI 互动小说创作平台</p>
</td></tr>
<tr><td style="padding:24px 32px;">
<div style="background:#131318;border-radius:16px;border:1px solid rgba(255,255,255,0.06);overflow:hidden;">
<div style="background:linear-gradient(135deg,rgba(201,165,92,0.12),rgba(228,204,138,0.05));padding:28px 24px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.04);">
<p style="font-size:36px;margin:0 0 12px;">🛠️</p>
<h2 style="color:#f0ece4;font-size:18px;font-weight:600;margin:0 0 6px;">系统异常修复通知</h2>
<p style="color:#9a9a8e;font-size:13px;margin:0;">Service Recovery Notice</p>
</div>
<div style="padding:24px;">
<p style="color:#c9a55c;font-size:15px;font-weight:600;margin:0 0 16px;">亲爱的 <span style="color:#e4cc8a;">${safe}</span>，您好：</p>
<div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.15);border-radius:10px;padding:16px;margin-bottom:20px;">
<p style="color:#fca5a5;font-size:13px;margin:0;line-height:1.8;">🥺 近期系统经历了短暂的不稳定期，给您带来了不便，我们深表歉意。</p>
</div>
<p style="color:#d4d4c8;font-size:14px;line-height:1.8;margin:0 0 16px;">目前网站所有核心功能已全面恢复并得到进一步优化完善：</p>
<table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:16px;">
<tr><td style="padding:6px 0;color:#d4d4c8;font-size:13px;line-height:1.6;"><span style="color:#c9a55c;margin-right:8px;">📚</span> AI 小说创作与发布 — 更加稳定流畅</td></tr>
<tr><td style="padding:6px 0;color:#d4d4c8;font-size:13px;line-height:1.6;"><span style="color:#c9a55c;margin-right:8px;">🔀</span> 分支剧情系统 — 读者互动体验升级</td></tr>
<tr><td style="padding:6px 0;color:#d4d4c8;font-size:13px;line-height:1.6;"><span style="color:#c9a55c;margin-right:8px;">🎮</span> RPG 跑团模块 — 新增副本与角色系统</td></tr>
<tr><td style="padding:6px 0;color:#d4d4c8;font-size:13px;line-height:1.6;"><span style="color:#c9a55c;margin-right:8px;">🌱</span> SEED 经济体系 — 创作激励与任务系统</td></tr>
<tr><td style="padding:6px 0;color:#d4d4c8;font-size:13px;line-height:1.6;"><span style="color:#c9a55c;margin-right:8px;">🔔</span> 站内消息通知 — 实时掌握作品动态</td></tr>
<tr><td style="padding:6px 0;color:#d4d4c8;font-size:13px;line-height:1.6;"><span style="color:#c9a55c;margin-right:8px;">💬</span> 读者评论与互动 — 建设活跃社区</td></tr>
</table>
<p style="color:#d4d4c8;font-size:14px;line-height:1.8;margin:0 0 24px;">诚挚地邀请您登录体验最新版本，感受 FireSeed 的完整魅力。</p>
<div style="text-align:center;margin-bottom:20px;">
<a href="${BASE_URL}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#c9a55c,#e4cc8a);color:#0b0b0f;text-decoration:none;border-radius:10px;font-size:15px;font-weight:600;">前往 FireSeed →</a>
</div>
<div style="background:rgba(201,165,92,0.06);border-radius:8px;padding:14px 16px;">
<p style="color:#9a9a8e;font-size:12px;margin:0;line-height:1.6;">💡 如有任何问题或建议，欢迎通过网站「反馈」功能联系我们。</p>
</div>
</div></div></td></tr>
<tr><td style="padding:0 32px 32px;text-align:center;">
<p style="color:#5a5a52;font-size:11px;margin:0 0 6px;">FireSeed · AI 互动小说创作平台<br><a href="${BASE_URL}" style="color:#c9a55c;text-decoration:none;">${BASE_URL}</a></p>
<p style="color:#5a5a52;font-size:10px;margin:0;">此邮件由 FireSeed 系统自动发送</p>
</td></tr>
</table>
</body></html>`;
}

// ===== 主流程 =====
async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   FireSeed 异常恢复通知 — 邮件发送                  ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log();

  // 1. 检查 SMTP
  console.log('[1/3] 检查 SMTP 连接...');
  const transporter = nodemailer.createTransport({
    host: SMTP.host, port: SMTP.port, secure: SMTP.port === 465,
    auth: { user: SMTP.user, pass: SMTP.pass },
  });
  await transporter.verify();
  console.log('  ✅ SMTP 连接成功（smtp.qq.com:465）\n');

  // 2. 发送邮件
  console.log('[2/3] 发送通知邮件...');
  let sent = 0, failed = 0;

  for (const r of RECIPIENTS) {
    try {
      console.log(`  📧 [${sent + failed + 1}/${RECIPIENTS.length}] ${r.username} <${r.email}>...`);
      await transporter.sendMail({
        from: `"FireSeed" <${FROM_ADDR}>`,
        to: r.email,
        subject: '🛠️ 系统异常修复通知 — FireSeed 全功能已恢复',
        html: buildEmailHtml(r.username),
      });
      sent++;
      console.log(`     ✅ 已发送`);
    } catch (e) {
      failed++;
      console.log(`     ❌ 失败: ${e.message}`);
    }
    // SMTP 限流保护
    await new Promise(r => setTimeout(r, 600));
  }
  console.log();

  // 3. 报告
  console.log('[3/3] 发送完成');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  发送报告                                    ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  目标:${String(RECIPIENTS.length).padStart(6)} 人                ║`);
  console.log(`║  成功:${String(sent).padStart(6)} 人 ✅              ║`);
  console.log(`║  失败:${String(failed).padStart(6)} 人               ║`);
  console.log('╚══════════════════════════════════════════════╝');
  console.log();
  console.log('🎉 全部完成！');
}

main().catch(err => { console.error('脚本执行失败:', err); process.exit(1); });
