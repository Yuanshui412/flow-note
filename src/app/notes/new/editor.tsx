"use client";

import { useState, useEffect, useRef } from "react";
import { Save, ArrowLeft, Check, Eye, Edit3 } from "lucide-react";

type Block = { id: string; type: "heading" | "paragraph" | "list" | "quote" | "code"; content: string };

function markdownToBlocks(md: string): Block[] {
  const blocks: Block[] = [];
  for (const line of md.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    if (/^#{1,3}\s/.test(t)) blocks.push({ id: crypto.randomUUID(), type: "heading", content: t.replace(/^#{1,3}\s/, "") });
    else if (/^[-*]\s/.test(t)) blocks.push({ id: crypto.randomUUID(), type: "list", content: t.replace(/^[-*]\s/, "") });
    else if (/^>\s/.test(t)) blocks.push({ id: crypto.randomUUID(), type: "quote", content: t.replace(/^>\s/, "") });
    else blocks.push({ id: crypto.randomUUID(), type: "paragraph", content: t });
  }
  return blocks.length > 0 ? blocks : [{ id: crypto.randomUUID(), type: "paragraph", content: "" }];
}

export function NewNoteEditor({ workspaceId }: { workspaceId: string }) {
  const [title, setTitle] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  const hasContent = title.trim() || markdown.trim();

  function flashSaved() { setSaved(true); clearTimeout(saveTimer.current); saveTimer.current = setTimeout(() => setSaved(false), 2000); }

  function handleBack() {
    if (hasContent) {
      if (!confirm("笔记未保存，确定离开吗？")) return;
    }
    window.location.href = "/notes";
  }

  async function handleSave() {
    if (!title.trim() && !markdown.trim()) return;
    setSaving(true);
    const blocks = markdownToBlocks(markdown);

    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, title: title || "新笔记", content: blocks }),
    });

    const data = await res.json();
    setSaving(false);

    if (data.success) {
      flashSaved();
      window.location.href = `/notes/${data.data.id}`;
    } else {
      alert("保存失败: " + (data.error?.message ?? "未知错误"));
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSave(); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [title, markdown]);

  const parsedBlocks = markdownToBlocks(markdown);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px 80px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, paddingBottom: 16, borderBottom: "1px solid rgba(0,0,0,0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={handleBack} className="notion-btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 14 }}>
            <ArrowLeft size={14} /> 返回
          </button>
          <span style={{ fontSize: 14, color: hasContent ? "#dd5b00" : "#a39e98" }}>
            {hasContent ? "● 未保存" : "新建笔记"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {saved && <span style={{ fontSize: 14, color: "#1aae39", display: "flex", alignItems: "center", gap: 4 }}><Check size={14} />已保存</span>}
          <button onClick={() => setPreview(!preview)} className="notion-btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 14 }}>
            {preview ? <><Edit3 size={14} />编辑</> : <><Eye size={14} />预览</>}
          </button>
          <button onClick={handleSave} disabled={saving} className="notion-btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 14 }}>
            <Save size={14} />{saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>

      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="笔记标题"
        style={{ width: "100%", border: "none", background: "transparent", fontSize: 40, fontWeight: 700, lineHeight: 1.2, letterSpacing: "-1.5px", color: "rgba(0,0,0,0.95)", outline: "none", marginBottom: 12 }} />

      <div style={{ display: "flex", gap: 16, marginBottom: 24, fontSize: 14, color: "#a39e98" }}>
        <span><code style={{ background: "rgba(0,0,0,0.05)", padding: "1px 4px", borderRadius: 3, fontSize: 13 }}>## 标题</code></span>
        <span><code style={{ background: "rgba(0,0,0,0.05)", padding: "1px 4px", borderRadius: 3, fontSize: 13 }}>- 列表</code></span>
        <span><code style={{ background: "rgba(0,0,0,0.05)", padding: "1px 4px", borderRadius: 3, fontSize: 13 }}>&gt; 引用</code></span>
        <span>空行分段</span>
      </div>

      {preview ? (
        <div style={{ minHeight: 400 }}>
          {parsedBlocks.map((b) => (
            <div key={b.id} style={{ marginBottom: 8 }}>
              {b.type === "heading" && <h3 style={{ fontSize: 22, fontWeight: 700, color: "rgba(0,0,0,0.95)" }}>{b.content}</h3>}
              {b.type === "list" && <li style={{ fontSize: 16, lineHeight: 1.5, marginLeft: 20 }}>{b.content}</li>}
              {b.type === "quote" && <blockquote style={{ borderLeft: "3px solid #0075de", paddingLeft: 16, color: "#615d59", fontStyle: "italic" }}>{b.content}</blockquote>}
              {b.type === "paragraph" && <p style={{ fontSize: 16, lineHeight: 1.5 }}>{b.content}</p>}
            </div>
          ))}
        </div>
      ) : (
        <textarea value={markdown} onChange={(e) => setMarkdown(e.target.value)}
          placeholder={"自由输入 Markdown...\n\n## 这是一个标题\n\n正文内容写在这里。\n\n- 列表项\n- 另一项\n\n> 这是一段引用"}
          style={{ width: "100%", minHeight: 400, border: "none", background: "transparent", fontSize: 16, lineHeight: 1.5, color: "rgba(0,0,0,0.95)", outline: "none", resize: "vertical", fontFamily: "Inter, -apple-system, system-ui, sans-serif" }}
          spellCheck={false} />
      )}
    </div>
  );
}
