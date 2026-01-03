# 故障排查指南

## 问题：部署后页面空白，没有内容显示

### 第一步：检查浏览器控制台

1. 在浏览器中打开您的网站
2. 按 `F12` 或右键点击 > "检查"
3. 切换到 "Console"（控制台）标签
4. 查看是否有红色错误信息

#### 常见错误及解决方案

**错误 1: `supabaseUrl is required` 或 `supabaseAnonKey is required`**

说明：环境变量没有正确配置

解决方案：

##### 如果使用 Vercel：
1. 进入 Vercel 项目页面
2. 点击 "Settings" > "Environment Variables"
3. 确认已添加以下变量：
   ```
   VITE_SUPABASE_URL=https://你的项目.supabase.co
   VITE_SUPABASE_ANON_KEY=你的密钥
   ```
4. 重新部署：进入 "Deployments" > 点击最新部署右侧的三个点 > "Redeploy"

##### 如果使用 Netlify：
1. 进入 Netlify 项目页面
2. 点击 "Site configuration" > "Environment variables"
3. 确认已添加环境变量（格式同上）
4. 点击 "Deploys" > "Trigger deploy" > "Deploy site"

**错误 2: `Failed to fetch` 或网络错误**

说明：无法连接到 Supabase

解决方案：
1. 检查 Supabase URL 是否正确（应该是 `https://xxx.supabase.co` 格式）
2. 检查网络连接
3. 确认 Supabase 项目状态正常（访问 Supabase Dashboard）

**错误 3: `row-level security policy` 错误**

说明：数据库 RLS 策略有问题

解决方案：
1. 进入 Supabase Dashboard
2. 打开 SQL Editor
3. 运行以下 SQL 确认策略存在：
   ```sql
   SELECT policyname, roles, cmd
   FROM pg_policies
   WHERE tablename = 'events';
   ```
4. 如果没有匿名访问策略，重新运行迁移文件

---

### 第二步：检查网络请求

在浏览器控制台中：

1. 切换到 "Network"（网络）标签
2. 刷新页面
3. 查看是否有失败的请求（红色）

#### 如果看到 Supabase 请求失败：
- 检查请求 URL 是否正确
- 查看响应内容，可能包含错误信息

---

### 第三步：验证环境变量

创建一个临时测试文件来验证环境变量：

在浏览器控制台中运行：

```javascript
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Has Anon Key:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
```

如果显示 `undefined`，说明环境变量没有正确配置。

---

### 第四步：检查数据库

确认数据库有数据：

1. 进入 Supabase Dashboard
2. 打开 "Table Editor"
3. 选择 `events` 表
4. 确认有数据且 `status` 为 `active`

如果没有数据，运行：

```sql
-- 检查数据
SELECT COUNT(*) as total, status
FROM events
GROUP BY status;

-- 如果数据为空，重新运行示例数据迁移
-- 内容在 supabase/migrations/20260101064953_insert_sample_data.sql
```

---

### 第五步：验证构建文件

检查部署的文件：

1. 访问 `https://你的域名/assets/`
2. 应该能看到 JS 和 CSS 文件
3. 如果是 404，说明构建或部署配置有问题

#### 解决构建问题：

确认部署配置正确：

**Vercel 配置**（项目设置）：
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

**Netlify 配置**（netlify.toml 应该包含）：
```toml
[build]
  command = "npx vite build"
  publish = "dist"
```

---

### 第六步：本地测试

在本地验证一切正常：

```bash
# 使用您的 Supabase 配置
# 编辑 .env 文件，确保包含：
# VITE_SUPABASE_URL=https://你的项目.supabase.co
# VITE_SUPABASE_ANON_KEY=你的密钥

# 安装依赖
npm install

# 构建
npm run build

# 预览构建结果
npm run preview
```

如果本地预览正常，问题就是部署环境配置。

---

## 常见问题 Q&A

### Q: 部署成功但页面完全空白

**A:** 99% 是环境变量问题。请按照"第一步"重新配置环境变量并重新部署。

### Q: 显示 "暂无事件"

**A:** 数据库没有数据。请运行示例数据迁移文件。

### Q: 本地正常但部署后有问题

**A:** 检查部署平台的环境变量配置，确保与本地 `.env` 文件一致。

### Q: 控制台显示 CORS 错误

**A:** 这通常不是问题，Supabase 默认允许跨域请求。如果确实有 CORS 问题，检查 Supabase 项目的 API 设置。

---

## 快速诊断清单

在联系支持前，请确认：

- [ ] 环境变量已在 Vercel/Netlify 配置
- [ ] 重新部署后问题依然存在
- [ ] 浏览器控制台有错误信息（请截图）
- [ ] 数据库中有 active 状态的事件
- [ ] Supabase 项目状态正常
- [ ] 本地 `npm run build && npm run preview` 正常

---

## 仍然无法解决？

提供以下信息以获取帮助：

1. 部署平台（Vercel 或 Netlify）
2. 部署 URL
3. 浏览器控制台截图（Console 和 Network 标签）
4. 环境变量配置截图（隐藏敏感信息）
5. 是否在本地可以正常运行

---

## 紧急修复

如果需要快速恢复服务：

```bash
# 回滚到上一个工作版本
git log --oneline  # 查看提交历史
git checkout <上一个工作的commit-hash>
git push -f origin master  # 强制推送
```

部署平台会自动检测并重新部署回滚后的版本。
