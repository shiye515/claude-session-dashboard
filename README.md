# LLM API Proxy Dashboard

大模型 API 本地代理监控面板，用于监控和记录任意 LLM API 的请求与响应。

## 功能特性

- 🔄 **通用 HTTP 代理**: 支持任意 API 提供商，只需替换 base URL
- 📊 **实时监控**: Dashboard 展示请求统计、Token 使用量、响应时间
- 📝 **请求日志**: 完整记录请求/响应，支持查看详情
- 🌊 **流式支持**: 支持 SSE 流式响应
- 🔒 **安全脱敏**: API Key 自动脱敏处理
- 🎯 **零配置**: 无需在代理中配置 API Key，由客户端自行携带

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
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/llm_proxy?schema=public"
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

### 基本原理

将原 API 的 base URL 替换为代理地址，并通过 `target` 参数指定原始目标地址。

```
原始地址: https://api.openai.com/v1/chat/completions
代理地址: http://localhost:3000/api/proxy?target=https%3A%2F%2Fapi.openai.com%2Fv1%2Fchat%2Fcompletions
```

### Python SDK 示例

#### OpenAI

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3000/api/proxy?target=https://api.openai.com/v1",
    api_key="your-openai-api-key"  # API Key 由客户端携带
)

response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

#### Anthropic

```python
from anthropic import Anthropic

client = Anthropic(
    base_url="http://localhost:3000/api/proxy?target=https://api.anthropic.com",
    api_key="your-anthropic-api-key"
)

message = client.messages.create(
    model="claude-3-opus-20240229",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello!"}]
)
```

#### 阿里云 DashScope (兼容 Anthropic 接口)

```python
from anthropic import Anthropic

client = Anthropic(
    base_url="http://localhost:3000/api/proxy?target=https://dashscope.aliyuncs.com/compatible-mode/v1",
    api_key="your-dashscope-api-key"
)
```

#### DeepSeek

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3000/api/proxy?target=https://api.deepseek.com/v1",
    api_key="your-deepseek-api-key"
)
```

### JavaScript/Node.js 示例

#### OpenAI

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:3000/api/proxy?target=https://api.openai.com/v1',
  apiKey: process.env.OPENAI_API_KEY
});
```

#### Anthropic

```javascript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  baseURL: 'http://localhost:3000/api/proxy?target=https://api.anthropic.com',
  apiKey: process.env.ANTHROPIC_API_KEY
});
```

### cURL 示例

```bash
# 原始请求
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-4", "messages": [{"role": "user", "content": "Hello"}]}'

# 通过代理请求 (URL 编码 target 参数)
curl "http://localhost:3000/api/proxy?target=https%3A%2F%2Fapi.openai.com%2Fv1%2Fchat%2Fcompletions" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-4", "messages": [{"role": "user", "content": "Hello"}]}'
```

## 项目结构

```
claude-session-dashboard/
├── app/
│   ├── api/
│   │   ├── proxy/route.ts        # 代理路由
│   │   ├── logs/route.ts         # 日志查询 API
│   │   └── stats/route.ts        # 统计数据 API
│   ├── logs/page.tsx             # 历史记录页面
│   └── page.tsx                  # Dashboard 首页
├── components/
│   ├── dashboard/                # Dashboard 组件
│   ├── logs/                     # 日志组件
│   └── ui/                       # shadcn/ui 组件
├── lib/
│   └── db.ts                     # 数据库连接
└── prisma/
    └── schema.prisma             # 数据库模型
```

## 数据库模型

### logs 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| provider | VARCHAR | 提供商标识 (openai, anthropic, dashscope 等) |
| endpoint | VARCHAR | 完整端点路径 (含主机) |
| method | VARCHAR | HTTP 方法 |
| request_headers | JSONB | 请求头（脱敏） |
| request_body | JSONB | 请求体 |
| response_status | INTEGER | 响应状态码 |
| response_headers | JSONB | 响应头 |
| response_body | JSONB | 响应体 |
| is_streaming | BOOLEAN | 是否流式请求 |
| prompt_tokens | INTEGER | 输入 token 数 |
| completion_tokens | INTEGER | 输出 token 数 |
| total_tokens | INTEGER | 总 token 数 |
| duration_ms | INTEGER | 请求耗时 |
| model | VARCHAR | 使用的模型 |
| created_at | TIMESTAMP | 创建时间 |

## 支持的提供商

代理会自动识别以下提供商（用于统计分类）：

- OpenAI (`api.openai.com`)
- Anthropic (`api.anthropic.com`)
- 阿里云 DashScope (`dashscope.aliyuncs.com`)
- DeepSeek (`api.deepseek.com`)
- Moonshot (`api.moonshot.cn`)
- 智谱 AI (`open.bigmodel.cn`)

其他 API 会以 `unknown` 分类记录。

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