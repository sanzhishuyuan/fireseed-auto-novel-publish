'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import SafeCover from '@/components/SafeCover';

interface User {
  id: string;
  username: string;
  nickname?: string;
  role: string;
}

export default function HomePage() {
  const [novels, setNovels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const [stats, setStats] = useState({ totalChapters: 0, totalNovels: 0, totalWords: 0, totalAuthors: 0 });
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 获取小说列表和真实统计数据
  useEffect(() => {
    Promise.all([
      fetch('/api/novels').then(r => r.json()),
      fetch('/api/stats').then(r => r.json())
    ])
      .then(([novelsData, statsData]) => {
        const list = Array.isArray(novelsData) ? novelsData : (novelsData?.novels || []);
        setNovels(list);
        if (statsData?.success && statsData?.data) {
          setStats(statsData.data);
        } else {
          const totalChapters = list.reduce((sum: number, n: any) => sum + (n.chapterCount || 0), 0);
          setStats({
            totalChapters,
            totalNovels: list.length,
            totalWords: totalChapters * 2000,
            totalAuthors: 0
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // 获取用户状态
  useEffect(() => {
    fetch('/api/user/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.loggedIn && data.user) {
          setUser(data.user);
        }
      })
      .catch(console.error);
  }, []);

  // 导航滚动检测
  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // 关闭抽屉时禁止 body 滚动
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // ===== 粒子系统 =====
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const canvas: HTMLCanvasElement = cvs;
    const ctx = canvas.getContext('2d')!;

    let animId: number;
    let particles: any[] = [];
    let mouseX = 0, mouseY = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const density = Math.min(Math.floor(canvas.width * canvas.height / 18000), 80);

    class Particle {
      x: number = 0; y: number = 0; size: number = 1; speedX: number = 0; speedY: number = 0;
      opacity: number = 0.5; isAmber: boolean = false; life: number = 0; maxLife: number = 200; wobble: number = 0; wobbleSpeed: number = 0.01;
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = 1 + Math.random() * 2;
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.speedY = (Math.random() - 0.5) * 0.3;
        this.opacity = 0.15 + Math.random() * 0.4;
        this.isAmber = Math.random() > 0.65;
        this.life = 0;
        this.maxLife = 200 + Math.random() * 300;
        this.wobble = Math.random() * Math.PI * 2;
        this.wobbleSpeed = 0.005 + Math.random() * 0.01;
      }
      update() {
        this.wobble += this.wobbleSpeed;
        this.x += this.speedX + Math.sin(this.wobble) * 0.15;
        this.y += this.speedY + Math.cos(this.wobble) * 0.1;
        this.life++;
        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height || this.life > this.maxLife) {
          this.reset();
        }
        const dx = this.x - mouseX;
        const dy = this.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          const force = (120 - dist) / 120 * 0.5;
          this.x += (dx / dist) * force;
          this.y += (dy / dist) * force;
        }
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        if (this.isAmber) {
          ctx.fillStyle = `rgba(245, 158, 11, ${this.opacity})`;
          ctx.shadowColor = 'rgba(245, 158, 11, 0.3)';
          ctx.shadowBlur = 6;
        } else {
          ctx.fillStyle = `rgba(200, 200, 220, ${this.opacity * 0.6})`;
          ctx.shadowBlur = 0;
        }
        ctx.fill();
      }
    }

    for (let i = 0; i < density; i++) {
      particles.push(new Particle());
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => { p.update(); p.draw(); });
      animId = requestAnimationFrame(animate);
    };
    animate();

    const onMouse = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    window.addEventListener('mousemove', onMouse, { passive: true });

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouse);
    };
  }, []);

  // ===== 滚动显示动画 =====
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    return () => observerRef.current?.disconnect();
  }, []);

  useEffect(() => {
    if (!loading) {
      setTimeout(() => {
        document.querySelectorAll('.reveal, .stagger').forEach(el => {
          observerRef.current?.observe(el);
        });
      }, 100);
    }
  }, [loading]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      setUser(null);
      setMenuOpen(false);
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoggingOut(false);
    }
  };

  const formatWords = (w: number) => {
    if (w >= 10000) return (w / 10000).toFixed(1);
    return w.toString();
  };

  const tagEmojis: Record<string, string> = {
    '玄幻': '⚡', '都市': '🏙', '仙侠': '🏯', '言情': '💕',
    '科幻': '🚀', '悬疑': '🔮', '历史': '📜', '恐怖': '👻',
    '军事': '⚔️', '奇幻': '🔮', '武侠': '⚡'
  };

  return (
    <>
      <style>{`
        /* ===== 粒子与设计基础 ===== */
        #ambient-canvas {
          position: fixed;
          top: 0; left: 0;
          width: 100%; height: 100%;
          z-index: 0;
          pointer-events: none;
        }
        .home-wrap {
          position: relative;
          z-index: 1;
          min-height: 100vh;
        }

        /* ===== 导航 ===== */
        .nav-header {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 100;
          padding: 16px 0;
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .nav-header.scrolled {
          background: rgba(26, 20, 16, 0.88);
          backdrop-filter: blur(20px) saturate(1.4);
          -webkit-backdrop-filter: blur(20px) saturate(1.4);
          border-bottom: 1px solid var(--border);
          padding: 10px 0;
        }
        .dark .nav-header.scrolled {
          background: rgba(7, 7, 13, 0.88);
        }
        .nav-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .logo-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }
        .logo-text {
          font-family: 'Orbitron', monospace;
          font-weight: 700;
          font-size: 1.1rem;
          letter-spacing: 0.08em;
          background: linear-gradient(135deg, var(--accent), #fbbf24);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .nav-links {
          display: flex;
          align-items: center;
          gap: 28px;
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .nav-links a {
          text-decoration: none;
          color: var(--text-secondary);
          font-size: 0.85rem;
          transition: color 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
        }
        .nav-links a::after {
          content: '';
          position: absolute;
          bottom: -4px; left: 0;
          width: 0; height: 1.5px;
          background: var(--accent);
          transition: width 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .nav-links a:hover { color: var(--text-primary); }
        .nav-links a:hover::after { width: 100%; }
        .nav-user-btn {
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 0.85rem;
          cursor: pointer;
          padding: 6px 12px;
          border-radius: 8px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .nav-user-btn:hover {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }
        .nav-mobile-wrap { display: none; }

        /* ===== 移动端抽屉 ===== */
        .drawer-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          z-index: 200;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.35s ease;
        }
        .drawer-overlay.open {
          opacity: 1;
          pointer-events: auto;
        }
        .mobile-drawer {
          position: fixed;
          top: 0; right: 0;
          width: min(320px, 80vw);
          height: 100%;
          background: var(--bg-card);
          border-left: 1px solid var(--border);
          z-index: 201;
          transform: translateX(100%);
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          padding: 24px;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }
        .mobile-drawer.open { transform: translateX(0); }
        .drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border);
        }
        .drawer-close {
          background: none;
          border: none;
          color: var(--text-primary);
          font-size: 1.5rem;
          cursor: pointer;
          padding: 4px 8px;
        }
        .drawer-close:hover { color: var(--accent); }
        .drawer-links {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 0; margin: 0;
        }
        .drawer-links a, .drawer-links button {
          display: block;
          padding: 14px 12px;
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 1rem;
          border-radius: 8px;
          transition: all 0.2s ease;
          background: none;
          border: none;
          text-align: left;
          cursor: pointer;
          width: 100%;
        }
        .drawer-links a:hover, .drawer-links a:active,
        .drawer-links button:hover, .drawer-links button:active {
          background: var(--accent-glow);
          color: var(--accent);
        }
        .drawer-cta {
          margin-top: 8px;
          background: linear-gradient(135deg, var(--accent), var(--accent-light)) !important;
          color: #fff !important;
          font-weight: 600;
          text-align: center;
        }

        /* ===== HERO ===== */
        .hero {
          position: relative;
          z-index: 1;
          min-height: 100vh;
          display: flex;
          align-items: center;
          padding-top: 80px;
          overflow: hidden;
        }
        .hero::before {
          content: '';
          position: absolute;
          top: -30%;
          left: -20%;
          width: 140%;
          height: 140%;
          background: radial-gradient(ellipse 60% 50% at 30% 40%, rgba(245,158,11,0.06), transparent 70%),
                      radial-gradient(ellipse 40% 40% at 70% 60%, rgba(125,211,252,0.04), transparent 60%);
          pointer-events: none;
        }
        .hero-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
          width: 100%;
        }
        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px 6px 8px;
          border-radius: 100px;
          background: var(--accent-glow);
          border: 1px solid rgba(245, 158, 11, 0.12);
          font-size: 0.75rem;
          color: var(--accent);
          margin-bottom: 24px;
        }
        .hero-badge .dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--accent);
          animation: pulse-dot 2s ease-in-out infinite;
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
        .hero h1 {
          font-family: 'ZCOOL QingKe HuangYou', serif;
          font-size: clamp(2.5rem, 6vw, 4rem);
          line-height: 1.15;
          margin-bottom: 20px;
          letter-spacing: 0.02em;
          color: var(--text-primary);
        }
        .hero h1 .highlight {
          position: relative;
          color: var(--accent);
        }
        .hero h1 .highlight::after {
          content: '';
          position: absolute;
          bottom: 2px; left: 0; right: 0;
          height: 8px;
          background: var(--accent-glow);
          border-radius: 4px;
          z-index: -1;
        }
        .hero p {
          font-size: 1.05rem;
          line-height: 1.8;
          color: var(--text-secondary);
          margin-bottom: 36px;
          max-width: 480px;
        }
        .hero-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .hero-actions .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 32px;
          border-radius: 100px;
          font-size: 0.9rem;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          border: none;
          background: linear-gradient(135deg, var(--accent), var(--accent-dark));
          color: #fff;
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .hero-actions .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(245, 158, 11, 0.3);
        }
        .hero-actions .btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 32px;
          border-radius: 100px;
          font-size: 0.9rem;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
          background: transparent;
          color: var(--text-primary);
          border: 1px solid var(--border);
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .hero-actions .btn-ghost:hover {
          border-color: var(--accent);
          background: var(--accent-glow);
          transform: translateY(-2px);
        }

        /* Hero visual */
        .hero-visual { position: relative; display: flex; justify-content: center; align-items: center; }
        .hero-orbs { position: relative; width: 420px; height: 420px; }
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.5;
          animation: orb-float 8s ease-in-out infinite;
        }
        .orb-1 { width: 200px; height: 200px; background: rgba(245, 158, 11, 0.2); top: 10%; left: 15%; animation-delay: 0s; }
        .orb-2 { width: 160px; height: 160px; background: rgba(125, 211, 252, 0.12); bottom: 15%; right: 10%; animation-delay: -3s; }
        .orb-3 { width: 120px; height: 120px; background: rgba(245, 158, 11, 0.1); top: 50%; left: 50%; transform: translate(-50%, -50%); animation-delay: -6s; }
        @keyframes orb-float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(15px, -20px) scale(1.05); }
          50% { transform: translate(-10px, 10px) scale(0.95); }
          75% { transform: translate(20px, 15px) scale(1.02); }
        }
        .hero-ring {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 340px; height: 340px;
          border: 1px solid rgba(245, 158, 11, 0.08);
          border-radius: 50%;
          animation: ring-spin 30s linear infinite;
        }
        .hero-ring-2 {
          width: 260px; height: 260px;
          border-color: rgba(125, 211, 252, 0.06);
          animation-direction: reverse;
          animation-duration: 20s;
        }
        @keyframes ring-spin {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        .hero-float-items {
          position: absolute;
          width: 100%; height: 100%;
          top: 0; left: 0;
        }
        .float-item {
          position: absolute;
          padding: 10px 16px;
          background: var(--bg-card);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--border);
          border-radius: 12px;
          font-size: 0.75rem;
          color: var(--text-secondary);
          animation: float-up 6s ease-in-out infinite;
          white-space: nowrap;
        }
        .float-item strong { color: var(--accent); }
        .float-item:nth-child(1) { top: 5%; right: 5%; animation-delay: 0s; }
        .float-item:nth-child(2) { bottom: 15%; left: 0; animation-delay: -2s; }
        .float-item:nth-child(3) { top: 40%; right: -10%; animation-delay: -4s; }
        @keyframes float-up {
          0%, 100% { transform: translateY(0); opacity: 0.7; }
          50% { transform: translateY(-10px); opacity: 1; }
        }

        /* ===== 通用区块 ===== */
        .home-section { position: relative; z-index: 1; padding: 100px 0; }
        .section-container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
        .section-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: 'Orbitron', monospace;
          font-size: 0.7rem;
          font-weight: 500;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--accent);
          margin-bottom: 16px;
          opacity: 0.7;
        }
        .section-label::before {
          content: '';
          width: 24px; height: 1px;
          background: var(--accent);
          opacity: 0.5;
        }
        .section-title {
          font-family: 'ZCOOL QingKe HuangYou', serif;
          font-size: clamp(2rem, 5vw, 3.2rem);
          line-height: 1.2;
          color: var(--text-primary);
          margin-bottom: 16px;
          letter-spacing: 0.02em;
        }
        .section-subtitle {
          font-size: 1rem;
          line-height: 1.7;
          color: var(--text-secondary);
          max-width: 560px;
        }
        .text-gradient {
          background: linear-gradient(135deg, var(--accent), #fbbf24, var(--accent-dark));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* ===== Features ===== */
        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-top: 48px;
        }
        .feature-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 40px 32px;
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: hidden;
        }
        .feature-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--accent), transparent);
          opacity: 0;
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .feature-card:hover {
          border-color: rgba(245, 158, 11, 0.12);
          transform: translateY(-4px);
        }
        .feature-card:hover::before { opacity: 1; }
        .feature-icon {
          width: 48px; height: 48px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          font-size: 1.3rem;
        }
        .feature-icon.amber { background: var(--accent-glow); }
        .feature-icon.frost { background: rgba(125, 211, 252, 0.1); }
        .feature-card h3 { font-size: 1.1rem; font-weight: 600; margin-bottom: 10px; color: var(--text-primary); }
        .feature-card p { font-size: 0.85rem; line-height: 1.7; color: var(--text-secondary); }

        /* ===== Stats ===== */
        .showcase-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 48px;
          gap: 40px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1px;
          background: var(--border);
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid var(--border);
        }
        .stat-item {
          background: var(--bg-card);
          padding: 36px 24px;
          text-align: center;
          transition: all 0.2s ease;
        }
        .stat-item:hover { background: var(--bg-secondary); }
        .stat-number {
          font-family: 'Orbitron', monospace;
          font-size: clamp(1.8rem, 3vw, 2.5rem);
          font-weight: 700;
          background: linear-gradient(135deg, var(--accent), #fbbf24);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 6px;
        }
        .stat-label {
          font-size: 0.8rem;
          color: var(--text-muted);
          letter-spacing: 0.05em;
        }

        /* ===== Novel Grid ===== */
        .novel-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-top: 48px;
        }
        .novel-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
          position: relative;
        }
        .novel-card:hover {
          transform: translateY(-6px);
          border-color: rgba(245, 158, 11, 0.12);
          box-shadow: 0 12px 40px rgba(0,0,0,0.4);
        }
        .novel-cover-wrap {
          aspect-ratio: 3/4;
          position: relative;
          overflow: hidden;
        }
        .novel-cover-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.8), transparent 50%);
          opacity: 0;
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          align-items: flex-end;
          padding: 16px;
        }
        .novel-card:hover .novel-cover-overlay { opacity: 1; }
        .novel-cover-overlay span {
          font-size: 0.75rem;
          color: var(--accent);
          font-family: 'Orbitron', monospace;
          letter-spacing: 0.08em;
        }
        .novel-info { padding: 16px; }
        .novel-info h4 {
          font-size: 0.9rem;
          font-weight: 600;
          margin-bottom: 4px;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .novel-info .meta {
          font-size: 0.75rem;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .novel-tag {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 100px;
          font-size: 0.65rem;
          background: var(--accent-glow);
          color: var(--accent);
        }

        /* ===== Divider ===== */
        .section-divider {
          position: relative; z-index: 1;
          text-align: center;
          padding: 60px 0;
        }
        .divider-line {
          width: 1px; height: 80px;
          background: linear-gradient(to bottom, transparent, var(--accent), transparent);
          margin: 0 auto;
          opacity: 0.3;
        }

        /* ===== CTA Banner ===== */
        .cta-inner {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 28px;
          padding: 80px 48px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .cta-inner::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 60% 40% at 50% 50%, rgba(245,158,11,0.06), transparent);
          pointer-events: none;
        }
        .cta-inner h2 {
          font-family: 'ZCOOL QingKe HuangYou', serif;
          font-size: clamp(1.8rem, 4vw, 2.6rem);
          margin-bottom: 12px;
          position: relative;
          color: var(--text-primary);
        }
        .cta-inner p {
          color: var(--text-secondary);
          margin-bottom: 32px;
          position: relative;
        }
        .cta-inner .btn-group {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
          position: relative;
        }

        /* ===== Footer ===== */
        .home-footer {
          position: relative; z-index: 1;
          border-top: 1px solid var(--border);
          padding: 48px 0 32px;
          margin-top: 100px;
        }
        .footer-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 24px;
        }
        .footer-copyright { font-size: 0.8rem; color: var(--text-muted); }
        .footer-links { display: flex; gap: 24px; flex-wrap: wrap; }
        .footer-links a { color: var(--text-muted); text-decoration: none; font-size: 0.8rem; transition: color 0.2s ease; }
        .footer-links a:hover { color: var(--text-secondary); }

        /* ===== Animations ===== */
        .reveal {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.8s ease, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal.visible {
          opacity: 1;
          transform: translateY(0);
        }
        .stagger > * {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.6s ease, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .stagger.visible > * {
          opacity: 1;
          transform: translateY(0);
        }
        .stagger.visible > *:nth-child(1) { transition-delay: 0s; }
        .stagger.visible > *:nth-child(2) { transition-delay: 0.1s; }
        .stagger.visible > *:nth-child(3) { transition-delay: 0.2s; }
        .stagger.visible > *:nth-child(4) { transition-delay: 0.3s; }
        .stagger.visible > *:nth-child(5) { transition-delay: 0.4s; }
        .stagger.visible > *:nth-child(6) { transition-delay: 0.5s; }
        .stagger.visible > *:nth-child(7) { transition-delay: 0.6s; }
        .stagger.visible > *:nth-child(8) { transition-delay: 0.7s; }

        /* ===== Responsive ===== */
        @media (max-width: 1024px) {
          .hero-grid { grid-template-columns: 1fr; text-align: center; gap: 32px; }
          .hero p { margin: 0 auto 36px; }
          .hero-actions { justify-content: center; }
          .hero-visual { display: none; }
          .features-grid { grid-template-columns: repeat(2, 1fr); gap: 20px; }
          .novel-grid { grid-template-columns: repeat(3, 1fr); gap: 16px; }
          .showcase-header { flex-direction: column; align-items: flex-start; }
        }
        @media (max-width: 768px) {
          .nav-header { padding: 12px 0; }
          .nav-header.scrolled { padding: 8px 0; }
          .nav-links { display: none; }
          .nav-mobile-wrap { display: flex; align-items: center; gap: 8px; }
          .nav-mobile-btn {
            background: none; border: none; color: var(--text-primary);
            cursor: pointer; padding: 8px; border-radius: 8px;
          }
          .nav-mobile-btn:active { background: var(--accent-glow); }
          .nav-inner { padding: 0 20px; }
          .logo-text { font-size: 1rem; }

          .hero { min-height: calc(100vh - 60px); padding-top: 72px; }
          .hero-badge { font-size: 0.65rem; padding: 4px 12px 4px 6px; margin-bottom: 16px; }
          .hero h1 { font-size: clamp(1.8rem, 7vw, 2.4rem); letter-spacing: 0; }
          .hero h1 .highlight::after { height: 5px; bottom: 1px; }
          .hero p { font-size: 0.9rem; line-height: 1.7; margin-bottom: 28px; }
          .hero-actions .btn-primary, .hero-actions .btn-ghost { padding: 12px 24px; font-size: 0.85rem; }
          .hero-actions { gap: 10px; }
          .hero-actions .btn-primary, .hero-actions .btn-ghost { flex: 1; justify-content: center; max-width: 200px; }

          .home-section { padding: 64px 0; }
          .features-grid { grid-template-columns: 1fr; gap: 16px; margin-top: 32px; }
          .feature-card { padding: 28px 24px; border-radius: 12px; }
          .feature-card h3 { font-size: 1rem; }
          .feature-card p { font-size: 0.82rem; }
          .feature-icon { width: 40px; height: 40px; font-size: 1.1rem; margin-bottom: 16px; }

          .stats-grid { grid-template-columns: repeat(2, 1fr); border-radius: 12px; }
          .stat-item { padding: 24px 16px; }
          .stat-number { font-size: clamp(1.5rem, 5vw, 2rem); }
          .stat-label { font-size: 0.72rem; }

          .novel-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 32px; }
          .novel-info { padding: 12px; }
          .novel-info h4 { font-size: 0.82rem; }
          .novel-info .meta { font-size: 0.7rem; gap: 4px; }

          .section-title { margin-bottom: 10px; }
          .section-subtitle { font-size: 0.9rem; }
          .showcase-header { margin-bottom: 32px; gap: 8px; }

          .cta-inner { padding: 48px 24px; border-radius: 20px; }
          .cta-inner h2 { font-size: clamp(1.4rem, 5vw, 1.8rem); }
          .cta-inner p { font-size: 0.9rem; margin-bottom: 24px; }

          .home-footer { margin-top: 60px; padding: 36px 0 24px; }
          .footer-inner { flex-direction: column; text-align: center; gap: 16px; }
          .footer-links { gap: 16px; justify-content: center; }

          .section-divider { padding: 40px 0; }
          .divider-line { height: 56px; }
        }
        @media (max-width: 480px) {
          .nav-inner { padding: 0 16px; }
          .nav-header { padding: 10px 0; }
          .nav-header.scrolled { padding: 6px 0; }
          .nav-mobile-btn { padding: 6px; }
          .nav-mobile-btn svg { width: 22px; height: 22px; }

          .hero { padding-top: 64px; min-height: auto; padding-bottom: 40px; }
          .hero-badge { font-size: 0.6rem; }
          .hero h1 { font-size: clamp(1.5rem, 8vw, 2rem); }
          .hero p { font-size: 0.82rem; margin-bottom: 24px; }
          .hero-actions .btn-primary, .hero-actions .btn-ghost { padding: 10px 20px; font-size: 0.8rem; max-width: 160px; }
          .hero-actions { gap: 8px; }
          .hero-actions .btn-primary svg { display: none; }

          .home-section { padding: 48px 0; }
          .features-grid { gap: 12px; margin-top: 24px; }
          .feature-card { padding: 24px 20px; }
          .feature-icon { width: 36px; height: 36px; font-size: 1rem; margin-bottom: 12px; }
          .feature-card h3 { font-size: 0.9rem; }
          .feature-card p { font-size: 0.78rem; }

          .stats-grid { border-radius: 8px; }
          .stat-item { padding: 20px 12px; }
          .stat-number { font-size: 1.4rem; }

          .novel-grid { gap: 10px; margin-top: 24px; }
          .novel-info { padding: 10px; }
          .novel-info h4 { font-size: 0.78rem; }
          .novel-info .meta { font-size: 0.65rem; }
          .novel-tag { font-size: 0.58rem; padding: 1px 6px; }
          .novel-cover-overlay { display: none; }

          .section-title { font-size: clamp(1.3rem, 6vw, 1.6rem); }
          .section-subtitle { font-size: 0.82rem; }

          .cta-inner { padding: 36px 20px; }
          .cta-inner h2 { font-size: clamp(1.2rem, 6vw, 1.5rem); }
          .cta-inner p { font-size: 0.82rem; margin-bottom: 20px; }

          .home-footer { margin-top: 40px; padding: 28px 0 20px; }
          .footer-copyright { font-size: 0.72rem; }
          .footer-links a { font-size: 0.72rem; }

          .section-divider { padding: 28px 0; }
          .divider-line { height: 40px; }
        }

        @supports (padding-top: env(safe-area-inset-top)) {
          .nav-inner { padding-left: calc(24px + env(safe-area-inset-left)); padding-right: calc(24px + env(safe-area-inset-right)); }
          .mobile-drawer { padding-top: env(safe-area-inset-top); }
          @media (max-width: 768px) { .nav-inner { padding-left: calc(20px + env(safe-area-inset-left)); padding-right: calc(20px + env(safe-area-inset-right)); } }
          @media (max-width: 480px) { .nav-inner { padding-left: calc(16px + env(safe-area-inset-left)); padding-right: calc(16px + env(safe-area-inset-right)); } }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
          .reveal { opacity: 1 !important; transform: none !important; }
          .stagger > * { opacity: 1 !important; transform: none !important; }
        }
      `}</style>

      {/* ===== 粒子背景 ===== */}
      <canvas id="ambient-canvas" ref={canvasRef} />

      <div className="home-wrap">
        {/* ===== 导航 ===== */}
        <header className={`nav-header${navScrolled ? ' scrolled' : ''}`}>
          <div className="nav-inner">
            <Link href="/" className="logo-wrap" aria-label="FireSeed 首页">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
                <circle cx="18" cy="18" r="17" stroke="url(#logo-grad)" strokeWidth="1.5" opacity="0.3"/>
                <path d="M18 8C18 8 22 16 18 22C14 16 18 8 18 8Z" fill="url(#logo-grad)"/>
                <circle cx="18" cy="22" r="3" fill="url(#logo-grad)"/>
                <defs>
                  <linearGradient id="logo-grad" x1="0" y1="0" x2="36" y2="36">
                    <stop offset="0%" stopColor="#f59e0b"/>
                    <stop offset="100%" stopColor="#d97706"/>
                  </linearGradient>
                </defs>
              </svg>
              <span className="logo-text">FireSeed</span>
            </Link>

            <ul className="nav-links">
              <li><Link href="/chat">社区</Link></li>
              <li><Link href="/novels">全部作品</Link></li>
              <li><Link href="/resources">可信资源</Link></li>
              <li><Link href="/opportunities">商机动态</Link></li>
              <li><Link href="/download">下载</Link></li>
              {user ? (
                <li style={{ position: 'relative' }}>
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="nav-user-btn"
                    style={{ background: menuOpen ? 'var(--bg-secondary)' : 'transparent' }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
                      style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-light))', color: 'white' }}
                    >
                      {(user.nickname || user.username).charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium hide-mobile">{user.nickname || user.username}</span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
                      className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`}>
                      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                      <div
                        className="absolute right-0 top-full mt-2 w-48 rounded-xl overflow-hidden z-20"
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border)',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                        }}
                      >
                        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{user.nickname || user.username}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>@{user.username} · {user.role === 'admin' ? '管理员' : '普通用户'}</p>
                        </div>
                        <div className="py-1">
                          <Link href="/my/settings" className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors" style={{ color: 'var(--text-secondary)' }} onClick={() => setMenuOpen(false)}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <circle cx="8" cy="8" r="2"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M2.93 2.93l1.41 1.41M11.66 11.66l1.41 1.41M2.93 13.07l1.41-1.41M11.66 4.34l1.41-1.41"/>
                            </svg>
                            个人设置
                          </Link>
                          {user.role === 'admin' && (
                            <Link href="/admin" className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors" style={{ color: 'var(--accent)' }} onClick={() => setMenuOpen(false)}>
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <rect x="2" y="3" width="12" height="10" rx="2"/><path d="M5 7h6M5 10h4"/>
                              </svg>
                              管理后台
                            </Link>
                          )}
                        </div>
                        <div style={{ borderTop: '1px solid var(--border-light)' }}>
                          <button onClick={handleLogout} disabled={loggingOut}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm w-full text-left transition-colors" style={{ color: '#ef4444' }}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M6 14H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3M11 11l3-3-3-3M14 8H6"/>
                            </svg>
                            {loggingOut ? '退出中...' : '退出登录'}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </li>
              ) : (
                <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Link href="/auth/login" className="btn-ghost" style={{ fontSize: '0.85rem', padding: '8px 16px' }}>登录</Link>
                  <Link href="/auth/register" className="btn-primary" style={{ fontSize: '0.85rem', padding: '8px 20px', borderRadius: 100, textDecoration: 'none' }}>注册</Link>
                </li>
              )}
            </ul>

            <div className="nav-mobile-wrap">
              {!user && (
                <Link href="/auth/register" className="btn-primary" style={{ padding: '8px 20px', fontSize: '0.8rem', borderRadius: 100, whiteSpace: 'nowrap', textDecoration: 'none' }}>
                  开始创作
                </Link>
              )}
              <button className="nav-mobile-btn" onClick={() => setDrawerOpen(true)} aria-label="菜单">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="4" y1="7" x2="20" y2="7"/>
                  <line x1="4" y1="12" x2="20" y2="12"/>
                  <line x1="4" y1="17" x2="20" y2="17"/>
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* ===== 移动端抽屉 ===== */}
        <div className={`drawer-overlay${drawerOpen ? ' open' : ''}`} onClick={closeDrawer} />
        <div className={`mobile-drawer${drawerOpen ? ' open' : ''}`}>
          <div className="drawer-header">
            <span className="logo-text" style={{ fontSize: '1rem' }}>FireSeed</span>
            <button className="drawer-close" onClick={closeDrawer}>&times;</button>
          </div>
          <ul className="drawer-links">
            <li><Link href="/chat" onClick={closeDrawer}>社区</Link></li>
            <li><Link href="/novels" onClick={closeDrawer}>全部作品</Link></li>
            <li><Link href="/resources" onClick={closeDrawer}>可信资源</Link></li>
            <li><Link href="/opportunities" onClick={closeDrawer}>商机动态</Link></li>
            <li><Link href="/download" onClick={closeDrawer}>下载</Link></li>
            {user ? (
              <>
                <li style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8 }}>
                  <div style={{ padding: '8px 12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {(user.nickname || user.username)} · @{user.username}
                  </div>
                </li>
                <li><Link href="/my/settings" onClick={closeDrawer}>个人设置</Link></li>
                {user.role === 'admin' && <li><Link href="/admin" onClick={closeDrawer} style={{ color: 'var(--accent)' }}>管理后台</Link></li>}
                <li><button onClick={() => { handleLogout(); closeDrawer(); }} style={{ color: '#ef4444' }}>退出登录</button></li>
              </>
            ) : (
              <li><Link href="/auth/register" onClick={closeDrawer} className="drawer-cta">免费注册</Link></li>
            )}
          </ul>
        </div>

        {/* ===== HERO ===== */}
        <section className="hero" id="main-content">
          <div className="section-container" style={{ width: '100%' }}>
            <div className="hero-grid">
              <div>
                <div className="hero-badge">
                  <span className="dot"></span>
                  AI 驱动 · 互动叙事 · 未来已来
                </div>
                <h1>
                  一粒<span className="highlight">火种</span><br />
                  便能改写故事的<span className="highlight">未来</span>
                </h1>
                <p>
                  在这里，AI 与人类的创作边界被重新定义。
                  {stats.totalNovels > 0 && ` ${stats.totalNovels} 部作品、${stats.totalChapters} 章内容，`}
                  每一次选择都生成独一无二的故事分支——你既是读者，也是故事的共同缔造者。
                </p>
                <div className="hero-actions">
                  <Link href="/auth/register" className="btn-primary">
                    开始创作
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </Link>
                  <Link href="/novels" className="btn-ghost">浏览作品</Link>
                </div>
              </div>
              <div className="hero-visual">
                <div className="hero-orbs">
                  <div className="orb orb-1"></div>
                  <div className="orb orb-2"></div>
                  <div className="orb orb-3"></div>
                  <div className="hero-ring"></div>
                  <div className="hero-ring hero-ring-2"></div>
                  <div className="hero-float-items">
                    <div className="float-item"><strong>{formatWords(stats.totalWords)}</strong> 万字 · AI 生成</div>
                    <div className="float-item"><strong>{stats.totalChapters}</strong> 章 · 分支叙事</div>
                    <div className="float-item"><strong>{stats.totalAuthors || stats.totalNovels}</strong> 位创作者</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== FEATURES ===== */}
        <section className="home-section" id="features">
          <div className="section-container">
            <div className="reveal">
              <div className="section-label">Capabilities</div>
              <div className="showcase-header">
                <div>
                  <h2 className="section-title">AI 创作 × 人类阅读<br />重新定义叙事</h2>
                  <p className="section-subtitle">不止是自动写作，更是一个让 AI 与人类共同探索故事可能性的创作生态</p>
                </div>
              </div>
            </div>
            <div className="features-grid stagger" id="features-grid">
              <div className="feature-card">
                <div className="feature-icon amber">✧</div>
                <h3>AI 自动写作</h3>
                <p>基于大语言模型的智能创作引擎，支持风格可控的章节生成、分支剧情构建，让灵感从概念到成稿一气呵成。</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon frost">◈</div>
                <h3>互动叙事引擎</h3>
                <p>每个关键节点提供多分支选择，AI 实时生成后续剧情。同一部作品，千人千面，每一次阅读都是独一无二的冒险。</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon amber">✦</div>
                <h3>人类共创社区</h3>
                <p>不只是读者。你可以 fork 作品、贡献分支、投票决定剧情走向。平台连接每一位创作者，让故事在协作中生长。</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon frost">◇</div>
                <h3>多模态故事体验</h3>
                <p>文字、配图、背景音乐三位一体。AI 自动为章节生成插画与氛围音效，让阅读升级为沉浸式感官体验。</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon amber">☆</div>
                <h3>SEED 创作者经济</h3>
                <p>点赞、创作、互动均可获得 SEED 积分。积分可用于解锁高级功能、打赏作者、参与社区治理，让创作有价值回报。</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon frost">▽</div>
                <h3>开放生态</h3>
                <p>API 开放、数据可导出、支持自定义 AI 模型接入。不做封闭花园，做 AI 叙事领域的开源基础设施。</p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== DIVIDER ===== */}
        <div className="section-divider">
          <div className="divider-line"></div>
        </div>

        {/* ===== STATS ===== */}
        <section className="home-section" id="showcase">
          <div className="section-container">
            <div className="reveal">
              <div className="section-label">Platform</div>
              <div className="showcase-header">
                <div>
                  <h2 className="section-title">从火种到燎原</h2>
                  <p className="section-subtitle">我们相信，一粒火种可以点燃整片草原。<br />以下数据见证了社区的成长</p>
                </div>
                <div className="section-subtitle" style={{ textAlign: 'right' }}>
                  <span className="text-gradient" style={{ fontFamily: "'Orbitron',monospace", fontSize: '0.85rem', letterSpacing: '0.05em' }}>LIVE · 实时更新</span>
                </div>
              </div>
            </div>
            <div className="stats-grid stagger" id="stats-grid">
              <div className="stat-item"><div className="stat-number">{stats.totalNovels}</div><div className="stat-label">部 AI 作品</div></div>
              <div className="stat-item"><div className="stat-number">{stats.totalChapters}</div><div className="stat-label">章节内容</div></div>
              <div className="stat-item"><div className="stat-number">{formatWords(stats.totalWords)}</div><div className="stat-label">{stats.totalWords >= 10000 ? '万字 · 累计' : '字 · 累计'}</div></div>
              <div className="stat-item"><div className="stat-number">{stats.totalAuthors || '-'}</div><div className="stat-label">注册作者</div></div>
            </div>
          </div>
        </section>

        {/* ===== DIVIDER ===== */}
        <div className="section-divider">
          <div className="divider-line"></div>
        </div>

        {/* ===== NOVELS ===== */}
        <section className="home-section" id="novels">
          <div className="section-container">
            <div className="reveal">
              <div className="section-label">Featured</div>
              <div className="showcase-header">
                <div>
                  <h2 className="section-title">精选作品</h2>
                  <p className="section-subtitle">每一部都是 AI 与人类共创的独特叙事实验</p>
                </div>
                <Link href="/novels" style={{ fontFamily: "'Orbitron',monospace", fontSize: '0.8rem', color: 'var(--accent)', textDecoration: 'none', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                  查看全部 →
                </Link>
              </div>
            </div>

            {!loading && novels.length > 0 && (
              <div className="novel-grid stagger" id="novel-grid">
                {novels.map((novel, i) => {
                  const primaryTag = novel.tags?.split(',')[0]?.trim() || '故事';
                  const emoji = tagEmojis[primaryTag] || '✨';
                  const totalChs = 30;
                  const currentChs = novel.chapterCount || 0;
                  const progress = Math.min((currentChs / totalChs) * 100, 100);

                  return (
                    <Link key={novel.id} href={`/novels/${novel.id}`} className="novel-card" style={{ textDecoration: 'none' }}>
                      <div className="novel-cover-wrap">
                        <SafeCover src={novel.cover_url} alt={novel.title} tag={novel.tags} />
                        <div className="novel-cover-overlay"><span>READ →</span></div>
                      </div>
                      <div className="novel-info">
                        <h4>{novel.title}</h4>
                        <div className="meta">
                          <span>{emoji} {primaryTag}</span>
                          {novel.status === 'completed' && <span className="novel-tag">完结</span>}
                          {novel.status !== 'completed' && novel.status !== 'completed' && <span className="novel-tag">连载</span>}
                        </div>
                        {novel.status !== 'completed' && (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                              <span>AI 生成进度</span>
                              <span>{Math.round(progress)}%</span>
                            </div>
                            <div style={{ height: 3, borderRadius: 2, background: 'var(--border-light)', overflow: 'hidden' }}>
                              <div style={{ width: `${progress}%`, height: '100%', borderRadius: 2, background: 'linear-gradient(90deg, var(--accent), var(--accent-light))' }} />
                            </div>
                          </div>
                        )}
                        <div className="meta" style={{ marginTop: 6 }}>
                          <span>{novel.chapterCount || 0} 章</span>
                        </div>
                        {novel.tags && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                            {novel.tags.split(',').filter(Boolean).slice(0, 3).map((tag: string) => (
                              <span key={tag} className="novel-tag">{tag.trim()}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {loading && (
              <div className="novel-grid" style={{ marginTop: 48 }}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="novel-card" style={{ animation: 'pulse 2s ease-in-out infinite' }}>
                    <div className="novel-cover-wrap" style={{ background: 'var(--bg-secondary)' }} />
                    <div className="novel-info">
                      <div style={{ height: 14, background: 'var(--bg-secondary)', borderRadius: 4, marginBottom: 8, width: '70%' }} />
                      <div style={{ height: 10, background: 'var(--bg-secondary)', borderRadius: 4, width: '40%' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && novels.length === 0 && (
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <div style={{ fontSize: '4rem', marginBottom: 16, opacity: 0.3 }}>✦</div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: 8 }}>故事正在酝酿中</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>第一部作品即将上线，敬请期待。</p>
                <Link href="/admin" className="btn-primary" style={{ padding: '12px 28px', borderRadius: 100, textDecoration: 'none', display: 'inline-flex' }}>
                  进入创作后台
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* ===== 火种·百人AI作家共创计划 ===== */}
        <section className="home-section" style={{ paddingTop: 0 }}>
          <div className="section-container">
            <div className="reveal">
              <div className="cta-inner">
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px 6px 8px', borderRadius: 100, background: 'var(--accent-glow)', border: '1px solid rgba(245, 158, 11, 0.12)', fontSize: '0.75rem', color: 'var(--accent)', marginBottom: 24 }}>
                  <span className="dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }}></span>
                  正在招募
                </div>
                <h2 style={{ fontFamily: "'ZCOOL QingKe HuangYou', serif", fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', marginBottom: 12, color: 'var(--text-primary)' }}>
                  火种·百人AI作家共创计划
                </h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 32, maxWidth: 520, margin: '0 auto 32px' }}>
                  100位AI作家，一起用AI写小说，探索互动叙事的可能性
                </p>
                <div className="btn-group" style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <Link href="/plan" className="btn-primary" style={{ padding: '14px 32px', borderRadius: 100, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', fontWeight: 600 }}>
                    了解完整方案
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== 会员 CTA ===== */}
        <section className="home-section" style={{ paddingTop: 0 }}>
          <div className="section-container">
            <div className="reveal">
              <div
                style={{
                  background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-light) 100%)',
                  borderRadius: 28,
                  padding: '80px 48px',
                  textAlign: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 700, color: '#fff', marginBottom: 12 }}>
                    解锁全部剧情分支
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: 32, maxWidth: 480, margin: '0 auto 32px' }}>
                    升级会员，探索每一条隐藏支线，体验完整的故事宇宙
                  </p>
                  <Link href="/vip" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', borderRadius: 100, background: '#fff', color: 'var(--accent)', fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none' }}>
                    了解会员权益
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 7h10M8 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </Link>
                </div>
                <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
                <div style={{ position: 'absolute', bottom: -40, left: -40, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
              </div>
            </div>
          </div>
        </section>

        {/* ===== 双二维码并排 ===== */}
        <section className="home-section" style={{ paddingTop: 0 }}>
          <div className="section-container">
            <div className="reveal">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 48, maxWidth: 640, margin: '0 auto' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'inline-block', borderRadius: 16, padding: 12, background: '#fff', border: '1px solid var(--border)', marginBottom: 12 }}>
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=https://fireseed.online" alt="扫码访问 fireseed.online" width="160" height="160" style={{ display: 'block', imageRendering: 'pixelated' }} />
                  </div>
                  <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>扫码访问</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>浏览器或微信扫一扫，手机直接看</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'inline-block', borderRadius: 16, padding: 12, background: '#fff', border: '1px solid var(--border)', marginBottom: 12 }}>
                    <img src="/qq-group.jpg" alt="QQ群 火种源" width="160" height="160" style={{ display: 'block', imageRendering: 'pixelated' }} />
                  </div>
                  <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>QQ群：火种源</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>扫码加入 QQ 群，与 AI 作者交流</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>与 AI 作者一起创作</p>
                  <a href="https://qm.qq.com/q/LPUZ9jSqC6" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 8, fontSize: '0.75rem', color: 'var(--text-muted)', textDecoration: 'underline' }}>
                    点击直接加群 →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== 页脚 ===== */}
        <footer className="home-footer">
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
            <div style={{ maxWidth: 560, margin: '0 auto 32px', color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.8 }}>
              一粒火种微弱，众火方成燎原。<br />
              FireSeed 从诞生之初，就是为AI网文创作发布而生。未来的AI小说将有专属的宇宙空间。<br /><br />
              诚招有兴趣玩玩的核心伙伴，不以工作为目的，只以共建专属创作者的免费AI写作发布平台为初心，慢慢打磨、共同成长。<br /><br />
              期待同频的你，一起守着这份热爱，深耕网文创作，完善专属我们的创作工具。
            </div>
            <a href="mailto:1726325780@qq.com"
              style={{ display: 'inline-block', marginBottom: 32, padding: '10px 24px', borderRadius: 100, fontSize: '0.85rem', fontWeight: 500, background: 'linear-gradient(135deg, var(--accent), var(--accent-light))', color: '#fff', textDecoration: 'none' }}>
              联系我们 → 1726325780@qq.com
            </a>

            <div className="footer-inner" style={{ borderTop: '1px solid var(--border)', paddingTop: 24, marginTop: 0 }}>
              <div className="footer-copyright">
                <span style={{ fontFamily: "'Orbitron',monospace", fontWeight: 600, background: 'linear-gradient(135deg,var(--accent),#fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>FireSeed</span>
                <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>© 2026 · AI 互动叙事平台</span>
              </div>
              <div className="footer-links">
                <a href="/novels">全部作品</a>
                <a href="/plan">火种计划</a>
                <a href="/skills">🔥 技能排行榜</a>
                <a href="/seed/leaderboard">🏆 SEED 富豪榜</a>
                <a href="/feedback">反馈</a>
                <a href="/api/rss" target="_blank">📡 RSS</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
