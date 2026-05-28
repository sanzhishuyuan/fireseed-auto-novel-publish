# 众筹 + VIP增强 + 推广链接系统 实施总览

**实施日期**: 2026-05-28  
**版本**: v3.6.0  
**状态**: ✅ 代码实施完成，待部署测试

---

## 一、三大系统架构

```
┌─────────────────────────────────────────────────┐
│              FireSeed 经济闭环                    │
├─────────────────────────────────────────────────┤
│                                                   │
│  众筹系统  ────  SEED代币  ────  推广系统         │
│  (作者创作)       ↑↓        (用户拉新)           │
│     ↕              ↕            ↕                │
│     VIP增强 ──── 更多权益 ──── 奖励加成           │
│                                                   │
└─────────────────────────────────────────────────┘
```

---

## 二、数据库设计

### 新增表

| 表名 | 用途 | 核心字段 |
|------|------|----------|
| `crowdfunding_projects` | 众筹项目 | id, author_id, title, target_amount, current_amount, deadline, status |
| `crowdfunding_supporters` | 众筹支持者 | id, project_id, user_id, amount |
| `referral_codes` | 推广码 | id, user_id, code, total_uses, successful_uses |
| `referral_redemptions` | 推广兑换记录 | id, referral_code, referrer_id, new_user_id, status, reward_given |

### users 表新增字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `referral_code` | TEXT | 用户推广码 |
| `referral_count` | INTEGER | 成功推广次数 |
| `referral_earnings` | INTEGER | 推广总收益 |

---

## 三、API 接口

### 众筹系统

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/crowdfunding/list` | GET | 众筹项目列表 |
| `/api/crowdfunding/create` | POST | 创建众筹项目 |
| `/api/crowdfunding/support` | POST | 支持众筹（扣SEED） |

### 推广系统

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/referral/code` | GET | 获取/生成推广码 |
| `/api/referral/code` | POST | 查询推广码信息 |
| `/api/referral/stats` | GET | 推广统计 |
| `/api/referral/redeem` | POST | 兑换推广码 |

### 认证增强

| 接口 | 变更 | 说明 |
|------|------|------|
| `/api/auth/register` | POST (增强) | 新增 referralCode 参数 |

---

## 四、前端页面

| 页面 | 路径 | 功能 |
|------|------|------|
| 众筹中心 | `/crowdfunding` | 众筹列表、创建、支持 |
| 推广中心 | `/referral` | 推广码、统计、分享 |
| 会员中心 | `/vip` (增强) | 新增众筹/推广入口 |

### 注册页增强

| 功能 | 说明 |
|------|------|
| URL参数 `?ref=XXXXXX` | 自动识别推广码 |
| 推广码输入框 | 手动输入 + 实时验证 |
| 成功提示 | 显示推广奖励信息 |

---

## 五、经济模型

### 推广奖励

| 角色 | 奖励 | 说明 |
|------|------|------|
| 推荐人（普通） | 50 SEED | 基础奖励 |
| 推荐人（高级会员） | 75 SEED | VIP 1.5x 加成 |
| 推荐人（年度会员） | 100 SEED | VIP 2x 加成 |
| 新用户 | 30 SEED + 3天VIP | 注册即得 |

### 众筹经济

| 参与者 | 收支 | 比例 |
|--------|------|------|
| 支持者 | 支出 SEED | 100% |
| 作者 | 收入 SEED | 90%（扣除10%平台费） |
| 平台 | 收入 SEED | 10% 平台费 |

---

## 六、经济闭环

```
推广拉新 → 新用户获SEED+VIP试用
    ↓
新用户阅读 → 点赞投票 → 获得SEED
    ↓
用SEED支持众筹 → 作者获得创作资金
    ↓
作者更新章节 → 内容增长 → 平台价值提升
    ↓
老用户分享推广 → 继续拉新（VIP推广加成）
```

---

## 七、文件清单

### 新增文件

| 文件 | 行数 | 说明 |
|------|------|------|
| `app/api/crowdfunding/list/route.ts` | ~70 | 众筹列表API |
| `app/api/crowdfunding/create/route.ts` | ~60 | 创建众筹API |
| `app/api/crowdfunding/support/route.ts` | ~110 | 支持众筹API |
| `app/api/referral/code/route.ts` | ~100 | 推广码API |
| `app/api/referral/stats/route.ts` | ~80 | 推广统计API |
| `app/api/referral/redeem/route.ts` | ~110 | 兑换推广码API |
| `app/crowdfunding/page.tsx` | ~290 | 众筹前端页面 |
| `app/referral/page.tsx` | ~240 | 推广前端页面 |

### 修改文件

| 文件 | 说明 |
|------|------|
| `lib/db.ts` | 新增4张表 + 字段迁移 + VIP增强权益 |
| `app/api/auth/register/route.ts` | 新增referralCode支持 |
| `app/auth/register/page.tsx` | 新增推广码输入+验证 |
| `app/vip/page.tsx` | 新增众筹/推广入口导航 |

---

## 八、部署步骤

```bash
# 1. 提交代码到 Git
cd /e/SaiBohuman/赛博卧龙/小说创作/ai-novel-lite
git add .
git commit -m "feat: 众筹+推广+VIP增强系统实施"
git push gitee master

# 2. 服务器拉取
ssh root@43.128.134.77 -i ~/.ssh/fireseed_key
cd /root/ai-novel-lite
git pull gitee master
npm run build
pm2 restart ai-novel-lite

# 3. 验证
curl https://fireseed.online/api/crowdfunding/list?status=active
curl https://fireseed.online/api/referral/code
```

---

**文档版本**: v1.0  
**最后更新**: 2026-05-28
