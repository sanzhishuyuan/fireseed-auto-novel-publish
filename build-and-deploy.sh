#!/bin/bash
# build-and-deploy.sh
# 带数据保护的构建部署脚本
# 用法: ./build-and-deploy.sh

set -e

PROJECT_DIR="/root/ai-novel-lite"
DATA_DIR="/var/data/ai-novel"   # 持久化目录（/var/data/ai-novel/data/ = novel.db 实际位置）
DB_FILE="$DATA_DIR/data/novel.db"
BACKUP_FILE="$DATA_DIR/novel.db.backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ROLLBACK_FILE="$DATA_DIR/novel.db.rollback_$TIMESTAMP"

echo "=========================================="
echo "  Fireseed 部署脚本 (v2 - 带数据保护)"
echo "=========================================="

cd "$PROJECT_DIR"

# ===== 步骤0: 备份当前数据库 =====
echo ""
echo "[1/6] 备份数据库..."
if [ -f "$DB_FILE" ]; then
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
    # 先确保 data 目录存在
    mkdir -p "$DATA_DIR/data"

    # 恢复备份（覆盖构建产生的新 DB）
    cp "$ROLLBACK_FILE" "$DB_FILE"
    echo "  ✅ 数据库已恢复（$RECORD_COUNT 条记录）"

    # 清理过期回滚文件（保留最近3个）
    ls -t "$DATA_DIR"/novel.db.rollback_* 2>/dev/null | tail -n +4 | xargs -r rm
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
# 为 standalone 目录设置 data 和 content 符号链接
if [ ! -L "$PROJECT_DIR/.next/standalone/data" ]; then
    rm -rf "$PROJECT_DIR/.next/standalone/data"
    ln -sf "$DATA_DIR/data" "$PROJECT_DIR/.next/standalone/data"
fi
if [ ! -L "$PROJECT_DIR/.next/standalone/content" ]; then
    rm -rf "$PROJECT_DIR/.next/standalone/content"
    ln -sf "$DATA_DIR/content" "$PROJECT_DIR/.next/standalone/content"
fi
echo "  ✅ 符号链接已设置"

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
