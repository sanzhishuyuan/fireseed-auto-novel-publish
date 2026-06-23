import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Chapter API' }, { status: 200 });
}
