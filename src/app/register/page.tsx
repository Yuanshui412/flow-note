"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Terminal, UserPlus } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error?.message ?? "注册失败，请重试");
      return;
    }

    router.push("/login?registered=1");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-mono flex items-center justify-center">
      <div className="w-full max-w-sm">
        {/* 品牌 */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Terminal className="w-5 h-5 text-emerald-500" />
            <span className="text-lg font-bold text-slate-200 tracking-tight">
              Flow<span className="text-emerald-400">Note</span>
            </span>
          </div>
          <p className="text-xs text-slate-600">创建新账号</p>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="px-4 py-2.5 border border-red-900 bg-red-950/30 text-sm text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-500 mb-1.5">姓名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="你的名字"
              required
              className="w-full bg-slate-900 border border-slate-800 px-3 py-2.5 text-sm
                         text-slate-300 placeholder-slate-700 outline-none
                         focus:border-slate-600 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1.5">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="demo@flownote.ai"
              required
              className="w-full bg-slate-900 border border-slate-800 px-3 py-2.5 text-sm
                         text-slate-300 placeholder-slate-700 outline-none
                         focus:border-slate-600 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1.5">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 位"
              required
              minLength={6}
              className="w-full bg-slate-900 border border-slate-800 px-3 py-2.5 text-sm
                         text-slate-300 placeholder-slate-700 outline-none
                         focus:border-slate-600 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5
                       bg-slate-800 border border-slate-700 text-sm text-slate-300
                       hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            {loading ? "注册中..." : "注册"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-600">
          已有账号？{" "}
          <Link href="/login" className="text-slate-400 hover:text-slate-300">
            登录
          </Link>
        </p>
      </div>
    </div>
  );
}
