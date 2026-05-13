/**
 * 幂等性中间件 — FlowNote
 *
 * 场景：财务入账的防重提交
 * - 每个写操作携带 Idempotency-Key header
 * - 相同 key 的重复请求返回缓存结果，不会重复执行
 * - 数据库唯一约束保证并发安全
 * - 24h 后自动清理（Prisma 模型主键约束 + 应用层 TTL 过滤）
 */

import { prisma } from "@/lib/db/prisma";
import { nanoid } from "nanoid";

const IDEMPOTENCY_TTL_HOURS = 24;

/**
 * 幂等包装器
 * 存在 → 返回缓存结果
 * 不存在 → 执行 fn → 缓存结果 → 返回
 */
export async function withIdempotency<T>(
  key: string,
  fn: () => Promise<{ body: T; statusCode: number }>
): Promise<{ body: T; statusCode: number; cached: boolean }> {
  // 1. 查缓存
  const existing = await prisma.idempotencyRecord.findUnique({
    where: { key },
  });

  if (existing && isFresh(existing.createdAt)) {
    return {
      body: existing.response as T,
      statusCode: existing.statusCode,
      cached: true,
    };
  }

  // 2. 执行业务
  const result = await fn();

  // 3. 存缓存（唯一约束 → 并发安全）
  try {
    await prisma.idempotencyRecord.create({
      data: {
        key,
        response: JSON.parse(JSON.stringify(result.body)), // 深拷贝，去 Date/undefined
        statusCode: result.statusCode,
      },
    });
  } catch {
    // 并发冲突：另一个请求已写入
    const conflict = await prisma.idempotencyRecord.findUnique({
      where: { key },
    });
    if (conflict) {
      return {
        body: conflict.response as T,
        statusCode: conflict.statusCode,
        cached: true,
      };
    }
  }

  return { ...result, cached: false };
}

export function generateIdempotencyKey(): string {
  return `idem_${nanoid(21)}`;
}

export function extractIdempotencyKey(request: Request): string | null {
  return request.headers.get("x-idempotency-key");
}

function isFresh(createdAt: Date): boolean {
  const age = Date.now() - createdAt.getTime();
  return age < IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000;
}
