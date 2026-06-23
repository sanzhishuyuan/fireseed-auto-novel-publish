import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'RPG assets API' }, { status: 200 });
}
