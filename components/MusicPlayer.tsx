'use client';

import { useState, useEffect, useRef } from 'react';

interface Song {
  name: string;
  url: string;
}

export default function MusicPlayer() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/music/list')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.songs.length > 0) {
          setSongs(data.songs);
          setCurrentIndex(Math.floor(Math.random() * data.songs.length));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (currentIndex >= 0 && songs[currentIndex] && audioRef.current) {
      audioRef.current.src = songs[currentIndex].url;
      if (playing) audioRef.current.play().catch(() => setPlaying(false));
    }
  }, [currentIndex, songs, playing]);

  // 点击外部关闭面板
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowPlayer(false);
      }
    };
    if (showPlayer) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPlayer]);

  const togglePlay = () => {
    if (!audioRef.current || songs.length === 0) return;
    if (!showPlayer) setShowPlayer(true);
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      if (currentIndex < 0 && songs.length > 0) {
        setCurrentIndex(Math.floor(Math.random() * songs.length));
      }
      audioRef.current.play().catch(() => {});
      setPlaying(true);
    }
  };

  const playNext = () => {
    if (songs.length === 0) return;
    setCurrentIndex(Math.floor(Math.random() * songs.length));
    if (!playing) setPlaying(true);
  };

  const currentSong = currentIndex >= 0 ? songs[currentIndex] : null;

  if (songs.length === 0) return null;

  return (
    <div className="relative" ref={panelRef}>
      <audio
        ref={audioRef}
        onEnded={playNext}
        onError={() => setTimeout(playNext, 3000)}
      />

      {/* 触发按钮 - 嵌在顶栏右侧 */}
      <button
        onClick={() => setShowPlayer(!showPlayer)}
        className="flex items-center justify-center transition-all hover:scale-110"
        style={{
          width: '34px', height: '34px', borderRadius: '50%',
          background: playing ? 'linear-gradient(135deg, var(--accent), var(--accent-light))' : 'transparent',
          color: playing ? 'white' : 'var(--text-secondary)',
          fontSize: '15px',
          border: playing ? 'none' : '1px solid var(--border)',
        }}
        title={playing ? `正在播放: ${currentSong?.name || ''}` : '背景音乐'}
      >
        {playing ? '♪' : '♫'}
      </button>

      {/* 下拉面板 */}
      {showPlayer && (
        <div
          className="absolute rounded-xl shadow-2xl overflow-hidden"
          style={{
            top: 'calc(100% + 8px)',
            right: 0,
            width: '260px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            animation: 'fadeIn 0.15s ease',
            zIndex: 9999
          }}
        >
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-light)' }}>
            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
              🎵 {playing ? '正在播放' : '已暂停'}
            </span>
            <button onClick={() => setShowPlayer(false)} className="text-xs" style={{ color: 'var(--text-muted)' }}>关闭</button>
          </div>

          <div className="px-4 py-3">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {currentSong ? currentSong.name : '暂无音乐'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>随机播放 · 共 {songs.length} 首</p>
          </div>

          <div className="px-4 pb-3 flex items-center justify-center gap-4">
            <button onClick={playNext} className="text-lg hover:scale-110 transition-transform" style={{ color: 'var(--accent)' }} title="下一首随机">⏭</button>
            <button onClick={togglePlay} className="flex items-center justify-center" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent-light))', color: 'white', fontSize: '18px' }}>
              {playing ? '⏸' : '▶'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
