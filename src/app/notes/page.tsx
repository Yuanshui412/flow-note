import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { NoteList } from "./note-list";
import Link from "next/link";
import { FileText } from "lucide-react";

export default async function NotesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.userId) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <FileText className="w-8 h-8 text-slate-700 mx-auto" />
          <p className="text-sm text-slate-500">请先登录以查看笔记</p>
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

  // 获取用户所有 workspace 的笔记
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: session.userId },
    select: { workspaceId: true },
  });

  const workspaceIds = memberships.map((m) => m.workspaceId);

  const notes = await prisma.note.findMany({
    where: {
      workspaceId: { in: workspaceIds },
      deletedAt: null,
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      author: { select: { name: true } },
      tags: { include: { tag: { select: { name: true, color: true } } } },
      _count: { select: { transactions: true } },
    },
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-mono">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <NoteList notes={notes} workspaceId={workspaceIds[0] ?? ""} />
      </div>
    </div>
  );
}
