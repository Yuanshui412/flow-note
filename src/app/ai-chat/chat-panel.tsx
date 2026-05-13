"use client";

import { useChat } from "ai/react";
import { useEffect, useRef } from "react";
import { Send, Square, Sparkles } from "lucide-react";

interface Props { workspaceId: string; }

export function ChatPanel({ workspaceId }: Props) {
  const { messages, input, handleInputChange, handleSubmit, isLoading, stop } =
    useChat({ api: "/api/ai/chat", body: { workspaceId } });
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 48px)" }}>
      {/* Header */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 24px", borderBottom: "1px solid rgba(0,0,0,0.1)",
          background: "rgba(255,255,255,0.82)", backdropFilter: "blur(12px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkles size={16} style={{ color: "#0075de" }} />
          <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(0,0,0,0.95)" }}>AI 对话</span>
        </div>
        <span style={{ fontSize: 14, color: isLoading ? "#dd5b00" : "#a39e98" }}>
          {isLoading ? "生成中..." : "就绪"}
        </span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
        {messages.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <div style={{ textAlign: "center" }}>
              <Sparkles size={32} style={{ color: "#a39e98", marginBottom: 16 }} />
              <p style={{ fontSize: 16, color: "#615d59" }}>输入任何问题，AI 实时流式回复</p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
                {["总结今天的笔记", "帮我分析本月支出", "写一段项目周报"].map((hint) => (
                  <button
                    key={hint}
                    onClick={() => {
                      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                      handleInputChange({ target: { value: hint } } as any);
                      setTimeout(() => handleSubmit(fakeEvent), 50);
                    }}
                    style={{
                      fontSize: 14, padding: "6px 12px", borderRadius: 9999,
                      background: "#f2f9ff", color: "#097fe8", border: "none",
                      cursor: "pointer", fontWeight: 500,
                    }}
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "80%",
                  padding: msg.role === "user" ? "8px 16px" : "12px 20px",
                  borderRadius: msg.role === "user" ? 12 : "4px 12px 12px 12px",
                  background: msg.role === "user" ? "#f2f9ff" : "#f6f5f4",
                  color: "rgba(0,0,0,0.95)",
                  fontSize: 16, lineHeight: 1.5,
                  border: msg.role === "assistant" ? "1px solid rgba(0,0,0,0.1)" : "none",
                }}
              >
                {msg.content || (isLoading && msg.role === "assistant" && "...")}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        style={{
          padding: "16px 24px", borderTop: "1px solid rgba(0,0,0,0.1)",
          background: "rgba(255,255,255,0.82)", backdropFilter: "blur(12px)",
        }}
      >
        <div style={{ display: "flex", gap: 12, maxWidth: 720, margin: "0 auto" }}>
          <input
            type="text" value={input} onChange={handleInputChange}
            placeholder="输入消息..." disabled={isLoading}
            className="notion-input"
            style={{ flex: 1 }}
          />
          {isLoading ? (
            <button type="button" onClick={stop}
              style={{ padding: "6px 12px", borderRadius: 4, border: "none", background: "#fef2f2", color: "#dc2626", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", gap: 4 }}>
              <Square size={14} />停止
            </button>
          ) : (
            <button type="submit" disabled={!input.trim()}
              className="notion-btn-primary" style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Send size={14} />发送
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
