import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import type { HandlerFn, ApiContext, ApiSuccess, ApiError } from "./types";

// ═══════════════════════════════════════════
// Route Handler 工厂
// ═══════════════════════════════════════════

/**
 * TInput = 经过 Zod parse 后的输出类型（handler 收到的类型）
 * ZodSchema 的输入可以是任意类型（raw json/searchParams），
 * 但输出必须是 TInput — transform/pipe/coerce 都依赖这个不对称性
 */
type CreateRouteOptions<TInput, TOutput> = {
  schema: z.ZodType<TInput, z.ZodTypeDef, unknown>;
  handler: HandlerFn<TInput, TOutput>;
};

export function createRoute<TInput = unknown, TOutput = unknown>(
  opts: CreateRouteOptions<TInput, TOutput>
) {
  const { schema, handler } = opts;

  return async (req: NextRequest, ctx: ApiContext = { params: {} }) => {
    try {
      let raw: unknown;

      if (req.method === "GET" || req.method === "DELETE") {
        const sp = req.nextUrl.searchParams;
        raw = Object.fromEntries(sp.entries());
      } else {
        raw = await req.json();
      }

      const input = schema.parse(raw) as TInput;

      const data = await handler({ req, ctx, input });

      return NextResponse.json({ success: true, data } satisfies ApiSuccess<TOutput>);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "请求参数校验失败",
              details: error.flatten().fieldErrors,
            },
          } satisfies ApiError,
          { status: 422 }
        );
      }

      if (error instanceof HttpError) {
        return NextResponse.json(
          {
            success: false,
            error: { code: error.code, message: error.message },
          } satisfies ApiError,
          { status: error.status }
        );
      }

      // 未知异常 → 500
      console.error("[createRoute] unhandled error:", error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "服务器内部错误",
          },
        } satisfies ApiError,
        { status: 500 }
      );
    }
  };
}

// ═══════════════════════════════════════════
// 业务异常类
// ═══════════════════════════════════════════

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "HttpError";
  }
}
