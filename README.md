# LLM API Proxy Dashboard

大模型 API 本地代理监控面板，用于监控和记录 OpenAI 和 Anthropic API 的请求与响应。

## 功能特性

- 🔄 **API 代理**: 支持 OpenAI 和 Anthropic 两个主要提供商
- 📊 **实时监控**: Dashboard 展示请求统计、Token 使用量、响应时间
- 📝 **请求日志**: 完整记录请求/响应，支持查看详情
- 🌊 **流式支持**: 支持 SSE 流式响应
- 🔒 **安全脱敏**: API Key 自动脱敏处理

## 技术栈

- **前端框架**: Next.js 16 (App Router)
- **UI 组件**: shadcn/ui + Tailwind CSS
- **数据库**: PostgreSQL
- **ORM**: Prisma

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env` 文件：

```env
# 数据库连接
DATABASE_URL="postgresql://postgres:123456@localhost:5432/llm_proxy?schema=public"

# API Keys (可选，用于代理转发)
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
```

### 3. 初始化数据库

确保 PostgreSQL 已启动，然后执行：

```bash
npx prisma db push
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看面板。

## 使用代理

### OpenAI

将原本指向 OpenAI 的 API 地址改为本地代理地址：

```python
# Python SDK
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3000/api/proxy/openai/v1",
    api_key="your-openai-api-key"  # 或留空使用环境变量
)

response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

```javascript
// JavaScript/Node.js
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:3000/api/proxy/openai/v1',
  apiKey: process.env.OPENAI_API_KEY
});
```

### Anthropic

```python
# Python SDK
from anthropic import Anthropic

client = Anthropic(
    base_url="http://localhost:3000/api/proxy/anthropic",
    api_key="your-anthropic-api-key"
)

message = client.messages.create(
    model="claude-3-opus-20240229",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello!"}]
)
```

```javascript
// JavaScript/Node.js
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  baseURL: 'http://localhost:3000/api/proxy/anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY
});
```

### 支持的端点

| 提供商    | 代理路径                    | 目标 API                         |
| --------- | --------------------------- | -------------------------------- |
| OpenAI    | `/api/proxy/openai/v1/*`    | `https://api.openai.com/v1/*`    |
| Anthropic | `/api/proxy/anthropic/v1/*` | `https://api.anthropic.com/v1/*` |

## 项目结构

```
claude-session-dashboard/
├── app/
│   ├── api/
│   │   ├── proxy/[...path]/     # 代理路由
│   │   ├── logs/                # 日志查询 API
│   │   └── stats/               # 统计数据 API
│   ├── logs/                    # 历史记录页面
│   └── page.tsx                 # Dashboard 首页
├── components/
│   ├── dashboard/               # Dashboard 组件
│   ├── logs/                    # 日志组件
│   └── ui/                      # shadcn/ui 组件
├── lib/
│   ├── db.ts                    # 数据库连接
│   └── proxy/                   # 代理处理逻辑
│       ├── openai.ts
│       ├── anthropic.ts
│       └── streaming.ts
└── prisma/
    └── schema.prisma            # 数据库模型
```

## 数据库模型

### logs 表

| 字段              | 类型      | 说明               |
| ----------------- | --------- | ------------------ |
| id                | UUID      | 主键               |
| provider          | ENUM      | openai / anthropic |
| endpoint          | VARCHAR   | 请求端点           |
| method            | VARCHAR   | HTTP 方法          |
| request_headers   | JSONB     | 请求头（脱敏）     |
| request_body      | JSONB     | 请求体             |
| response_status   | INTEGER   | 响应状态码         |
| response_headers  | JSONB     | 响应头             |
| response_body     | JSONB     | 响应体             |
| is_streaming      | BOOLEAN   | 是否流式请求       |
| prompt_tokens     | INTEGER   | 输入 token 数      |
| completion_tokens | INTEGER   | 输出 token 数      |
| total_tokens      | INTEGER   | 总 token 数        |
| duration_ms       | INTEGER   | 请求耗时           |
| model             | VARCHAR   | 使用的模型         |
| created_at        | TIMESTAMP | 创建时间           |

## 安全说明

- ⚠️ **仅限本地使用**，未实现认证机制
- 🔐 API Key 在日志中自动脱敏显示为 `sk-...xxxx` 格式
- 🏠 建议仅在可信网络环境中使用

## 开发命令

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start

# 数据库迁移
npx prisma db push

# 查看 Prisma Studio
npx prisma studio
```

## License

MIT