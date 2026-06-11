'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const C = {
  card: '#131318',
  elevated: '#1a1a22',
  text: '#f0ece4',
  dim: '#9a9a8e',
  muted: '#5a5a52',
  gold: '#c9a55c',
  border: 'rgba(255,255,255,0.06)',
  red: '#ef4444',
} as const;

const fontDisplay = "'Fraunces', Georgia, serif";
const fontMono = "'DM Mono', 'Menlo', monospace";

interface Song {
  name: string;
  size: number;
  sizeText: string;
  url: string;
  modified: string;
}

export default function MusicManager() {
  const router = useRouter();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const fetchSongs = async () => {
    try {
      const res = await fetch('/api/admin/music');
      if (res.ok) {
        const data = await res.json();
        setSongs(data.data.songs || []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchSongs(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(mp3|wav|ogg|flac|aac|m4a)$/i)) {
      setError('不支持的格式，支持 mp3/wav/ogg/flac/aac/m4a');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('文件超过 20MB');
      return;
    }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/music', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        fetchSongs();
      } else {
        const data = await res.json();
        setError(data.error || '上传失败');
      }
    } catch {
      setError('上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`确认删除「${name.replace(/^\d+_/, '')}」？`)) return;

    try {
      const res = await fetch(`/api/admin/music?file=${encodeURIComponent(name)}`, { method: 'DELETE' });
      if (res.ok) {
        fetchSongs();
        router.refresh();
      }
    } catch {}
  };

  return (
    <div className="codex-card overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
        <h2 style={{ fontWeight: 600, color: C.text, fontFamily: fontDisplay, fontSize: 15 }}>🎵 背景音乐</h2>
        <label className="cursor-pointer codex-btn-gold" style={{ fontSize: 12, padding: '5px 12px' }}>
          {uploading ? '上传中...' : '+ 添加音乐'}
          <input type="file" accept=".mp3,.wav,.ogg,.flac,.aac,.m4a" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {error && (
        <div className="codex-tip-danger" style={{ margin: '0 20px', padding: '8px 12px', fontSize: 12 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="px-5 py-8 text-center" style={{ fontSize: 12, color: C.muted }}>加载中...</div>
      ) : songs.length === 0 ? (
        <div className="px-5 py-8 text-center" style={{ fontSize: 12, color: C.muted }}>
          暂无背景音乐，点击「添加音乐」上传
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: C.border }}>
          {songs.map((song) => (
            <div key={song.name} className="px-5 py-3 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate" style={{ color: C.text }}>
                  ♪ {song.name.replace(/^\d+_/, '').replace(/\.[^.]+$/, '')}
                </div>
                <div className="text-xs mt-0.5" style={{ color: C.muted, fontFamily: fontMono }}>
                  {song.sizeText}
                </div>
              </div>
              <audio
                src={song.url}
                controls
                className="h-8 w-48 flex-shrink-0"
                preload="none"
                style={{ borderRadius: '4px' }}
              />
              <button
                onClick={() => handleDelete(song.name)}
                className="px-2 py-1 rounded flex-shrink-0 hover:opacity-80"
                style={{ fontSize: 12, background: 'rgba(239,68,68,0.1)', color: C.red, border: 'none', cursor: 'pointer' }}
              >
                删除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
