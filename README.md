# 亲友找乐子预测网

一个类似 Polymarket 的预测市场平台，用于对热点事件进行模拟投注。

## 项目概述

这是一个 MVP 阶段的预测市场应用，允许用户对各类热点事件进行预测下注。系统包含四种用户角色：

- **游客**：仅可浏览事件
- **玩家**：可以注册、登录、浏览和下注
- **见证人**：可以推荐玩家、管理收款并获得分红
- **管理员**：可以管理所有用户和事件

## 技术栈

- **前端框架**：React 18 + TypeScript
- **样式方案**：Tailwind CSS
- **构建工具**：Vite
- **数据库**：Supabase（PostgreSQL）
- **身份验证**：Supabase Auth
- **图标库**：Lucide React

## 功能特性

### 核心功能

1. **用户认证**
   - 邮箱密码注册/登录
   - 支持玩家和见证人两种注册类型
   - 见证人需上传收款码
   - 推荐码系统

2. **事件管理**
   - 多分类事件展示（政治、经济、金融、科技等）
   - 事件搜索功能
   - 实时显示投注金额和比例
   - 事件详情页面

3. **下注功能**
   - YES/NO 双向下注
   - 扫码支付见证人
   - 待确认/已确认状态管理
   - 投注历史记录

4. **用户中心**
   - 角色特定的信息展示
   - 密码修改功能
   - 下注记录查看
   - 见证人：玩家列表和收款确认
   - 管理员：用户管理和事件管理

5. **规则说明**
   - 详细的玩家规则
   - 见证人分红机制
   - 常见问题解答

## 数据库表结构

### profiles 表
存储用户配置信息：
- `id`：用户 ID（关联 auth.users）
- `email`：邮箱
- `name`：姓名
- `role`：角色（player/witness/admin）
- `referral_code`：推荐码
- `referred_by`：推荐人 ID
- `payment_qr_code`：收款码 URL
- `status`：账户状态（active/banned）

### events 表
存储预测事件：
- `id`：事件 ID
- `title`：事件标题
- `description`：详细描述
- `category`：分类
- `rules`：评判标准
- `status`：状态（active/banned/expired）
- `reveal_date`：揭晓日期

### bets 表
存储下注记录：
- `id`：下注 ID
- `event_id`：事件 ID
- `user_id`：用户 ID
- `direction`：方向（yes/no）
- `amount`：金额
- `status`：状态（pending/confirmed/rejected）
- `witness_id`：见证人 ID
- `confirmed_at`：确认时间

## 初始设置

### 1. 创建管理员账号

在 Supabase Dashboard 中：
1. 进入 Authentication > Users
2. 点击 "Add User"
3. 创建用户：
   - Email: `admin@example.com`
   - Password: `123456`
4. 复制生成的 User ID
5. 在 SQL Editor 中执行：

```sql
INSERT INTO profiles (id, email, name, role, referral_code, status)
VALUES ('[复制的USER_ID]', 'admin@example.com', '管理员', 'admin', 'ADMIN2026', 'active');
```

### 2. 创建测试见证人

1. 使用管理员账号登录
2. 进入用户中心 > 见证人列表
3. 点击"添加见证人"按钮（注：当前版本需手动在数据库中创建）

或通过 Supabase Auth + SQL：

```sql
-- 先在 Supabase Auth 中创建用户（email: witness@example.com）
-- 然后执行：
INSERT INTO profiles (id, email, name, role, referral_code, payment_qr_code, referred_by, status)
VALUES ('[见证人USER_ID]', 'witness@example.com', '测试见证人', 'witness', 'W001', '[收款码URL]', '[管理员USER_ID]', 'active');
```

### 3. 注册测试玩家

使用前端注册功能：
1. 点击"注册"
2. 选择"玩家注册"
3. 填写信息（推荐码使用 `W001`）
4. 完成注册

## 使用流程

### 玩家流程

1. **注册** → 输入见证人推荐码 → 填写个人信息
2. **浏览事件** → 选择感兴趣的事件 → 点击查看详情
3. **下注** → 选择 YES/NO → 扫码转账给见证人 → 填写金额 → 点击"已转款"
4. **等待确认** → 见证人确认收款后，下注生效
5. **查看记录** → 用户中心查看所有下注历史

### 见证人流程

1. **注册** → 上传收款码 → 获得推荐码
2. **推荐玩家** → 分享推荐码给玩家注册
3. **确认收款** → 用户中心 > 见证玩家列表 → 查看待确认下注 → 确认收款
4. **管理玩家** → 查看玩家列表和投注统计

### 管理员流程

1. **登录** → 使用 admin@example.com
2. **管理用户** → 查看/激活/封禁/删除用户
3. **管理事件** → 创建/编辑/激活/封禁/删除事件
4. **查看统计** → 查看所有用户的下注情况

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器（自动启动）
# npm run dev 会在后台自动运行

# 构建生产版本
npm run build

# 类型检查
npm run typecheck
```

## 环境变量

确保 `.env` 文件包含：

```
VITE_SUPABASE_URL=你的Supabase项目URL
VITE_SUPABASE_ANON_KEY=你的Supabase匿名密钥
```

## 项目结构

```
src/
├── components/           # 可复用组件
│   ├── Navbar.tsx       # 导航栏
│   ├── EventCard.tsx    # 事件卡片
│   └── dashboard/       # 用户中心子组件
├── contexts/            # React Context
│   └── AuthContext.tsx  # 认证上下文
├── lib/                 # 工具库
│   └── supabase.ts     # Supabase 客户端
├── pages/              # 页面组件
│   ├── HomePage.tsx    # 首页
│   ├── LoginPage.tsx   # 登录页
│   ├── RegisterPage.tsx # 注册页
│   ├── DashboardPage.tsx # 用户中心
│   ├── EventDetailPage.tsx # 事件详情
│   └── RulesPage.tsx   # 规则说明
└── App.tsx             # 主应用
```

## 安全说明

- 所有表都启用了行级安全（RLS）
- 用户只能访问自己的数据
- 见证人只能确认自己推荐的玩家的下注
- 管理员有完整的管理权限

## 下一步计划

- [ ] 实现实际的支付集成
- [ ] 添加事件结果判定功能
- [ ] 实现自动分红计算
- [ ] 添加用户通知系统
- [ ] 优化移动端体验
- [ ] 添加数据可视化

## 许可证

本项目仅用于演示和学习目的。
