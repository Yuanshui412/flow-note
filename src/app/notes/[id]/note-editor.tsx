"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Save, Eye, Edit3, Check } from "lucide-react";

// ─── 类型 ───

type Block = {
  id: string;
  type: "heading" | "paragraph" | "list" | "quote" | "code";
  content: string;
};

interface NoteData {
  id: string;
  title: string;
  content: Block[];
  version: number;
}

interface Props {
  note: NoteData;
}

// ─── Block ↔ Markdown 互转 ───

function blocksToMarkdown(blocks: Block[]): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case "heading": return `## ${b.content}`;
        case "list":    return `- ${b.content}`;
        case "quote":   return `> ${b.content}`;
        case "code":    return `\`\`\`\n${b.content}\n\`\`\``;
        default:        return b.content;
      }
    })
    .join("\n\n");
}

function markdownToBlocks(md: string): Block[] {
  const lines = md.split("\n");
  const blocks: Block[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue; // 跳过空行

    if (/^#{1,3}\s/.test(trimmed)) {
      blocks.push({ id: crypto.randomUUID(), type: "heading", content: trimmed.replace(/^#{1,3}\s/, "") });
    } else if (/^[-*]\s/.test(trimmed)) {
      blocks.push({ id: crypto.randomUUID(), type: "list", content: trimmed.replace(/^[-*]\s/, "") });
    } else if (/^>\s/.test(trimmed)) {
      blocks.push({ id: crypto.randomUUID(), type: "quote", content: trimmed.replace(/^>\s/, "") });
    } else {
      blocks.push({ id: crypto.randomUUID(), type: "paragraph", content: trimmed });
    }
  }

  return blocks.length > 0 ? blocks : [{ id: crypto.randomUUID(), type: "paragraph", content: "" }];
}

// ─── 渲染 Block 为 HTML（预览用）───

function BlockPreview({ block }: { block: Block }) {
  switch (block.type) {
    case "heading":
      return <h3 className="text-lg font-bold text-slate-100 mt-2">{block.content || <span className="text-slate-700">标题</span>}</h3>;
    case "list":
      return <li className="text-sm text-slate-300 ml-4 list-disc">{block.content || <span className="text-slate-700">列表项</span>}</li>;
    case "quote":
      return (
        <blockquote className="border-l-2 border-emerald-700 pl-3 text-sm text-slate-400 italic">
          {block.content || <span className="text-slate-700">引用</span>}
        </blockquote>
      );
    case "code":
      return (
        <pre className="bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-emerald-400 overflow-x-auto">
          {block.content || <span className="text-slate-700">code</span>}
        </pre>
      );
    default:
      return <p className="text-sm text-slate-300 leading-relaxed">{block.content || <span className="text-slate-700">段落</span>}</p>;
  }
}

// ─── 组件 ───

export function NoteEditor({ note }: Props) {
  const initialMd = blocksToMarkdown(note.content);
  const [title, setTitle] = useState(note.title);
  const [markdown, setMarkdown] = useState(initialMd);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  const parsedBlocks = markdownToBlocks(markdown);

  function flashSaved() {
    setSaved(true);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaved(false), 2000);
  }

  // ─── 保存 ───

  async function handleSave() {
    setSaving(true);
    setConflict(false);

    const blocks = markdownToBlocks(markdown);
    const res = await fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content: blocks, version: note.version }),
    });

    if (res.status === 409) {
      setConflict(true);
    } else if (res.ok) {
      flashSaved();
    }

    setSaving(false);
  }

  // ─── Ctrl+S ───

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [title, markdown, note.version]);

  // ─── 渲染 ───

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-mono">
      <div className="mx-auto max-w-3xl px-6 py-8">
        {/* 顶部工具栏 */}
        <header className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
          <span className="text-xs text-slate-600">编辑笔记 · Ctrl+S 保存</span>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <Check className="w-3 h-3" /> 已保存
              </span>
            )}
            {/* 预览切换 */}
            <button
              onClick={() => setPreview(!preview)}
              className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs transition-colors
                ${preview
                  ? "border-emerald-800 text-emerald-400 bg-emerald-950/30"
                  : "border-slate-800 text-slate-500 hover:text-slate-400"
                }`}
            >
              {preview ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {preview ? "编辑" : "预览"}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-1.5 border border-slate-700
                         text-sm text-slate-300 hover:border-emerald-600 hover:text-emerald-400
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </header>

        {/* 冲突提示 */}
        {conflict && (
          <div className="mb-6 px-4 py-3 border border-red-900 bg-red-950/30 text-sm text-red-400">
            笔记已被他人修改。请刷新页面后重新编辑。
          </div>
        )}

        {/* 标题 */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="笔记标题"
          className="w-full bg-transparent text-2xl text-slate-100 placeholder-slate-700
                     outline-none mb-6"
        />

        {/* Markdown 语法提示 */}
        <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-700">
          <span><code className="text-slate-600">## 标题</code></span>
          <span><code className="text-slate-600">- 列表</code></span>
          <span><code className="text-slate-600">&gt; 引用</code></span>
          <span><code className="text-slate-600">``` 代码</code></span>
          <span className="text-slate-600">空行分段</span>
        </div>

        {/* 编辑 / 预览区域 */}
        {preview ? (
          /* 预览模式 */
          <div className="border border-slate-800 px-6 py-6 min-h-[400px] space-y-2">
            {parsedBlocks.map((block) => (
              <BlockPreview key={block.id} block={block} />
            ))}
          </div>
        ) : (
          /* 编辑模式 */
          <textarea
            ref={textareaRef}
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            placeholder={"自由输入 Markdown...\n\n## 这是一个标题\n\n正文内容写在这里。\n\n- 列表项\n- 另一项\n\n> 这是一段引用"}
            className="w-full min-h-[400px] bg-transparent text-sm text-slate-300
                       placeholder-slate-700 outline-none resize-y leading-relaxed
                       border border-slate-800 px-4 py-4"
            spellCheck={false}
          />
        )}
      </div>
    </div>
  );
}
