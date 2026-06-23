import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'RPG API root' }, { status: 200 });
}
