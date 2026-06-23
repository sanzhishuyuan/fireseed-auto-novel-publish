import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Branch API' }, { status: 200 });
}
