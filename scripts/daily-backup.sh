#!/bin/bash
# ============================================================
# daily-backup.sh — FireSeed 每日自动备份编排
# ============================================================
# 由 cron 每日凌晨 3:00 触发
# 流程: 本地备份 → Gitee 异地备份 → 结果通知
# ============================================================

set -euo pipefail

PROJECT_DIR="/root/ai-novel-lite"
LOG_FILE="/var/log/ai-novel/daily-backup.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

mkdir -p "$(dirname "$LOG_FILE")"

echo ""
echo "============================================"
echo "  Daily Backup — $TIMESTAMP"
echo "============================================"
echo ""

# ---- Step 1: 本地备份 ----
echo "[1/3] 本地数据库备份..."
LOCAL_OK=0
if bash "$PROJECT_DIR/scripts/auto-backup.sh" >> "$LOG_FILE" 2>&1; then
  echo "  ✅ 本地备份完成"
  LOCAL_OK=1
else
  echo "  ⚠️  本地备份失败（查看日志: $LOG_FILE）"
fi

# ---- Step 2: Gitee 异地备份 ----
echo "[2/3] Gitee 异地备份..."
GITEE_OK=0
if bash "$PROJECT_DIR/scripts/gitee-db-backup.sh" --quiet --scheduled >> "$LOG_FILE" 2>&1; then
  echo "  ✅ Gitee 备份完成"
  GITEE_OK=1
else
  echo "  ⚠️  Gitee 备份失败（查看日志: /var/log/ai-novel/gitee-backup.log）"
fi

# ---- Step 3: 结果报告 ----
echo ""
echo "[3/3] 备份结果:"
echo "  本地备份: $([ $LOCAL_OK -eq 1 ] && echo '✅' || echo '❌')"
echo "  Gitee备份: $([ $GITEE_OK -eq 1 ] && echo '✅' || echo '❌')"

if [ $LOCAL_OK -eq 1 ] && [ $GITEE_OK -eq 1 ]; then
  echo ""
  echo "✅ 全部备份完成"
  echo "============================================"
  exit 0
else
  echo ""
  echo "⚠️  部分备份失败，请检查日志"
  echo "============================================"
  exit 1
fi
