import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Guest novels API' }, { status: 200 });
}
