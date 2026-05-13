import { z } from "zod";
import { createRoute, HttpError } from "@/lib/api";
import { getCurrentUserId, requireWorkspaceMember } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/db/audit";

// ─── POST /api/notes/[id]/restore — 从回收站恢复 ───

export const POST = createRoute({
  schema: z.object({}),
  async handler({ ctx }) {
    const noteId = ctx.params.id;
    const userId = await getCurrentUserId();

    // 只查已删除的笔记
    const note = await prisma.note.findFirst({
      where: { id: noteId, deletedAt: { not: null } },
    });

    if (!note) {
      throw new HttpError(404, "NOT_FOUND", "回收站中未找到该笔记");
    }

    await requireWorkspaceMember(userId, note.workspaceId);

    // 恢复：清空 deletedAt
    const restored = await prisma.note.update({
      where: { id: noteId },
      data: { deletedAt: null },
    });

    writeAuditLog({
      workspaceId: note.workspaceId,
      actorId: userId,
      action: "note.restore",
      targetType: "note",
      targetId: noteId,
      metadata: { title: note.title },
    });

    return restored;
  },
});
