import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Guest novel API' }, { status: 200 });
}
