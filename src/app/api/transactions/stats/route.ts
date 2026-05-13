import { z } from "zod";
import { createRoute } from "@/lib/api";
import { getCurrentUserId, requireWorkspaceMember } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";

// ─── Schema ───

const StatsSchema = z.object({
  workspaceId: z.string().min(1),
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

// ─── GET Handler ───

export const GET = createRoute({
  schema: StatsSchema,
  async handler({ input }) {
    const userId = await getCurrentUserId();
    await requireWorkspaceMember(userId, input.workspaceId);

    // 日期范围
    const start = new Date(input.year, (input.month ?? 1) - 1, 1);
    const end = input.month
      ? new Date(input.year, input.month, 1)
      : new Date(input.year + 1, 0, 1);

    // 查所有交易（当月）
    const txns = await prisma.transaction.findMany({
      where: {
        workspaceId: input.workspaceId,
        date: { gte: start, lt: end },
      },
      include: { category: true },
    });

    // JS 端聚合：按分类汇总
    let totalIncome = 0;
    let totalExpense = 0;
    const catMap = new Map<string, { category: string; icon: string; type: string; amount: number; count: number }>();

    for (const txn of txns) {
      const amount = Number(txn.amount);
      if (txn.type === "INCOME") totalIncome += amount;
      else totalExpense += amount;

      const key = txn.category.name;
      const existing = catMap.get(key);
      if (existing) {
        existing.amount += amount;
        existing.count += 1;
      } else {
        catMap.set(key, {
          category: txn.category.name,
          icon: txn.category.icon,
          type: txn.type,
          amount,
          count: 1,
        });
      }
    }

    const byCategory = Array.from(catMap.values()).sort((a, b) => b.amount - a.amount);

    return {
      income: totalIncome,
      expense: totalExpense,
      balance: totalIncome - totalExpense,
      byCategory,
    };
  },
});
