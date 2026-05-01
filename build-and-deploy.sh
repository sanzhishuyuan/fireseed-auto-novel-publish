#!/bin/bash
# build-and-deploy.sh (v3 - 简化版)
# 构建部署脚本，无数据保护（数据库可重建）
# 用法: ./build-and-deploy.sh

set -e

PROJECT_DIR="/root/ai-novel-lite"
DB_FILE="$PROJECT_DIR/data/novel.db"

echo "=========================================="
echo "  Fireseed 部署脚本 (v3 - 简化版)"
echo "=========================================="

cd "$PROJECT_DIR"

# ===== 步骤1: 构建 =====
echo ""
echo "[1/4] 执行构建..."
npm run build
echo "  ✅ 构建完成"

# ===== 步骤2: 复制静态资源 =====
echo ""
echo "[2/4] 复制静态资源..."
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
echo "  ✅ 静态资源已同步"

# ===== 步骤3: 设置符号链接 =====
echo ""
echo "[3/4] 设置符号链接..."
# 替换 standalone 目录下的空数据库为符号链接（指向项目 data 目录的真实 DB）
# 构建过程会创建新的空 data/ 目录，必须替换为符号链接才能读取真实数据
STANDALONE_DATA="$PROJECT_DIR/.next/standalone/data"
rm -rf "$STANDALONE_DATA/novel.db"
ln -sf "$DB_FILE" "$STANDALONE_DATA/novel.db"
echo "  ✅ 符号链接已设置: $STANDALONE_DATA/novel.db → $DB_FILE"

# ===== 步骤4: 重启服务 =====
echo ""
echo "[4/4] 重启服务..."
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
echo "🎉 部署完成"
