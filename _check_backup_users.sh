WORK="/tmp/restore-freseeddb"
rm -rf "$WORK"
mkdir -p "$WORK"
cd "$WORK"

echo "=== 从 Gitee 下载最新备份 ==="
git init -q
git remote add origin git@gitee.com:topofthesky/freseeddb.git
git fetch origin main --depth=1 -q
git checkout -q main

# 检查备份文件
echo "latest 指向:"
ls -la backups/novel.db.latest
echo ""

# 用最新备份
DB="$WORK/backups/novel.db.latest"

echo "=== 备份数据库完整性 ==="
sqlite3 "$DB" "PRAGMA integrity_check;"

echo ""
echo "=== 备份中的用户统计 ==="
echo "用户总数: $(sqlite3 "$DB" 'SELECT COUNT(*) FROM users;')"
echo "有效小说: $(sqlite3 "$DB" 'SELECT COUNT(*) FROM novels WHERE deleted_at IS NULL;')"
echo "章节总数: $(sqlite3 "$DB" 'SELECT COUNT(*) FROM chapters;')"

echo ""
echo "=== 查找丢失用户（在当前DB中不存在的用户）==="
CUR="/root/ai-novel-lite/data/novel.db"
sqlite3 "$DB" "SELECT id, username, COALESCE(email,'(无)') as email, created_at FROM users WHERE id NOT IN (SELECT id FROM $CUR.users)" | while IFS='|' read id name email created; do
  echo "  🆔 $id"
  echo "    用户名: $name"
  echo "    邮箱: $email"
  echo "    注册时间: $created"
  echo ""
done

echo ""
echo "=== 备份中且有邮箱的用户 ==="
sqlite3 "$DB" "SELECT id, username, email, created_at FROM users WHERE email IS NOT NULL AND email != '' ORDER BY created_at DESC"

rm -rf "$WORK"
