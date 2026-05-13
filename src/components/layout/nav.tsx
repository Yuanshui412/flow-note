"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Terminal,
  FileText,
  Wallet,
  Sparkles,
  LogOut,
  LogIn,
  UserPlus,
} from "lucide-react";

const links = [
  { href: "/notes", label: "笔记", icon: FileText },
  { href: "/finance", label: "财务", icon: Wallet },
  { href: "/ai-chat", label: "AI", icon: Sparkles },
] as const;

export function Nav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  if (pathname === "/login" || pathname === "/register") return null;

  return (
    <header className="border-b border-slate-800 bg-slate-950">
      <div className="mx-auto flex h-12 items-center justify-between px-6 max-w-6xl">
        {/* Logo + 导航 */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Terminal className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-bold text-slate-300 tracking-tight">
              Flow<span className="text-emerald-400">Note</span>
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors
                    ${
                      active
                        ? "text-slate-200 bg-slate-800"
                        : "text-slate-500 hover:text-slate-300 hover:bg-slate-900"
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* 用户区 */}
        <div className="flex items-center gap-3">
          {status === "loading" ? (
            <span className="text-xs text-slate-700">...</span>
          ) : session?.user ? (
            <>
              <span className="text-xs text-slate-500">{session.user.email}</span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600
                           hover:text-slate-400 transition-colors"
              >
                <LogOut className="w-3 h-3" />
                退出
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500
                           hover:text-slate-300 transition-colors"
              >
                <LogIn className="w-3 h-3" />
                登录
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500
                           hover:text-slate-300 transition-colors"
              >
                <UserPlus className="w-3 h-3" />
                注册
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
