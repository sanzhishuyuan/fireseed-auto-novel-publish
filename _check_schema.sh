#!/bin/bash
echo "=== 当前数据库 users 表结构 ==="
sqlite3 /root/ai-novel-lite/data/novel.db "PRAGMA table_info(users);"

echo ""
echo "=== 当前数据库 novels 表结构 ==="
sqlite3 /root/ai-novel-lite/data/novel.db "PRAGMA table_info(novels);"

echo ""
echo "=== 当前数据库 chapters 表结构 ==="
sqlite3 /root/ai-novel-lite/data/novel.db "PRAGMA table_info(chapters);"

echo ""
echo "=== 当前数据库 user_tokens 表结构 ==="
sqlite3 /root/ai-novel-lite/data/novel.db "PRAGMA table_info(user_tokens);"
