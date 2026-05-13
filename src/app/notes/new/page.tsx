import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { NewNoteEditor } from "./editor";
import Link from "next/link";

export default async function NewNotePage() {
  const session = await getServerSession(authOptions);
  if (!session?.userId) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f6f5f4" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 16, color: "#615d59", marginBottom: 20 }}>请先登录</p>
          <Link href="/login" className="notion-btn-primary" style={{ textDecoration: "none" }}>登录</Link>
        </div>
      </div>
    );
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: session.userId },
    select: { workspaceId: true },
  });

  return <NewNoteEditor workspaceId={membership?.workspaceId ?? ""} />;
}
