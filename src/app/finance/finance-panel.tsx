"use client";

import { useState, useEffect, useCallback } from "react";
import { Wallet, Plus, ArrowUpRight, ArrowDownRight, TrendingUp, Hash } from "lucide-react";

// ─── 类型 ───

type Stats = {
  income: number;
  expense: number;
  balance: number;
  byCategory: { category: string; icon: string; type: string; amount: number; count: number }[];
};

type Transaction = {
  id: string;
  amount: string | number;
  type: string;
  date: string;
  description: string | null;
  category: { name: string; icon: string; color: string | null };
};

interface Props {
  workspaceId: string;
  initialStats: Stats;
  initialTransactions: Transaction[];
}

// ─── 预置分类（快捷记账用）───

const QUICK_CATEGORIES = [
  { name: "餐饮", icon: "🍜", type: "EXPENSE" },
  { name: "交通", icon: "🚗", type: "EXPENSE" },
  { name: "购物", icon: "🛒", type: "EXPENSE" },
  { name: "办公", icon: "💻", type: "EXPENSE" },
  { name: "工资", icon: "💵", type: "INCOME" },
];

// ─── 组件 ───

export function FinancePanel({ workspaceId, initialStats, initialTransactions }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [stats, setStats] = useState(initialStats);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [showForm, setShowForm] = useState(false);

  // 快捷记账表单
  const [amount, setAmount] = useState("");
  const [catName, setCatName] = useState("餐饮");
  const [catType, setCatType] = useState("EXPENSE");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 切换月份时重新加载
  const loadData = useCallback(async () => {
    const params = new URLSearchParams({ workspaceId, year: String(year) });
    if (month) params.set("month", String(month));

    const [statsRes, txnsRes] = await Promise.all([
      fetch(`/api/transactions/stats?${params}`),
      fetch(`/api/transactions?workspaceId=${workspaceId}&year=${year}&month=${month}`),
    ]);

    if (statsRes.ok) {
      const s = await statsRes.json();
      console.log("[finance] stats response:", s);
      if (s.success) setStats(s.data);
    } else {
      console.error("[finance] stats failed:", statsRes.status);
    }
    if (txnsRes.ok) {
      const t = await txnsRes.json();
      console.log("[finance] txns response:", t);
      if (t.success) setTransactions(Array.isArray(t.data) ? t.data : []);
    } else {
      console.error("[finance] txns failed:", txnsRes.status);
    }
  }, [workspaceId, year, month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 提交记账
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount) return;

    setSubmitting(true);
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        amount: Number(amount),
        type: catType,
        categoryName: catName,
        date: new Date().toISOString(),
        description: desc || undefined,
      }),
    });

    setSubmitting(false);
    if (res.ok || res.status === 201) {
      setAmount("");
      setDesc("");
      setShowForm(false);
      loadData();
    }
  }

  const maxCategoryAmount = Math.max(...stats.byCategory.map((c) => c.amount), 1);

  return (
    <div className="min-h-screen bg-slate-950 font-mono">
      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* 标题栏 */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-slate-200 flex items-center gap-3">
            <Wallet className="w-6 h-6 text-slate-500" />
            财务
          </h1>

          {/* 月份切换 */}
          <div className="flex items-center gap-2 text-xs">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="bg-slate-900 border border-slate-800 px-2 py-1 text-slate-400 outline-none"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}年</option>
              ))}
            </select>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="bg-slate-900 border border-slate-800 px-2 py-1 text-slate-400 outline-none"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}月</option>
              ))}
            </select>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 md:grid-cols-3 mb-10">
          {[
            { label: "收入", value: stats.income, icon: ArrowUpRight, color: "text-emerald-400", bg: "border-emerald-900 bg-emerald-950/20" },
            { label: "支出", value: stats.expense, icon: ArrowDownRight, color: "text-red-400", bg: "border-red-900 bg-red-950/20" },
            { label: "结余", value: stats.balance, icon: TrendingUp, color: "text-blue-400", bg: "border-blue-900 bg-blue-950/20" },
          ].map((stat) => (
            <div key={stat.label} className={`border px-5 py-4 ${stat.bg}`}>
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-xs text-slate-500">{stat.label}</span>
              </div>
              <div className={`text-xl tabular-nums ${stat.color}`}>
                ¥{stat.value.toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        {/* 分类明细 */}
        {stats.byCategory.length > 0 && (
          <div className="mb-10">
            <h2 className="text-sm text-slate-400 mb-4">分类明细</h2>
            <div className="space-y-2">
              {stats.byCategory.map((cat) => (
                <div key={cat.category} className="flex items-center gap-3">
                  <span className="text-sm w-6">{cat.icon}</span>
                  <span className="text-xs text-slate-400 w-16 shrink-0">{cat.category}</span>
                  <div className="flex-1 bg-slate-900 h-3">
                    <div
                      className={`h-full ${cat.type === "INCOME" ? "bg-emerald-700" : "bg-red-700"}`}
                      style={{ width: `${Math.max((cat.amount / maxCategoryAmount) * 100, 2)}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 w-24 text-right tabular-nums">
                    ¥{cat.amount.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-600 w-12 text-right">{cat.count}笔</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 快捷记账按钮 */}
        <div className="mb-6">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 border border-emerald-900
                         text-sm text-emerald-500 hover:bg-emerald-950/30 transition-colors"
            >
              <Plus className="w-4 h-4" /> 记一笔
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="border border-slate-800 p-4 space-y-3">
              <div className="flex items-center gap-3">
                {/* 分类快捷选择 */}
                <div className="flex gap-1">
                  {QUICK_CATEGORIES.map((cat) => (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => { setCatName(cat.name); setCatType(cat.type); }}
                      className={`px-2 py-1 text-xs border transition-colors
                        ${catName === cat.name
                          ? "border-emerald-700 text-emerald-400 bg-emerald-950/30"
                          : "border-slate-800 text-slate-500 hover:border-slate-700"
                        }`}
                    >
                      {cat.icon} {cat.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="金额"
                  step="0.01"
                  required
                  className="w-32 bg-slate-900 border border-slate-800 px-3 py-1.5 text-sm
                             text-slate-300 placeholder-slate-700 outline-none"
                />
                <input
                  type="text"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="备注（选填）"
                  className="flex-1 bg-slate-900 border border-slate-800 px-3 py-1.5 text-sm
                             text-slate-300 placeholder-slate-700 outline-none"
                />
                <button
                  type="submit"
                  disabled={submitting || !amount}
                  className="px-4 py-1.5 bg-emerald-600 text-sm text-white
                             hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                >
                  {submitting ? "..." : "入账"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-3 py-1.5 border border-slate-800 text-xs text-slate-500
                             hover:text-slate-400 transition-colors"
                >
                  取消
                </button>
              </div>
            </form>
          )}
        </div>

        {/* 交易列表 */}
        <div>
          <h2 className="text-sm text-slate-400 mb-4">
            交易记录
            {transactions.length > 0 && (
              <span className="text-slate-600 ml-2">({transactions.length})</span>
            )}
          </h2>
          {!Array.isArray(transactions) || transactions.length === 0 ? (
            <div className="border border-slate-800 px-6 py-12 text-center">
              <Hash className="w-6 h-6 text-slate-700 mx-auto mb-2" />
              <p className="text-sm text-slate-600">暂无交易记录</p>
            </div>
          ) : (
            <div className="space-y-px">
              {transactions.map((txn) => (
                <div
                  key={txn.id}
                  className="flex items-center gap-4 px-4 py-3 border border-slate-800 hover:bg-slate-900"
                >
                  <span className="text-lg">{txn.category.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-300 truncate">
                      {txn.description || txn.category.name}
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      {txn.category.name} · {new Date(txn.date).toLocaleDateString("zh-CN")}
                    </div>
                  </div>
                  <span
                    className={`text-sm tabular-nums font-medium ${
                      typeof txn.amount === "number"
                        ? txn.amount > 0
                          ? txn.type === "INCOME" ? "text-emerald-400" : "text-red-400"
                          : "text-slate-500"
                        : Number(txn.amount) > 0
                          ? txn.type === "INCOME" ? "text-emerald-400" : "text-red-400"
                          : "text-slate-500"
                    }`}
                  >
                    {txn.type === "INCOME" ? "+" : "-"}¥
                    {typeof txn.amount === "number"
                      ? Math.abs(txn.amount).toLocaleString()
                      : Math.abs(Number(txn.amount)).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
