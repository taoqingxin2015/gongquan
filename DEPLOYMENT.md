# 双版本部署指南

本指南将帮助您将"共权预测网"和"亲友找乐子预测网"两个版本部署到不同的域名进行市场测试。

## 目录

1. [准备工作](#准备工作)
2. [创建独立的 Supabase 项目](#创建独立的-supabase-项目)
3. [配置两个版本](#配置两个版本)
4. [使用 Vercel 部署](#使用-vercel-部署)
5. [使用 Netlify 部署](#使用-netlify-部署)
6. [环境变量配置](#环境变量配置)
7. [域名配置](#域名配置)
8. [测试验证](#测试验证)

---

## 准备工作

### 所需账号

- [ ] GitHub 账号（用于托管代码）
- [ ] Supabase 账号（两个独立项目）
- [ ] Vercel 或 Netlify 账号（用于部署）
- [ ] 域名（可选，用于自定义域名）

### 本地准备

```bash
# 确保已安装 Git
git --version

# 确保已安装 Node.js 18+
node --version

# 确保项目构建成功
npm run build
```

---

## 创建独立的 Supabase 项目

### 项目 1：共权预测网

1. 访问 [Supabase Dashboard](https://app.supabase.com/)
2. 点击 "New Project"
3. 填写项目信息：
   - **Name**: `gongquan-prediction`（共权预测网）
   - **Database Password**: 设置一个强密码（请保存）
   - **Region**: 选择离您用户最近的区域（建议：Singapore 或 Hong Kong）
4. 点击 "Create new project" 并等待初始化完成（约 2-3 分钟）

5. 获取 API 密钥：
   - 进入 Settings > API
   - 复制 **Project URL**（格式：`https://xxx.supabase.co`）
   - 复制 **anon public key**

6. 运行数据库迁移：
   - 进入 SQL Editor
   - 点击 "New query"
   - 依次执行以下迁移文件的内容：
     1. `supabase/migrations/20260101064243_create_initial_schema.sql`
     2. `supabase/migrations/20260101064953_insert_sample_data.sql`
     3. `supabase/migrations/20260101070445_allow_public_view_events.sql`
     4. `supabase/migrations/20260101070545_allow_public_view_confirmed_bets.sql`
     5. `supabase/migrations/20260101072315_create_payment_qr_codes_bucket.sql`
     6. `supabase/migrations/20260101073711_allow_anon_upload_qr_codes.sql`
     7. `supabase/migrations/20260101210954_add_admin_update_policies.sql`
     8. `supabase/migrations/20260101225056_enable_realtime_for_bets.sql`
     9. `supabase/migrations/20260101225704_allow_anon_view_profiles.sql`
     10. `supabase/migrations/20260101233242_allow_authenticated_view_confirmed_bets.sql`

7. 创建管理员账号（参考 SETUP.md）

### 项目 2：亲友找乐子预测网

重复上述步骤，但使用不同的项目名称：
- **Name**: `qinyou-prediction`（亲友找乐子预测网）

---

## 配置两个版本

### 方案 A：使用 Git 分支（推荐）

```bash
# 1. 提交当前的"共权预测网"版本
git add -A
git commit -m "共权预测网 - 初始版本"

# 2. 创建"亲友找乐子预测网"分支
git checkout -b qinyou-version

# 3. 修改品牌名称
# 将以下文件中的"共权预测网"改为"亲友找乐子预测网"：
# - src/components/Navbar.tsx
# - src/pages/EventDetailPage.tsx
# - README.md
# - SETUP.md
# - supabase/migrations/20260101064243_create_initial_schema.sql

# 4. 提交更改
git add -A
git commit -m "亲友找乐子预测网 - 品牌修改"

# 5. 回到主分支（共权预测网）
git checkout master
```

### 方案 B：使用两个独立仓库

```bash
# 1. 为"共权预测网"创建仓库
cd /path/to/gongquan-prediction
git init
git add -A
git commit -m "共权预测网 - 初始版本"

# 2. 复制项目文件夹
cp -r /path/to/gongquan-prediction /path/to/qinyou-prediction

# 3. 为"亲友找乐子预测网"创建仓库
cd /path/to/qinyou-prediction
git init
# 修改品牌名称...
git add -A
git commit -m "亲友找乐子预测网 - 初始版本"
```

---

## 使用 Vercel 部署

### 部署"共权预测网"

1. 访问 [Vercel Dashboard](https://vercel.com/)
2. 点击 "Add New..." > "Project"
3. 导入 Git 仓库：
   - 如果使用分支方案，选择主分支（master）
   - 如果使用独立仓库，选择"共权预测网"仓库
4. 配置项目：
   - **Project Name**: `gongquan-prediction`
   - **Framework Preset**: Vite
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. 添加环境变量：
   ```
   VITE_SUPABASE_URL=https://你的共权项目.supabase.co
   VITE_SUPABASE_ANON_KEY=你的共权项目anon_key
   VITE_PROJECT_NAME=共权预测网
   ```
6. 点击 "Deploy"

### 部署"亲友找乐子预测网"

重复上述步骤，但使用：
- **Project Name**: `qinyou-prediction`
- **Branch**: `qinyou-version`（如果使用分支方案）
- 不同的环境变量（使用"亲友找乐子"的 Supabase 配置）

---

## 使用 Netlify 部署

### 部署"共权预测网"

1. 访问 [Netlify Dashboard](https://app.netlify.com/)
2. 点击 "Add new site" > "Import an existing project"
3. 选择 Git 提供商并授权
4. 选择仓库和分支
5. 配置构建设置：
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
6. 添加环境变量：
   - 进入 Site settings > Environment variables
   - 添加：
     ```
     VITE_SUPABASE_URL=https://你的共权项目.supabase.co
     VITE_SUPABASE_ANON_KEY=你的共权项目anon_key
     VITE_PROJECT_NAME=共权预测网
     ```
7. 点击 "Deploy site"

### 部署"亲友找乐子预测网"

重复上述步骤，使用不同的分支和环境变量。

---

## 环境变量配置

### 共权预测网

创建 `.env` 文件：

```env
VITE_SUPABASE_URL=https://你的共权项目.supabase.co
VITE_SUPABASE_ANON_KEY=你的共权项目anon_key
VITE_PROJECT_NAME=共权预测网
```

### 亲友找乐子预测网

创建 `.env` 文件：

```env
VITE_SUPABASE_URL=https://你的亲友项目.supabase.co
VITE_SUPABASE_ANON_KEY=你的亲友项目anon_key
VITE_PROJECT_NAME=亲友找乐子预测网
```

---

## 域名配置

### 使用 Vercel 自定义域名

1. 在 Vercel 项目页面，进入 Settings > Domains
2. 添加自定义域名：
   - 共权预测网：`gongquan.yourdomain.com`
   - 亲友找乐子：`qinyou.yourdomain.com`
3. 按照提示在您的域名提供商处添加 DNS 记录：
   ```
   类型: CNAME
   名称: gongquan
   值: cname.vercel-dns.com
   ```

### 使用 Netlify 自定义域名

1. 在 Netlify 项目页面，进入 Domain settings
2. 点击 "Add custom domain"
3. 输入域名并按照提示配置 DNS

---

## 测试验证

### 功能测试清单

#### 共权预测网
- [ ] 访问网站 URL，确认品牌名称显示正确
- [ ] 测试用户注册
- [ ] 测试用户登录
- [ ] 测试浏览事件
- [ ] 测试下注流程
- [ ] 测试见证人确认
- [ ] 测试管理员功能

#### 亲友找乐子预测网
- [ ] 重复上述所有测试

### 数据隔离验证

确保两个版本的数据完全独立：
1. 在"共权预测网"创建测试账号
2. 尝试用同样的邮箱在"亲友找乐子"登录（应该失败）
3. 在两个平台分别创建测试事件
4. 确认事件不会出现在另一个平台

### 性能测试

- [ ] 测试页面加载速度
- [ ] 测试实时更新功能
- [ ] 测试并发下注
- [ ] 测试移动端体验

---

## 部署后配置

### 1. 启用 Supabase Realtime

在两个 Supabase 项目中：
1. 进入 Database > Replication
2. 确保 `bets` 表的 Realtime 已启用

### 2. 配置 Storage

在两个 Supabase 项目中：
1. 进入 Storage
2. 确保 `payment-qr-codes` bucket 存在且为公开

### 3. 监控设置

Vercel 监控：
- 进入 Analytics 查看访问数据
- 设置 Error Tracking

Netlify 监控：
- 进入 Analytics 查看流量
- 配置 Form notifications（如需要）

---

## 常见问题

### Q: 部署后显示 404 错误

**A:** 确保：
- Build 命令正确：`npm run build`
- 输出目录正确：`dist`
- 路由重写配置正确（参见 vercel.json 或 netlify.toml）

### Q: 环境变量不生效

**A:**
- 确保环境变量名称以 `VITE_` 开头
- 在 Vercel/Netlify 中重新部署项目
- 清除浏览器缓存

### Q: 数据库连接失败

**A:**
- 检查 Supabase 项目状态
- 确认 URL 和 API Key 正确
- 检查 RLS 策略是否正确配置

### Q: 实时更新不工作

**A:**
- 确认 Supabase Realtime 已启用
- 检查浏览器控制台是否有 WebSocket 错误
- 验证网络是否阻止 WebSocket 连接

---

## 成本估算

### 免费方案（适合测试）

**Supabase 免费计划**（每个项目）:
- 500MB 数据库空间
- 1GB 文件存储
- 50,000 月活用户

**Vercel 免费计划**:
- 100GB 带宽/月
- 无限部署

**Netlify 免费计划**:
- 100GB 带宽/月
- 300 分钟构建时间/月

### 付费方案（生产环境）

**Supabase Pro**（$25/月，每个项目）:
- 8GB 数据库空间
- 100GB 文件存储
- 100,000 月活用户

**Vercel Pro**（$20/月）:
- 1TB 带宽/月
- 优先支持

---

## 下一步

部署成功后，您可以：

1. **设置分析工具**
   - Google Analytics
   - Plausible Analytics（隐私友好）

2. **配置错误追踪**
   - Sentry
   - LogRocket

3. **优化 SEO**
   - 添加 meta 标签
   - 配置 sitemap.xml
   - 提交到搜索引擎

4. **A/B 测试**
   - 比较两个版本的用户参与度
   - 分析用户反馈
   - 优化转化率

5. **备份策略**
   - 设置 Supabase 自动备份
   - 导出数据库定期备份
   - 配置 Git 标签管理版本

---

## 支持与反馈

如遇到问题：
1. 查看浏览器控制台错误
2. 检查 Supabase 日志
3. 查看 Vercel/Netlify 构建日志
4. 参考 README.md 和 SETUP.md

祝部署顺利！
