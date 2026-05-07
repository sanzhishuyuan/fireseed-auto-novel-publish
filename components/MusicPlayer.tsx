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

  // 加载音乐列表
  useEffect(() => {
    fetch('/api/music/list')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.songs.length > 0) {
          setSongs(data.songs);
          const shuffled = Math.floor(Math.random() * data.songs.length);
          setCurrentIndex(shuffled);
        }
      })
      .catch(() => {});
  }, []);

  // 当前歌曲变化时播放
  useEffect(() => {
    if (currentIndex >= 0 && songs[currentIndex] && audioRef.current) {
      audioRef.current.src = songs[currentIndex].url;
      if (playing) {
        audioRef.current.play().catch(() => setPlaying(false));
      }
    }
  }, [currentIndex, songs, playing]);

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
    const next = Math.floor(Math.random() * songs.length);
    setCurrentIndex(next);
    if (!playing) setPlaying(true);
  };

  const currentSong = currentIndex >= 0 ? songs[currentIndex] : null;

  if (songs.length === 0) return null;

  return (
    <>
      {/* 隐藏的 audio 元素 */}
      <audio
        ref={audioRef}
        onEnded={playNext}
        onError={() => setTimeout(playNext, 3000)}
      />

      {/* 浮动播放按钮 */}
      <button
        onClick={togglePlay}
        className="fixed z-50 flex items-center justify-center shadow-lg hover:scale-110 transition-all"
        style={{
          bottom: showPlayer ? '100px' : '80px',
          right: '24px',
          width: '46px',
          height: '46px',
          borderRadius: '50%',
          background: playing
            ? 'linear-gradient(135deg, var(--accent), var(--accent-light))'
            : 'var(--bg-card)',
          border: '2px solid var(--accent)',
          color: playing ? 'white' : 'var(--accent)',
          fontSize: '20px',
          zIndex: 999
        }}
        title={playing ? '暂停' : '播放背景音乐'}
      >
        {playing ? '⏸' : '🎵'}
      </button>

      {/* 展开的播放器小窗 */}
      {showPlayer && (
        <div
          className="fixed z-50 rounded-xl shadow-2xl overflow-hidden"
          style={{
            bottom: '80px',
            right: '24px',
            width: '260px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            animation: 'fadeIn 0.2s ease',
            zIndex: 999
          }}
        >
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-light)' }}>
            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
              🎵 {playing ? '正在播放' : '已暂停'}
            </span>
            <button
              onClick={() => { setShowPlayer(false); if (playing && audioRef.current) { audioRef.current.pause(); setPlaying(false); } }}
              className="text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              关闭
            </button>
          </div>

          <div className="px-4 py-3">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {currentSong ? currentSong.name : '暂无音乐'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              随机播放 · 共 {songs.length} 首
            </p>
          </div>

          <div className="px-4 pb-3 flex items-center justify-center gap-4">
            <button
              onClick={playNext}
              className="text-lg hover:scale-110 transition-transform"
              style={{ color: 'var(--accent)' }}
              title="下一首随机"
            >
              ⏭
            </button>
            <button
              onClick={togglePlay}
              className="flex items-center justify-center"
              style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent), var(--accent-light))',
                color: 'white', fontSize: '18px'
              }}
            >
              {playing ? '⏸' : '▶'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
