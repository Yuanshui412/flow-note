import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { FinancePanel } from "./finance-panel";

export default async function FinancePage() {
  const session = await getServerSession(authOptions);

  if (!session?.userId) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Wallet className="w-8 h-8 text-slate-700 mx-auto" />
          <p className="text-sm text-slate-500">请先登录以查看财务</p>
          <Link
            href="/login"
            className="inline-block px-6 py-2 bg-emerald-600 text-sm text-white hover:bg-emerald-500 transition-colors"
          >
            登录
          </Link>
        </div>
      </div>
    );
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: session.userId },
    select: { workspaceId: true },
  });

  if (!membership) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-sm text-slate-500">你还没有加入任何工作区</p>
      </div>
    );
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // 查本月交易
  const rows = await prisma.$queryRawUnsafe<
    Array<{ category_id: string; category: string; icon: string; type: string; amount: number; count: number }>
  >(
    `SELECT t.category_id, tc.name AS category, tc.icon, t.type,
            SUM(t.amount) AS amount, COUNT(*) AS count
     FROM transactions t
     JOIN transaction_categories tc ON t.category_id = tc.id
     WHERE t.workspace_id = ?
       AND CAST(strftime('%Y', t.date) AS INTEGER) = ?
       AND CAST(strftime('%m', t.date) AS INTEGER) = ?
     GROUP BY t.category_id, tc.name, tc.icon, t.type
     ORDER BY amount DESC`,
    membership.workspaceId,
    year,
    month
  );

  let totalIncome = 0;
  let totalExpense = 0;
  const byCategory: Stats["byCategory"] = [];

  for (const row of rows) {
    const amount = Number(row.amount);
    if (row.type === "INCOME") totalIncome += amount;
    else totalExpense += amount;
    byCategory.push({
      category: row.category,
      icon: row.icon,
      type: row.type,
      amount,
      count: Number(row.count),
    });
  }

  const transactions = await prisma.transaction.findMany({
    where: { workspaceId: membership.workspaceId },
    orderBy: { date: "desc" },
    take: 50,
    include: { category: true },
  });

  return (
    <FinancePanel
      workspaceId={membership.workspaceId}
      initialStats={{
        income: totalIncome,
        expense: totalExpense,
        balance: totalIncome - totalExpense,
        byCategory,
      }}
      initialTransactions={transactions.map((t) => ({
        id: t.id,
        amount: Number(t.amount),
        type: t.type,
        date: t.date.toISOString(),
        description: t.description,
        category: {
          name: t.category.name,
          icon: t.category.icon,
          color: t.category.color,
        },
      }))}
    />
  );
}

type Stats = {
  income: number;
  expense: number;
  balance: number;
  byCategory: { category: string; icon: string; type: string; amount: number; count: number }[];
};
