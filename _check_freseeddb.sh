echo "=== Gitee SSH 密钥列表 ==="
ls -la ~/.ssh/
cat ~/.ssh/id_rsa.pub 2>/dev/null || cat ~/.ssh/id_ed25519.pub 2>/dev/null || echo "无公钥"

echo ""
echo "=== 尝试连通 freseeddb 备份仓库 ==="
ssh -o StrictHostKeyChecking=no -T git@gitee.com 2>&1 || true

echo ""
echo "=== 当前数据库完整性检查 ==="
sqlite3 /root/ai-novel-lite/data/novel.db "PRAGMA integrity_check;" 2>&1

echo ""
echo "=== 当前数据库统计 ==="
echo "用户数: $(sqlite3 /root/ai-novel-lite/data/novel.db 'SELECT COUNT(*) FROM users;')"
echo "小说数: $(sqlite3 /root/ai-novel-lite/data/novel.db 'SELECT COUNT(*) FROM novels WHERE deleted_at IS NULL;')"
echo "章节数: $(sqlite3 /root/ai-novel-lite/data/novel.db 'SELECT COUNT(*) FROM chapters;')"

echo ""
echo "=== 尝试克隆备份仓库预览（最近一次备份）==="
rm -rf /tmp/check-freseeddb
mkdir -p /tmp/check-freseeddb
cd /tmp/check-freseeddb
git init -q
git remote add origin git@gitee.com:topofthesky/freseeddb.git
git fetch origin main --depth=1 2>&1 || echo "FETCH_FAILED (无权限或仓库不存在)"
if [ -d .git ]; then
  git checkout -q main 2>/dev/null
  echo "=== backups/ 目录内容 ==="
  ls -la backups/ 2>/dev/null | head -35
  echo ""
  echo "=== 备份信息文件 ==="
  ls -la backups/backup_info_*.json 2>/dev/null | tail -10
fi
rm -rf /tmp/check-freseeddb
