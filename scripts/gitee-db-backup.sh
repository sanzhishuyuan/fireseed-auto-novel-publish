#!/bin/bash
# ============================================================
# gitee-db-backup.sh — FireSeed 数据库 Gitee 异地备份
# ============================================================
# 用法:
#   bash /root/ai-novel-lite/scripts/gitee-db-backup.sh          # 常规备份
#   bash /root/ai-novel-lite/scripts/gitee-db-backup.sh --quiet  # 静默模式
# ============================================================
# 功能:
#   1. 验证数据库完整性
#   2. 推送数据库 + 封面到 Gitee 备份仓库
#   3. 保留最近 30 个历史备份
#   4. 记录备份日志
# ============================================================

QUIET=0
if [ "${1:-}" = "--quiet" ]; then
  QUIET=1
fi

log() {
  if [ "$QUIET" -eq 0 ]; then
    echo "$@"
  fi
}

# ---- 配置 ----
PROJECT_DIR="/root/ai-novel-lite"
DB_FILE="$PROJECT_DIR/data/novel.db"
COVERS_DIR="/var/data/ai-novel/covers"
GITEE_REPO="git@gitee.com:topofthesky/freseeddb.git"
WORK_DIR="/tmp/gitee-db-backup-work"
LOG_FILE="/var/log/ai-novel/gitee-backup.log"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MAX_BACKUPS=30

mkdir -p "$(dirname "$LOG_FILE")"

log "============================================"
log "  Gitee DB Backup — $TIMESTAMP"
log "============================================"

# ---- Step 1: 验证 ----
if [ ! -f "$DB_FILE" ]; then
  echo "[$TIMESTAMP] ERROR: Database not found: $DB_FILE" | tee -a "$LOG_FILE"
  exit 1
fi

INTEGRITY=$(sqlite3 "$DB_FILE" "PRAGMA integrity_check;" 2>&1)
if [ "$INTEGRITY" != "ok" ]; then
  echo "[$TIMESTAMP] ERROR: Integrity check failed" | tee -a "$LOG_FILE"
  exit 1
fi

USER_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "0")
NOVEL_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM novels;" 2>/dev/null || echo "0")
CHAPTER_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM chapters;" 2>/dev/null || echo "0")
DB_SIZE=$(stat -c%s "$DB_FILE")
log "  DB: $(du -h "$DB_FILE" | cut -f1) | $USER_COUNT users | $NOVEL_COUNT novels | $CHAPTER_COUNT chapters"

# ---- Step 2: 准备 Git 工作区 ----
rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR"
cd "$WORK_DIR"

git init -q
git config user.name "FireSeed Backup"
git config user.email "backup@fireseed.online"

# 拉取已有历史
if git fetch "$GITEE_REPO" main 2>/dev/null; then
  git checkout -q -B main FETCH_HEAD 2>/dev/null || git checkout -q -b main
  git branch --set-upstream-to=origin/main main 2>/dev/null || true
  log "  Fetched existing backup history"
else
  git checkout -q -b main
  log "  New repo, initialized main branch"
fi

git remote add origin "$GITEE_REPO" 2>/dev/null || true

# ---- Step 3: 复制文件 ----
mkdir -p backups covers

# 数据库
cp "$DB_FILE" "backups/novel.db.$TIMESTAMP"
cp "$DB_FILE" "backups/novel.db.latest"

# 封面
if [ -d "$COVERS_DIR" ] && [ "$(ls "$COVERS_DIR" 2>/dev/null | wc -l)" -gt 0 ]; then
  tar -czf "covers/covers.$TIMESTAMP.tar.gz" -C "/var/data/ai-novel" "covers" 2>/dev/null || true
  cp "covers/covers.$TIMESTAMP.tar.gz" "covers/covers.latest.tar.gz" 2>/dev/null || true
  log "  Covers included"
fi

# 备份元数据
cat > "backups/backup_info_${TIMESTAMP}.json" <<EOF
{
  "timestamp": "$TIMESTAMP",
  "datetime": "$(date -Iseconds)",
  "size_bytes": $DB_SIZE,
  "users": $USER_COUNT,
  "novels": $NOVEL_COUNT,
  "chapters": $CHAPTER_COUNT,
  "integrity": "ok",
  "server": "fireseed.online",
  "type": "${BACKUP_TYPE:-manual}"
}
EOF

# README
cat > README.md <<EOF
# FireSeed 数据库备份仓库

> 自动管理 | 每次部署前 + 每日凌晨 3 点自动备份  
> 保留最近 $MAX_BACKUPS 个历史快照

## 快速回滚

\`\`\`bash
# 服务器上执行
cd /root/ai-novel-lite
cp data/novel.db data/novel.db.bak

# 方式一：从 Gitee 直接拉取
git clone git@gitee.com:topofthesky/freseeddb.git /tmp/freseeddb-restore
cp /tmp/freseeddb-restore/backups/novel.db.latest data/novel.db
rm -rf /tmp/freseeddb-restore

# 方式二：wget
wget -O data/novel.db.restore https://gitee.com/topofthesky/freseeddb/raw/main/backups/novel.db.latest
sqlite3 data/novel.db.restore "PRAGMA integrity_check;" && mv data/novel.db.restore data/novel.db

# 重启
pm2 restart ai-novel
\`\`\`

---
*最后备份: $TIMESTAMP | $USER_COUNT users | $NOVEL_COUNT novels | $CHAPTER_COUNT chapters*
EOF

# ---- Step 4: 清理旧备份 ----
cd backups
OLD_DB=$(ls -t novel.db.* 2>/dev/null | grep -v latest | tail -n +$((MAX_BACKUPS + 1)))
if [ -n "$OLD_DB" ]; then
  echo "$OLD_DB" | xargs rm -f
  log "  Cleaned old db backups"
fi
OLD_META=$(ls -t backup_info_*.json 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)))
if [ -n "$OLD_META" ]; then
  echo "$OLD_META" | xargs rm -f
fi
cd ..

cd covers
OLD_COVERS=$(ls -t covers.*.tar.gz 2>/dev/null | grep -v latest | tail -n +$((MAX_BACKUPS + 1)))
if [ -n "$OLD_COVERS" ]; then
  echo "$OLD_COVERS" | xargs rm -f
fi
cd ..

# ---- Step 5: 提交推送 ----
git add -A
git commit -q -m "backup: $TIMESTAMP ($USER_COUNT users, $NOVEL_COUNT novels, $CHAPTER_COUNT chapters)" --allow-empty

if git push origin main --force -q 2>&1; then
  echo "[$TIMESTAMP] OK | $USER_COUNT users | $NOVEL_COUNT novels | $CHAPTER_COUNT chapters | ${DB_SIZE} bytes" >> "$LOG_FILE"
  log ""
  log "  Pushed to Gitee successfully"
else
  echo "[$TIMESTAMP] PUSH_FAILED | integrity ok but push to Gitee failed" >> "$LOG_FILE"
  echo "ERROR: Failed to push to Gitee"
  cd /
  rm -rf "$WORK_DIR"
  exit 1
fi

# ---- Cleanup ----
cd /
rm -rf "$WORK_DIR"

log ""
log "  Backup complete: https://gitee.com/topofthesky/freseeddb"
log "============================================"
