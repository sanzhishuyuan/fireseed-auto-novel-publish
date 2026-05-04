import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface Params { params: Promise<{ novelId: string; chapterId: string }>; }

// 验证 token 字符串
function verifyTokenString(token: string): { valid: boolean; token: string; userId?: string } {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string; role: string };
    return { valid: true, token, userId: decoded.userId };
  } catch { /* JWT 无效 */ }

  const userToken = db.prepare(
    'SELECT id, user_id, is_active FROM user_tokens WHERE token = ?'
  ).get(token) as { id: string; user_id: string; is_active: number } | undefined;
  if (userToken && userToken.is_active === 1) {
    db.prepare('UPDATE user_tokens SET last_used = CURRENT_TIMESTAMP WHERE token = ?').run(token);
    return { valid: true, token, userId: userToken.user_id };
  }

  const aiToken = db.prepare('SELECT * FROM ai_tokens WHERE token = ? AND is_active = 1').get(token) as Record<string, unknown> | undefined;
  if (aiToken) {
    db.prepare('UPDATE ai_tokens SET last_used = CURRENT_TIMESTAMP WHERE token = ?').run(token);
    return { valid: true, token };
  }

  return { valid: false, token };
}

// 统一 Token 验证：Header Bearer 优先，Body token 回退
function verifyToken(request: NextRequest, bodyToken?: string): { valid: boolean; token: string; userId?: string } {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const result = verifyTokenString(authHeader.slice(7));
    if (result.valid) return result;
  }
  if (bodyToken) {
    const result = verifyTokenString(bodyToken);
    if (result.valid) return result;
  }
  return { valid: false, token: '' };
}

/**
 * PUT /api/ai/novels/{novelId}/chapters/{chapterId}
 * 修改已有章节
 *
 * body: {
 *   "token": "JWT_TOKEN",
 *   "title": "新的章节标题",     // 可选
 *   "content": "新的正文内容",   // 必传
 *   "order": 2,                  // 可选
 *   "branch": "main",            // 可选
 *   "choices": [],               // 可选
 *   "custom_branch_enabled": false  // 可选
 * }
 */
export async function PUT(request: NextRequest, { params }: Params) {
  const { novelId, chapterId } = await params;

  // 先读取 body 获取可能的内嵌 token
  let bodyToken: string | undefined;
  let body: any;
  try {
    body = await request.json();
    bodyToken = body?.token;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const auth = verifyToken(request, bodyToken);
  if (!auth.valid) {
    return NextResponse.json({ error: 'Unauthorized', code: 'unauthorized' }, { status: 401 });
  }

  try {
    const { title, content, order, branch, choices, custom_branch_enabled } = body;

    if (!content) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    // 字数校验（去除空白字符）
    const contentStr = String(content);
    const checkWordCount = contentStr.replace(/\s/g, '').length;
    if (checkWordCount < 1500) {
      return NextResponse.json({
        error: '章节字数不足',
        detail: '单章至少 1500 字以保证阅读体验，当前字数：' + checkWordCount + '，建议充实内容后重试',
        current_word_count: checkWordCount,
        minimum_required: 1500
      }, { status: 400 });
    }

    // 确认小说存在
    const novel = db.prepare('SELECT id, author_id FROM novels WHERE id = ?').get(novelId) as any;
    if (!novel) {
      return NextResponse.json({ error: 'Novel not found' }, { status: 404 });
    }

    // 确认章节存在且属于该小说
    const existingChapter = db.prepare('SELECT * FROM chapters WHERE id = ? AND novel_id = ?').get(chapterId, novelId) as any;
    if (!existingChapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    const wordCount = checkWordCount;
    const newTitle = title || existingChapter.title;
    const newOrder = order !== undefined ? parseInt(String(order)) : existingChapter.order_num;
    const newBranch = branch || existingChapter.branch || 'main';

    // 构建 choices
    let finalChoices: any[] = choices !== undefined ? [...choices] : (
      existingChapter.choices ? JSON.parse(existingChapter.choices) : []
    );
    const newCustomBranchEnabled = custom_branch_enabled !== undefined ? custom_branch_enabled : (existingChapter.custom_branch_enabled === 1);
    if (newCustomBranchEnabled && !finalChoices.some((c: any) => c.is_custom)) {
      finalChoices.push({ text: 'Custom storyline (reader-written)', branch: 'custom', is_custom: true });
    }
    const choicesJson = JSON.stringify(finalChoices);

    // 更新数据库
    db.prepare(`
      UPDATE chapters
      SET title = ?, content = ?, order_num = ?, branch = ?, word_count = ?, choices = ?, custom_branch_enabled = ?
      WHERE id = ? AND novel_id = ?
    `).run(newTitle, contentStr, newOrder, newBranch, wordCount, choicesJson, newCustomBranchEnabled ? 1 : 0, chapterId, novelId);

    // 更新文件系统
    try {
      const chaptersDir = path.join(process.cwd(), 'content', 'novels', novelId, 'chapters');
      if (fs.existsSync(chaptersDir)) {
        const files = fs.readdirSync(chaptersDir);
        const chapterFile = files.find(f => {
          const parsed = path.parse(f);
          return parsed.name.startsWith(String(existingChapter.order_num) + '-') || f.startsWith(existingChapter.id);
        });
        if (chapterFile) {
          const meta = {
            title: newTitle,
            book: novelId,
            order: newOrder,
            branch: newBranch,
            choices: finalChoices,
            custom_branch_enabled: newCustomBranchEnabled,
            word_count: wordCount,
            updated_at: new Date().toISOString()
          };
          const filePath = path.join(chaptersDir, chapterFile);
          fs.writeFileSync(filePath, matter.stringify(contentStr, meta), 'utf-8');
        }
      }
    } catch (fsError) {
      // 文件系统更新失败不影响数据库更新
      console.error('Update chapter file error:', fsError);
    }

    db.prepare('UPDATE novels SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(novelId);

    return NextResponse.json({
      success: true,
      chapter: {
        id: chapterId,
        novel_id: novelId,
        title: newTitle,
        order: newOrder,
        branch: newBranch,
        word_count: wordCount,
        choices: finalChoices,
        custom_branch_enabled: newCustomBranchEnabled
      }
    });
  } catch (error) {
    console.error('Update chapter error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
