import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getChapter, getBranchChapter, getNovelChapters, getNovelMeta } from '@/lib/novels';
import db from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import ReadingControls from './ReadingControls';
import BranchChoice from './BranchChoice';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string; chapterId: string }>;
}

export default async function ChapterPage({ params }: Props) {
  const { id, chapterId } = await params;
  const chapter = getChapter(id, chapterId);
  const novel = getNovelMeta(id);
  
  if (!chapter || !novel) {
    notFound();
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  let userId = null;
  
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      userId = payload.userId;
      // 保存阅读进度
      const existing = db.prepare('SELECT id FROM user_progress WHERE user_id = ? AND novel_id = ?')
        .get(userId, id);
      if (existing) {
        db.prepare('UPDATE user_progress SET chapter_id = ?, branch = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND novel_id = ?')
          .run(chapterId, chapter.meta.branch, userId, id);
      } else {
        db.prepare('INSERT INTO user_progress (id, user_id, novel_id, chapter_id, branch) VALUES (?, ?, ?, ?, ?)')
          .run(uuidv4(), userId, id, chapterId, chapter.meta.branch);
      }
    }
  }

  // 获取所有章节用于导航
  const allChapters = getNovelChapters(id);
  const mainChapters = allChapters.filter(c => c.meta.branch === 'main');
  const currentIndex = mainChapters.findIndex(c => c.filePath === chapterId);
  
  const prevChapter = currentIndex > 0 ? mainChapters[currentIndex - 1] : null;
  const nextChapter = currentIndex < mainChapters.length - 1 ? mainChapters[currentIndex + 1] : null;

  // 检查用户是否有分支选择记录
  let userBranch = null;
  if (userId) {
    const progress = db.prepare('SELECT branch FROM user_progress WHERE user_id = ? AND novel_id = ?')
      .get(userId, id) as { branch: string } | undefined;
    userBranch = progress?.branch;
  }

  return (
    <div className="min-h-screen bg-[#fdf6e3] dark:bg-[#1a1a2e] eye-care dark:dark-mode">
      {/* 顶部导航栏 */}
      <header className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/novels/${id}`} className="text-2xl">📚</Link>
            <div className="hidden sm:block">
              <h1 className="font-bold text-gray-800 dark:text-white text-sm">{novel.title}</h1>
              <p className="text-xs text-gray-500">{chapter.meta.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ReadingControls />
            <Link href={`/novels/${id}`} className="p-2 text-gray-600 dark:text-gray-300">
              📋
            </Link>
          </div>
        </div>
      </header>

      {/* 广告位 */}
      <div className="ad-container mx-4 my-2 text-xs md:hidden">
        📢 章节顶部广告
      </div>

      {/* 阅读内容 */}
      <article className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-8">
          {chapter.meta.title}
        </h1>
        
        <div 
          className="reading-content text-gray-700 dark:text-gray-300"
          dangerouslySetInnerHTML={{ __html: chapter.content.replace(/\n\n/g, '</p><p>').replace(/^/, '<p>').replace(/$/, '</p>') }}
        />

        {/* 分支选择区域 */}
        {chapter.meta.choices && chapter.meta.choices.length > 0 && (
          <BranchChoice 
            choices={chapter.meta.choices}
            novelId={id}
            currentBranch={chapter.meta.branch}
            userId={userId}
            userBranch={userBranch}
          />
        )}

        {/* 章节底部广告 */}
        <div className="ad-container my-8">
          📢 广告位：章节内广告
        </div>

        {/* 章节导航 */}
        <div className="flex justify-between items-center mt-8 pt-8 border-t dark:border-gray-700">
          {prevChapter ? (
            <Link href={`/novels/${id}/${prevChapter.filePath}`}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">
              ← {prevChapter.meta.title}
            </Link>
          ) : (
            <div />
          )}
          
          {nextChapter ? (
            <Link href={`/novels/${id}/${nextChapter.filePath}`}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              {nextChapter.meta.title} →
            </Link>
          ) : (
            <Link href={`/novels/${id}`}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              返回目录 ✓
            </Link>
          )}
        </div>
      </article>

      {/* 底部固定工具栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-t dark:border-gray-700 p-2 md:hidden">
        <div className="flex justify-around items-center">
          <Link href={prevChapter ? `/novels/${id}/${prevChapter.filePath}` : '#'}
            className={`p-3 ${!prevChapter ? 'opacity-30 pointer-events-none' : ''}`}>
            ◀
          </Link>
          <Link href={`/novels/${id}`} className="p-3">📑</Link>
          <button className="p-3">🕯️</button>
          <Link href={nextChapter ? `/novels/${id}/${nextChapter.filePath}` : '#'}
            className={`p-3 ${!nextChapter ? 'opacity-30 pointer-events-none' : ''}`}>
            ▶
          </Link>
        </div>
      </div>
    </div>
  );
}
