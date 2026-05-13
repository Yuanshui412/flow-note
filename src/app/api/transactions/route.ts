import { z } from "zod";
import { createRoute, HttpError } from "@/lib/api";
import { getCurrentUserId, requireWorkspaceMember } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";
import { withIdempotency, extractIdempotencyKey } from "@/lib/idempotency";
import { writeAuditLog } from "@/lib/db/audit";

// ─── Schema ───

const CreateTransactionSchema = z.object({
  workspaceId: z.string().min(1),
  amount: z.number().positive("金额必须 > 0"),
  type: z.enum(["INCOME", "EXPENSE"]),
  categoryId: z.string().optional(),     // 优先用 ID
  categoryName: z.string().optional(),   // 或按名称匹配
  date: z.coerce.date(),
  description: z.string().optional(),
  noteId: z.string().optional(),
  blockId: z.string().optional(),
}).refine((d) => d.categoryId || d.categoryName, {
  message: "categoryId 或 categoryName 必须提供一个",
});

// ─── POST /api/transactions — 幂等入账 ───

export const POST = createRoute({
  schema: CreateTransactionSchema,
  async handler({ req, input }) {
    const idemKey = extractIdempotencyKey(req as unknown as Request);

    // 幂等包装：相同 key 的重复请求返回缓存结果
    if (idemKey) {
      const result = await withIdempotency(idemKey, async () => {
        const txn = await createTransaction(input);
        return { body: txn, statusCode: 201 };
      });
      // 解包：只返回业务数据，createRoute 统一包装为 { success: true, data }
      return result.body;
    }

    // 无幂等键 → 直接执行
    return createTransaction(input);
  },
});

// ─── 业务逻辑 ───

async function createTransaction(input: z.infer<typeof CreateTransactionSchema>) {
  const userId = await getCurrentUserId();
  await requireWorkspaceMember(userId, input.workspaceId);

  // 解析分类：优先用 categoryId，否则按名称查
  let categoryId = input.categoryId;
  if (!categoryId && input.categoryName) {
    const cat = await prisma.transactionCategory.findFirst({
      where: { workspaceId: input.workspaceId, name: input.categoryName },
    });
    if (!cat) {
      throw new HttpError(400, "INVALID_CATEGORY", `未找到分类: ${input.categoryName}`);
    }
    categoryId = cat.id;
  }

  const txn = await prisma.transaction.create({
    data: {
      workspaceId: input.workspaceId,
      amount: input.amount,
      type: input.type,
      categoryId: categoryId!,
      date: input.date,
      description: input.description,
      noteId: input.noteId,
      blockId: input.blockId,
      createdById: userId,
    },
    include: {
      category: true,
    },
  });

  writeAuditLog({
    workspaceId: input.workspaceId,
    actorId: userId,
    action: "transaction.create",
    targetType: "transaction",
    targetId: txn.id,
    metadata: { amount: input.amount, type: input.type, description: input.description },
  });

  return txn;
}

// ─── GET /api/transactions — 交易列表 ───

const ListTransactionsSchema = z.object({
  workspaceId: z.string().min(1),
  year: z.coerce.number().int().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
});

export const GET = createRoute({
  schema: ListTransactionsSchema,
  async handler({ input }) {
    const userId = await getCurrentUserId();
    await requireWorkspaceMember(userId, input.workspaceId);

    const where: any = { workspaceId: input.workspaceId };

    if (input.year) {
      const start = new Date(input.year, (input.month ?? 1) - 1, 1);
      const end = input.month
        ? new Date(input.year, input.month, 1)
        : new Date(input.year + 1, 0, 1);
      where.date = { gte: start, lt: end };
    }

    const [data, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { date: "desc" },
        take: 50,
        skip: (input.page - 1) * 50,
        include: { category: true },
      }),
      prisma.transaction.count({ where }),
    ]);

    return data;
  },
});
