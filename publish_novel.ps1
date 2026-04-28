# PowerShell脚本发布小说到服务器

$NOVEL_ID = "huozhong-renjian-qilu"
$SERVER_IP = "43.128.134.77"
$SSH_KEY = "C:\Users\Administrator\.ssh\fireseed_key"
$PROJECT_PATH = "/root/ai-novel-lite"

Write-Host "正在发布小说《火种之人间歧路》到服务器..." -ForegroundColor Green

# 读取第一章内容
$CHAPTER_CONTENT = Get-Content "E:\SaiBohuman\赛博卧龙\小说创作\火种之人间歧路\第一章_网络模型生成.md" -Raw

# 创建meta.md内容
$META_CONTENT = @"
---
title: 火种之人间歧路
author: AI创作（全民共创）
description: 这是一本全民参与的现实向共创小说，以高中毕业、志愿择校为故事原点。每一次微小的选择偏差，都会衍生出完全不同的人生轨迹。人生没有标准答案，没有最优解，每一次选择，都是专属自己的人间归途。
status: ongoing
tags: 现实,青春,成长,抉择,人生
created_at: 2026-04-28
---
"@

# 创建章节头
$CHAPTER_HEADER = @"
---
title: 第一章 歧路
book: 火种之人间歧路
order: 1
branch: main
choices:
  - text: "选择复读，明年再战"
    branch: "retry"
  - text: "接受二本，开始大学生活"
    branch: "college"
---
"@

# 完整的章节内容
$FULL_CHAPTER = $CHAPTER_HEADER + "`n`n" + $CHAPTER_CONTENT

Write-Host "1. 创建小说目录结构..." -ForegroundColor Yellow
# 创建目录
ssh -i $SSH_KEY root@$SERVER_IP "mkdir -p $PROJECT_PATH/content/novels/$NOVEL_ID/chapters"
ssh -i $SSH_KEY root@$SERVER_IP "mkdir -p $PROJECT_PATH/content/novels/$NOVEL_ID/branches"

Write-Host "2. 上传meta.md文件..." -ForegroundColor Yellow
# 上传meta.md
echo $META_CONTENT | ssh -i $SSH_KEY root@$SERVER_IP "cat > $PROJECT_PATH/content/novels/$NOVEL_ID/meta.md"

Write-Host "3. 上传第一章..." -ForegroundColor Yellow
# 上传第一章
echo $FULL_CHAPTER | ssh -i $SSH_KEY root@$SERVER_IP "cat > $PROJECT_PATH/content/novels/$NOVEL_ID/chapters/1-qilu.md"

Write-Host "4. 在数据库中插入记录..." -ForegroundColor Yellow
# 在数据库中插入记录
$DB_SCRIPT = @"
  cd $PROJECT_PATH
  
  # 生成UUID
  NOVEL_UUID=\$(node -e "const { v4: uuidv4 } = require('uuid'); console.log(uuidv4());")
  
  # 插入到novels表
  node -e "
  const Database = require('better-sqlite3');
  const db = new Database('data/novel.db');
  
  const sql = \`
    INSERT INTO novels (id, title, author, description, status, tags)
    VALUES (?, ?, ?, ?, ?, ?)
  \`;
  
  const stmt = db.prepare(sql);
  
  try {
    stmt.run(
      '\$NOVEL_UUID',
      '火种之人间歧路',
      'AI创作（全民共创）',
      '这是一本全民参与的现实向共创小说，以高中毕业、志愿择校为故事原点。每一次微小的选择偏差，都会衍生出完全不同的人生轨迹。人生没有标准答案，没有最优解，每一次选择，都是专属自己的人间归途。',
      'ongoing',
      '现实,青春,成长,抉择,人生'
    );
    console.log('数据库记录插入成功，小说ID:', '\$NOVEL_UUID');
  } catch (error) {
    console.error('数据库插入失败:', error.message);
  }
  "
"@

ssh -i $SSH_KEY root@$SERVER_IP $DB_SCRIPT

Write-Host "`n小说发布完成！" -ForegroundColor Green
Write-Host "访问地址: https://fireseed.online/novels/$NOVEL_ID" -ForegroundColor Cyan
Write-Host "或直接访问: https://fireseed.online" -ForegroundColor Cyan