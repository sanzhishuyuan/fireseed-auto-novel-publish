import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { sendBulkNotification } from '@/lib/mail';

const ADMIN_KEY = process.env.ADMIN_KEY || 'Fireseed@Admin2026';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { admin_key, subject, preview } = body;

    if (!admin_key || admin_key !== ADMIN_KEY) {
      return NextResponse.json({ error: '管理员密钥不正确' }, { status: 403 });
    }

    const clPath = path.join(process.cwd(), 'docs', 'changelog.md');
    let cl = '';
    try { cl = fs.readFileSync(clPath, 'utf-8'); } catch { cl = ''; }

    const vm = cl.match(/## \[([\d.]+)\]/);
    const version = vm ? vm[1] : 'unknown';

    const sections = cl.split(/^## /m);
    const latest = sections.find(s => s.trim().startsWith('['));
    let items = '';
    if (latest) {
      const matches: RegExpExecArray[] = []; let m; while ((m = /^- (.+)$/gm.exec(latest)) !== null) { matches.push(m); }
      if (matches.length > 0) {
        items = matches.map(m => '<li>' + m[1] + '</li>').join('');
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://fireseed.online';
    const finalSubject = subject || ('FireSeed v' + version + ' 版本更新通知');

    const html = '<div style="max-width:640px;margin:0 auto;background:#0f0f1a;color:#e0e0e0;border-radius:12px;overflow:hidden;font-family:sans-serif;">'
      + '<div style="background:linear-gradient(135deg,#f59e0b,#fbbf24);padding:32px;text-align:center;">'
      + '<h1 style="margin:0;font-size:24px;color:#1a1a2e;">FireSeed 版本更新</h1>'
      + '<p style="margin:8px 0 0;font-size:14px;color:#1a1a2e;">v' + version + '</p></div>'
      + '<div style="padding:32px;">'
      + '<h2 style="color:#fbbf24;font-size:18px;margin:0 0 16px;">你好，{{username}}！</h2>'
      + '<p style="color:#a0a0b0;line-height:1.8;">FireSeed 平台发布了新版本，以下是本次更新内容：</p>'
      + '<div style="background:#1a1a2e;border-radius:8px;padding:24px;margin:20px 0;"><ul style="color:#a0a0b0;line-height:2;padding-left:20px;margin:0;">'
      + (items || '<li>请访问官网查看最新功能</li>')
      + '</ul></div>'
      + '<p style="margin:24px 0;text-align:center;">'
      + '<a href="' + baseUrl + '" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#f59e0b,#fbbf24);color:#1a1a2e;text-decoration:none;border-radius:8px;font-weight:600;">前往 FireSeed</a></p>'
      + '<p style="color:#666;font-size:12px;text-align:center;margin:32px 0 0;">此邮件由 FireSeed 系统自动发送。<br><a href="' + baseUrl + '" style="color:#60a5fa;">fireseed.online</a></p></div></div>';

    if (preview) {
      const { default: db } = await import('@/lib/db');
      const count = db.prepare("SELECT COUNT(*) as c FROM users WHERE email IS NOT NULL AND email != ''").get() as { c: number };
      return NextResponse.json({ preview: true, version, subject: finalSubject, recipients: count.c });
    }

    const sentCount = await sendBulkNotification(finalSubject, html);
    return NextResponse.json({ success: true, version, subject: finalSubject, sent_count: sentCount });
  } catch (error) {
    console.error('[Admin] send update notification failed:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
