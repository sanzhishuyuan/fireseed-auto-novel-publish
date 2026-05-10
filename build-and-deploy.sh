#!/bin/bash
# build-and-deploy.sh (v6 — 安全版)
# 构建部署脚本：构建前自动备份数据库和封面文件，构建后自动恢复符号链接
# 注意：数据库禁止自动重建！备份失败或数据库不存在时中止部署
# 用法: ./build-and-deploy.sh

set -euo pipefail

PROJECT_DIR="/root/ai-novel-lite"
DB_FILE="$PROJECT_DIR/data/novel.db"
BACKUP_DIR="/var/data/ai-novel/backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/novel.db.$TIMESTAMP"
COVERS_DIR="/var/data/ai-novel/covers"

echo "=========================================="
echo "  Fireseed 部署脚本 (v6 - 安全版)"
echo "=========================================="

cd "$PROJECT_DIR"

# ===== 步骤0: 重编 native 模块（不执行 git clean） =====
echo ""
echo "[0/5] 重编 native 模块..."
npm rebuild better-sqlite3 2>/dev/null || true
echo "  ✅ native 模块检查完成"

# ===== 步骤1: 备份数据库 + 封面文件 =====
echo ""
echo "[1/6] 备份数据库 + 封面文件..."
mkdir -p "$BACKUP_DIR"

if [ ! -f "$DB_FILE" ]; then
  echo "  ❌ 错误：数据库文件不存在！"
  echo "  ❌ 生产数据库禁止重建，部署中止。"
  exit 1
fi

# WAL checkpoint
sqlite3 "$DB_FILE" "PRAGMA wal_checkpoint(TRUNCATE);" 2>/dev/null || true
echo "  ✅ WAL checkpoint 完成"

cp "$DB_FILE" "$BACKUP_FILE"
echo "  ✅ 数据库备份: $BACKUP_FILE"

# 保留最近7个数据库备份
ls -t "$BACKUP_DIR"/novel.db.* 2>/dev/null | tail -n +8 | xargs -r rm

# 备份封面文件
if [ -d "$COVERS_DIR" ] && [ "$(ls -A "$COVERS_DIR" 2>/dev/null)" ]; then
  COVERS_BACKUP="$BACKUP_DIR/covers.$TIMESTAMP.tar.gz"
  tar -czf "$COVERS_BACKUP" -C "$(dirname "$COVERS_DIR")" "$(basename "$COVERS_DIR")" 2>/dev/null
  echo "  ✅ 封面已备份: $COVERS_BACKUP"
  ls -t "$BACKUP_DIR"/covers.*.tar.gz 2>/dev/null | tail -n +8 | xargs -r rm
else
  echo "  📭 封面目录为空或不存在，跳过封面备份"
fi

# ===== 步骤2: 构建 =====
echo ""
echo "[2/6] 执行构建..."
npm run build
echo "  ✅ 构建完成"

# ===== 步骤3: 复制静态资源 =====
echo ""
echo "[3/6] 复制静态资源..."
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
cp -r public .next/standalone/public 2>/dev/null || true
echo "  ✅ 静态资源已同步"

# ===== 步骤4: 设置符号链接 =====
echo ""
echo "[4/6] 设置符号链接..."
mkdir -p "$COVERS_DIR"

# 项目内 covers → Nginx covers
rm -rf covers
ln -sf "$COVERS_DIR" covers
echo "  ✅ 封面: covers → $COVERS_DIR"

# standalone covers → Nginx covers
STANDALONE_COVERS=".next/standalone/covers"
rm -rf "$STANDALONE_COVERS"
ln -sf "$COVERS_DIR" "$STANDALONE_COVERS"
echo "  ✅ 封面: $STANDALONE_COVERS → $COVERS_DIR"

# standalone data/novel.db → 项目 data/novel.db
STANDALONE_DATA=".next/standalone/data"
rm -f "$STANDALONE_DATA/novel.db"
ln -sf "$DB_FILE" "$STANDALONE_DATA/novel.db"
echo "  ✅ 数据库: $STANDALONE_DATA/novel.db → $DB_FILE"

# ===== 步骤5: 重启 =====
echo ""
echo "[5/6] 重启服务..."
pm2 restart ai-novel || pm2 start ecosystem.config.js
sleep 2
pm2 status | grep ai-novel

# ===== 验证 =====
echo ""
echo "[6/6] 验证..."
RECORD_AFTER=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM novels;" 2>/dev/null || echo "?")
echo "  ✅ 小说数: $RECORD_AFTER"
echo "  ✅ 服务: https://fireseed.online"
echo ""
echo "=========================================="
echo "🎉 部署完成！"
echo "回滚: cp $BACKUP_FILE $DB_FILE && pm2 restart ai-novel"
echo "=========================================="
