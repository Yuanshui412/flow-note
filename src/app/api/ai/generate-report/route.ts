import { generateObject } from "ai";
import { z } from "zod";
import { models } from "@/lib/ai/provider";
import { getCurrentUserId, requireWorkspaceMember } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";

// ─── Input Schema ───

const ReportInputSchema = z.object({
  workspaceId: z.string().min(1),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
});

// ─── Output Schema —— 报告结构 ───

const ReportOutputSchema = z.object({
  period: z.object({
    year: z.number(),
    month: z.number(),
    label: z.string(), // "2026年3月"
  }),

  workSummary: z.object({
    totalNotes: z.number(),
    highlights: z.array(z.string()).describe("本月重点事项，3-5条"),
    keywords: z.array(z.string()).describe("高频关键词，3-5个"),
    aiSummary: z.string().describe("AI总结的一段话，概述本月工作"),
  }),

  financialSummary: z.object({
    totalIncome: z.number(),
    totalExpense: z.number(),
    balance: z.number(),
    topCategories: z.array(
      z.object({
        name: z.string(),
        icon: z.string(),
        amount: z.number(),
        percentage: z.number(),
      })
    ).describe("支出前5分类"),
  }),

  budgetComparison: z.array(
    z.object({
      categoryName: z.string(),
      icon: z.string(),
      budgetAmount: z.number(),
      actualAmount: z.number(),
      remaining: z.number(),
      usageRate: z.number().describe("使用率 0-1"),
      status: z.enum(["safe", "warning", "over"]),
    })
  ),

  insights: z.object({
    spendingAlert: z.string().optional().describe("超支提醒"),
    savingOpportunity: z.string().optional().describe("省钱建议"),
    workPattern: z.string().optional().describe("工作模式发现"),
    nextMonthTip: z.string().optional().describe("下月建议"),
  }),
});

// ─── POST /api/ai/generate-report ───

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  const body = await req.json();
  const { workspaceId, year, month } = ReportInputSchema.parse(body);

  await requireWorkspaceMember(userId, workspaceId);

  // ── ① 查本月笔记 ──
  const notes = await prisma.note.findMany({
    where: {
      workspaceId,
      deletedAt: null,
      createdAt: {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1),
      },
    },
    select: { title: true, content: true },
    take: 100,
  });

  // ── ② 查本月财务 ──
  const txns = await prisma.transaction.findMany({
    where: {
      workspaceId,
      date: {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1),
      },
    },
    include: { category: true },
    orderBy: { date: "desc" },
  });

  // ── ③ 查预算 ──
  const budgets = await prisma.budget.findMany({
    where: {
      workspaceId,
      periodStart: { lte: new Date(year, month, 1) },
      periodEnd: { gte: new Date(year, month - 1, 1) },
    },
    include: { category: true },
  });

  // ── ④ 汇总统计数据 ──
  let totalIncome = 0;
  let totalExpense = 0;
  const byCategory: Record<string, { name: string; icon: string; amount: number }> = {};

  for (const txn of txns) {
    const amount = Number(txn.amount);
    if (txn.type === "INCOME") totalIncome += amount;
    else totalExpense += amount;

    const key = txn.category.name;
    if (!byCategory[key]) {
      byCategory[key] = { name: key, icon: txn.category.icon, amount: 0 };
    }
    byCategory[key].amount += amount;
  }

  const noteTitles = notes.map((n) => n.title).join("；");

  // ── ⑤ 注入 AI ──
  const result = await generateObject({
    model: models.smart, // 复杂推理用 smart
    schema: ReportOutputSchema,
    system:
      "你是一个专业的复盘教练。根据提供的笔记和财务数据，生成月度复盘报告。" +
      "数据必须基于提供的真实数据，不得编造。" +
      "建议要具体、可操作。中文输出。",
    prompt: [
      `请为 ${year}年${month}月 生成复盘报告。`,
      ``,
      `【本月笔记标题】`,
      noteTitles || "（无笔记）",
      ``,
      `【财务数据】`,
      `总收入: ¥${totalIncome}`,
      `总支出: ¥${totalExpense}`,
      `收支结余: ¥${totalIncome - totalExpense}`,
      `分类明细:`,
      ...Object.values(byCategory).map(
        (c) => `  ${c.icon} ${c.name}: ¥${c.amount}`
      ),
      ``,
      `【预算对比】`,
      ...budgets.map((b) => {
        const actual = byCategory[b.category.name]?.amount ?? 0;
        const remaining = Number(b.amount) - actual;
        return `  ${b.category.icon} ${b.category.name}: 预算 ¥${Number(b.amount)} / 实际 ¥${actual} / 剩余 ¥${remaining}`;
      }),
    ].join("\n"),
  });

  return Response.json({
    success: true,
    data: {
      ...result.object,
      rawStats: {
        noteCount: notes.length,
        transactionCount: txns.length,
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        byCategory: Object.values(byCategory),
      },
    },
  });
}
