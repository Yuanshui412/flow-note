import { prisma } from "@/lib/db/prisma";
import { HttpError } from "./create-route";
import {getServerSession} from "next-auth";
import {authOptions} from "@/lib/auth";

declare module "next-auth" {
  interface Session {
    userId: string;
  }
}
/**
 * 校验用户是否属于目标 workspace。
 * 租户隔离核心：每个 API 请求必须过此校验。
 */

export async function requireWorkspaceMember(userId: string, workspaceId: string) {
  const member = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: { userId, workspaceId },
    },
  });

  if (!member) {
    throw new HttpError(403, "FORBIDDEN", "你不在该工作区中");
  }

  return member;
}

/**
 * 从 NextAuth session 中提取当前用户 ID。
 * 未登录时抛出 401。
 */
export async function getCurrentUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.userId) {
    throw new HttpError(401,"UNAUTHORIZED","请先登录");
  }
  return session.userId;
}