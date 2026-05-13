import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import Link from "next/link";
import { BarChart3 } from "lucide-react";

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.userId) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <BarChart3 className="w-8 h-8 text-slate-700 mx-auto" />
          <p className="text-sm text-slate-500">请先登录以查看报告</p>
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

  return (
    <div className="min-h-screen bg-slate-950 font-mono">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-2xl font-bold text-slate-200 mb-8 flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-slate-500" />
          复盘报告
        </h1>

        <div className="border border-slate-800 px-6 py-12 text-center">
          <p className="text-sm text-slate-500 mb-2">AI 月度复盘报告</p>
          <p className="text-xs text-slate-700 mb-6">
            每个月自动汇总笔记和财务数据，生成工作+财务分析报告
          </p>
          <button
            disabled
            className="px-6 py-2 border border-slate-800 text-xs text-slate-600 cursor-not-allowed"
          >
            需要先有笔记和财务数据
          </button>
        </div>
      </div>
    </div>
  );
}
