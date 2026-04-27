import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.redirect(new URL('/admin', process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'));
  response.cookies.delete('admin_auth');
  return response;
}
