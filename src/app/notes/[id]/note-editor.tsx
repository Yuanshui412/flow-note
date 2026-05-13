"use client";

import { useState, useEffect, useRef } from "react";
import { Save, Eye, Edit3, Check, ArrowLeft } from "lucide-react";

type Block = { id: string; type: "heading" | "paragraph" | "list" | "quote" | "code"; content: string };

interface NoteData { id: string; title: string; content: Block[]; version: number }

function blocksToMarkdown(blocks: Block[]): string {
  return blocks.map((b) => {
    switch (b.type) {
      case "heading": return `## ${b.content}`;
      case "list": return `- ${b.content}`;
      case "quote": return `> ${b.content}`;
      case "code": return `\`\`\`\n${b.content}\n\`\`\``;
      default: return b.content;
    }
  }).join("\n\n");
}

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

function BlockPreview({ block }: { block: Block }) {
  switch (block.type) {
    case "heading": return <h3 style={{ fontSize: 22, fontWeight: 700, color: "rgba(0,0,0,0.95)", margin: "16px 0 4px" }}>{block.content}</h3>;
    case "list": return <li style={{ fontSize: 16, lineHeight: 1.5, color: "rgba(0,0,0,0.95)", marginLeft: 20 }}>{block.content}</li>;
    case "quote":
      return <blockquote style={{ borderLeft: "3px solid #0075de", paddingLeft: 16, margin: "8px 0", color: "#615d59", fontSize: 16, fontStyle: "italic" }}>{block.content}</blockquote>;
    case "code":
      return <pre style={{ background: "#f6f5f4", borderRadius: 8, padding: "12px 16px", fontSize: 14, color: "#31302e", overflow: "auto" }}>{block.content}</pre>;
    default: return <p style={{ fontSize: 16, lineHeight: 1.5, color: "rgba(0,0,0,0.95)", margin: "4px 0" }}>{block.content}</p>;
  }
}

export function NoteEditor({ note }: Props) {
  const [title, setTitle] = useState(note.title);
  const [markdown, setMarkdown] = useState(blocksToMarkdown(note.content));
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const initialContent = blocksToMarkdown(note.content);

  // 检测是否有未保存的修改
  useEffect(() => {
    setDirty(title !== note.title || markdown !== initialContent);
  }, [title, markdown, initialContent, note.title]);

  function handleBack() {
    if (dirty) {
      if (!confirm("你有未保存的修改，确定要离开吗？")) return;
    }
    window.location.href = "/notes";
  }

  function flashSaved() { setSaved(true); clearTimeout(saveTimer.current); saveTimer.current = setTimeout(() => setSaved(false), 2000); }

  async function handleSave() {
    setSaving(true); setConflict(false);
    const blocks = markdownToBlocks(markdown);
    const res = await fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content: blocks, version: note.version }),
    });
    if (res.status === 409) setConflict(true);
    else if (res.ok) flashSaved();
    setSaving(false);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSave(); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [title, markdown, note.version]);

  const parsedBlocks = markdownToBlocks(markdown);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px 80px" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, paddingBottom: 16, borderBottom: "1px solid rgba(0,0,0,0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={handleBack}
            className="notion-btn-secondary"
            style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 14 }}
          >
            <ArrowLeft size={14} /> 返回
          </button>
          <span style={{ fontSize: 14, color: dirty ? "#dd5b00" : "#a39e98" }}>
            {dirty ? "● 未保存" : "已保存"}
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

      {conflict && <div style={{ padding: "8px 12px", borderRadius: 4, background: "#fef2f2", color: "#dc2626", fontSize: 14, marginBottom: 16 }}>笔记已被他人修改。请刷新后重新编辑。</div>}

      {/* Title */}
      <input
        type="text" value={title} onChange={(e) => setTitle(e.target.value)}
        placeholder="笔记标题"
        style={{
          width: "100%", border: "none", background: "transparent",
          fontSize: 40, fontWeight: 700, lineHeight: 1.2, letterSpacing: "-1.5px",
          color: "rgba(0,0,0,0.95)", outline: "none", marginBottom: 12,
        }}
      />

      {/* Markdown hints */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, fontSize: 14, color: "#a39e98" }}>
        <span><code style={{ background: "rgba(0,0,0,0.05)", padding: "1px 4px", borderRadius: 3, fontSize: 13 }}>## 标题</code></span>
        <span><code style={{ background: "rgba(0,0,0,0.05)", padding: "1px 4px", borderRadius: 3, fontSize: 13 }}>- 列表</code></span>
        <span><code style={{ background: "rgba(0,0,0,0.05)", padding: "1px 4px", borderRadius: 3, fontSize: 13 }}>&gt; 引用</code></span>
        <span>空行分段</span>
      </div>

      {/* Content */}
      {preview ? (
        <div style={{ minHeight: 400 }}>
          {parsedBlocks.map((b) => <BlockPreview key={b.id} block={b} />)}
        </div>
      ) : (
        <textarea
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          placeholder={"自由输入 Markdown...\n\n## 这是一个标题\n\n正文内容写在这里。\n\n- 列表项\n- 另一项\n\n> 这是一段引用"}
          style={{
            width: "100%", minHeight: 400, border: "none", background: "transparent",
            fontSize: 16, lineHeight: 1.5, color: "rgba(0,0,0,0.95)",
            outline: "none", resize: "vertical",
            fontFamily: "Inter, -apple-system, system-ui, sans-serif",
          }}
          spellCheck={false}
        />
      )}
    </div>
  );
}

interface Props { note: NoteData; }
