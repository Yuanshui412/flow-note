"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { FileText, Wallet, Sparkles, LogOut, LogIn, UserPlus } from "lucide-react";

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
    <header
      className="fixed top-0 w-full"
      style={{ zIndex: 1000, background: "#fff", borderBottom: "1px solid rgba(0,0,0,0.1)" }}
    >
      <div className="mx-auto flex h-12 items-center justify-between px-6 max-w-[1200px]">
        {/* Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 shrink-0 no-underline">
            <span
              className="text-[15px] font-semibold tracking-[-0.125px]"
              style={{ color: "rgba(0,0,0,0.95)" }}
            >
              Flow<span style={{ color: "#0075de" }}>Note</span>
            </span>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] no-underline
                             text-[15px] font-medium transition-colors"
                  style={{
                    color: active ? "rgba(0,0,0,0.95)" : "#615d59",
                    background: active ? "rgba(0,0,0,0.05)" : "transparent",
                  }}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User area */}
        <div className="flex items-center gap-3">
          {status === "loading" ? (
            <span style={{ color: "#a39e98", fontSize: 14 }}>...</span>
          ) : session?.user ? (
            <>
              <span style={{ color: "#615d59", fontSize: 14 }}>
                {session.user.email}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex items-center gap-1 px-2 py-1 text-[14px] font-medium
                           rounded-[4px] transition-colors no-underline border-0 cursor-pointer"
                style={{ color: "#615d59", background: "transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <LogOut size={14} />
                退出
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="flex items-center gap-1 px-2 py-1 text-[14px] font-medium
                           rounded-[4px] no-underline transition-colors"
                style={{ color: "#615d59" }}
              >
                <LogIn size={14} />
                登录
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-1 px-3 py-1.5 text-[14px] font-semibold
                           rounded-[4px] no-underline transition-colors"
                style={{ background: "#0075de", color: "#fff" }}
              >
                <UserPlus size={14} />
                注册
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
