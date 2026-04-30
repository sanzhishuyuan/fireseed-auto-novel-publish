# ai-novel-lite — 腾讯云部署与长期管理计划

> 文档版本：v1.3 | 创建时间：2026-04-27 | 更新：2026-04-30

> ⚠️ **【重要】数据库保护警告**
>
> `npm run build` 会重新初始化 SQLite 数据库，**所有用户数据会丢失**。
> 部署必须使用项目根目录下的 `build-and-deploy.sh` 脚本（自动备份+恢复）。
> 详见章节 **4.3 上传项目**。

---

## 一、项目概况

| 项目 | 说明 |
|------|------|
| 技术栈 | Next.js 14 + React 18 + TypeScript + Tailwind CSS |
| 数据层 | SQLite (better-sqlite3) + Markdown 文件 |
| 进程管理 | PM2 |
| 反向代理 | Nginx |
| 监听端口 | 3000（Node），80（Nginx） |
| 构建产物 | `output: 'standalone'`（独立可运行目录） |

---

## 二、安全问题清单（上线前必须处理）

| 优先级 | 问题 | 修复方法 |
|--------|------|---------|
| 🔴 P0 | 管理员密码存于 Cookie 明文值 | 改为 JWT 或 hmac-sha256 签名 |
| 🔴 P0 | JWT_SECRET 默认硬编码 | 生产必须设置环境变量 |
| 🔴 P0 | ADMIN_PASSWORD 默认 `admin123456` | 生产必须设置环境变量 |
| 🟡 P1 | README 中 AI Token 泄露 | 上线后重新生成并删除 README 中明文 |
| 🟡 P1 | 无速率限制（登录/注册接口） | 加 `next-rate-limit` 或 Nginx 限流 |
| 🟡 P1 | SQLite 数据库文件放在项目目录内 | 迁移到项目外持久化路径 |
| 🟢 P2 | 无 HTTPS | 腾讯云申请免费 SSL + Nginx 配置 |

---

## 三、腾讯云推荐部署方案

### 方案 A — 轻量应用服务器（推荐，最简单）

**适合**：个人项目、低并发（< 1000 DAU）

```
腾讯云轻量服务器（2C2G / 2C4G）
  └── Ubuntu 22.04
        ├── Node.js 20.x
        ├── PM2（进程守护）
        ├── Nginx（80/443 → 3000）
        └── 定期备份到 COS 对象存储
```

**推荐配置**：2核4G / 40G SSD / 5M带宽 ≈ ¥50-100/月

---

### 方案 B — CVM 云服务器（弹性扩容）

**适合**：中等规模，未来可能接入 CDN / 负载均衡

配置与方案 A 相同，但可随时升级配置、挂载云硬盘、接入 CLB。

---

### 方案 C — 容器化部署（Docker + TKE）

**适合**：有 DevOps 经验，多环境管理

需先编写 Dockerfile（见第五节），然后推到腾讯云容器镜像服务，再用 TKE 或 CVM+Docker 运行。

---

## 四、部署操作步骤（方案 A 详细版）

### 4.1 购买服务器

1. 登录腾讯云控制台 → 轻量应用服务器 → 新建实例
2. 选择 **Ubuntu 22.04 LTS**（不选预装应用镜像）
3. 带宽建议 ≥ 5Mbps，磁盘 ≥ 40GB
4. 配置安全组：开放 22(SSH)、80(HTTP)、443(HTTPS)、3000（可选调试）

### 4.2 服务器初始化

```bash
# 登录服务器（替换 YOUR_IP）
ssh root@YOUR_IP

# 更新系统
apt update && apt upgrade -y

# 安装 Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 验证
node -v && npm -v

# 安装 PM2
npm install -g pm2

# 安装 Nginx
apt install -y nginx

# 安装 Git（如需从 Git 拉代码）
apt install -y git
```

### 4.3 上传项目

> ⚠️ **⚠️ 部署必须使用 `build-and-deploy.sh` 脚本！⚠️**
>
> `npm run build` 会重新初始化数据库。**必须先备份数据，否则所有用户数据（小说、用户、章节）会丢失！**
>
> **禁止直接运行 `npm run build` 后手动上传 standalone 目录！**

**方式一（推荐）：服务器端一键部署**

```bash
# 服务器上运行（自动处理数据备份）
cd /root/ai-novel-lite
git pull  # 或上传修改后的文件
./build-and-deploy.sh
```

脚本功能：
1. 自动备份当前数据库到 `/var/data/ai-novel/novel.db.rollback_YYYYMMDD_HHMMSS`
2. 执行 `npm run build`
3. 恢复数据库（覆盖构建产生的新 DB）
4. 复制 `.next/static` 到 standalone 目录
5. 设置符号链接
6. 重启 PM2

**方式二：使用 Git 拉代码 + 脚本**

```bash
# 服务器上
cd /root
git clone https://YOUR_REPO_URL ai-novel
cd ai-novel
npm install
./build-and-deploy.sh
```

**方式三（不推荐，已废弃）**

```bash
# 本地先构建
cd E:\SaiBohuman\赛博卧龙\小说创作\ai-novel-lite
npm install
npm run build

# ⚠️ 必须手动备份数据库！
# 从服务器下载备份：
scp root@YOUR_IP:/var/data/ai-novel/data/novel.db ./data/novel.db.backup

# 上传 standalone 构建产物
scp -r .next/standalone root@YOUR_IP:/root/ai-novel-lite/

# ⚠️ 恢复数据库（上传前先备份！）
scp ./data/novel.db.backup root@YOUR_IP:/var/data/ai-novel/data/novel.db

# ⚠️ 必须手动复制静态资源！
scp -r .next/static root@YOUR_IP:/root/ai-novel-lite/.next/standalone/.next/

# 重启
pm2 restart ai-novel
```

### 4.4 配置环境变量

```bash
# 服务器上创建 .env.production
cat > /root/ai-novel/.env.production << 'EOF'
NODE_ENV=production
JWT_SECRET=【替换为随机64字符字符串】
ADMIN_PASSWORD=【替换为强密码】
NEXT_PUBLIC_URL=https://【你的域名或IP】
EOF

# 生成随机密钥（在服务器上执行）
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4.5 修改 ecosystem.config.js

将 `cwd` 路径修改为服务器上的实际路径，并添加环境变量加载：

```javascript
module.exports = {
  apps: [{
    name: 'ai-novel',
    script: 'server.js',           // standalone 模式使用 server.js
    cwd: '/root/ai-novel',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '800M',
    env_file: '/root/ai-novel/.env.production',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOSTNAME: '0.0.0.0'
    },
    error_file: '/var/log/ai-novel/error.log',
    out_file: '/var/log/ai-novel/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
```

### 4.6 数据库初始化

```bash
# 确保 data 目录存在
mkdir -p /root/ai-novel/data

# 初始化数据库（如果是全新部署）
cd /root/ai-novel
node lib/init-db.js
```

### 4.7 启动应用

```bash
# 创建日志目录
mkdir -p /var/log/ai-novel

# 启动
cd /root/ai-novel
pm2 start ecosystem.config.js

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status
pm2 logs ai-novel --lines 50
```

### 4.8 配置 Nginx

```bash
cat > /etc/nginx/sites-available/ai-novel << 'EOF'
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    # 限制请求频率（防 CC 攻击）
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;

    location /api/auth/ {
        limit_req zone=api burst=10 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }

    # 静态资源缓存
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # 上传文件大小限制
    client_max_body_size 10M;
}
EOF

# 启用配置
ln -sf /etc/nginx/sites-available/ai-novel /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 4.9 配置 HTTPS（腾讯云免费 SSL）

1. 腾讯云控制台 → SSL 证书 → 申请免费证书（域名型）
2. 完成 DNS 验证后下载 Nginx 格式证书
3. 上传证书到服务器：

```bash
mkdir -p /etc/nginx/ssl
scp YOUR_CERT.pem root@YOUR_IP:/etc/nginx/ssl/
scp YOUR_KEY.key root@YOUR_IP:/etc/nginx/ssl/
```

4. 修改 Nginx 配置，添加 HTTPS：

```nginx
server {
    listen 443 ssl;
    server_name YOUR_DOMAIN;
    ssl_certificate /etc/nginx/ssl/YOUR_CERT.pem;
    ssl_certificate_key /etc/nginx/ssl/YOUR_KEY.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    # ... 其余配置与 HTTP 相同
}

# HTTP 强制跳转 HTTPS
server {
    listen 80;
    server_name YOUR_DOMAIN;
    return 301 https://$host$request_uri;
}
```

---

## 五、Dockerfile（容器化可选）

如需 Docker 部署，在项目根目录创建此文件：

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/content ./content

RUN mkdir -p /app/data && chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000
ENV PORT 3000 HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

---

## 六、数据备份策略

### 自动备份脚本

```bash
cat > /root/backup-novel.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/root/backups/ai-novel"
mkdir -p $BACKUP_DIR

# 备份数据库
cp /root/ai-novel/data/novel.db $BACKUP_DIR/novel_$DATE.db

# 备份 content 目录
tar czf $BACKUP_DIR/content_$DATE.tar.gz -C /root/ai-novel content

# 保留最近 30 天的备份，删除更早的
find $BACKUP_DIR -name "*.db" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "[$DATE] 备份完成" >> /var/log/ai-novel-backup.log
EOF

chmod +x /root/backup-novel.sh

# 每天凌晨 3 点自动备份
(crontab -l 2>/dev/null; echo "0 3 * * * /root/backup-novel.sh") | crontab -
```

### 上传到腾讯云 COS（可选）

```bash
# 安装 coscli
wget https://cosbrowser.cloud.tencent.com/software/coscli/coscli-linux -O /usr/local/bin/coscli
chmod +x /usr/local/bin/coscli
coscli config init  # 按提示填入 SecretId/SecretKey

# 每天备份完后同步到 COS
# 在 backup-novel.sh 末尾追加：
# coscli sync $BACKUP_DIR cos://your-bucket/ai-novel-backup/
```

---

## 七、长期运维管理计划

### 7.1 日常监控

| 检查项 | 频率 | 命令 |
|--------|------|------|
| 服务状态 | 每日 | `pm2 status` |
| 错误日志 | 每日 | `pm2 logs ai-novel --err --lines 100` |
| 磁盘空间 | 每周 | `df -h` |
| 内存占用 | 每周 | `free -m` / `pm2 monit` |
| Nginx 日志 | 每周 | `tail -n 200 /var/log/nginx/access.log` |
| 数据库大小 | 每月 | `ls -lh /root/ai-novel/data/novel.db` |

### 7.2 常用运维命令速查

```bash
# === 应用管理 ===
pm2 status                    # 查看状态
pm2 restart ai-novel          # 重启服务
pm2 reload ai-novel           # 零停机重载
pm2 stop ai-novel             # 停止服务
pm2 logs ai-novel             # 实时日志
pm2 logs ai-novel --lines 200 # 查看最近200行
pm2 monit                     # 资源监控面板

# === 代码更新部署 ===
# 1. 本地构建
npm run build

# 2. 上传新构建产物（覆盖旧版本）
scp -r .next/standalone root@YOUR_IP:/root/ai-novel-new
# 切换并重启（建议蓝绿部署）

# === 数据库维护 ===
sqlite3 /root/ai-novel/data/novel.db ".tables"
sqlite3 /root/ai-novel/data/novel.db ".schema users"
sqlite3 /root/ai-novel/data/novel.db "SELECT COUNT(*) FROM users;"

# === Nginx 管理 ===
nginx -t                      # 配置检查
systemctl reload nginx        # 重载配置
systemctl restart nginx       # 完全重启
tail -f /var/log/nginx/error.log   # 错误日志

# === 手动备份 ===
/root/backup-novel.sh

# === 防火墙 ===
ufw status
ufw allow 80/tcp
ufw allow 443/tcp
```

### 7.3 版本更新流程（SOP）

> ⚠️ **`npm run build` 会重新初始化数据库！所有数据会丢失！必须使用脚本！**

```
1. 本地开发测试
   → 2. 推送代码到服务器（或上传修改的文件）
   → 3. 服务器端运行 ./build-and-deploy.sh（自动备份+构建+恢复+重启）
   → 4. 访问网站验证功能正常
   → 5. 观察 PM2 日志 5 分钟确认无异常

回滚（如有问题）：
   cp /var/data/ai-novel/novel.db.rollback_* /var/data/ai-novel/data/novel.db
   pm2 restart ai-novel
```

**⚠️ 常见踩坑：**

| 问题 | 原因 | 解决 |
|------|------|------|
| 构建后数据全部消失 | 直接 `npm run build` 后手动上传 standalone | 使用 `build-and-deploy.sh` |
| CSS 样式丢失 | standalone 未复制 `.next/static` | 脚本自动处理 |
| PM2 读取旧代码 | 未重启 PM2 | `pm2 restart ai-novel` |
| 符号链接失效 | standalone 重装后 data 目录重建 | 脚本自动重建链接 |

### 7.4 内容更新流程（添加新小说/章节）

**方式一：通过管理后台（推荐）**
1. 访问 `https://YOUR_DOMAIN/admin`
2. 输入管理员密码
3. 在「小说管理」创建新小说
4. 在「章节管理」发布章节

**方式二：直接上传 Markdown 文件**
```bash
# 在服务器上创建新小说目录
mkdir -p /root/ai-novel/content/novels/NEW_NOVEL_ID/{chapters,branches}

# 创建 meta.md
cat > /root/ai-novel/content/novels/NEW_NOVEL_ID/meta.md << 'EOF'
---
title: 小说标题
author: 作者名
description: 小说简介
status: ongoing
tags: 标签1,标签2
created_at: 2026-04-27
---
EOF

# 上传章节文件（从本地）
scp chapters/*.md root@YOUR_IP:/root/ai-novel/content/novels/NEW_NOVEL_ID/chapters/

# 无需重启，Next.js 动态读取文件
```

### 7.5 故障应急预案

| 故障 | 诊断 | 处理 |
|------|------|------|
| 网站无法访问 | `pm2 status` + `nginx -t` | `pm2 restart ai-novel && systemctl restart nginx` |
| 内存溢出 | `pm2 monit` | 调低 `max_memory_restart`，考虑升级服务器 |
| 数据库损坏 | `sqlite3 data/novel.db "PRAGMA integrity_check;"` | 从最近备份恢复 |
| 磁盘满 | `df -h && du -sh /*` | 清理旧备份、日志，或扩容磁盘 |
| 构建失败 | `npm run build 2>&1` | 检查 TypeScript 报错，回滚到上一个版本 |

---

## 八、未来功能扩展路线图

| 阶段 | 功能 | 技术方案 |
|------|------|---------|
| 近期 | HTTPS 启用 | 腾讯云免费 SSL |
| 近期 | 安全加固 | 修复 P0 安全问题 |
| 中期 | 微信支付 | 腾讯云微信支付 SDK |
| 中期 | 推送通知 | 腾讯云 TPNS |
| 中期 | 图片封面 | 腾讯云 COS + CDN |
| 远期 | 数据库迁移 | SQLite → TencentDB MySQL |
| 远期 | CDN 加速 | 腾讯云 CDN（静态资源） |
| 远期 | 监控告警 | 腾讯云 Cloud Monitor |

---

## 九、费用估算

| 服务 | 配置 | 月费（参考） |
|------|------|------------|
| 轻量应用服务器 | 2C4G/40G/5M | ¥50-100 |
| 域名 | .com/.cn | ¥50-80/年 |
| SSL 证书 | 免费（腾讯云） | ¥0 |
| COS 备份 | 50GB | ¥5 |
| **合计** | | **约 ¥60-110/月** |

---

*最后更新：2026-04-27 | 维护者：赛博卧龙*
