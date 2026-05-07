import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const MUSIC_DIR = '/var/data/ai-novel/music';

export async function GET() {
  try {
    if (!fs.existsSync(MUSIC_DIR)) {
      return NextResponse.json({ success: true, songs: [] });
    }

    const files = fs.readdirSync(MUSIC_DIR)
      .filter(f => /\.(mp3|wav|ogg|flac|aac|m4a)$/i.test(f))
      .map(f => ({
        name: f.replace(/^\d+_/, '').replace(/\.[^.]+$/, ''),
        url: '/music/' + f
      }));

    return NextResponse.json({ success: true, songs: files });
  } catch (error) {
    console.error('Get music list error:', error);
    return NextResponse.json({ success: false, songs: [] });
  }
}
