# 数据备份方案

## 当前方案（构建时）

**自动**：`build-and-deploy.sh` 每次部署前都会备份数据库到 `/var/data/ai-novel/backup/`，保留最近7个。

**手动回滚**：
```bash
cp /var/data/ai-novel/backup/novel.db.20260501_083000 /root/ai-novel-lite/data/novel.db
pm2 restart ai-novel
```

## 生产运营建议（上线后启用）

### 1. 每日定时备份（cron）

```bash
# 每天凌晨3点备份，保留30天
0 3 * * * cp /root/ai-novel-lite/data/novel.db /var/data/ai-novel/daily/novel.db.$(date +\%Y\%m\%d) && find /var/data/ai-novel/daily -name 'novel.db.*' -mtime +30 -delete
```

### 2. 异地备份（可选）

数据库只有 SQLite 一个文件，可以直接 `rsync` 到另一台机器或对象存储：

```bash
# 示例：备份到腾讯云 COS（需安装 coscli）
coscli cp /root/ai-novel-lite/data/novel.db cos://bucket-name/backups/novel-$(date +%Y%m%d).db
```

### 3. 数据库本身可靠性

- SQLite WAL 模式已启用 → 崩溃恢复能力强
- `PRAGMA foreign_keys = OFF` → 避免外键导致的写入失败
- 单文件设计 → 备份/恢复极简单
