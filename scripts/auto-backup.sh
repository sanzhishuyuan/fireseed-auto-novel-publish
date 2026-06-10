#!/bin/bash
# FireSeed 自动备份脚本
# 每日凌晨执行: 备份数据库 + 封面文件
# 保留最近 30 天备份

set -euo pipefail

PROJECT_DIR="/root/ai-novel-lite"
DB_FILE="$PROJECT_DIR/data/novel.db"
BACKUP_DIR="/var/data/ai-novel/backup"
COVERS_DIR="/var/data/ai-novel/covers"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MAX_BACKUPS=30
LOG_FILE="$PROJECT_DIR/logs/backup.log"

mkdir -p "$BACKUP_DIR" "$PROJECT_DIR/logs"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 开始自动备份..." >> "$LOG_FILE"

# 1. 备份数据库
if [ -f "$DB_FILE" ]; then
    # WAL checkpoint
    sqlite3 "$DB_FILE" "PRAGMA wal_checkpoint(TRUNCATE);" 2>/dev/null || true
    BACKUP_PATH="$BACKUP_DIR/novel.db.$TIMESTAMP"
    cp "$DB_FILE" "$BACKUP_PATH"
    RECORDS=$(sqlite3 "$BACKUP_PATH" "SELECT COUNT(*) FROM novels;" 2>/dev/null || echo "?")
    echo "  DB备份: $BACKUP_PATH ($RECORDS 部小说)" >> "$LOG_FILE"
else
    echo "  WARNING: 数据库文件不存在，跳过DB备份" >> "$LOG_FILE"
fi

# 2. 备份封面
if [ -d "$COVERS_DIR" ] && [ "$(ls -A "$COVERS_DIR" 2>/dev/null)" ]; then
    COVERS_BACKUP="$BACKUP_DIR/covers.$TIMESTAMP.tar.gz"
    tar -czf "$COVERS_BACKUP" -C "$(dirname "$COVERS_DIR")" "$(basename "$COVERS_DIR")" 2>/dev/null
    echo "  封面包: $COVERS_BACKUP" >> "$LOG_FILE"
else
    echo "  封面目录为空，跳过封面备份" >> "$LOG_FILE"
fi

# 3. 清理旧备份（保留最近 MAX_BACKUPS 个）
ls -t "$BACKUP_DIR"/novel.db.* 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm
ls -t "$BACKUP_DIR"/covers.*.tar.gz 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 备份完成" >> "$LOG_FILE"
echo "---" >> "$LOG_FILE"

# 清理旧日志
tail -n 1000 "$LOG_FILE" > /tmp/backup_log.tmp && mv /tmp/backup_log.tmp "$LOG_FILE"
