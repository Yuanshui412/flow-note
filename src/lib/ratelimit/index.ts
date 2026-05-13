/**
 * Token Bucket 限流器（内存版）
 *
 * 生产环境应替换为 Redis 版本（多 Pod 共享计数）。
 * 算法：每个 key 独立一个 bucket，以恒定速率补充 token。
 */

interface Bucket {
  tokens: number;
  lastRefill: number;
}

export interface RateLimitConfig {
  maxTokens: number;     // 桶容量 = 突发峰值
  refillRate: number;    // 每秒补充 token 数
  windowSeconds: number; // 时间窗口（用于计算 reset 时间）
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number;         // Unix timestamp (seconds)
  limit: number;
}

// ─── Bucket 存储 ───

const buckets = new Map<string, Bucket>();

// 定期清理过期 bucket（每 60 秒）
setInterval(() => {
  const now = Date.now();
  buckets.forEach((b, key) => {
    if (now - b.lastRefill > 600_000) {
      buckets.delete(key);
    }
  });
}, 60_000);

// ─── 限流函数 ───

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { tokens: config.maxTokens, lastRefill: now };
    buckets.set(key, bucket);
  }

  // 补充 token
  const elapsed = (now - bucket.lastRefill) / 1000; // 秒
  bucket.tokens = Math.min(
    config.maxTokens,
    bucket.tokens + elapsed * config.refillRate
  );
  bucket.lastRefill = now;

  // 消费
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return {
      allowed: true,
      remaining: Math.floor(bucket.tokens),
      reset: Math.ceil(now / 1000) + config.windowSeconds,
      limit: config.maxTokens,
    };
  }

  // 拒绝
  const resetIn = Math.ceil((1 - bucket.tokens) / config.refillRate);
  return {
    allowed: false,
    remaining: 0,
    reset: Math.ceil(now / 1000) + resetIn,
    limit: config.maxTokens,
  };
}

// ─── 预设限流策略 ───

export const RateLimitPresets = {
  /** 普通 API：60 次/分钟 */
  default: {
    maxTokens: 60,
    refillRate: 1, // 1 token/s
    windowSeconds: 60,
  } satisfies RateLimitConfig,

  /** AI API：20 次/分钟（费用控制） */
  ai: {
    maxTokens: 20,
    refillRate: 0.33, // 1 token/3s
    windowSeconds: 60,
  } satisfies RateLimitConfig,

  /** 财务入账：30 次/分钟（防重放攻击） */
  transaction: {
    maxTokens: 30,
    refillRate: 0.5,
    windowSeconds: 60,
  } satisfies RateLimitConfig,
};

// ─── 辅助函数：构建限流 key ───

export function buildRateLimitKey(workspaceId: string, endpoint: string): string {
  return `${workspaceId}:${endpoint}`;
}
