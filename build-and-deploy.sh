#!/bin/bash
# build-and-deploy.sh
# 带数据保护的构建部署脚本
# 用法: ./build-and-deploy.sh

set -e

PROJECT_DIR="/root/ai-novel-lite"
# 数据库在项目 data 目录（由 lib/db.ts 的 process.cwd() + '/data/novel.db' 决定）
DB_DIR="$PROJECT_DIR/data"
DB_FILE="$DB_DIR/novel.db"
ROLLBACK_DIR="/var/data/ai-novel"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ROLLBACK_FILE="$ROLLBACK_DIR/novel.db.rollback_$TIMESTAMP"

echo "=========================================="
echo "  Fireseed 部署脚本 (v2 - 带数据保护)"
echo "=========================================="

cd "$PROJECT_DIR"

# ===== 步骤0: 备份当前数据库 =====
echo ""
echo "[1/6] 备份数据库..."
if [ -f "$DB_FILE" ]; then
    mkdir -p "$ROLLBACK_DIR"
    cp "$DB_FILE" "$ROLLBACK_FILE"
    echo "  ✅ 备份已保存: $ROLLBACK_FILE"
    RECORD_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM novels;" 2>/dev/null || echo "0")
    echo "  📊 当前小说数: $RECORD_COUNT"
else
    echo "  ⚠️  数据库文件不存在，跳过备份"
fi

# ===== 步骤1: 构建 =====
echo ""
echo "[2/6] 执行构建..."
npm run build
echo "  ✅ 构建完成"

# ===== 步骤2: 恢复数据库 =====
echo ""
echo "[3/6] 恢复数据库..."
if [ -f "$ROLLBACK_FILE" ]; then
    # 确保 data 目录存在
    mkdir -p "$DB_DIR"

    # 恢复备份（覆盖构建产生的新 DB）
    cp "$ROLLBACK_FILE" "$DB_FILE"
    echo "  ✅ 数据库已恢复（$RECORD_COUNT 条记录）"

    # 清理过期回滚文件（保留最近3个）
    ls -t "$ROLLBACK_DIR"/novel.db.rollback_* 2>/dev/null | tail -n +4 | xargs -r rm
    echo "  🧹 过期回滚文件已清理"
else
    echo "  ⚠️  无备份文件，跳过恢复"
fi

# ===== 步骤3: 复制静态资源 =====
echo ""
echo "[4/6] 复制静态资源..."
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
echo "  ✅ 静态资源已同步"

# ===== 步骤4: 设置符号链接 =====
echo ""
echo "[5/6] 设置符号链接..."
# 替换 standalone 目录下的空数据库为符号链接（指向项目 data 目录的真实 DB）
# 构建过程会创建新的空 data/ 目录，必须替换为符号链接才能读取真实数据
STANDALONE_DATA="$PROJECT_DIR/.next/standalone/data"
rm -rf "$STANDALONE_DATA/novel.db"
ln -sf "$DB_FILE" "$STANDALONE_DATA/novel.db"
echo "  ✅ 符号链接已设置: $STANDALONE_DATA/novel.db → $DB_FILE"

# ===== 步骤5: 重启 PM2 =====
echo ""
echo "[6/6] 重启服务..."
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
echo "🎉 部署完成！如需回滚，运行:"
echo "   cp $ROLLBACK_FILE $DB_FILE && pm2 restart ai-novel"
