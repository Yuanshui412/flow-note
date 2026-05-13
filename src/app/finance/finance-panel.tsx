"use client";

import { useState, useEffect, useCallback } from "react";
import { Wallet, Plus, ArrowUpRight, ArrowDownRight, TrendingUp, Hash } from "lucide-react";

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

interface Props { workspaceId: string; initialStats: Stats; initialTransactions: Transaction[]; }

const QUICK_CATEGORIES = [
  { name: "餐饮", icon: "🍜", type: "EXPENSE" },
  { name: "交通", icon: "🚗", type: "EXPENSE" },
  { name: "购物", icon: "🛒", type: "EXPENSE" },
  { name: "办公", icon: "💻", type: "EXPENSE" },
  { name: "工资", icon: "💵", type: "INCOME" },
];

export function FinancePanel({ workspaceId, initialStats, initialTransactions }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [stats, setStats] = useState(initialStats);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [catName, setCatName] = useState("餐饮");
  const [catType, setCatType] = useState("EXPENSE");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    const params = new URLSearchParams({ workspaceId, year: String(year) });
    if (month) params.set("month", String(month));
    const [statsRes, txnsRes] = await Promise.all([
      fetch(`/api/transactions/stats?${params}`),
      fetch(`/api/transactions?workspaceId=${workspaceId}&year=${year}&month=${month}`),
    ]);
    if (statsRes.ok) { const s = await statsRes.json(); if (s.success) setStats(s.data); }
    if (txnsRes.ok) { const t = await txnsRes.json(); if (t.success) setTransactions(Array.isArray(t.data) ? t.data : []); }
  }, [workspaceId, year, month]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount) return;
    setSubmitting(true);
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, amount: Number(amount), type: catType, categoryName: catName, date: new Date().toISOString(), description: desc || undefined }),
    });
    setSubmitting(false);
    if (res.ok || res.status === 201) { setAmount(""); setDesc(""); setShowForm(false); loadData(); }
  }

  const maxCategoryAmount = Math.max(...stats.byCategory.map((c) => c.amount), 1);

  const selectStyle: React.CSSProperties = {
    background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 4,
    padding: "4px 8px", fontSize: 14, color: "rgba(0,0,0,0.95)", outline: "none",
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.625px", color: "rgba(0,0,0,0.95)", display: "flex", alignItems: "center", gap: 12 }}>
          <Wallet size={22} style={{ color: "#615d59" }} /> 财务
        </h1>
        <div style={{ display: "flex", gap: 8, fontSize: 14 }}>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={selectStyle}>
            {[2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}年</option>)}
          </select>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={selectStyle}>
            {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}月</option>)}
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 40 }}>
        {[
          { label: "收入", value: stats.income, icon: ArrowUpRight, color: "#1aae39", bg: "#f0fdf4" },
          { label: "支出", value: stats.expense, icon: ArrowDownRight, color: "#dc2626", bg: "#fef2f2" },
          { label: "结余", value: stats.balance, icon: TrendingUp, color: "#0075de", bg: "#f2f9ff" },
        ].map((stat) => (
          <div key={stat.label} className="notion-card" style={{ padding: "20px 24px", background: stat.bg }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <stat.icon size={16} style={{ color: stat.color }} />
              <span style={{ fontSize: 14, fontWeight: 500, color: "#615d59" }}>{stat.label}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "rgba(0,0,0,0.95)", fontVariantNumeric: "tabular-nums" }}>
              ¥{stat.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Category Breakdown */}
      {stats.byCategory.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "rgba(0,0,0,0.95)", marginBottom: 16 }}>分类明细</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {stats.byCategory.map((cat) => (
              <div key={cat.category} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 16, width: 24 }}>{cat.icon}</span>
                <span style={{ fontSize: 14, color: "#615d59", width: 64, flexShrink: 0 }}>{cat.category}</span>
                <div style={{ flex: 1, background: "#f6f5f4", borderRadius: 4, height: 8, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%", borderRadius: 4,
                      background: cat.type === "INCOME" ? "#1aae39" : "#0075de",
                      width: `${Math.max((cat.amount / maxCategoryAmount) * 100, 2)}%`,
                    }}
                  />
                </div>
                <span style={{ fontSize: 14, color: "rgba(0,0,0,0.95)", fontVariantNumeric: "tabular-nums", width: 80, textAlign: "right" }}>
                  ¥{cat.amount.toLocaleString()}
                </span>
                <span style={{ fontSize: 14, color: "#a39e98", width: 48, textAlign: "right" }}>{cat.count}笔</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Add */}
      <div style={{ marginBottom: 40 }}>
        {!showForm ? (
          <button onClick={() => setShowForm(true)} className="notion-btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14 }}>
            <Plus size={14} /> 记一笔
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="notion-card" style={{ padding: 20, marginTop: 8 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              {QUICK_CATEGORIES.map((cat) => (
                <button
                  key={cat.name} type="button"
                  onClick={() => { setCatName(cat.name); setCatType(cat.type); }}
                  style={{
                    fontSize: 14, padding: "4px 10px", borderRadius: 9999, border: "none",
                    background: catName === cat.name ? "#f2f9ff" : "rgba(0,0,0,0.05)",
                    color: catName === cat.name ? "#097fe8" : "#615d59",
                    cursor: "pointer", fontWeight: catName === cat.name ? 600 : 500,
                  }}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="金额" step="0.01" required
                className="notion-input" style={{ width: 120 }} />
              <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)}
                placeholder="备注（选填）" className="notion-input" style={{ flex: 1 }} />
              <button type="submit" disabled={submitting || !amount} className="notion-btn-primary" style={{ fontSize: 14 }}>
                {submitting ? "..." : "入账"}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="notion-btn-secondary" style={{ fontSize: 14 }}>
                取消
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Transaction List */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "rgba(0,0,0,0.95)", marginBottom: 16 }}>
          交易记录
          {transactions.length > 0 && <span style={{ color: "#a39e98", fontWeight: 400, marginLeft: 8 }}>({transactions.length})</span>}
        </h2>
        {!Array.isArray(transactions) || transactions.length === 0 ? (
          <div className="notion-card" style={{ padding: "48px 24px", textAlign: "center" }}>
            <Hash size={24} style={{ color: "#a39e98", marginBottom: 8 }} />
            <p style={{ fontSize: 14, color: "#a39e98", margin: 0 }}>暂无交易记录</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "rgba(0,0,0,0.1)" }}>
            {transactions.map((txn) => {
              const amt = typeof txn.amount === "number" ? txn.amount : Number(txn.amount);
              return (
                <div key={txn.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 20px", background: "#fff" }}>
                  <span style={{ fontSize: 20 }}>{txn.category.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 500, color: "rgba(0,0,0,0.95)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {txn.description || txn.category.name}
                    </div>
                    <div style={{ fontSize: 14, color: "#615d59", marginTop: 2 }}>
                      {txn.category.name} · {new Date(txn.date).toLocaleDateString("zh-CN")}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 16, fontWeight: 600, fontVariantNumeric: "tabular-nums",
                    color: txn.type === "INCOME" ? "#1aae39" : "#dc2626",
                  }}>
                    {txn.type === "INCOME" ? "+" : "-"}¥{Math.abs(amt).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
