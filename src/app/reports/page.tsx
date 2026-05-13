import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import Link from "next/link";
import { BarChart3 } from "lucide-react";

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.userId) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f6f5f4" }}>
        <div style={{ textAlign: "center" }}>
          <BarChart3 size={32} style={{ color: "#a39e98", marginBottom: 16 }} />
          <p style={{ fontSize: 16, color: "#615d59", marginBottom: 20 }}>请先登录以查看报告</p>
          <Link href="/login" className="notion-btn-primary" style={{ textDecoration: "none" }}>登录</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.625px", color: "rgba(0,0,0,0.95)", display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
        <BarChart3 size={22} style={{ color: "#615d59" }} /> 复盘报告
      </h1>

      <div className="notion-card" style={{ padding: "64px 24px", textAlign: "center" }}>
        <BarChart3 size={32} style={{ color: "#a39e98", marginBottom: 16 }} />
        <p style={{ fontSize: 16, color: "rgba(0,0,0,0.95)", marginBottom: 8 }}>AI 月度复盘报告</p>
        <p style={{ fontSize: 14, color: "#615d59", marginBottom: 24 }}>
          每个月自动汇总笔记和财务数据，生成工作+财务分析报告
        </p>
        <span className="notion-badge" style={{ background: "rgba(0,0,0,0.05)", color: "#a39e98" }}>
          需要先有笔记和财务数据
        </span>
      </div>
    </div>
  );
}
