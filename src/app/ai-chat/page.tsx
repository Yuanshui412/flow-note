import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { ChatPanel } from "./chat-panel";
import Link from "next/link";

export default async function AIChatPage() {
  const session = await getServerSession(authOptions);

  if (!session?.userId) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-sm text-slate-500">请先登录以使用 AI 对话</p>
          <Link
            href="/login"
            className="inline-block px-6 py-2 bg-emerald-600 text-sm text-white hover:bg-emerald-500 transition-colors"
          >
            登录
          </Link>
        </div>
      </div>
    );
  }

  // 取用户的第一个 workspace
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: session.userId },
    select: { workspaceId: true },
  });

  if (!membership) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-sm text-slate-500">你还没有加入任何工作区</p>
      </div>
    );
  }

  return <ChatPanel workspaceId={membership.workspaceId} />;
}
