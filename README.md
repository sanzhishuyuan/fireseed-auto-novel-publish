# AI小说平台 - 使用说明

## 🎉 部署完成

AI小说平台已成功部署在云电脑上！

---

## 📍 访问地址

### 前台阅读
- **地址**: http://localhost:3000
- **局域网访问**: http://<云电脑IP>:3000

### 管理员后台
- **地址**: http://localhost:3000/admin
- **默认密码**: 请在部署后通过环境变量 `ADMIN_PASSWORD` 设置

---

## 👤 测试账号

### 读者账号
- **用户名**: `testuser`
- **密码**: `test123456`

### 管理员账号
- **密码**: 请通过环境变量 `ADMIN_PASSWORD` 设置
- **访问路径**: http://localhost:3000/admin

### AI授权Token
- **Token**: 请在注册后通过「我的设置」页面获取，或由管理员在后台生成
- **权限**: read,write
- **用途**: 用于外部AI/机器人自动发文

---

## 📚 功能概览

### 读者前台
- ✅ 小说列表浏览
- ✅ 书籍详情页
- ✅ 章节阅读（移动端适配）
- ✅ 收藏书架
- ✅ 章节点赞
- ✅ 全书点赞
- ✅ 章节评论
- ✅ 阅读进度自动保存
- ✅ 个性化阅读设置（字号、行距、护眼/夜间模式）

### 多分支剧情
- ✅ 章节末尾剧情分叉配置
- ✅ 用户选择后跳转对应支线
- ✅ SQLite保存用户分支选择记录

### AI创作后台
- ✅ 管理员密码登录
- ✅ 小说管理（新建/编辑）
- ✅ 章节管理（发布主线/支线）
- ✅ AI Token授权系统
- ✅ 支持外部AI自动发文

### 商业化预留
- ✅ 广告位（开屏、章节内、底部、侧边）
- ✅ 会员体系页面
- ✅ 付费阅读框架

---

## 📁 项目结构

```
/root/ai-novel/
├── app/                    # Next.js App Router
│   ├── page.tsx           # 首页
│   ├── novels/            # 小说阅读
│   ├── auth/              # 登录注册
│   ├── admin/             # AI创作后台
│   ├── vip/              # 会员页面
│   └── api/               # API接口
├── content/novels/        # 小说MD文件
│   └── huozhong-juexing/  # 示例小说
├── data/novel.db          # SQLite数据库
├── lib/                   # 工具函数
└── public/                # 静态资源
```

---

## 🔧 常用命令

```bash
# 查看服务状态
pm2 list

# 重启服务
pm2 restart ai-novel

# 查看日志
pm2 logs ai-novel

# 停止服务
pm2 stop ai-novel

# 启动服务
pm2 start /root/ai-novel/ecosystem.config.js
```

---

## 📝 MD章节格式

```markdown
---
title: 第一章 标题
book: 火种觉醒
order: 1
branch: main
choices:
  - text: "选择与神秘人合作"
    branch: "cooperate"
  - text: "独自探索真相"
    branch: "solo"
---

章节正文内容...
```

---

## 🌐 Nginx配置

反向代理已配置在 `/etc/nginx/sites-available/ai-novel`

```nginx
server {
    listen 80;
    server_name localhost;
    location / {
        proxy_pass http://127.0.0.1:3000;
    }
}
```

---

## 🔐 安全说明

1. **默认密码仅用于测试**，生产环境请修改 `ADMIN_PASSWORD` 环境变量
2. **JWT密钥**使用默认，生产环境请设置 `JWT_SECRET` 环境变量
3. **数据库操作**均使用参数化查询，防止SQL注入
4. **API验证**需要有效的Token或Cookie

---

## 📱 移动端适配

- 响应式设计，完美适配手机屏幕
- 沉浸式阅读模式
- 底部固定工具栏
- 护眼模式/夜间模式切换

---

## 🚀 扩展功能

如需扩展更多功能，可参考以下方向：

1. **支付集成**: 接入微信/支付宝支付
2. **推送通知**: 章节更新提醒
3. **用户画像**: 阅读行为分析
4. **AI创作**: 接入GPT等大模型自动生成内容
5. **社交功能**: 关注、分享、书友圈

---

## ❓ 常见问题

**Q: 服务启动失败？**
```bash
pm2 logs ai-novel  # 查看错误日志
pm2 restart ai-novel  # 重启服务
```

**Q: 无法访问？**
```bash
# 检查防火墙
sudo ufw allow 3000
# 检查端口占用
lsof -i:3000
```

**Q: 如何添加新小说？**
1. 在 `content/novels/` 创建新小说文件夹
2. 创建 `meta.md` 元数据文件
3. 在 `chapters/` 目录添加章节MD文件
4. 在管理员后台创建对应记录

---

## 📞 技术支持

如有问题，请查看 [DEV_LOG.md](DEV_LOG.md) 或提交 Issue。

**技术栈**: Next.js 14 + React 18 + Tailwind CSS + SQLite + PM2 + Nginx

---

## 🔧 开发规范

### Git Hooks（自动安装）
```bash
# 首次克隆后运行（设置 Git hooks 路径）
git config core.hooksPath .githooks
```

### 分支策略
```
dev   ← 开发分支（日常开发在此）
main  ← 稳定版分支（由 dev 合并而来）
```

### 合并流程（dev → main）
1. 在 dev 分支完成开发
2. 更新 `DEV_LOG.md`，记录本次变更
3. `git add DEV_LOG.md && git commit`
4. 发起 Pull Request 或直接合并到 main：
   ```bash
   git checkout main
   git merge dev
   ```
5. **Hook 会自动检查**：如果没有提交修改过 DEV_LOG.md，合并将被拒绝 ❌

### DEV_LOG.md 格式
每次合并到 main 前，必须在 DEV_LOG.md 顶部添加记录：
- 日期：`## YYYY-MM-DD`
- 类型：🐛 Bug修复 / ✨ 新功能 / ⚠️ 警告 / 📝 文档
- 问题 / 根因 / 修复 / 涉及文件 / 经验教训
