# Polymarket 数据导入脚本

这个脚本用于从 Polymarket API 抓取活跃市场数据并导入到 Supabase 数据库。

## 功能

- 调用 Polymarket 的 GET /markets 接口获取活跃市场
- 抓取市场标题、描述等信息
- 自动将市场分类映射到中文分类
- 为每个事件初始化投注额（约100万±1000）
- 批量导入到 Supabase events 表

## 使用方法

### 1. 确保环境变量已配置

在项目根目录的 `.env` 文件中，确保以下变量已设置：

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. 安装依赖

```bash
npm install
```

### 3. 运行导入脚本

```bash
npm run import-polymarket
```

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
