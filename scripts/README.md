# Polymarket 数据导入

这个功能用于从 Polymarket API 抓取活跃市场数据并导入到 Supabase 数据库。

## 功能

- 调用 Polymarket 的 GET /markets 接口获取活跃市场
- 抓取市场标题、描述等信息
- 自动将市场分类映射到中文分类
- 为每个事件初始化投注额（约100万±1000）
- 批量导入到 Supabase events 表
- 如果 Polymarket API 无可用数据，自动使用样本数据

## 使用方法

### 方法 1：通过管理界面（推荐）

1. 使用管理员账号登录
2. 进入"控制台"页面
3. 点击"事件管理"标签
4. 点击右上角的"导入数据"按钮
5. 确认导入操作
6. 等待导入完成，系统会显示导入的事件数量

### 方法 2：通过命令行脚本

#### 1. 确保环境变量已配置

在项目根目录的 `.env` 文件中，确保以下变量已设置：

```
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

注意：命令行脚本需要 Service Role Key 才能插入数据，因为只有管理员有权限创建事件。

#### 2. 安装依赖

```bash
npm install
```

#### 3. 运行导入脚本

```bash
npm run import-polymarket
```

此脚本现在主要用于开发和测试，生产环境建议使用管理界面的导入功能。

## 分类映射

脚本会自动将 Polymarket 的分类映射到中文：

| Polymarket 分类 | 中文分类 |
|----------------|---------|
| Politics       | 政治    |
| Crypto         | 加密货币 |
| Sports         | 体育    |
| Business       | 经济    |
| Science        | 科技    |
| Pop Culture    | 娱乐    |
| News           | 时事    |
| 其他           | 其他    |

## 初始投注额

每个导入的事件会自动初始化投注额：
- YES 投注总额：1,000,000 ± 1,000（随机）
- NO 投注总额：1,000,000 ± 1,000（随机）

这样可以让新导入的事件看起来更真实，有更好的展示效果。

## 注意事项

1. 脚本默认最多导入 50 个市场，可以在代码中修改这个限制
2. 只会导入活跃且未关闭的市场
3. 如果没有设置揭晓日期，默认为导入后 30 天
4. 导入的事件状态为 'active'

## 故障排除

### 错误：Missing Supabase credentials

确保 `.env` 文件存在且包含正确的 Supabase 配置。

### 错误：Polymarket API error

Polymarket API 可能暂时不可用，请稍后重试。

### 错误：Error importing events

检查 Supabase 数据库连接和权限设置，确保有权限插入数据到 events 表。
