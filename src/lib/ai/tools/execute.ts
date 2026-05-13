import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/db/audit";

/**
 * AI Tool 的实际执行函数
 *
 * 每个函数 = AI 可调用的一个能力。
 * 函数签名必须与 registry.ts 中的 parameters 一致。
 */

// ─── searchNotes ───

interface SearchNotesInput {
  query: string;
  limit?: number;
}

export async function executeSearchNotes(input: SearchNotesInput, workspaceId: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; title: string }>>(
    `SELECT id, title, updatedAt
     FROM notes
     WHERE workspaceId = ?
       AND deletedAt IS NULL
       AND title LIKE ?
     ORDER BY updatedAt DESC
     LIMIT ?`,
    workspaceId,
    `%${input.query}%`,
    input.limit ?? 20
  );

  return {
    count: rows.length,
    results: rows.map((r) => ({ id: r.id, title: r.title })),
    hint: "展示标题列表给用户。如需查看某篇笔记的详细内容，请调用 getNoteContent 工具。",
  };
}

// ─── listAllNotes ───

export async function executeListAllNotes(workspaceId: string) {
  const notes = await prisma.note.findMany({
    where: { workspaceId, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: { id: true, title: true, updatedAt: true },
  });

  return {
    count: notes.length,
    notes: notes.map((n) => ({
      id: n.id,
      title: n.title,
      updatedAt: n.updatedAt.toISOString(),
    })),
    hint: "展示所有笔记标题。如需查看具体内容，调用 getNoteContent。",
  };
}

// ─── getNoteContent ───

interface GetNoteContentInput {
  noteId: string;
}

export async function executeGetNoteContent(input: GetNoteContentInput, workspaceId: string) {
  const note = await prisma.note.findFirst({
    where: { id: input.noteId, workspaceId, deletedAt: null },
    select: { id: true, title: true, content: true, updatedAt: true },
  });

  if (!note) {
    return { found: false, message: "笔记不存在或已删除" };
  }

  // 解析 JSON content 为可读文本
  let textContent = "";
  try {
    const blocks = JSON.parse(note.content);
    if (Array.isArray(blocks)) {
      textContent = blocks
        .map((b: any) => {
          if (b.type === "heading") return `【${b.content}】`;
          return b.content;
        })
        .join("\n");
    }
  } catch {
    textContent = note.content;
  }

  return {
    found: true,
    id: note.id,
    title: note.title,
    content: textContent,
    updatedAt: note.updatedAt.toISOString(),
    hint: "这是笔记的完整内容。请根据内容为用户提供总结或回答相关问题。",
  };
}

// ─── createNote ───

interface CreateNoteInput {
  title: string;
  content: string; // Markdown 文本
}

export async function executeCreateNote(
  input: CreateNoteInput,
  workspaceId: string,
  userId: string
) {
  // 将 Markdown 转为 Block 数组
  const lines = input.content.split("\n");
  const blocks: Array<{ id: string; type: string; content: string }> = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^#{1,3}\s/.test(trimmed)) {
      blocks.push({ id: crypto.randomUUID(), type: "heading", content: trimmed.replace(/^#{1,3}\s/, "") });
    } else if (/^[-*]\s/.test(trimmed)) {
      blocks.push({ id: crypto.randomUUID(), type: "list", content: trimmed.replace(/^[-*]\s/, "") });
    } else if (/^>\s/.test(trimmed)) {
      blocks.push({ id: crypto.randomUUID(), type: "quote", content: trimmed.replace(/^>\s/, "") });
    } else {
      blocks.push({ id: crypto.randomUUID(), type: "paragraph", content: trimmed });
    }
  }

  if (blocks.length === 0) {
    blocks.push({ id: crypto.randomUUID(), type: "paragraph", content: input.content });
  }

  const note = await prisma.note.create({
    data: {
      workspaceId,
      authorId: userId,
      title: input.title,
      content: JSON.stringify(blocks),
    },
  });

  return {
    success: true,
    note: { id: note.id, title: note.title },
    message: `已创建笔记：《${input.title}》`,
  };
}

// ─── createTransaction ───

interface CreateTransactionInput {
  amount: number;
  type: "INCOME" | "EXPENSE";
  categoryName: string;
  date: string;       // ISO date string
  description?: string;
  noteId?: string;
}

export async function executeCreateTransaction(
  input: CreateTransactionInput,
  workspaceId: string,
  userId: string
) {
  // 1. 匹配分类（按名称模糊匹配）
  const category = await prisma.transactionCategory.findFirst({
    where: { workspaceId, name: { contains: input.categoryName } },
  });

  if (!category) {
    return {
      success: false,
      message: `未找到分类「${input.categoryName}」。请让用户从已有分类中选择，或创建新分类。`,
    };
  }

  // 2. 创建交易
  const txn = await prisma.transaction.create({
    data: {
      workspaceId,
      amount: input.amount,
      type: input.type,
      categoryId: category.id,
      date: new Date(input.date),
      description: input.description,
      noteId: input.noteId || undefined,
      createdById: userId,
    },
    include: { category: true },
  });

  writeAuditLog({
    workspaceId,
    actorId: userId,
    action: "transaction.create",
    targetType: "transaction",
    targetId: txn.id,
    metadata: { amount: input.amount, type: input.type, source: "ai-tool" },
  });

  return {
    success: true,
    transaction: {
      amount: txn.amount.toString(),
      type: txn.type,
      category: category.name,
      icon: category.icon,
      date: txn.date.toISOString(),
    },
    message: `已记账：${category.icon} ${category.name} ¥${input.amount}`,
  };
}

// ─── getFinancialStats ───

interface GetFinancialStatsInput {
  year: number;
  month?: number;
}

export async function executeGetFinancialStats(
  input: GetFinancialStatsInput,
  workspaceId: string
) {
  const now = new Date();
  const year = input.year ?? now.getFullYear();
  const month = input.month;

  const start = new Date(year, (month ?? 1) - 1, 1);
  const end = month ? new Date(year, month, 1) : new Date(year + 1, 0, 1);

  const txns = await prisma.transaction.findMany({
    where: { workspaceId, date: { gte: start, lt: end } },
    include: { category: true },
  });

  let totalIncome = 0;
  let totalExpense = 0;
  const byCategory: Record<string, { name: string; icon: string; type: string; amount: number; count: number }> = {};

  for (const txn of txns) {
    const amount = Number(txn.amount);
    if (txn.type === "INCOME") totalIncome += amount;
    else totalExpense += amount;

    const key = txn.category.name;
    if (!byCategory[key]) byCategory[key] = { name: key, icon: txn.category.icon, type: txn.type, amount: 0, count: 0 };
    byCategory[key].amount += amount;
    byCategory[key].count += 1;
  }

  const categories = Object.values(byCategory).sort((a, b) => b.amount - a.amount);

  const period = month ? `${year}年${month}月` : `${year}年`;

  return {
    period,
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    transactionCount: txns.length,
    topCategories: categories.slice(0, 5),
    summary: `${period}：收入 ¥${totalIncome}，支出 ¥${totalExpense}，结余 ¥${totalIncome - totalExpense}。共 ${txns.length} 笔交易。`,
  };
}
