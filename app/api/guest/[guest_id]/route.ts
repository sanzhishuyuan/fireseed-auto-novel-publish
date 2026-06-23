import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Guest ID API' }, { status: 200 });
}
