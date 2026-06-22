WORK="/tmp/restore-freseeddb"
rm -rf "$WORK"
mkdir -p "$WORK"
cd "$WORK"

git init -q
git remote add origin git@gitee.com:topofthesky/freseeddb.git
git fetch origin main --depth=1 -q
git checkout -q main

BACKUP_DB="$WORK/backups/novel.db.latest"
CUR_DB="/root/ai-novel-lite/data/novel.db"

echo "=== 备份数据库完整性 ==="
sqlite3 "$BACKUP_DB" "PRAGMA integrity_check;"

echo ""
echo "=== 备份中的用户统计 ==="
echo "用户总数: $(sqlite3 "$BACKUP_DB" 'SELECT COUNT(*) FROM users;')"
echo "有效小说: $(sqlite3 "$BACKUP_DB" 'SELECT COUNT(*) FROM novels WHERE deleted_at IS NULL;')"
echo "章节总数: $(sqlite3 "$BACKUP_DB" 'SELECT COUNT(*) FROM chapters;')"

echo ""
echo "=== 当前数据库不存在的用户（备份中有但当前没有）==="
# Attach current db and do cross-db query
sqlite3 "$BACKUP_DB" << 'SQL'
ATTACH '/root/ai-novel-lite/data/novel.db' AS cur;
SELECT b.id, b.username, COALESCE(b.email, '(无)') as email, b.created_at
FROM users b
WHERE b.id NOT IN (SELECT id FROM cur.users)
ORDER BY b.created_at DESC;
DETACH cur;
SQL

echo ""
echo "=== 备份中所有有邮箱的用户 ==="
sqlite3 "$BACKUP_DB" "SELECT id, username, email, created_at FROM users WHERE email IS NOT NULL AND email != '' AND username != 'system' ORDER BY created_at DESC;"

echo ""
echo "=== 备份中所有用户（按注册时间倒序）==="
sqlite3 "$BACKUP_DB" "SELECT substr(id,1,12)||'...' as id, username, COALESCE(email,'无') as email, created_at FROM users WHERE username != 'system' ORDER BY created_at DESC LIMIT 20;"

echo ""
echo "=== 丢失的小说 ==="
sqlite3 "$BACKUP_DB" << 'SQL'
ATTACH '/root/ai-novel-lite/data/novel.db' AS cur;
SELECT n.id, n.title, n.author_id, n.created_at
FROM novels n
WHERE n.id NOT IN (SELECT id FROM cur.novels WHERE deleted_at IS NULL)
  AND n.deleted_at IS NULL
ORDER BY n.created_at DESC;
DETACH cur;
SQL

rm -rf "$WORK"
