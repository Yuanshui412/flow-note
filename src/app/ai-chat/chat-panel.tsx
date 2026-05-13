"use client";

import { useChat } from "ai/react";
import { useEffect, useRef } from "react";
import { Send, Square, Sparkles, User, Bot } from "lucide-react";

interface Props {
  workspaceId: string;
}

export function ChatPanel({ workspaceId }: Props) {
  const { messages, input, handleInputChange, handleSubmit, isLoading, stop } =
    useChat({
      api: "/api/ai/chat",
      body: { workspaceId },
    });

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-300 font-mono">
      <header className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          <span className="text-sm text-slate-400">AI 对话</span>
        </div>
        <span className="text-xs text-slate-600">
          {isLoading ? "生成中..." : "就绪"}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <Sparkles className="w-8 h-8 text-slate-700 mx-auto" />
              <p className="text-sm text-slate-600">输入任何问题，AI 实时流式回复</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {["总结今天的笔记", "帮我分析本月支出", "写一段项目周报"].map((hint) => (
                  <button
                    key={hint}
                    onClick={() => {
                      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                      handleInputChange({ target: { value: hint } } as React.ChangeEvent<HTMLInputElement>);
                      setTimeout(() => handleSubmit(fakeEvent), 50);
                    }}
                    className="text-xs px-3 py-1.5 border border-slate-800 text-slate-500
                               hover:border-slate-700 hover:text-slate-400 transition-colors"
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`shrink-0 w-7 h-7 flex items-center justify-center border ${
                msg.role === "user"
                  ? "order-2 border-slate-700 text-slate-500"
                  : "order-1 border-emerald-900 text-emerald-600"
              }`}
            >
              {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>
            <div
              className={`max-w-[75%] px-4 py-2.5 border text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "border-slate-700 bg-slate-900 text-slate-300"
                  : "border-slate-800 bg-slate-900/50 text-slate-300"
              }`}
            >
              {msg.content || (isLoading && msg.role === "assistant" && "...")}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="shrink-0 border-t border-slate-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="输入消息..."
            disabled={isLoading}
            className="flex-1 bg-transparent text-sm text-slate-300 placeholder-slate-600 outline-none py-2 disabled:opacity-50"
          />
          {isLoading ? (
            <button
              type="button"
              onClick={() => stop()}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-red-900 text-xs text-red-400 hover:bg-red-950/30 transition-colors"
            >
              <Square className="w-3 h-3" /> 停止
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-emerald-900 text-xs text-emerald-500 hover:bg-emerald-950/30 disabled:border-slate-800 disabled:text-slate-700 transition-colors"
            >
              <Send className="w-3 h-3" /> 发送
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
