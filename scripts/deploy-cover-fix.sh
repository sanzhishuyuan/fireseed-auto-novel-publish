#!/bin/bash
# 一键部署脚本 v2：原子部署 + 封面修复
# 用法: scp 脚本和产物到服务器后执行
# bash deploy-cover-fix.sh
#
# 关键原则：
#   1. 不覆盖 ecosystem.config.js（服务器配置可能与本地不同）
#   2. 先解压到临时目录，成功后再替换（原子部署）
#   3. 自动检测 DATA_DIR 和 DB 文件名

set -e

APP_DIR="/root/ai-novel-lite"
TARBALL="/root/ai-novel-standalone.tar.gz"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TEMP_DIR="$APP_DIR/.next/standalone_new_$TIMESTAMP"

echo "=== FireSeed 原子部署 v2 ==="
echo "开始时间: $(date)"
echo ""

# 0. 预检查
echo "[0/8] 预检查..."
if [ ! -f "$TARBALL" ]; then
  echo "  [FATAL] 找不到 $TARBALL"
  exit 1
fi
if ! command -v pm2 &>/dev/null; then
  echo "  [FATAL] pm2 未安装"
  exit 1
fi

# 自动检测 DATA_DIR（从服务器 ecosystem.config.js 读取）
if [ -f "$APP_DIR/ecosystem.config.js" ]; then
  DATA_DIR=$(grep -oP 'DATA_DIR:\s*"[^"]*"' "$APP_DIR/ecosystem.config.js" | grep -oP '"[^"]*"' | tr -d '"' | head -1)
fi
DATA_DIR="${DATA_DIR:-$APP_DIR}"
echo "  DATA_DIR = $DATA_DIR"

# 自动检测 DB 文件名
DB_NAME="novel.db"
if [ -f "$DATA_DIR/fireseed.db" ] && [ ! -f "$DATA_DIR/novel.db" ]; then
  DB_NAME="fireseed.db"
fi
echo "  DB = $DATA_DIR/$DB_NAME"

# 1. 解压到临时目录（不影响当前运行）
echo "[1/8] 解压新 standalone 到临时目录..."
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"
tar xzf "$TARBALL" -C "$APP_DIR/.next/" --transform='s|^standalone|standalone_new_'"$TIMESTAMP"'/'
if [ ! -f "$TEMP_DIR/server.js" ]; then
  echo "  [FATAL] 解压后缺少 server.js，产物可能损坏"
  rm -rf "$TEMP_DIR"
  exit 1
fi
echo "  解压成功: $TEMP_DIR"

# 2. 替换 better-sqlite3 原生模块（从当前运行的 standalone 复制 Linux ELF 版本）
echo "[2/8] 替换 better-sqlite3 原生模块..."
CURRENT_NODE="$APP_DIR/.next/standalone/node_modules/better-sqlite3/build/Release/better_sqlite3.node"
NEW_NODE="$TEMP_DIR/node_modules/better-sqlite3/build/Release/better_sqlite3.node"

if [ -f "$CURRENT_NODE" ]; then
  cp "$CURRENT_NODE" "$NEW_NODE"
  echo "  已从当前 standalone 复制原生模块"
elif [ -f "$APP_DIR/node_modules/better-sqlite3/build/Release/better_sqlite3.node" ]; then
  cp "$APP_DIR/node_modules/better-sqlite3/build/Release/better_sqlite3.node" "$NEW_NODE"
  echo "  已从项目 node_modules 复制原生模块"
else
  echo "  [WARN] 未找到 Linux 原生模块，服务可能无法启动"
fi

# 3. 备份当前 standalone
echo "[3/8] 备份当前 standalone..."
BACKUP_DIR="$APP_DIR/standalone_backup_$TIMESTAMP"
if [ -d "$APP_DIR/.next/standalone" ]; then
  cp -r "$APP_DIR/.next/standalone" "$BACKUP_DIR"
  echo "  备份到: $BACKUP_DIR"
else
  echo "  [SKIP] 无现有 standalone"
fi

# 4. 原子替换：停服务 → 替换 → 启服务
echo "[4/8] 停止服务..."
pm2 stop ai-novel

echo "[5/8] 原子替换 standalone..."
rm -rf "$APP_DIR/.next/standalone"
mv "$TEMP_DIR" "$APP_DIR/.next/standalone"
echo "  替换完成"

# 5. 确保封面目录存在
echo "[6/8] 确保封面目录..."
COVERS_DIR="$DATA_DIR/covers"
mkdir -p "$COVERS_DIR"
echo "  封面目录: $COVERS_DIR"

# 6. 运行封面匹配脚本
echo "[7/8] 匹配封面文件..."
if [ -f "$APP_DIR/scripts/match-covers.sh" ]; then
  bash "$APP_DIR/scripts/match-covers.sh" || echo "  [WARN] 封面匹配有错误，但非致命"
else
  echo "  [SKIP] match-covers.sh 不存在"
fi

# 7. 重启服务
echo "[8/8] 重启服务..."
pm2 restart ai-novel --update-env
sleep 3

# === 验证 ===
echo ""
echo "=== 部署验证 ==="

# 检查进程
if pm2 status ai-novel | grep -q "online"; then
  echo "  [OK] PM2 进程在线"
else
  echo "  [FAIL] PM2 进程未启动！尝试回滚..."
  if [ -d "$BACKUP_DIR" ]; then
    rm -rf "$APP_DIR/.next/standalone"
    mv "$BACKUP_DIR" "$APP_DIR/.next/standalone"
    pm2 restart ai-novel --update-env
    echo "  已回滚到上一版本"
  fi
  exit 1
fi

# 测试 API
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/novels 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo "  [OK] API 正常 (HTTP $HTTP_CODE)"
else
  echo "  [WARN] API 返回 HTTP $HTTP_CODE"
fi

# 测试封面
echo "  测试封面路由..."
DB_PATH="$DATA_DIR/$DB_NAME"
COVERS=$(sqlite3 "$DB_PATH" "SELECT cover_url FROM novels WHERE cover_url LIKE '/covers/%' LIMIT 3;" 2>/dev/null || echo "")
if [ -n "$COVERS" ]; then
  for url in $COVERS; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$url" 2>/dev/null)
    echo "    $url -> HTTP $STATUS"
  done
else
  echo "    无本地封面 URL"
fi

# 清理临时文件
rm -rf "$TEMP_DIR" 2>/dev/null

echo ""
echo "=== 部署完成 ==="
echo "结束时间: $(date)"
