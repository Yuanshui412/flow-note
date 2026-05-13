import { NextResponse } from "next/server";
import { checkRateLimit, buildRateLimitKey } from "./index";
import type { RateLimitConfig } from "./index";

/**
 * 为 Route Handler 添加限流保护
 *
 * 用法：
 *   export const POST = withRateLimit(
 *     createRoute({ schema, handler }),
 *     RateLimitPresets.transaction
 *   );
 */

export function withRateLimit(
  handler: (req: Request, ctx: any) => Promise<Response>,
  config: RateLimitConfig
) {
  return async (req: Request, ctx: any) => {
    // 从请求中提取 workspaceId（优先 body，其次 searchParams）
    let workspaceId = "anonymous";

    try {
      if (req.method === "GET") {
        const url = new URL(req.url);
        workspaceId = url.searchParams.get("workspaceId") ?? "anonymous";
      } else {
        const cloned = req.clone();
        const body = await cloned.json().catch(() => ({}));
        workspaceId = body.workspaceId ?? "anonymous";
      }
    } catch {
      // 无法解析 → anonymous
    }

    const key = buildRateLimitKey(workspaceId, new URL(req.url).pathname);
    const result = checkRateLimit(key, config);

    // 设置限流响应头
    const headers: Record<string, string> = {
      "X-RateLimit-Limit": String(result.limit),
      "X-RateLimit-Remaining": String(result.remaining),
      "X-RateLimit-Reset": String(result.reset),
    };

    if (!result.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: `请求过于频繁，请在 ${Math.ceil((result.reset - Date.now() / 1000))} 秒后重试`,
          },
        },
        { status: 429, headers }
      );
    }

    // 放行，注入限流头
    const response = await handler(req, ctx);
    for (const [k, v] of Object.entries(headers)) {
      response.headers.set(k, v);
    }
    return response;
  };
}
