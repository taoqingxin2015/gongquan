# 项目设置指南

本文档提供详细的项目设置步骤，帮助您快速启动"共权预测网"。

## 前置要求

- Node.js 18+
- npm 或 yarn
- Supabase 账号

## 步骤 1：Supabase 项目设置

### 1.1 创建 Supabase 项目

1. 访问 [Supabase Dashboard](https://app.supabase.com/)
2. 点击 "New Project"
3. 填写项目信息并创建
4. 等待项目初始化完成

### 1.2 获取 API 密钥

1. 在项目 Dashboard 中，进入 Settings > API
2. 复制以下信息：
   - `Project URL`（作为 VITE_SUPABASE_URL）
   - `anon public` 密钥（作为 VITE_SUPABASE_ANON_KEY）

### 1.3 配置环境变量

在项目根目录的 `.env` 文件中添加：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 步骤 2：数据库迁移

数据库迁移已自动执行。如果需要手动执行：

1. 进入 Supabase Dashboard > SQL Editor
2. 运行以下迁移（按顺序）：
   - `create_initial_schema` - 创建表结构
   - `insert_sample_data` - 插入示例数据

## 步骤 3：创建管理员账号

### 3.1 创建 Auth 用户

1. 进入 Supabase Dashboard > Authentication > Users
2. 点击 "Add User"
3. 填写信息：
   - Email: `admin@example.com`
   - Password: `123456`
   - 勾选 "Auto Confirm User"
4. 点击 "Create User"
5. **重要：复制生成的 User ID**

### 3.2 创建管理员 Profile

1. 进入 Supabase Dashboard > SQL Editor
2. 执行以下 SQL（替换 `YOUR_USER_ID`）：

```sql
INSERT INTO profiles (id, email, name, role, referral_code, status)
VALUES (
  'YOUR_USER_ID',  -- 替换为上一步复制的 User ID
  'admin@example.com',
  '管理员',
  'admin',
  'ADMIN2026',
  'active'
);
```

## 步骤 4：创建测试见证人（可选）

### 4.1 准备收款码图片

准备一张二维码图片（可以是任意图片用于测试）

### 4.2 上传到 Supabase Storage

1. 进入 Supabase Dashboard > Storage
2. 创建一个新的 bucket：
   - Name: `payment-qr-codes`
   - Public: 勾选（使 URL 可公开访问）
3. 上传您的收款码图片
4. 复制图片的 Public URL

### 4.3 创建见证人账号

1. 在 Authentication > Users 中创建新用户：
   - Email: `witness@example.com`
   - Password: `test123456`
2. 复制 User ID
3. 在 SQL Editor 中执行（替换相应的值）：

```sql
INSERT INTO profiles (id, email, name, role, referral_code, payment_qr_code, referred_by, status)
VALUES (
  'WITNESS_USER_ID',  -- 见证人的 User ID
  'witness@example.com',
  '测试见证人',
  'witness',
  'W001',  -- 这是玩家注册时需要的推荐码
  'https://your-project.supabase.co/storage/v1/object/public/payment-qr-codes/your-qr-code.png',  -- 收款码 URL
  'ADMIN_USER_ID',  -- 管理员的 User ID
  'active'
);
```

## 步骤 5：启动项目

```bash
# 安装依赖
npm install

# 开发服务器会自动启动
# 如果没有，可以手动运行：
# npm run dev

# 访问 http://localhost:5173
```

## 步骤 6：测试流程

### 6.1 测试管理员登录

1. 访问首页
2. 点击"登录"
3. 使用管理员账号登录：
   - Email: `admin@example.com`
   - Password: `123456`
4. 点击用户名，进入用户中心
5. 验证可以看到所有管理功能

### 6.2 测试事件创建

1. 以管理员身份登录
2. 进入用户中心 > 事件管理
3. 点击"添加事件"
4. 填写事件信息并创建
5. 返回首页验证事件显示

### 6.3 测试玩家注册

1. 退出管理员账号
2. 点击"注册"
3. 选择"玩家注册"
4. 填写信息：
   - 见证人代码：`W001`（或您创建的见证人推荐码）
   - Email: `player@example.com`
   - 姓名：测试玩家
   - 密码：`test123456`
5. 完成注册并登录

### 6.4 测试下注流程

1. 以玩家身份登录
2. 在首页选择一个事件
3. 点击进入事件详情
4. 选择 YES 或 NO
5. 会显示见证人的收款码
6. 输入下注金额
7. 点击"已转款"
8. 下注状态为"待确认"

### 6.5 测试见证人确认

1. 退出玩家账号
2. 使用见证人账号登录：
   - Email: `witness@example.com`
   - Password: `test123456`
3. 进入用户中心 > 见证玩家列表
4. 查看待确认的下注
5. 点击"确认收款"
6. 下注状态变为"已确认"

## 常见问题

### Q: 注册时提示"推荐码不存在"

**A:** 确保您已经创建了见证人账号，并且推荐码正确。检查数据库中 profiles 表的 referral_code 字段。

### Q: 下注时没有显示收款码

**A:** 确保：
1. 见证人的 payment_qr_code 字段有值
2. Storage bucket 是公开的
3. 图片 URL 可访问

### Q: 数据库迁移失败

**A:**
1. 检查 Supabase 项目是否正常运行
2. 确保环境变量配置正确
3. 在 SQL Editor 中手动运行迁移 SQL

### Q: RLS 策略导致无法访问数据

**A:** 检查：
1. 用户是否已通过身份验证
2. Profile 是否已创建
3. 在 Supabase Dashboard > Authentication > Policies 中检查策略

## 生产部署建议

### 安全性

- 修改默认管理员密码
- 使用强密码策略
- 启用邮箱验证（在 Supabase Auth 设置中）
- 配置 CORS 策略

### 性能优化

- 启用 Supabase 的 Connection Pooling
- 添加适当的数据库索引
- 使用 CDN 托管静态资源

### 监控

- 配置 Supabase 日志记录
- 设置错误追踪（如 Sentry）
- 监控数据库性能

## 获取帮助

如遇到问题：
1. 检查浏览器控制台错误
2. 查看 Supabase Dashboard 的日志
3. 验证环境变量配置
4. 确认数据库表和数据是否正确创建

## 后续开发

完成基础设置后，您可以：
- 自定义品牌和样式
- 添加更多事件类别
- 实现真实的支付集成
- 添加邮件通知功能
- 优化移动端体验
