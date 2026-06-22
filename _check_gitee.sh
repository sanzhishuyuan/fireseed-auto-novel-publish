cd /root/ai-novel-lite
echo "=== Git Remote ==="
git remote -v

echo ""
echo "=== 备份日志 (最近10条) ==="
cat /var/log/ai-novel/gitee-backup.log 2>/dev/null | tail -10 || echo "无日志文件"

echo ""
echo "=== Gitee 仓库连通性测试 ==="
ssh -o StrictHostKeyChecking=no -T git@gitee.com 2>&1 || true

echo ""
echo "=== 本地是否有 Gitee SSH 密钥 ==="
ls -la ~/.ssh/ 2>/dev/null | grep -i gitee || echo "未找到 gitee 专用密钥"

echo ""
echo "=== 备份分支是否存在 ==="
git branch -a 2>/dev/null | grep backup || echo "无 backup 分支"

echo ""
echo "=== 最近一次备份文件 ==="
ls -la /root/ai-novel-lite/data/novel.db.backup_* 2>/dev/null | tail -3 || echo "无本地备份文件"
