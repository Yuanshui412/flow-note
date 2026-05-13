import { z } from "zod";
import { createRoute } from "@/lib/api";
import { requireWorkspaceMember, getCurrentUserId } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/db/audit";

// ─── Schema ───

const CreateNoteSchema = z.object({
  title: z.string().min(1, "标题不能为空"),
  workspaceId: z.string().min(1),
  content: z.array(z.any()).optional(),
});

const ListNoteSchema = z.object({
  workspaceId: z.string().min(1),
  q: z.string().optional(),
  page: z
    .string()
    .optional()
    .default("1")
    .transform((s) => parseInt(s, 10))
    .pipe(z.number().int().min(1)),
})

// ─── POST /api/notes ───
// 创建笔记，自动校验 workspace 成员身份

export const POST = createRoute({
  schema: CreateNoteSchema,
  async handler({ req, input }) {
    const userId = await getCurrentUserId();
    await requireWorkspaceMember(userId, input.workspaceId);

    const note = await prisma.note.create({
      data: {
        title: input.title,
        content: JSON.stringify(input.content ?? []),
        workspaceId: input.workspaceId,
        authorId: userId,
      },
    });

    writeAuditLog({
      workspaceId: input.workspaceId,
      actorId: userId,
      action: "note.create",
      targetType: "note",
      targetId: note.id,
      metadata: { title: note.title },
    });

    return note;
  },
});

const PAGE_SIZE = 20;

export const GET = createRoute({
  schema: ListNoteSchema,
  async handler({ req, input }) {
    const userId = await getCurrentUserId();
    await requireWorkspaceMember(userId, input.workspaceId);

    // ── 搜索分支（SQLite: LIKE 模糊匹配）──
    if (input.q) {
      const rows = await prisma.$queryRawUnsafe<
        Array<{ id: string; title: string; updatedAt: string }>
      >(
        `SELECT id, title, updatedAt
         FROM notes
         WHERE workspaceId = ?
           AND deletedAt IS NULL
           AND title LIKE ?
         ORDER BY updatedAt DESC
         LIMIT ? OFFSET ?`,
        input.workspaceId,
        `%${input.q}%`,
        PAGE_SIZE,
        (input.page - 1) * PAGE_SIZE
      );

      return {
        data: rows,
        pagination: { page: input.page, pageSize: PAGE_SIZE, total: rows.length, totalPages: 1 },
      };
    }

    // ── 普通列表分支（无搜索词时）──
    const [notes, total] = await Promise.all([
      prisma.note.findMany({
        where: {
          workspaceId: input.workspaceId,
          deletedAt: null,
        },
        orderBy: { updatedAt: "desc" },
        take: PAGE_SIZE,
        skip: (input.page - 1) * PAGE_SIZE,
        include: {
          author: { select: { name: true } },
          _count: { select: { transactions: true } },
        },
      }),
      prisma.note.count({
        where: {
          workspaceId: input.workspaceId,
          deletedAt: null,
        },
      }),
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
