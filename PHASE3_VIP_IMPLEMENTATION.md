# FireSeed VIP 收费系统 - Phase 3 实施文档

## 📊 实施概述

**实施日期**: 2026-05-28  
**实施版本**: v3.5.0  
**实施范围**: Phase 3 VIP 收费系统  
**实施状态**: ✅ 代码完成，待部署测试

---

## 🏗️ 系统架构

### 1. 数据库设计

#### 新增表

**`vip_subscriptions` - VIP 订阅记录表**
- `id` - 订阅ID (TEXT PRIMARY KEY)
- `user_id` - 用户ID (FOREIGN KEY)
- `plan_type` - 套餐类型 (monthly/yearly)
- `start_date` - 开始时间
- `end_date` - 到期时间
- `status` - 状态 (active/cancelled/expired)
- `payment_method` - 支付方式
- `amount` - 支付金额（单位：分）
- `transaction_id` - 关联交易ID
- `created_at` - 创建时间
- `updated_at` - 更新时间

**`payment_transactions` - 支付交易记录表**
- `id` - 交易ID (TEXT PRIMARY KEY)
- `user_id` - 用户ID
- `order_no` - 订单号（唯一）
- `amount` - 金额（单位：分）
- `currency` - 货币类型（默认 CNY）
- `payment_method` - 支付方式
- `status` - 状态 (pending/paid/failed)
- `transaction_id` - 第三方交易ID
- `callback_data` - 回调数据
- `paid_at` - 支付时间
- `created_at` - 创建时间
- `updated_at` - 更新时间

**`vip_benefits` - VIP 权益配置表**
- `id` - 权益ID
- `plan_type` - 套餐类型
- `benefit_key` - 权益键名
- `benefit_value` - 权益值
- `description` - 权益描述
- `created_at` - 创建时间

#### users 表新增字段
- `vip_type` - VIP 类型 (free/monthly/yearly)
- `vip_expires_at` - VIP 到期时间
- `vip_auto_renew` - 自动续费开关

---

### 2. API 接口设计

#### VIP 相关接口

| 接口 | 方法 | 描述 | 认证要求 |
|------|------|------|----------|
| `/api/vip/status` | GET | 获取用户 VIP 状态 | ✅ 需要 |
| `/api/vip/subscribe` | POST | 订阅 VIP | ✅ 需要 |
| `/api/vip/benefits` | GET | 获取 VIP 权益配置 | ❌ 公开 |
| `/api/vip/manage` | GET/POST | 管理 VIP（查询/取消） | ✅ 需要 |

#### 支付相关接口

| 接口 | 方法 | 描述 | 认证要求 |
|------|------|------|----------|
| `/api/payment/create` | POST | 创建支付订单 | ✅ 需要 |
| `/api/payment/callback` | GET/POST | 支付回调 | ❌ 公开 |
| `/api/payment/list` | GET | 查询订单列表 | ✅ 需要 |

#### 认证接口

| 接口 | 方法 | 描述 | 认证要求 |
|------|------|------|----------|
| `/api/auth/me` | GET | 获取当前用户信息 | ✅ 需要 |

---

### 3. 前端页面

#### 升级页面

**`app/vip/page.tsx` - VIP 中心页面**
- ✅ 连接真实后端 API
- ✅ 显示用户 VIP 状态
- ✅ 套餐购买功能
- ✅ 支持 SEED 代币支付
- ✅ 加载状态和错误处理
- ✅ 当前套餐高亮显示

---

## 💰 支付集成方案

### 阶段一（MVP - 当前实施）

**SEED 代币支付**
- 利用现有 `tokens` 表
- 扣除用户 SEED 余额
- 即时到账，无需第三方

**模拟支付流程**
- 创建订单记录
- 返回模拟支付链接
- 用于开发和测试

### 阶段二（生产环境）

**微信支付**
- 需要微信支付商户号
- 配置支付回调 URL
- 支持 Native 支付（二维码）

**支付宝支付**
- 需要支付宝商户号
- 配置支付回调 URL
- 支持电脑网站支付

---

## 🚀 部署步骤

### 1. 上传代码到服务器

```bash
# 在本地执行
cd /e/SaiBohuman/赛博卧龙/小说创作/ai-novel-lite
git add .
git commit -m "feat: Phase 3 VIP收费系统实施"
git push gitee master

# 在服务器上执行
ssh root@43.128.134.77 -i ~/.ssh/fireseed_key
cd /root/ai-novel-lite
git pull gitee master
```

### 2. 安装依赖（如需要）

```bash
cd /root/ai-novel-lite
npm install
```

### 3. 构建项目

```bash
npm run build
```

### 4. 重启 PM2

```bash
pm2 restart ai-novel-lite
pm2 logs ai-novel-lite --lines 50
```

### 5. 验证部署

```bash
# 检查 API 是否正常
curl https://fireseed.online/api/vip/benefits

# 检查数据库表是否创建
sqlite3 data/novel.db ".tables"

# 检查 VIP 权益数据
sqlite3 data/novel.db "SELECT * FROM vip_benefits;"
```

---

## 🧪 测试计划

### 1. 单元测试

- [ ] 数据库迁移测试
- [ ] VIP 状态查询测试
- [ ] 订阅流程测试
- [ ] 支付回调测试

### 2. 集成测试

- [ ] 完整订阅流程（免费 → VIP）
- [ ] VIP 到期自动重置
- [ ] SEED 代币扣除
- [ ] 订单创建和查询

### 3. 手动测试

- [ ] 访问 `/vip` 页面
- [ ] 登录后查看 VIP 状态
- [ ] 点击订阅按钮
- [ ] 使用 SEED 支付
- [ ] 验证 VIP 权益生效

---

## 📝 已知问题和限制

### 1. 本地开发环境

**问题**: Windows 环境下 `better-sqlite3` 需要 Visual Studio 编译工具  
**解决方案**: 在服务器（Linux）上构建和测试  
**影响**: 本地无法 `npm run build`，但不影响服务器部署

### 2. 支付集成

**当前状态**: 仅实现 SEED 代币支付  
**待实施**: 微信支付、支付宝支付集成  
**优先级**: 中（MVP 阶段可使用 SEED 代币）

### 3. VIP 权益校验

**当前状态**: 前端展示权益，后端未做权限校验  
**待实施**: 在 API 层增加 VIP 权限校验中间件  
**优先级**: 高（安全相关）

---

## 🔧 后续优化方向

### 1. 安全加固

- [ ] 添加 VIP 权限校验中间件
- [ ] 防止重复支付
- [ ] 订单号防碰撞
- [ ] SQL 注入防护（使用参数化查询）

### 2. 功能完善

- [ ] 微信支付集成
- [ ] 支付宝支付集成
- [ ] 退款功能
- [ ] 发票申请
- [ ] VIP 权益详细配置后台

### 3. 用户体验

- [ ] 支付成功页面
- [ ] 订单详情页面
- [ ] VIP 到期提醒
- [ ] 自动续费管理页面

---

## 📊 数据库种子数据

### VIP 权益配置

**免费用户**
- `read_main_story`: 免费阅读主线章节
- `basic_settings`: 基础阅读设置
- `chapter_like`: 章节点赞

**高级会员**
- `unlock_branches`: 解锁全部分支剧情
- `ad_free`: 无广告阅读体验
- `exclusive_themes`: 专属阅读主题
- `priority_read`: 优先阅读新章节
- `unlimited_favorites`: 无限收藏

**年度会员**
- `all_monthly_benefits`: 高级会员全部权益
- `unlock_paid_chapters`: 解锁付费章节
- `exclusive_identity`: 专属身份标识
- `annual_events`: 年度专属活动
- `exclusive_voting`: 专属创作投票权

---

## ✅ 实施检查清单

- [x] 数据库表设计
- [x] 数据库迁移脚本
- [x] 种子数据插入
- [x] VIP 状态查询 API
- [x] VIP 订阅 API
- [x] VIP 权益查询 API
- [x] 支付订单创建 API
- [x] 支付回调 API
- [x] 订单列表查询 API
- [x] VIP 管理 API
- [x] 用户信息安全 API
- [x] VIP 前端页面升级
- [x] SEED 代币支付集成
- [ ] 微信支付集成（待实施）
- [ ] 支付宝支付集成（待实施）
- [ ] VIP 权限校验中间件（待实施）
- [ ] 部署到服务器（待执行）
- [ ] 功能测试（待执行）

---

## 📞 联系和支持

**实施者**: AI Assistant  
**项目**: FireSeed (fireseed.online)  
**用户**: 赛博卧龙  
**日期**: 2026-05-28

---

**文档版本**: v1.0  
**最后更新**: 2026-05-28
