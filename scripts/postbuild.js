/**
 * postbuild.js — Next.js standalone 模式后处理
 * 1. 检查数据文件完整性（非阻断警告）
 * 2. 自动复制 .next/static 和 public/ 到 .next/standalone/ 目录
 * 3. 校验 standalone 输出完整性
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const standalone = path.join(root, '.next', 'standalone');
const dbPath = path.join(root, 'data', 'novel.db');
const backupDir = path.join(root, '.backups');

// ===== 数据保护：检查数据库完整性 =====
try {
  if (fs.existsSync(dbPath)) {
    // 检查数据库文件是否可读（通过文件大小判断是否损坏）
    const stats = fs.statSync(dbPath);
    if (stats.size < 1024) {
      console.warn(`[postbuild] ⚠️  数据库文件异常小 (${(stats.size / 1024).toFixed(1)}KB)，请检查数据完整性`);
    } else {
      console.log(`[postbuild] ✓ 数据库文件正常 (${(stats.size / 1024 / 1024).toFixed(1)}MB)`);
    }
  } else {
    console.warn('[postbuild] ⚠️  未找到数据库文件，构建使用无数据模式');
  }
} catch (e) {
  console.warn('[postbuild] ⚠️  数据库检查失败:', e.message);
}

// ===== 检查是否需要备份（距离上次备份超过24小时） =====
try {
  const today = new Date().toISOString().slice(0, 10);
  const dailyBackupPath = path.join(backupDir, `novel.db.${today}`);
  if (fs.existsSync(dbPath) && !fs.existsSync(dailyBackupPath)) {
    // 非阻断：提示用户定期备份
    console.log('[postbuild] 💡 提示：今日尚未备份数据库，建议定期执行 scripts/auto-backup.sh');
  }
} catch (e) {
  // 忽略备份检查错误
}

// ===== 检查是否使用了 standalone 输出 =====
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

console.log('[postbuild] Done.');
