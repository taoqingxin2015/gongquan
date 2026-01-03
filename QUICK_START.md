# 快速开始：双版本部署

本文档提供快速部署两个版本到市场测试的简化步骤。

## 当前状态

✅ 项目已配置完成：
- **main 分支**：共权预测网版本
- 包含完整的部署配置文件

## 快速部署步骤

### 第一步：上传到 GitHub

```bash
# 1. 在 GitHub 创建新仓库（例如：prediction-market）

# 2. 将本地代码推送到 GitHub
git remote add origin https://github.com/你的用户名/prediction-market.git
git push -u origin main
```

### 第二步：创建 Supabase 项目

#### 共权预测网的数据库

1. 访问 https://app.supabase.com/
2. 创建新项目：`gongquan-prediction`
3. 复制 **Project URL** 和 **anon public key**
4. 在 SQL Editor 中依次运行 `supabase/migrations/` 目录下的所有 SQL 文件

#### 备用数据库（可选）

如需测试或备用环境，可重复上述步骤创建额外的数据库项目。

### 第三步：部署到 Vercel（推荐）

#### 部署到 Vercel

1. 访问 https://vercel.com/
2. 点击 "Add New..." > "Project"
3. 选择您的 GitHub 仓库
4. 配置：
   - **Branch**: `main`
   - **Project Name**: `gongquan-prediction`
5. 添加环境变量：
   ```
   VITE_SUPABASE_URL=https://你的项目.supabase.co
   VITE_SUPABASE_ANON_KEY=你的项目anon_key
   VITE_PROJECT_NAME=共权预测网
   ```
6. 点击 "Deploy"

### 第四步：获取部署 URL

部署完成后，您会得到部署 URL：
- 共权预测网：`https://gongquan-prediction.vercel.app`

### 第五步：配置管理员账号

创建管理员账号（参考 SETUP.md 的步骤 3）。

## 更新部署

当您修改代码后：

```bash
# 1. 确保在正确的分支上
git branch

# 2. 提交更改
git add .
git commit -m "描述您的更改"

# 3. 推送到 GitHub
git push

# Vercel 会自动检测并重新部署！
```

## 环境变量说明

每个部署需要配置 3 个环境变量：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `VITE_SUPABASE_URL` | Supabase 项目 URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名密钥 | `eyJhbGciOi...` |
| `VITE_PROJECT_NAME` | 项目名称（可选） | `共权预测网` |

## 常见命令

```bash
# 查看当前分支
git branch

# 查看提交历史
git log --oneline

# 本地运行（会自动启动）
npm run dev

# 构建项目
npm run build

# 查看远程仓库
git remote -v
```

## 监控和分析

### Vercel 提供的功能
- 实时访问统计
- 构建日志
- 错误追踪
- 自动 HTTPS

### Supabase 提供的功能
- 数据库统计
- API 请求日志
- 用户认证日志
- 实时数据库监控

## 故障排查

### 部署失败？
1. 检查构建日志
2. 确认 `npm run build` 在本地能成功
3. 验证环境变量是否正确

### 数据库连接失败？
1. 检查 Supabase 项目状态
2. 确认 URL 和 Key 是否正确复制
3. 验证 RLS 策略是否正确配置

### 更多帮助
- 详细部署指南：`DEPLOYMENT.md`
- 项目设置：`SETUP.md`
- 项目文档：`README.md`

## 成本

使用免费方案：
- ✅ Vercel：免费（100GB 带宽/月）
- ✅ Supabase：免费（500MB 数据库 × 2）
- ✅ GitHub：免费
- 💰 自定义域名：约 $10-15/年（可选）

**总成本：$0/月**（不含域名）

## 下一步

部署成功后：
1. ✅ 测试两个版本的所有功能
2. ✅ 配置自定义域名（可选）
3. ✅ 设置监控和分析工具
4. ✅ 开始市场测试！

---

需要详细指南？请查看 `DEPLOYMENT.md`
