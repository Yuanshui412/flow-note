/**
 * 数据库事务工具
 *
 * 设计原则：
 * - 所有涉及多表写入的操作必须包裹在事务中
 * - 支持交互式事务（interactive transactions），可在事务内执行业务逻辑
 * - 统一超时和重试策略
 */

import { prisma } from "./prisma";

type TransactionFn<T> = (
  tx: Omit<
    typeof prisma,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
  >
) => Promise<T>;

const TX_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;

/**
 * 执行一个数据库事务，自动重试（仅限可重试错误）
 */
export async function withTransaction<T>(fn: TransactionFn<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await prisma.$transaction(fn, {
        timeout: TX_TIMEOUT_MS,
        // SQLite 仅支持 Serializable；PostgreSQL 可用 ReadCommitted
        isolationLevel: "Serializable",
      });
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error)) throw error;
      if (attempt === MAX_RETRIES) throw error;
      // 指数退避
      await new Promise((r) => setTimeout(r, 100 * 2 ** attempt));
    }
  }

  throw lastError;
}

function isRetryableError(error: unknown): boolean {
  const msg = String(error);
  return (
    msg.includes("40P01") || // deadlock
    msg.includes("40001") || // serialization failure
    msg.includes("57P01") || // admin shutdown
    msg.includes("connection") // 连接相关
  );
}
