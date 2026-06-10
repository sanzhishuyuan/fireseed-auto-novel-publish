# 经济体系升级实施进度

> 开始时间：2026-06-10  
> 当前阶段：Phase 1 - 任务系统基础

---

## 已完成工作

### ✅ 1. 方案设计与规划

**文件**: [ECONOMY_UPGRADE_PLAN.md](file://e:\SaiBohuman\赛博卧龙\小说创作\ai-novel-lite\ECONOMY_UPGRADE_PLAN.md)

完成了完整的经济体系升级方案设计，包括：

- **核心功能设计**：
  - 读者发布小说任务（Task Marketplace）
  - 作者接单并获得SEED奖励
  - 众筹小说功能激活
  
- **数据库设计**：
  - novel_tasks表结构
  - crowdfunding_updates表
  - crowdfunding_rewards表
  - 现有表的字段补充
  
- **API设计**：
  - 任务系统7个核心API
  - 众筹系统5个核心API
  
- **经济模型计算**：
  - 日/月流水预测
  - SEED周转率分析
  - 通缩压力测试
  
- **风险控制**：
  - 经济风险（通胀、欺诈、跑路）
  - 技术风险（并发、定时任务、数据一致性）
  
- **实施计划**：
  - Phase 1: 任务系统基础（2周）
  - Phase 2: 众筹系统激活（2周）
  - Phase 3: 经济平衡优化（1周）
  - Phase 4: 高级功能（2周）

### ✅ 2. 数据库迁移

**文件**: [lib/db.ts](file://e:\SaiBohuman\赛博卧龙\小说创作\ai-novel-lite\lib\db.ts)

已完成数据库表结构创建：

#### 新增表
1. **novel_tasks** - 小说任务表
   - 包含发布者、预算、状态、接单人等字段
   - 3个索引优化查询性能

2. **crowdfunding_updates** - 众筹更新表
   - 记录项目进展更新
   - 按项目和时间的索引

3. **crowdfunding_rewards** - 众筹回报表
   - 支持多档位回报
   - 限量和已领取数量追踪

#### 修改表
1. **crowdfunding_projects** - 补充字段
   - min_support_amount（最低支持金额）
   - stretch_goals（阶梯目标）
   - updates_count（更新次数）
   - success_stories（成功案例）

---

## 进行中工作

### 🔄 Phase 1: 任务系统基础

#### 待完成任务

1. **实现任务发布API** (`app/api/tasks/novel/route.ts`)
   - POST /api/tasks/novel - 发布新任务
   - 验证用户登录和SEED余额
   - 冻结预算SEED
   - 创建任务记录

2. **实现任务浏览API**
   - GET /api/tasks/novel - 任务列表
   - 支持筛选（status、genre）
   - 支持分页
   - 返回任务摘要信息

3. **实现任务详情API**
   - GET /api/tasks/novel/[id] - 任务详情
   - 返回完整任务信息
   - 包含发布者和接单人信息

4. **前端：任务市场页面** (`app/tasks/page.tsx`)
   - 任务列表展示
   - 筛选和排序功能
   - 发布任务按钮
   - 响应式设计

5. **前端：任务详情页** (`app/tasks/[id]/page.tsx`)
   - 任务详细信息
   - 接单按钮（作者）
   - 发布任务入口（读者）

---

## 下一步行动

### 立即执行（今天）

1. **创建任务发布API**
   - 文件：`app/api/tasks/novel/route.ts`
   - 功能：接收任务数据，验证预算，创建任务
   - 依赖：需要实现SEED转账逻辑

2. **创建任务列表API**
   - 文件：`app/api/tasks/novel/route.ts` (GET方法)
   - 功能：查询开放任务，支持筛选和分页

### 本周内完成

3. **创建任务详情API**
   - 文件：`app/api/tasks/novel/[id]/route.ts`
   - 功能：返回任务完整信息

4. **前端任务市场页面**
   - 文件：`app/tasks/page.tsx`
   - 功能：展示任务列表，支持筛选

5. **前端任务详情页**
   - 文件：`app/tasks/[id]/page.tsx`
   - 功能：显示任务详情，提供操作按钮

### 下周完成

6. **接单和完成流程**
   - POST /api/tasks/novel/[id]/assign - 接单
   - POST /api/tasks/novel/[id]/complete - 提交完成
   - POST /api/tasks/novel/[id]/confirm - 确认并支付

7. **我的任务页面**
   - `app/my/tasks/page.tsx`
   - 显示我发布的任务和我是接单人的任务

---

## 技术要点

### SEED转账逻辑

所有涉及SEED的操作必须使用数据库事务：

```typescript
db.transaction(() => {
  // 1. 检查余额
  const wallet = db.prepare('SELECT balance FROM wallets WHERE user_id = ?').get(userId);
  if (wallet.balance < amount) throw new Error('余额不足');
  
  // 2. 扣款
  db.prepare('UPDATE wallets SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?')
    .run(amount, userId);
  
  // 3. 记录交易
  db.prepare('INSERT INTO transactions (id, user_id, type, amount, description, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)')
    .run(uuid(), userId, type, -amount, description);
  
  // 4. 如果是转账，收款方加款
  if (recipientId) {
    db.prepare('UPDATE wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?')
      .run(amount * 0.9, recipientId); // 扣除10%手续费
    
    // 平台收入
    const commission = amount * 0.1;
    db.prepare('UPDATE wallets SET balance = balance + ? WHERE user_id = ?')
      .run(commission, 'platform');
    
    // 记录平台收入交易
    db.prepare('INSERT INTO transactions (id, user_id, type, amount, description, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)')
      .run(uuid(), 'platform', 'commission', commission, description);
  }
})();
```

### 任务状态流转

```
open (开放) 
  ↓ assign (接单)
assigned (已分配)
  ↓ complete (提交完成)
pending_review (待审核)
  ↓ confirm (确认)
completed (已完成)
  
或者：
open → cancelled (取消)
assigned → cancelled (取消，需退款)
```

### 众筹状态流转

```
active (进行中)
  ↓ 达到目标且到期
successful (成功)
  ↓ 未达目标且到期
failed (失败，退款)
  
或者：
active → cancelled (手动取消，退款)
```

---

## 关键决策点

### 决策1：SEED日产出上限调整

**现状**：10,000 SEED/天  
**问题**：任务市场和众筹可能导致日消耗28,000+ SEED  
**建议**：
- 短期：提升至30,000 SEED/天
- 中期：引入动态调整机制（根据流通量自动调整）
- 长期：考虑完全取消日限制，改为通缩机制

### 决策2：任务审核机制

**选项A**：所有任务无需审核，自由发布  
**选项B**：大额任务（>1000 SEED）需平台审核  
**选项C**：所有任务需审核后上线  

**建议**：采用选项B，平衡用户体验和风险控制

### 决策3：众筹资金释放方式

**选项A**：成功后一次性释放给作者  
**选项B**：分阶段释放（30%/40%/30%）  
**选项C**：按月释放  

**建议**：采用选项B，降低跑路风险

### 决策4：纠纷处理机制

**选项A**：平台仲裁  
**选项B**：社区投票  
**选项C**：第三方调解  

**建议**：初期采用选项A，后期引入选项B作为补充

---

## 监控清单

### 开发阶段监控

- [ ] 数据库迁移是否成功执行
- [ ] API接口是否正常响应
- [ ] SEED转账是否正确记录
- [ ] 事务是否保证原子性
- [ ] 错误处理是否完善

### 上线后监控

- [ ] 任务发布量（日/周/月）
- [ ] 任务完成率
- [ ] SEED流通量变化
- [ ] 用户投诉和纠纷
- [ ] 系统性能和稳定性

---

## 风险评估

### 高风险项

1. **SEED通胀失控**
   - 概率：中
   - 影响：高
   - 缓解：动态调整日产出上限，增加销毁场景

2. **任务欺诈**
   - 概率：中
   - 影响：高
   - 缓解：实名认证、大额审核、信誉系统

3. **众筹跑路**
   - 概率：低
   - 影响：高
   - 缓解：分阶段释放资金、进度更新要求

### 中风险项

4. **并发交易冲突**
   - 概率：低
   - 影响：中
   - 缓解：数据库事务、乐观锁

5. **定时任务失败**
   - 概率：中
   - 影响：中
   - 缓解：重试机制、手动触发backup

---

## 资源需求

### 开发人员
- 后端开发：1人（API实现）
- 前端开发：1人（页面实现）
- 测试人员：1人（功能和压力测试）

### 时间估算
- Phase 1（任务系统）：2周
- Phase 2（众筹系统）：2周
- Phase 3（经济优化）：1周
- Phase 4（高级功能）：2周
- **总计**：7周

### 基础设施
- 数据库备份机制
- 定时任务服务（cron）
- 监控系统（Prometheus/Grafana）
- 日志系统（ELK）

---

## 成功标准

### Phase 1 成功标准（2周后）

- ✅ 任务发布API正常工作
- ✅ 任务列表和详情页可访问
- ✅ SEED转账逻辑正确执行
- ✅ 前端页面完成并可用
- ✅ 至少10个测试任务成功完成

### Phase 2 成功标准（4周后）

- ✅ 众筹发起和支持API正常
- ✅ 众筹状态自动检查机制运行
- ✅ 退款逻辑正确执行
- ✅ 前端众筹页面完成
- ✅ 至少5个众筹项目成功

### Phase 3 成功标准（5周后）

- ✅ SEED日流通量稳定在20,000-50,000
- ✅ 任务市场日均成交量30+
- ✅ 众筹成功率>60%
- ✅ 无重大经济异常

---

## 附录：相关文件清单

### 数据库
- `lib/db.ts` - 表结构定义

### API路由（待创建）
- `app/api/tasks/novel/route.ts` - 任务列表和发布
- `app/api/tasks/novel/[id]/route.ts` - 任务详情
- `app/api/tasks/novel/[id]/assign/route.ts` - 接单
- `app/api/tasks/novel/[id]/complete/route.ts` - 完成
- `app/api/tasks/novel/[id]/confirm/route.ts` - 确认
- `app/api/crowdfunding/create/route.ts` - 发起众筹
- `app/api/crowdfunding/list/route.ts` - 众筹列表
- `app/api/crowdfunding/[id]/route.ts` - 众筹详情
- `app/api/crowdfunding/[id]/support/route.ts` - 支持众筹

### 前端页面（待创建）
- `app/tasks/page.tsx` - 任务市场
- `app/tasks/[id]/page.tsx` - 任务详情
- `app/my/tasks/page.tsx` - 我的任务
- `app/crowdfunding/page.tsx` - 众筹广场
- `app/crowdfunding/[id]/page.tsx` - 众筹详情

### 工具库（待创建）
- `lib/task-validator.ts` - 任务验证
- `lib/crowdfunding-helper.ts` - 众筹辅助
- `lib/economy.ts` - 扩展现有经济函数

---

**最后更新**: 2026-06-10  
**下次更新**: 完成Phase 1第一个API后
