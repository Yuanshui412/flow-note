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
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f6f5f4" }}>
        <div style={{ textAlign: "center" }}>
          <Wallet size={32} style={{ color: "#a39e98", marginBottom: 16 }} />
          <p style={{ fontSize: 16, color: "#615d59", marginBottom: 20 }}>请先登录以查看财务</p>
          <Link href="/login" className="notion-btn-primary" style={{ textDecoration: "none" }}>登录</Link>
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
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f6f5f4" }}>
        <p style={{ fontSize: 16, color: "#615d59" }}>你还没有加入任何工作区</p>
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
