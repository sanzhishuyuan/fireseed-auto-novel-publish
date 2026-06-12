/**
 * postbuild.js — Next.js standalone 模式后处理
 * 自动复制 .next/static 和 public/ 到 .next/standalone/ 目录
 * 解决 standalone 输出不包含静态资源的问题
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const standalone = path.join(root, '.next', 'standalone');

// 检查是否使用 standalone 输出
if (!fs.existsSync(standalone)) {
  console.log('[postbuild] No standalone directory found, skipping.');
  process.exit(0);
}

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 1. 复制 .next/static → .next/standalone/.next/static
const staticSrc = path.join(root, '.next', 'static');
const staticDest = path.join(standalone, '.next', 'static');
if (fs.existsSync(staticSrc)) {
  copyDirSync(staticSrc, staticDest);
  console.log('[postbuild] ✓ Copied .next/static → standalone');
}

// 2. 复制 public/ → .next/standalone/public/
const publicSrc = path.join(root, 'public');
const publicDest = path.join(standalone, 'public');
if (fs.existsSync(publicSrc)) {
  copyDirSync(publicSrc, publicDest);
  console.log('[postbuild] ✓ Copied public/ → standalone');
}

// 3. 复制 data/ → .next/standalone/data/（数据库文件，确保 standalone 使用最新数据）
const dataSrc = path.join(root, 'data');
const dataDest = path.join(standalone, 'data');
try {
  if (fs.existsSync(dataSrc)) {
    // 逐个文件复制（不覆盖 WAL/SHM 以避免冲突）
    const dbFiles = fs.readdirSync(dataSrc).filter(f => f.endsWith('.db') || f === 'changelog.json');
    fs.mkdirSync(dataDest, { recursive: true });
    for (const file of dbFiles) {
      fs.copyFileSync(path.join(dataSrc, file), path.join(dataDest, file));
    }
    console.log('[postbuild] ✓ Copied data/ → standalone');
  }
} catch (e) {
  console.error('[postbuild] ⚠ Failed to copy data/:', e.message);
}

console.log('[postbuild] Done.');
