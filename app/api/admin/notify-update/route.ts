import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { sendBulkNotification } from '@/lib/mail';
import db from '@/lib/db';

const ADMIN_KEY = process.env.ADMIN_KEY || 'Fireseed@Admin2026';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { admin_key, subject, preview } = body;

    if (!admin_key || admin_key !== ADMIN_KEY) {
      return NextResponse.json({ error: 'admin_key invalid' }, { status: 403 });
    }

    // Try multiple paths for changelog.md
    const paths = [
      path.join(process.cwd(), 'docs', 'changelog.md'),
      path.join('/root/ai-novel-lite', 'docs', 'changelog.md'),
    ];
    let cl = '';
    for (const p of paths) {
      try { cl = fs.readFileSync(p, 'utf-8'); break; } catch {}
    }

    const vm = cl.match(/## \[([\d.]+)\]/);
    const version = vm ? vm[1] : 'unknown';

    const sections = cl.split(/^## /m);
    const latest = sections.find(function(s) { return s.trim().startsWith('['); });
    let items = '';
    if (latest) {
      var re = /^- (.+)$/gm;
      var m;
      while ((m = re.exec(latest)) !== null) {
        items += '<li>' + m[1] + '</li>';
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://fireseed.online';
    const finalSubject = subject || ('FireSeed v' + version + ' update');

    const h = [
      '<div style="max-width:640px;margin:0 auto;background:#0f0f1a;color:#e0e0e0;border-radius:12px;overflow:hidden;font-family:sans-serif;">',
      '<div style="background:linear-gradient(135deg,#f59e0b,#fbbf24);padding:32px;text-align:center;">',
      '<h1 style="margin:0;font-size:24px;color:#1a1a2e;">FireSeed update</h1>',
      '<p style="margin:8px 0 0;font-size:14px;color:#1a1a2e;">v' + version + '</p></div>',
      '<div style="padding:32px;">',
      '<h2 style="color:#fbbf24;font-size:18px;margin:0 0 16px;">Hello, {{username}}!</h2>',
      '<p style="color:#a0a0b0;line-height:1.8;">FireSeed has been updated.</p>',
      '<div style="background:#1a1a2e;border-radius:8px;padding:24px;margin:20px 0;"><ul style="color:#a0a0b0;line-height:2;padding-left:20px;margin:0;">',
      (items || '<li>Check the website for details</li>'),
      '</ul></div>',
      '<p style="margin:24px 0;text-align:center;"><a href="' + baseUrl + '" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#f59e0b,#fbbf24);color:#1a1a2e;text-decoration:none;border-radius:8px;font-weight:600;">Go to FireSeed</a></p>',
      '<p style="color:#666;font-size:12px;text-align:center;margin:32px 0 0;">Auto-generated.<br><a href="' + baseUrl + '" style="color:#60a5fa;">fireseed.online</a></p></div></div>',
    ].join('\n');

    if (preview) {
      const count = db.prepare("SELECT COUNT(*) as c FROM users WHERE email IS NOT NULL AND email != ''").get() as { c: number };
      return NextResponse.json({ preview: true, version: version, subject: finalSubject, recipients: count.c });
    }

    const sentCount = await sendBulkNotification(finalSubject, h);
    return NextResponse.json({ success: true, version: version, subject: finalSubject, sent_count: sentCount });
  } catch (error) {
    console.error('[Admin] notify failed:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
