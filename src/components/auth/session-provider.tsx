"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

/**
 * 包装 NextAuth SessionProvider
 * 必须在 Client Component 中使用（用了 React Context）
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
