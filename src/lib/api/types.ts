import { z } from "zod";
import { NextRequest } from "next/server";

// ═══════════════════════════════════════════
// 统一 API 契约类型
// ═══════════════════════════════════════════

export type ApiContext = {
  params: Record<string, string>;
};

/** 成功响应 */
export type ApiSuccess<T> = {
  success: true;
  data: T;
};

/** 错误响应（统一格式） */
export type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/** Route Handler 的业务逻辑签名 */
export type HandlerFn<TInput, TOutput> = (input: {
  req: NextRequest;
  ctx: ApiContext;
  input: TInput;
}) => Promise<TOutput>;
