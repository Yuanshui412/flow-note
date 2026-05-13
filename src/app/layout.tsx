import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/auth/session-provider";
import { Nav } from "@/components/layout/nav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FlowNote — AI 知识库",
  description: "以笔记为主轴，财务记账为内嵌模块的 AI 知识库",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <body className={inter.className}>
        <SessionProvider>
          <Nav />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
