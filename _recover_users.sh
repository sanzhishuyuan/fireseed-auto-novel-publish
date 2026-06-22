#!/bin/bash
# 恢复 3 个用户: 雾隐工坊, 罪大恶极, Knight
# 使用 ATTACH + INSERT INTO ... SELECT 方式，自动匹配列名

set -e

BACKUP_REPO="git@gitee.com:topofthesky/freseeddb.git"
WORKDIR="/tmp/recover-users"
CUR_DB="/root/ai-novel-lite/data/novel.db"

# Step 1: 从 Gitee 下载备份
echo "=== [1/5] 从 Gitee 下载最新备份 ==="
rm -rf "$WORKDIR"
mkdir -p "$WORKDIR"
cd "$WORKDIR"
git init -q
git remote add origin "$BACKUP_REPO"
git fetch origin main --depth=1 -q
git checkout -q main
BAK_DB="$WORKDIR/backups/novel.db.latest"
echo "备份文件: $BAK_DB ($(stat -c%s "$BAK_DB") bytes)"

# Step 2: 确认 3 个用户在备份中存在
echo ""
echo "=== [2/5] 确认目标用户 ==="
USER_IDS=(
  "c4fdf6e0-017d-4c29-add1-90f33c000666"
  "49fb5773-4394-4d81-a509-0c2f4be687b7"
  "516eb21d-566d-46b8-84b0-5a0fa0e4a2fa"
)
USERNAMES=("雾隐工坊" "罪大恶极" "Knight")

for i in "${!USER_IDS[@]}"; do
  uid="${USER_IDS[$i]}"
  uname="${USERNAMES[$i]}"
  row=$(sqlite3 "$BAK_DB" "SELECT id, username, COALESCE(email,'无'), created_at FROM users WHERE id='$uid';")
  if [ -n "$row" ]; then
    echo "  ✅ [$uname] $row"
  else
    echo "  ❌ [$uname] $uid 在备份中不存在"
  fi
done

# Step 3: 检查关联数据
echo ""
echo "=== [3/5] 检查关联数据 ==="
for i in "${!USER_IDS[@]}"; do
  uid="${USER_IDS[$i]}"
  uname="${USERNAMES[$i]}"
  echo ""
  echo "--- $uname ($uid) ---"
  
  # 小说
  novels=$(sqlite3 "$BAK_DB" "SELECT id, title, created_at FROM novels WHERE author_id='$uid' AND deleted_at IS NULL;")
  if [ -n "$novels" ]; then
    echo "  小说:"
    echo "$novels" | while IFS='|' read nid ntitle ncreated; do
      chapters=$(sqlite3 "$BAK_DB" "SELECT COUNT(*) FROM chapters WHERE novel_id='$nid';")
      echo "    📖 $ntitle — $chapters 章 ($ncreated)"
    done
  else
    echo "  小说: 无"
  fi

  # Token
  tokens=$(sqlite3 "$BAK_DB" "SELECT COUNT(*) FROM user_tokens WHERE user_id='$uid';")
  echo "  Token: $tokens 个"
done

# Step 4: 使用 ATTACH 方式直接插入
echo ""
echo "=== [4/5] 开始数据恢复 ==="

# 构建 user_id 列表字符串
UID_LIST="c4fdf6e0-017d-4c29-add1-90f33c000666','49fb5773-4394-4d81-a509-0c2f4be687b7','516eb21d-566d-46b8-84b0-5a0fa0e4a2fa"

sqlite3 "$CUR_DB" << EOF
ATTACH '$BAK_DB' AS bak;

-- 恢复用户
INSERT OR IGNORE INTO users
  (id, username, password, email, role, created_at, nickname, vip_type, vip_expires_at, vip_auto_renew,
   referral_code, referral_count, referral_earnings, creator_score, creator_level,
   total_public_contributions, total_sales_volume, total_rating_sum, total_rating_count)
SELECT
  id, username, password, email, role, created_at, nickname, vip_type, vip_expires_at, vip_auto_renew,
  referral_code, referral_count, referral_earnings, creator_score, creator_level,
  total_public_contributions, total_sales_volume, total_rating_sum, total_rating_count
FROM bak.users
WHERE id IN ('$UID_LIST');
SELECT changes() AS users_inserted;

-- 恢复小说
INSERT OR IGNORE INTO novels
  (id, title, author, author_id, description, cover_url, status, tags, deleted_at,
   retention_days, created_at, updated_at)
SELECT
  id, title, author, author_id, description, cover_url, status, tags, deleted_at,
  retention_days, created_at, updated_at
FROM bak.novels
WHERE author_id IN ('$UID_LIST') AND deleted_at IS NULL;
SELECT changes() AS novels_inserted;

-- 恢复章节
INSERT OR IGNORE INTO chapters
  (id, novel_id, title, content, order_num, branch, word_count, created_at,
   choices, custom_branch_enabled, author_id, author_name)
SELECT
  ch.id, ch.novel_id, ch.title, ch.content, ch.order_num, ch.branch, ch.word_count, ch.created_at,
  ch.choices, ch.custom_branch_enabled, ch.author_id, ch.author_name
FROM bak.chapters ch
JOIN bak.novels n ON ch.novel_id = n.id
WHERE n.author_id IN ('$UID_LIST') AND n.deleted_at IS NULL;
SELECT changes() AS chapters_inserted;

-- 恢复 user_tokens
INSERT OR IGNORE INTO user_tokens
  (id, user_id, token, name, permissions, created_at, last_used, is_active)
SELECT
  id, user_id, token, name, permissions, created_at, last_used, is_active
FROM bak.user_tokens
WHERE user_id IN ('$UID_LIST');
SELECT changes() AS tokens_inserted;

DETACH bak;
EOF

echo ""
echo "✅ 数据恢复完成"

# Step 5: 验证
echo ""
echo "=== [5/5] 验证恢复结果 ==="
for i in "${!USER_IDS[@]}"; do
  uid="${USER_IDS[$i]}"
  uname="${USERNAMES[$i]}"
  row=$(sqlite3 "$CUR_DB" "SELECT id, username, COALESCE(email,'无'), created_at FROM users WHERE id='$uid';")
  if [ -n "$row" ]; then
    echo "  ✅ [$uname] 用户: $row"
    nc=$(sqlite3 "$CUR_DB" "SELECT COUNT(*) FROM novels WHERE author_id='$uid' AND deleted_at IS NULL;")
    echo "     小说数: $nc"
    tc=$(sqlite3 "$CUR_DB" "SELECT COUNT(*) FROM chapters ch JOIN novels n ON ch.novel_id=n.id WHERE n.author_id='$uid' AND n.deleted_at IS NULL;")
    echo "     章节数: $tc"
    tk=$(sqlite3 "$CUR_DB" "SELECT COUNT(*) FROM user_tokens WHERE user_id='$uid';")
    echo "     Token数: $tk"
  else
    echo "  ❌ [$uname] 恢复失败"
  fi
done

echo ""
echo "当前用户总数: $(sqlite3 "$CUR_DB" 'SELECT COUNT(*) FROM users;')"
echo "当前小说总数: $(sqlite3 "$CUR_DB" 'SELECT COUNT(*) FROM novels WHERE deleted_at IS NULL;')"

# 清理
rm -rf "$WORKDIR"
echo ""
echo "✅ 全部完成！"
