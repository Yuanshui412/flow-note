"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error?.message ?? "注册失败");
      return;
    }
    router.push("/login?registered=1");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f6f5f4",
      }}
    >
      <div style={{ width: "100%", maxWidth: 380, padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.625px", color: "rgba(0,0,0,0.95)", marginBottom: 8 }}>
            Flow<span style={{ color: "#0075de" }}>Note</span>
          </h1>
          <p style={{ fontSize: 14, color: "#615d59" }}>创建新账号</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {error && (
            <div style={{ padding: "8px 12px", borderRadius: 4, background: "#fef2f2", color: "#dc2626", fontSize: 14 }}>
              {error}
            </div>
          )}
          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "rgba(0,0,0,0.95)", marginBottom: 4 }}>
              姓名
            </label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="你的名字" required className="notion-input" style={{ width: "100%", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "rgba(0,0,0,0.95)", marginBottom: 4 }}>
              邮箱
            </label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="demo@flownote.ai" required className="notion-input" style={{ width: "100%", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "rgba(0,0,0,0.95)", marginBottom: 4 }}>
              密码
            </label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 位" required minLength={6} className="notion-input" style={{ width: "100%", boxSizing: "border-box" }} />
          </div>
          <button type="submit" disabled={loading} className="notion-btn-primary" style={{ width: "100%" }}>
            {loading ? "注册中..." : "注册"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "#615d59" }}>
          已有账号？{" "}
          <Link href="/login" style={{ color: "#0075de", fontWeight: 500 }}>登录</Link>
        </p>
      </div>
    </div>
  );
}
