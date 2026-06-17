#!/bin/bash
# 封面恢复脚本：匹配备份文件与数据库 cover_url
# 在服务器上执行: bash match-covers.sh
# 自动检测 DATA_DIR 和 DB 文件名

set -e

APP_DIR="/root/ai-novel-lite"

# 自动检测 DATA_DIR
if [ -f "$APP_DIR/ecosystem.config.js" ]; then
  DATA_DIR=$(grep -oP 'DATA_DIR:\s*"[^"]*"' "$APP_DIR/ecosystem.config.js" | grep -oP '"[^"]*"' | tr -d '"' | head -1)
fi
DATA_DIR="${DATA_DIR:-$APP_DIR}"

COVERS_DIR="$DATA_DIR/covers"

# 自动检测 DB 文件名
if [ -f "$DATA_DIR/fireseed.db" ]; then
  DB_PATH="$DATA_DIR/fireseed.db"
elif [ -f "$DATA_DIR/novel.db" ]; then
  DB_PATH="$DATA_DIR/novel.db"
else
  echo "[FATAL] 找不到数据库文件 (尝试了 fireseed.db 和 novel.db)"
  echo "  DATA_DIR=$DATA_DIR"
  ls -la "$DATA_DIR/"*.db 2>/dev/null || echo "  无 .db 文件"
  exit 1
fi

echo "=== 封面恢复脚本 ==="
echo "DATA_DIR: $DATA_DIR"
echo "封面目录: $COVERS_DIR"
echo "数据库: $DB_PATH"
echo ""

# 确保封面目录存在
mkdir -p "$COVERS_DIR"

# 从数据库查询需要封面的小说
COVER_URLS=$(sqlite3 "$DB_PATH" "SELECT id || '|' || cover_url FROM novels WHERE cover_url IS NOT NULL AND cover_url != '' AND cover_url LIKE '/covers/%';" 2>/dev/null)

if [ -z "$COVER_URLS" ]; then
  echo "数据库中没有本地封面 URL 的小说"
  exit 0
fi

MATCHED=0
MISSING=0
FIXED=0

while IFS= read -r row; do
  [ -z "$row" ] && continue
  NOVEL_ID=$(echo "$row" | cut -d'|' -f1)
  COVER_URL=$(echo "$row" | cut -d'|' -f2)
  FILENAME=$(basename "$COVER_URL")
  
  TARGET="$COVERS_DIR/$FILENAME"
  
  if [ -f "$TARGET" ]; then
    echo "[OK] $FILENAME"
    MATCHED=$((MATCHED + 1))
  else
    # 策略1: 在封面目录中按基础 ID 前缀搜索
    FOUND=$(find "$COVERS_DIR" -maxdepth 1 -name "${NOVEL_ID}*" 2>/dev/null | head -1)
    
    # 策略2: 在 /var/data/ai-novel/ 下搜索
    if [ -z "$FOUND" ]; then
      FOUND=$(find /var/data/ai-novel/ -name "${NOVEL_ID}*" 2>/dev/null | head -1)
    fi
    
    # 策略3: 在 /root/ai-novel-lite/data/ 下搜索
    if [ -z "$FOUND" ]; then
      FOUND=$(find "$APP_DIR/data/" -name "${NOVEL_ID}*" 2>/dev/null | head -1)
    fi
    
    if [ -n "$FOUND" ]; then
      echo "[FIX] $(basename "$FOUND") → $FILENAME"
      cp "$FOUND" "$TARGET"
      MATCHED=$((MATCHED + 1))
      FIXED=$((FIXED + 1))
    else
      echo "[MISS] $FILENAME (novel_id=$NOVEL_ID)"
      MISSING=$((MISSING + 1))
    fi
  fi
done <<< "$COVER_URLS"

echo ""
echo "=== 结果 ==="
echo "已有: $MATCHED | 恢复: $FIXED | 缺失: $MISSING"
echo ""
ls -la "$COVERS_DIR/" 2>/dev/null | tail -20
