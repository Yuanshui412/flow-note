# ═══════════════════════════════════════════
# FlowNote — 多阶段 Docker 构建
# ═══════════════════════════════════════════

# ─── Stage 1: 依赖 ───
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts

# ─── Stage 2: 构建 ───
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
COPY --from=deps /app/node_modules ./node_modules

# 生成 Prisma Client
RUN npx prisma generate

# 构建 Next.js（output: standalone）
RUN npm run build

# ─── Stage 3: 运行 ───
FROM node:20-alpine AS runner
RUN apk add --no-cache tini curl

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 安全：非 root 用户运行
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 只复制运行时需要的文件
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000

# tini: 正确的信号处理（SIGTERM → 优雅关闭）
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
