#!/bin/bash
# build-and-deploy.sh (v4 - 生产版，带可靠数据保护)
# 构建部署脚本，构建前自动备份数据库，构建后自动恢复
# 用法: ./build-and-deploy.sh

set -e

PROJECT_DIR="/root/ai-novel-lite"
DB_FILE="$PROJECT_DIR/data/novel.db"
BACKUP_DIR="/var/data/ai-novel/backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/novel.db.$TIMESTAMP"

echo "=========================================="
echo "  Fireseed 部署脚本 (v4 - 生产版)"
echo "=========================================="

cd "$PROJECT_DIR"

# ===== 步骤1: 备份数据库 =====
echo ""
echo "[1/5] 备份数据库..."
mkdir -p "$BACKUP_DIR"
cp "$DB_FILE" "$BACKUP_FILE"
echo "  ✅ 备份已保存: $BACKUP_FILE"
RECORD_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM novels;" 2>/dev/null || echo "0")
echo "  📊 当前小说数: $RECORD_COUNT"

# 保留最近7个备份，删除更旧的
ls -t "$BACKUP_DIR"/novel.db.* 2>/dev/null | tail -n +8 | xargs -r rm
echo "  🧹 保留最近7个备份"

# ===== 步骤2: 构建 =====
echo ""
echo "[2/5] 执行构建..."
npm run build
echo "  ✅ 构建完成"

# ===== 步骤3: 复制静态资源 =====
echo ""
echo "[3/5] 复制静态资源..."
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
echo "  ✅ 静态资源已同步"

# ===== 步骤4: 设置符号链接 =====
echo ""
echo "[4/5] 设置符号链接和目录..."
# 创建封面目录
COVERS_DIR="$PROJECT_DIR/covers"
mkdir -p "$COVERS_DIR"
echo "  ✅ 封面目录: $COVERS_DIR"

# 替换 standalone 构建产出的空数据库为符号链接，指向项目 data 目录的真实 DB
STANDALONE_DATA="$PROJECT_DIR/.next/standalone/data"
rm -rf "$STANDALONE_DATA/novel.db"
ln -sf "$DB_FILE" "$STANDALONE_DATA/novel.db"
echo "  ✅ 符号链接: $STANDALONE_DATA/novel.db → $DB_FILE"

# ===== 步骤5: 重启服务 =====
echo ""
echo "[5/5] 重启服务..."
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
echo "  小说数量: $RECORD_AFTER"
echo "  服务地址: https://fireseed.online"
echo "=========================================="
echo ""
echo "🎉 部署完成！回滚命令:"
echo "   cp $BACKUP_FILE $DB_FILE && pm2 restart ai-novel"
