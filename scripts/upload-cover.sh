#!/bin/bash
# upload-cover.sh - 服务端封面上传脚本
# 用法: ./upload-cover.sh <novel_id> <image_path> [ext]
# 示例: ./upload-cover.sh novel_1777900500840_wwyemkb /tmp/cover.jpg jpg
# 创建日期: 2026-05-05

set -euo pipefail

NOVEL_ID="${1:?用法: $0 <novel_id> <image_path> [ext]}"
IMAGE_PATH="${2:?用法: $0 <novel_id> <image_path> [ext]}"
EXT="${3:-jpg}"
COVERS_DIR="/var/data/ai-novel/covers"
DB="/root/ai-novel-lite/data/novel.db"

echo "========================================"
echo "  Fireseed 封面上传脚本"
echo "========================================"
echo "小说ID:  $NOVEL_ID"
echo "图片路径: $IMAGE_PATH"
echo "扩展名:   $EXT"
echo ""

# 1. 检查图片文件
if [ ! -f "$IMAGE_PATH" ]; then
  echo "❌ 图片文件不存在: $IMAGE_PATH"
  exit 1
fi

# 2. 自动检测扩展名 (如果传 auto)
if [ "$EXT" = "auto" ]; then
  MIME=$(file --mime-type -b "$IMAGE_PATH")
  case "$MIME" in
    image/jpeg) EXT="jpg" ;;
    image/png)  EXT="png" ;;
    image/webp) EXT="webp" ;;
    image/gif)  EXT="gif" ;;
    *) echo "❌ 不支持的图片格式: $MIME"; exit 1 ;;
  esac
  echo "🔍 自动检测扩展名: $EXT"
fi

# 3. 确保封面目录存在
mkdir -p "$COVERS_DIR"

# 4. 复制到封面目录
cp "$IMAGE_PATH" "$COVERS_DIR/$NOVEL_ID.$EXT"
echo "✅ 封面已复制: $COVERS_DIR/$NOVEL_ID.$EXT"

# 5. 更新数据库
NODE_PATH=/root/ai-novel-lite/node_modules \
  node -e "
    const db = require('better-sqlite3')('$DB');
    const info = db.prepare('SELECT id, title FROM novels WHERE id = ?').get('$NOVEL_ID');
    if (!info) {
      console.log('❌ 小说不存在: $NOVEL_ID');
      process.exit(1);
    }
    db.prepare('UPDATE novels SET cover_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run('/covers/$NOVEL_ID.$EXT', '$NOVEL_ID');
    db.close();
    console.log('✅ 数据库已更新: /covers/$NOVEL_ID.$EXT');
    console.log('📖 小说: ' + info.title);
  "

# 6. 验证
echo ""
echo "🔍 验证封面可访问性..."
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' "https://fireseed.online/covers/$NOVEL_ID.$EXT")
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ 封面可正常访问 (HTTP $HTTP_CODE)"
  echo "   https://fireseed.online/covers/$NOVEL_ID.$EXT"
else
  echo "⚠️ 封面返回 HTTP $HTTP_CODE，可能需要检查"
fi

echo ""
echo "========================================"
echo "  ✅ 完成"
echo "========================================"
