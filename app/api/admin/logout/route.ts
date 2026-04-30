import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.redirect(new URL('/admin', process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'));
  // 删除 admin_token Cookie（不再使用 admin_auth）
  response.cookies.delete('admin_token');
  return response;
}
