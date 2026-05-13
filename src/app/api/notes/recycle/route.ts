import { z } from "zod";
import { createRoute } from "@/lib/api";
import { getCurrentUserId, requireWorkspaceMember } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";

// ─── Schema ───

const RecycleSchema = z.object({
  workspaceId: z.string().min(1),
  page: z
    .string()
    .optional()
    .default("1")
    .transform((s) => parseInt(s, 10))
    .pipe(z.number().int().min(1)),
});

const PAGE_SIZE = 20;

// ─── GET /api/notes/recycle — 回收站列表 ───

export const GET = createRoute({
  schema: RecycleSchema,
  async handler({ input }) {
    const userId = await getCurrentUserId();
    await requireWorkspaceMember(userId, input.workspaceId);

    const where = {
      workspaceId: input.workspaceId,
      deletedAt: { not: null }, // 只查已删除的
    };

    const [notes, total] = await Promise.all([
      prisma.note.findMany({
        where,
        orderBy: { deletedAt: "desc" },
        take: PAGE_SIZE,
        skip: (input.page - 1) * PAGE_SIZE,
        select: {
          id: true,
          title: true,
          deletedAt: true,
          updatedAt: true,
          author: { select: { name: true } },
        },
      }),
      prisma.note.count({ where }),
    ]);

    return {
      data: notes,
      pagination: {
        page: input.page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE),
      },
    };
  },
});
