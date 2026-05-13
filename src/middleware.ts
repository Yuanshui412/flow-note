import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Edge Middleware
 *
 * 检查每个受保护 API 请求的 JWT token。
 * 无 token → 401
 * token 有效 → 放行到 Route Handler
 */
export async function middleware(req: NextRequest) {
  // 健康检查不鉴权（K8s probe 用）
  if (req.nextUrl.pathname === "/api/health") {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "UNAUTHORIZED", message: "请先登录" },
      },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

/**
 * matcher: 哪些路径触发 middleware
 * 注意：auth/register 和 auth/[...nextauth] 不在此范围内（公开路由）
 */
export const config = {
  matcher: [
    "/api/notes/:path*",
    "/api/transactions/:path*",
    "/api/workspaces/:path*",
    "/api/reports/:path*",
    "/api/ai/:path*",       // AI 接口也需要鉴权
    "/api/health",          // 健康检查不鉴权... 但需要排除
  ],
};
