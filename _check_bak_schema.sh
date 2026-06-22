#!/bin/bash
# 从 Gitee 下载备份并检查 schema

WORKDIR="/tmp/check-bak-schema"
rm -rf "$WORKDIR"
mkdir -p "$WORKDIR"
cd "$WORKDIR"

git init -q
git remote add origin git@gitee.com:topofthesky/freseeddb.git
git fetch origin main --depth=1 -q
git checkout -q main

BAK_DB="$WORKDIR/backups/novel.db.latest"

echo "=== 备份数据库 users 表结构 ==="
sqlite3 "$BAK_DB" "PRAGMA table_info(users);"

echo ""
echo "=== 备份数据库 novels 表结构 ==="
sqlite3 "$BAK_DB" "PRAGMA table_info(novels);"

echo ""
echo "=== 备份数据库 chapters 表结构 ==="
sqlite3 "$BAK_DB" "PRAGMA table_info(chapters);"

echo ""
echo "=== 备份数据库 user_tokens 表结构 ==="
sqlite3 "$BAK_DB" "PRAGMA table_info(user_tokens);"

rm -rf "$WORKDIR"
