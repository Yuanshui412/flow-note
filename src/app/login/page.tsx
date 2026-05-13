"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Terminal, LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("邮箱或密码错误");
      return;
    }

    router.push("/");
    router.refresh();
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
          <p className="text-xs text-slate-600">登录你的工作区</p>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="px-4 py-2.5 border border-red-900 bg-red-950/30 text-sm text-red-400">
              {error}
            </div>
          )}

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
              placeholder="••••••"
              required
              className="w-full bg-slate-900 border border-slate-800 px-3 py-2.5 text-sm
                         text-slate-300 placeholder-slate-700 outline-none
                         focus:border-slate-600 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5
                       bg-emerald-600 text-sm text-white font-medium
                       hover:bg-emerald-500 disabled:opacity-50 transition-colors"
          >
            <LogIn className="w-4 h-4" />
            {loading ? "登录中..." : "登录"}
          </button>
        </form>

        {/* 注册入口 */}
        <p className="mt-6 text-center text-xs text-slate-600">
          还没有账号？{" "}
          <Link href="/register" className="text-slate-400 hover:text-slate-300">
            注册
          </Link>
        </p>
      </div>
    </div>
  );
}
