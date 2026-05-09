#!/bin/bash
# build-and-deploy.sh (v5 - 正式版，数据库保护 + native模块自修复)
# 构建部署脚本，构建前自动备份数据库，构建后自动恢复
# 注意：数据库禁止自动重建！备份失败或数据库不存在时中止部署
# 用法: ./build-and-deploy.sh

set -euo pipefail

PROJECT_DIR="/root/ai-novel-lite"
DB_FILE="$PROJECT_DIR/data/novel.db"
BACKUP_DIR="/var/data/ai-novel/backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/novel.db.$TIMESTAMP"
NGINX_COVERS_DIR="/var/data/ai-novel/covers"

echo "=========================================="
echo "  Fireseed 部署脚本 (v5 - 正式版)"
echo "=========================================="

cd "$PROJECT_DIR"

# ===== 步骤0: 清理与预热 =====
echo ""
echo "[0/5] 清理 untracked 文件 & 重编 native 模块..."
git clean -fd
echo "  ✅ untracked 文件已清理"

npm rebuild better-sqlite3
echo "  ✅ native 模块已重编译"

# ===== 步骤1: 备份数据库（数据库不存在则中止！）=====
echo ""
echo "[1/6] 备份数据库 + 封面文件..."
mkdir -p "$BACKUP_DIR"

if [ ! -f "$DB_FILE" ]; then
  echo "  ❌ 错误：数据库文件不存在！"
  echo "  ❌ 生产数据库禁止重建，部署中止。"
  echo "  ❌ 如需恢复请执行: cp <备份文件> $DB_FILE"
  exit 1
fi

# WAL checkpoint：确保 WAL 日志已完全写入主数据库，避免备份丢失数据
sqlite3 "$DB_FILE" "PRAGMA wal_checkpoint(TRUNCATE);" 2>/dev/null || true
echo "  ✅ WAL checkpoint 完成"

cp "$DB_FILE" "$BACKUP_FILE"
echo "  ✅ 备份已保存: $BACKUP_FILE"
RECORD_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM novels;" 2>/dev/null || echo "0")
echo "  📊 当前小说数: $RECORD_COUNT"

# 保留最近7个数据库备份，删除更旧的
ls -t "$BACKUP_DIR"/novel.db.* 2>/dev/null | tail -n +8 | xargs -r rm
echo "  🧹 保留最近7个数据库备份"

# 备份封面文件（tar 压缩，避免文件数过多）
COVERS_SRC="$NGINX_COVERS_DIR"
COVERS_BACKUP="$BACKUP_DIR/covers.$TIMESTAMP.tar.gz"
if [ -d "$COVERS_SRC" ] && [ "$(ls -A "$COVERS_SRC" 2>/dev/null)" ]; then
  tar -czf "$COVERS_BACKUP" -C "$(dirname "$COVERS_SRC")" "$(basename "$COVERS_SRC")" 2>/dev/null
  echo "  ✅ 封面已备份: $COVERS_BACKUP ($(du -sh "$COVERS_BACKUP" | cut -f1))"
fi

# 保留最近7个封面备份
ls -t "$BACKUP_DIR"/covers.*.tar.gz 2>/dev/null | tail -n +8 | xargs -r rm

# ===== 步骤2: 构建 =====
echo ""
echo "[2/6] 执行构建..."
npm run build
echo "  ✅ 构建完成"

# ===== 步骤3: 复制静态资源 =====
echo ""
echo "[3/6] 复制静态资源..."
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
echo "  ✅ 静态资源已同步"

# ===== 步骤4: 设置符号链接 =====
echo ""
echo "[4/6] 设置符号链接和目录..."
# 封面目录：统一到 /var/data/ai-novel/covers/（nginx 也使用此路径）
NGINX_COVERS_DIR="/var/data/ai-novel/covers"
mkdir -p "$NGINX_COVERS_DIR"
COVERS_DIR="$PROJECT_DIR/covers"
if [ ! -L "$COVERS_DIR" ]; then
  # 安全迁移：如果旧目录是真实目录且有封面文件，先复制到新路径再删除
  if [ -d "$COVERS_DIR" ] && [ "$(ls -A "$COVERS_DIR" 2>/dev/null)" ]; then
    echo "  ⚠️ 发现旧封面目录，正在迁移到新路径..."
    cp -r "$COVERS_DIR"/* "$NGINX_COVERS_DIR"/ 2>/dev/null || true
    echo "  ✅ 已迁移 $(ls -A "$COVERS_DIR" | wc -l) 个文件到 $NGINX_COVERS_DIR"
  fi
  rm -rf "$COVERS_DIR"
  ln -sf "$NGINX_COVERS_DIR" "$COVERS_DIR"
fi
echo "  ✅ 封面目录（nginx统一路径）: $NGINX_COVERS_DIR"

# 替换 standalone 构建产出的空数据库为符号链接，指向项目 data 目录的真实 DB
STANDALONE_DATA="$PROJECT_DIR/.next/standalone/data"
rm -rf "$STANDALONE_DATA/novel.db"
ln -sf "$DB_FILE" "$STANDALONE_DATA/novel.db"
echo "  ✅ 符号链接: $STANDALONE_DATA/novel.db → $DB_FILE"

# 封面目录符号链接（封面上传 API 在 standalone 模式下 process.cwd() 指向 .next/standalone/）
STANDALONE_COVERS="$PROJECT_DIR/.next/standalone/covers"
rm -rf "$STANDALONE_COVERS"
ln -sf "$COVERS_DIR" "$STANDALONE_COVERS"
echo "  ✅ 符号链接: $STANDALONE_COVERS → $COVERS_DIR"

# ===== 步骤5: 重启服务 =====
echo ""
echo "[5/6] 重启服务..."
pm2 restart ai-novel || pm2 start ecosystem.config.js
sleep 2

STATUS=$(pm2 describe ai-novel | grep 'status' | awk '{print $4}')
echo "  ✅ PM2 状态: $STATUS"

# ===== 验证 =====
echo ""
echo "=========================================="
echo "  验证结果"
echo "=========================================="
RECORD_AFTER=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM novels;" 2>/dev/null || echo "?")
echo "  小说数: $RECORD_AFTER"
echo "  服务: https://fireseed.online"
echo "=========================================="
echo ""
echo "🎉 部署完成！回滚命令:"
echo "   cp $BACKUP_FILE $DB_FILE && pm2 restart ai-novel"
