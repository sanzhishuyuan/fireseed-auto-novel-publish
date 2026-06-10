#!/bin/bash
# gitee-backup.sh — Gitee 异地数据库备份
# 用法: bash scripts/gitee-backup.sh [备份文件路径]
# 将数据库备份推送到 Gitee 的 backups/ 目录（git lfs 兼容）
# 通过 backup 分支管理，不会污染主分支

set -euo pipefail

PROJECT_DIR="/root/ai-novel-lite"
BACKUP_FILE="${1:-}"
GIT_REMOTE="origin"
BACKUP_BRANCH="backup-data"
WORK_DIR="/tmp/gitee-db-backup"

# 检查参数
if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "[gitee-backup] ❌ 请提供有效的备份文件路径"
  exit 1
fi

BACKUP_NAME=$(basename "$BACKUP_FILE")
DATE_TAG=$(echo "$BACKUP_NAME" | grep -oP '\d{8}_\d{6}' || echo "unknown")

echo "[gitee-backup] 开始异地备份: $BACKUP_NAME"

# 清理工作目录
rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR"
cd "$WORK_DIR"

# 初始化 git 仓库
git init -q
git config user.name "FireSeed Backup"
git config user.email "backup@fireseed.online"

# 从主仓库拉取 backup 分支（如不存在则创建独立分支）
set +e
git fetch "$PROJECT_DIR/.git" "$BACKUP_BRANCH" 2>/dev/null
FETCH_EXIT=$?
set -e

if [ $FETCH_EXIT -eq 0 ]; then
  git checkout -q "$BACKUP_BRANCH" 2>/dev/null || git checkout -q FETCH_HEAD
else
  # 首次: 创建孤立分支
  git checkout -q --orphan "$BACKUP_BRANCH"
  git rm -rfq . 2>/dev/null || true
  cat > README.md << 'EOF'
# FireSeed 数据库备份

> 自动备份分支，由 `scripts/gitee-backup.sh` 管理
> 每次部署自动推送当前数据库快照到此分支

## 文件结构

```
backups/
  novel.db.YYYYMMDD_HHMMSS  ← 每次备份的时间戳快照
```

## 回滚

```bash
# 从 Gitee 下载指定备份
git checkout backup-data
cp backups/novel.db.20260610_091026 /root/ai-novel-lite/data/novel.db
pm2 restart ai-novel
```
EOF
  git add README.md
  git commit -q -m "chore: 初始化备份分支" --allow-empty
fi

# 创建 backups/ 目录并复制备份
mkdir -p backups
cp "$BACKUP_FILE" "backups/novel.db.$DATE_TAG"

# 保留最近 30 个备份
ls -t backups/novel.db.* 2>/dev/null | tail -n +31 | xargs -r rm -f

# 提交并推送
git add -A
git commit -q -m "backup: $BACKUP_NAME

自动备份 $(date '+%Y-%m-%d %H:%M:%S')
用户数: $(sqlite3 "$BACKUP_FILE" 'SELECT COUNT(*) FROM users;' 2>/dev/null || echo '?')
小说数: $(sqlite3 "$BACKUP_FILE" 'SELECT COUNT(*) FROM novels;' 2>/dev/null || echo '?')"

# 推送到 Gitee（使用 origin 的 remote URL）
REMOTE_URL=$(cd "$PROJECT_DIR" && git remote get-url origin 2>/dev/null)
if [ -n "$REMOTE_URL" ]; then
  git remote add origin "$REMOTE_URL"
  git push origin "$BACKUP_BRANCH" --force -q 2>/dev/null
  echo "[gitee-backup] ✅ 已推送到 Gitee ($BACKUP_BRANCH)"
else
  echo "[gitee-backup] ⚠️  无法获取远程仓库 URL"
fi

# 清理
rm -rf "$WORK_DIR"
echo "[gitee-backup] 完成"
