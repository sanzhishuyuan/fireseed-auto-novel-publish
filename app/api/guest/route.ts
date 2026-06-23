import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Guest API root' }, { status: 200 });
}
