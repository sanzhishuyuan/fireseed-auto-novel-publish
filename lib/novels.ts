import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface ChapterMeta {
  title: string;
  book: string;
  order: number;
  branch: string;
  choices?: Array<{
    text: string;
    branch: string;
  }>;
}

export interface Chapter {
  meta: ChapterMeta;
  content: string;
  filePath: string;
}

// 获取小说目录
export function getNovelsDir(): string {
  return path.join(process.cwd(), 'content', 'novels');
}

// 获取所有小说ID
export function getAllNovelIds(): string[] {
  const novelsDir = getNovelsDir();
  if (!fs.existsSync(novelsDir)) {
    return [];
  }
  return fs.readdirSync(novelsDir).filter(file => {
    const metaPath = path.join(novelsDir, file, 'meta.md');
    return fs.existsSync(metaPath);
  });
}

// 读取小说元信息
export function getNovelMeta(novelId: string): any {
  const metaPath = path.join(getNovelsDir(), novelId, 'meta.md');
  if (!fs.existsSync(metaPath)) {
    return null;
  }
  const content = fs.readFileSync(metaPath, 'utf-8');
  return matter(content).data;
}

// 获取小说的所有章节
export function getNovelChapters(novelId: string): Chapter[] {
  const chaptersDir = path.join(getNovelsDir(), novelId, 'chapters');
  if (!fs.existsSync(chaptersDir)) {
    return [];
  }
  
  const files = fs.readdirSync(chaptersDir)
    .filter(file => file.endsWith('.md'))
    .sort((a, b) => {
      const numA = parseInt(a.match(/^(\d+)/)?.[1] || '0');
      const numB = parseInt(b.match(/^(\d+)/)?.[1] || '0');
      return numA - numB;
    });
  
  return files.map(file => {
    const filePath = path.join(chaptersDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data, content: body } = matter(content);
    
    return {
      meta: data as ChapterMeta,
      content: body,
      filePath: file.replace('.md', '')
    };
  });
}

// 获取单个章节
export function getChapter(novelId: string, chapterId: string): Chapter | null {
  const chapterPath = path.join(getNovelsDir(), novelId, 'chapters', `${chapterId}.md`);
  if (!fs.existsSync(chapterPath)) {
    return null;
  }
  
  const content = fs.readFileSync(chapterPath, 'utf-8');
  const { data, content: body } = matter(content);
  
  return {
    meta: data as ChapterMeta,
    content: body,
    filePath: chapterId
  };
}

// 获取支线章节
export function getBranchChapter(novelId: string, branch: string): Chapter | null {
  const branchesDir = path.join(getNovelsDir(), novelId, 'branches');
  if (!fs.existsSync(branchesDir)) {
    return null;
  }
  
  const branchPath = path.join(branchesDir, `${branch}.md`);
  if (!fs.existsSync(branchPath)) {
    return null;
  }
  
  const content = fs.readFileSync(branchPath, 'utf-8');
  const { data, content: body } = matter(content);
  
  return {
    meta: data as ChapterMeta,
    content: body,
    filePath: branch
  };
}

// 保存章节到文件
export function saveChapter(novelId: string, chapterId: string, meta: ChapterMeta, content: string): void {
  const chaptersDir = path.join(getNovelsDir(), novelId, 'chapters');
  if (!fs.existsSync(chaptersDir)) {
    fs.mkdirSync(chaptersDir, { recursive: true });
  }
  
  const filePath = path.join(chaptersDir, `${chapterId}.md`);
  const fileContent = matter.stringify(content, meta);
  fs.writeFileSync(filePath, fileContent, 'utf-8');
}

// 保存支线章节
export function saveBranchChapter(novelId: string, branch: string, meta: ChapterMeta, content: string): void {
  const branchesDir = path.join(getNovelsDir(), novelId, 'branches');
  if (!fs.existsSync(branchesDir)) {
    fs.mkdirSync(branchesDir, { recursive: true });
  }
  
  const filePath = path.join(branchesDir, `${branch}.md`);
  const fileContent = matter.stringify(content, meta);
  fs.writeFileSync(filePath, fileContent, 'utf-8');
}
