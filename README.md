# Core AI Station

AI 驱动的智能客服系统 — 基于 Next.js 14 + Vercel AI SDK + Prisma + PostgreSQL。

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 14 (App Router) |
| 语言 | TypeScript |
| AI | Vercel AI SDK (`ai` + `@ai-sdk/openai`) |
| 数据库 | PostgreSQL (pgvector 扩展) + Prisma ORM |
| 样式 | Tailwind CSS |
| 容器化 | Docker + docker-compose (本地) / Kubernetes (生产) |

## 核心设计

- **幂等性** — 所有写操作通过 `Idempotency-Key` header 保证幂等，基于数据库唯一约束
- **事务** — 多表写入统一包裹在 Prisma 交互式事务中，支持死锁重试
- **Tool Calling** — 可扩展的工具注册中心，AI 自动调用知识库搜索、人工转接、工单创建等
- **结构化输出** — 基于 Zod schema + Vercel AI SDK 的意图分类、会话摘要

## 快速开始

### 1. 环境准备

```bash
cp .env.example .env
# 编辑 .env，填入你的 OPENAI_API_KEY
```

### 2. 启动数据库

```bash
docker compose up -d postgres
```

### 3. 初始化数据库

```bash
npm install
npx prisma db push
npm run db:seed
```

### 4. 启动开发服务器

```bash
npm run dev
```

打开 http://localhost:3000

## Docker 部署

```bash
# 完整启动（PostgreSQL + App）
docker compose up -d

# 初始化数据库（首次）
docker compose exec app npx prisma db push
docker compose exec app npm run db:seed
```

## K8s 部署

```bash
kubectl apply -f k8s/manifests.yaml
```

⚠️ 部署前请修改 `k8s/manifests.yaml` 中的 `REPLACE_ME` 占位符。

## 项目结构

```
src/
├── app/
│   ├── api/
│   │   ├── chat/           # AI 对话接口（流式 + Tool Calling）
│   │   ├── conversations/  # 会话 CRUD
│   │   └── knowledge/      # 知识库 CRUD
│   ├── chat/               # 客服对话界面（待实现）
│   ├── admin/              # 管理后台（待实现）
│   ├── layout.tsx
│   └── page.tsx            # Landing page
├── lib/
│   ├── ai/
│   │   ├── provider.ts     # AI 模型配置
│   │   ├── tools/registry.ts  # Tool Calling 注册中心
│   │   └── structured-output.ts # Zod → 结构化输出
│   ├── db/
│   │   ├── prisma.ts       # Prisma 客户端
│   │   └── transaction.ts  # 事务 + 重试
│   └── idempotency/
│       └── index.ts        # 幂等性中间件
└── prisma/
    ├── schema.prisma       # 数据模型
    └── seed.ts             # 种子数据
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/chat | AI 对话（SSE 流式） |
| GET | /api/conversations | 会话列表（分页） |
| POST | /api/conversations | 创建会话 |
| GET | /api/conversations/[id] | 会话详情 + 消息 |
| PATCH | /api/conversations/[id] | 更新会话状态 |
| GET | /api/knowledge | 知识库搜索 |
| POST | /api/knowledge | 创建知识条目 |
| PATCH | /api/knowledge/[id] | 更新知识条目 |
| DELETE | /api/knowledge/[id] | 删除知识条目 |

## 幂等性

写操作请求需携带 `X-Idempotency-Key` header：

```bash
curl -X POST http://localhost:3000/api/conversations \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: $(uuidgen)" \
  -d '{"title": "测试会话"}'
```
