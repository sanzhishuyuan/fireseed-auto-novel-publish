'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
        setSongs(data.songs || []);
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
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-light)' }}>
        <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>🎵 背景音乐</h2>
        <label className="cursor-pointer btn-primary text-xs px-3 py-1.5">
          {uploading ? '上传中...' : '+ 添加音乐'}
          <input type="file" accept=".mp3,.wav,.ogg,.flac,.aac,.m4a" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {error && (
        <div className="px-5 py-2 text-xs" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="px-5 py-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>加载中...</div>
      ) : songs.length === 0 ? (
        <div className="px-5 py-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          暂无背景音乐，点击「添加音乐」上传
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
          {songs.map((song) => (
            <div key={song.name} className="px-5 py-3 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                  ♪ {song.name.replace(/^\d+_/, '').replace(/\.[^.]+$/, '')}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
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
                className="px-2 py-1 rounded text-xs flex-shrink-0 hover:opacity-80"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
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
