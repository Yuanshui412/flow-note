import { z } from "zod";
import { createRoute, HttpError } from "@/lib/api";
import { getCurrentUserId, requireWorkspaceMember } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";
import { withTransaction } from "@/lib/db/transaction";
import { writeAuditLog } from "@/lib/db/audit";

// ─── Schema ───

const UpdateNoteSchema = z.object({
  title: z.string().min(1, "标题不能为空").optional(),
  content: z.array(z.any()).optional(),
  version: z.number().int().min(1), // 乐观锁：客户端必须传当前版本号
});

// ─── PATCH /api/notes/[id] — 乐观锁 + 版本快照 ───

export const PATCH = createRoute({
  schema: UpdateNoteSchema,
  async handler({ ctx, input }) {
    const noteId = ctx.params.id;

    // ① 查当前笔记（事务外，减少锁持有时间）
    const note = await prisma.note.findUnique({
      where: { id: noteId, deletedAt: null },
    });

    if (!note) {
      throw new HttpError(404, "NOT_FOUND", "笔记不存在");
    }

    // ② 乐观锁：版本不匹配 → 冲突
    if (note.version !== input.version) {
      throw new HttpError(
        409,
        "VERSION_CONFLICT",
        `笔记已被他人修改。你的版本: ${input.version}, 最新版本: ${note.version}`
      );
    }

    // ③ 鉴权
    const userId = await getCurrentUserId();
    await requireWorkspaceMember(userId, note.workspaceId);

    // ④ 事务：快照 + 更新 + 版本号递增
    const updated = await withTransaction(async (tx) => {
      // 将当前版本存为快照
      await tx.noteSnapshot.create({
        data: {
          noteId: note.id,
          title: note.title,
          content: note.content, // SQLite: 已经是 JSON 字符串
          version: note.version,
        },
      });

      // 写入新内容，版本号 +1
      return tx.note.update({
        where: { id: noteId },
        data: {
          ...(input.title !== undefined && { title: input.title }),
          ...(input.content !== undefined && { content: JSON.stringify(input.content) }),
          version: { increment: 1 },
        },
      });
    });

    return updated;
  },
});

// ─── GET /api/notes/[id] ───

export const GET = createRoute({
  schema: z.object({}),
  async handler({ ctx }) {
    const noteId = ctx.params.id;

    const note = await prisma.note.findUnique({
      where: { id: noteId, deletedAt: null },
      include: {
        author: { select: { name: true } },
        tags: { include: { tag: true } },
        transactions: {
          include: { category: true },
          orderBy: { date: "desc" },
        },
      },
    });

    if (!note) {
      throw new HttpError(404, "NOT_FOUND", "笔记不存在");
    }

    return note;
  },
});

// ─── DELETE /api/notes/[id] — 软删除 ───

export const DELETE = createRoute({
  schema: z.object({}),
  async handler({ ctx }) {
    const noteId = ctx.params.id;
    const userId = await getCurrentUserId();

    const note = await prisma.note.findUnique({
      where: { id: noteId, deletedAt: null },
    });

    if (!note) {
      throw new HttpError(404, "NOT_FOUND", "笔记不存在");
    }

    await requireWorkspaceMember(userId, note.workspaceId);

    // 软删除：只设 deletedAt，数据不丢失
    await prisma.note.update({
      where: { id: noteId },
      data: { deletedAt: new Date() },
    });

    // 审计日志（fire-and-forget）
    writeAuditLog({
      workspaceId: note.workspaceId,
      actorId: userId,
      action: "note.delete",
      targetType: "note",
      targetId: noteId,
      metadata: { title: note.title },
    });

    return { deleted: true, id: noteId };
  },
});
