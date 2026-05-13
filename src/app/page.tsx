import Link from "next/link";
import { FileText, Wallet, BarChart3, ArrowRight } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  // 获取真实统计数据（已登录用户）
  let noteCount = 0;
  let expenseTotal = 0;
  let budgetRemaining = 0;
  let aiParseCount = 0;

  if (session?.userId) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 用户所有 workspace
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: session.userId },
      select: { workspaceId: true },
    });
    const wsIds = memberships.map((m) => m.workspaceId);

    // 本月笔记数
    noteCount = await prisma.note.count({
      where: { workspaceId: { in: wsIds }, deletedAt: null, createdAt: { gte: monthStart } },
    });

    // 本月支出
    const txns = await prisma.transaction.findMany({
      where: { workspaceId: { in: wsIds }, type: "EXPENSE", date: { gte: monthStart } },
      select: { amount: true },
    });
    expenseTotal = txns.reduce((sum, t) => sum + Number(t.amount), 0);

    // 本月预算剩余
    const budgets = await prisma.budget.findMany({
      where: { workspaceId: { in: wsIds }, periodStart: { lte: now }, periodEnd: { gte: now } },
      select: { amount: true },
    });
    const totalBudget = budgets.reduce((sum, b) => sum + Number(b.amount), 0);
    budgetRemaining = totalBudget - expenseTotal;

    // AI 解析次数（通过审计日志统计 AI 工具创建的 transaction）
    aiParseCount = await prisma.auditLog.count({
      where: { workspaceId: { in: wsIds }, action: "transaction.create", createdAt: { gte: monthStart } },
    });
  }

  return (
    <>
      {/* Hero */}
      <section style={{ background: "var(--bg-warm)", padding: "100px 24px 80px", textAlign: "center" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div className="notion-badge" style={{ marginBottom: 24, background: "#e8f4fd", color: "#0075de" }}>
            AI-Powered Knowledge Base
          </div>
          <h1 style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.0, letterSpacing: "-2.125px", color: "rgba(0,0,0,0.95)", margin: "0 0 24px" }}>
            Flow<span style={{ color: "#0075de" }}>Note</span>
          </h1>
          <p style={{ fontSize: 20, lineHeight: 1.5, color: "#615d59", maxWidth: 540, margin: "0 auto 40px" }}>
            以笔记为主轴，财务记账为内嵌模块的 AI 知识库。写笔记时自然语言入账，月底自动生成工作+财务复盘报告。
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Link href="/notes" className="notion-btn-primary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 15 }}>
              开始使用 <ArrowRight size={16} />
            </Link>
            <Link href="/ai-chat" className="notion-btn-secondary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
              AI 对话
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: "80px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <h2 style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.23, letterSpacing: "-0.625px", color: "rgba(0,0,0,0.95)", marginBottom: 40 }}>
          一切从笔记开始
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          {[
            { icon: FileText, title: "块结构笔记", desc: "自由输入 Markdown，自动解析为结构化 Block。支持标题、列表、引用、代码块。" },
            { icon: Wallet, title: "自然语言记账", desc: "在笔记中写「和客户吃饭花了800」，AI 自动提取金额、分类，关联上下文。" },
            { icon: BarChart3, title: "AI 复盘报告", desc: "每月自动汇总笔记和财务数据，生成工作+财务分析报告。" },
          ].map((f) => (
            <div key={f.title} className="notion-card" style={{ padding: 32 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: "#f2f9ff", color: "#0075de", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                <f.icon size={20} />
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.27, letterSpacing: "-0.25px", color: "rgba(0,0,0,0.95)", marginBottom: 8 }}>
                {f.title}
              </h3>
              <p style={{ fontSize: 16, lineHeight: 1.5, color: "#615d59", margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats — real data */}
      <section className="notion-section-warm" style={{ padding: "64px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 1 }}>
          {[
            { label: "本月笔记", value: noteCount.toLocaleString(), unit: "篇" },
            { label: "本月支出", value: `¥${expenseTotal.toLocaleString()}`, unit: "" },
            { label: "预算剩余", value: `¥${budgetRemaining.toLocaleString()}`, unit: "" },
            { label: "AI 解析", value: aiParseCount.toLocaleString(), unit: "次" },
          ].map((stat) => (
            <div key={stat.label} style={{ background: "#fff", padding: "24px 28px" }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#615d59", marginBottom: 8 }}>{stat.label}</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: "rgba(0,0,0,0.95)", lineHeight: 1 }}>
                {stat.value}
                {stat.unit && <span style={{ fontSize: 14, fontWeight: 400, color: "#a39e98", marginLeft: 4 }}>{stat.unit}</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(0,0,0,0.1)", padding: "24px", textAlign: "center", fontSize: 14, color: "#a39e98" }}>
        FlowNote · AI-Powered Knowledge Base with Financial Nerve
      </footer>
    </>
  );
}
