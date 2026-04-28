import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import crypto from 'crypto';

// Token 验证中间件（仅供内部使用）
function verifyUserToken(request: NextRequest): { valid: boolean; userId?: string; token?: string } {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { valid: false };
  }
  const token = authHeader.slice(7);
  const record = db.prepare(
    'SELECT ut.id, ut.user_id, ut.is_active FROM user_tokens ut WHERE ut.token = ?'
  ).get(token) as { id: string; user_id: string; is_active: number } | undefined;
  
  if (!record || record.is_active !== 1) {
    return { valid: false };
  }
  
  // 更新最后使用时间
  db.prepare('UPDATE user_tokens SET last_used = CURRENT_TIMESTAMP WHERE id = ?').run(record.id);
  
  return { valid: true, userId: record.user_id, token };
}

// 生成随机 Token
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// 获取用户的 Token 列表
export async function GET(request: NextRequest) {
  // 支持两种认证方式：
  // 1. 用户登录认证 (Cookie)
  // 2. AI Token 认证 (Bearer Token)
  
  const userId = request.headers.get('x-user-id');
  const authHeader = request.headers.get('Authorization');
  
  let targetUserId = userId;
  
  // 如果没有 user-id header，尝试从 Authorization 获取
  if (!targetUserId && authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const record = db.prepare(
      'SELECT user_id FROM user_tokens WHERE token = ? AND is_active = 1'
    ).get(token) as { user_id: string } | undefined;
    
    if (record) {
      targetUserId = record.user_id;
    }
  }
  
  // 如果都没有，尝试从 Cookie 获取
  if (!targetUserId) {
    const cookies = request.cookies;
    const sessionToken = cookies.get('session')?.value;
    if (sessionToken) {
      const user = db.prepare('SELECT id FROM users WHERE username = ?').get(sessionToken) as { id: string } | undefined;
      if (user) {
        targetUserId = user.id;
      }
    }
  }
  
  if (!targetUserId) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }
  
  const tokens = db.prepare(`
    SELECT id, name, permissions, created_at, last_used, is_active
    FROM user_tokens
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(targetUserId);
  
  return NextResponse.json({ tokens });
}

// 创建新的 Token（需要用户登录）
export async function POST(request: NextRequest) {
  // 获取用户认证
  const cookies = request.cookies;
  const sessionToken = cookies.get('session')?.value;
  
  if (!sessionToken) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }
  
  const user = db.prepare('SELECT id, username FROM users WHERE username = ?').get(sessionToken) as { id: string; username: string } | undefined;
  
  if (!user) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 });
  }
  
  try {
    const { name, permissions } = await request.json();
    
    const tokenId = uuidv4();
    const token = generateToken();
    const tokenName = name || `Token_${new Date().toISOString().slice(0, 10)}`;
    const tokenPermissions = permissions || ['create_novel', 'create_chapter'];
    
    db.prepare(`
      INSERT INTO user_tokens (id, user_id, token, name, permissions)
      VALUES (?, ?, ?, ?, ?)
    `).run(tokenId, user.id, token, tokenName, JSON.stringify(tokenPermissions));
    
    return NextResponse.json({
      success: true,
      token: {
        id: tokenId,
        token: token,
        name: tokenName,
        permissions: tokenPermissions,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Create token error:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}

// 删除 Token
export async function DELETE(request: NextRequest) {
  const cookies = request.cookies;
  const sessionToken = cookies.get('session')?.value;
  
  if (!sessionToken) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }
  
  const user = db.prepare('SELECT id FROM users WHERE username = ?').get(sessionToken) as { id: string } | undefined;
  
  if (!user) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 });
  }
  
  const { searchParams } = new URL(request.url);
  const tokenId = searchParams.get('id');
  
  if (!tokenId) {
    return NextResponse.json({ error: '缺少 Token ID' }, { status: 400 });
  }
  
  // 确保 Token 属于当前用户
  const token = db.prepare('SELECT id FROM user_tokens WHERE id = ? AND user_id = ?').get(tokenId, user.id);
  
  if (!token) {
    return NextResponse.json({ error: 'Token 不存在或无权限删除' }, { status: 404 });
  }
  
  db.prepare('DELETE FROM user_tokens WHERE id = ?').run(tokenId);
  
  return NextResponse.json({ success: true });
}
