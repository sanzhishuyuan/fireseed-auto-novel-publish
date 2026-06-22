#!/bin/bash
cd /root/ai-novel-lite
PID=$(pm2 pid ai-novel)
echo "Old PID: $PID"
kill -9 $PID 2>/dev/null
sleep 2
pm2 start ecosystem.config.js --only ai-novel
sleep 3
pm2 pid ai-novel
