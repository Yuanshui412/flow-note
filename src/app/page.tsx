import Link from "next/link";
import { FileText, Wallet, BarChart3, Hash, Terminal, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-300 font-mono">
      {/* Main Content */}
      <div className="mx-auto max-w-4xl px-6 pt-20 pb-24">
        {/* Brand Line */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <Terminal className="w-6 h-6 text-slate-400" />
            <span className="text-xs text-slate-600 tracking-[0.2em] uppercase">
              AI-Powered Knowledge Base
            </span>
          </div>
          <h1 className="text-5xl font-bold text-slate-100 tracking-tight">
            Flow<span className="text-emerald-400">Note</span>
          </h1>
          <p className="mt-4 text-sm text-slate-500 max-w-lg leading-relaxed">
            以笔记为主轴，财务记账为内嵌模块的 AI 知识库。
            写笔记时自然语言入账，月底自动生成工作+财务复盘报告。
          </p>

          {/* CTA */}
          <div className="mt-8 flex items-center gap-4">
            <Link
              href="/notes"
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-sm text-white
                         hover:bg-emerald-500 transition-colors"
            >
              开始使用
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/ai-chat"
              className="flex items-center gap-2 px-6 py-2.5 border border-slate-700 text-sm
                         text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
            >
              AI 对话
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-1">
          <p className="text-xs text-slate-600 mb-3 uppercase tracking-widest">
            Quick Actions
          </p>

          <Link
            href="/notes"
            className="flex items-center gap-4 px-4 py-3 border border-slate-800
                       hover:border-slate-700 hover:bg-slate-900 group transition-colors"
          >
            <FileText className="w-5 h-5 text-slate-500 group-hover:text-slate-300 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm text-slate-300">笔记</span>
              <span className="text-xs text-slate-600 ml-3">
                块结构编辑 · Markdown · 版本历史
              </span>
            </div>
            <span className="text-xs text-slate-700">⌘N</span>
          </Link>

          <Link
            href="/finance"
            className="flex items-center gap-4 px-4 py-3 border border-slate-800
                       hover:border-slate-700 hover:bg-slate-900 group transition-colors"
          >
            <Wallet className="w-5 h-5 text-slate-500 group-hover:text-slate-300 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm text-slate-300">财务</span>
              <span className="text-xs text-slate-600 ml-3">
                自然语言入账 · 分类统计 · 预算追踪
              </span>
            </div>
            <span className="text-xs text-slate-700">⌘F</span>
          </Link>

          <Link
            href="/reports"
            className="flex items-center gap-4 px-4 py-3 border border-slate-800
                       hover:border-slate-700 hover:bg-slate-900 group transition-colors"
          >
            <BarChart3 className="w-5 h-5 text-slate-500 group-hover:text-slate-300 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm text-slate-300">复盘报告</span>
              <span className="text-xs text-slate-600 ml-3">
                AI 生成 · 工作+财务 · 月度总结
              </span>
            </div>
            <span className="text-xs text-slate-700">⌘R</span>
          </Link>
        </div>

        {/* Stats Row */}
        <div className="mt-16 grid grid-cols-4 gap-px bg-slate-800">
          {[
            { label: "本月笔记", value: "23", unit: "篇", icon: FileText },
            { label: "本月支出", value: "3,845", unit: "¥", icon: Wallet },
            { label: "预算剩余", value: "1,155", unit: "¥", icon: BarChart3 },
            { label: "AI 解析", value: "47", unit: "次", icon: Hash },
          ].map((stat) => (
            <div key={stat.label} className="bg-slate-950 px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-xs text-slate-500">{stat.label}</span>
              </div>
              <div className="text-xl font-bold text-slate-200 tabular-nums">
                {stat.value}
                <span className="text-xs text-slate-600 ml-1 font-normal">
                  {stat.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-800 py-4 text-center text-xs text-slate-700">
        FlowNote · AI-Powered Knowledge Base with Financial Nerve
      </div>
    </main>
  );
}
