import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { DossierStack } from "./dossier-stack";
import Link from "next/link";
import { FileText } from "lucide-react";

export default async function NotesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.userId) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f6f5f4" }}>
        <div style={{ textAlign: "center" }}>
          <FileText size={32} style={{ color: "#a39e98", marginBottom: 16 }} />
          <p style={{ fontSize: 16, color: "#615d59", marginBottom: 20 }}>请先登录以查看笔记</p>
          <Link href="/login" className="notion-btn-primary" style={{ textDecoration: "none" }}>登录</Link>
        </div>
      </div>
    );
  }

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: session.userId },
    select: { workspaceId: true },
  });

  const workspaceIds = memberships.map((m) => m.workspaceId);

  const notes = await prisma.note.findMany({
    where: { workspaceId: { in: workspaceIds }, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      author: { select: { name: true } },
      tags: { include: { tag: { select: { name: true, color: true } } } },
      _count: { select: { transactions: true } },
    },
  });

  return <DossierStack notes={notes} workspaceId={workspaceIds[0] ?? ""} />;
}
