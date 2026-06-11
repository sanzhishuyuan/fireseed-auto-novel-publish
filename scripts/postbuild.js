/**
 * postbuild.js - Next.js standalone 模式后处理
 * 自动复制 .next/static 和 public/ 到 .next/standalone/ 目录
 * 解决 standalone 输出不包含静态资源的问题
 *
 * 注意：数据库文件不由 postbuild 管理。
 * 通过 DATA_DIR 环境变量统一数据库路径（见 lib/db.ts），
 * 所有运行模式（dev / standalone）共用同一数据库文件。
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const standalone = path.join(root, ".next", "standalone");

if (!fs.existsSync(standalone)) {
  console.log("[postbuild] No standalone directory found, skipping.");
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

// 1. 复制 .next/static 到 standalone/.next/static
const staticSrc = path.join(root, ".next", "static");
const staticDest = path.join(standalone, ".next", "static");
if (fs.existsSync(staticSrc)) {
  copyDirSync(staticSrc, staticDest);
  console.log("[postbuild] OK .next/static -> standalone");
}

// 2. 复制 public/ 到 standalone/public/
const publicSrc = path.join(root, "public");
const publicDest = path.join(standalone, "public");
if (fs.existsSync(publicSrc)) {
  copyDirSync(publicSrc, publicDest);
  console.log("[postbuild] OK public/ -> standalone");
}

console.log("[postbuild] Done.");
