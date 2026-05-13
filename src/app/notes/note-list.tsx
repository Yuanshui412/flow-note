"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, FileText, Wallet, Hash, Plus, Trash2 } from "lucide-react";
import type { Prisma } from "@prisma/client";

// ─── 类型：Server Component 传下来的 note 结构 ───

type NoteWithMeta = Prisma.NoteGetPayload<{
  include: {
    author: { select: { name: true } };
    tags: { include: { tag: { select: { name: true; color: true } } } };
    _count: { select: { transactions: true } };
  };
}>;

interface Props {
  notes: NoteWithMeta[];
  workspaceId: string;
}

// ─── Client Component ───

export function NoteList({ notes, workspaceId }: Props) {
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [items, setItems] = useState(notes);

  async function handleDelete(noteId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("确定删除这篇笔记？")) return;

    setDeletingId(noteId);
    const res = await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
    if (res.ok) {
      setItems(items.filter((n) => n.id !== noteId));
    } else {
      alert("删除失败，请重试");
    }
    setDeletingId(null);
  }

  async function handleCreate() {
    setCreating(true);
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, title: "新笔记" }),
    });
    const data = await res.json();
    setCreating(false);
    if (data.success) {
      window.location.href = `/notes/${data.data.id}`;
    }
  }

  const filtered = q
    ? items.filter((n) => n.title.toLowerCase().includes(q.toLowerCase()))
    : items;

  return (
    <div>
      {/* 搜索栏 */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
        <Search className="w-4 h-4 text-slate-600 shrink-0" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索笔记..."
          className="flex-1 bg-transparent text-sm text-slate-300 placeholder-slate-600 outline-none"
        />
        <span className="text-xs text-slate-600 tabular-nums">
          {filtered.length}/{items.length}
        </span>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="flex items-center gap-1 px-3 py-1 border border-emerald-900
                     text-xs text-emerald-500 hover:bg-emerald-950/30
                     disabled:opacity-50 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          新建
        </button>
      </div>

      {/* 笔记列表 */}
      {filtered.length === 0 ? (
        <p className="text-sm text-slate-600 py-8 text-center">无匹配结果</p>
      ) : (
        <div className="space-y-px">
          {filtered.map((note) => (
            <Link
              key={note.id}
              href={`/notes/${note.id}`}
              className="flex items-center gap-4 px-3 py-3 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 group transition-colors"
            >
              {/* 图标 */}
              <FileText className="w-4 h-4 text-slate-600 group-hover:text-slate-400 shrink-0" />

              {/* 主信息 */}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-300 truncate">{note.title}</div>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-600">
                  <span>{note.author.name}</span>
                  <span>{new Date(note.updatedAt).toLocaleDateString("zh-CN")}</span>
                  {note.tags.map((t) => (
                    <span key={t.tag.name} style={{ color: t.tag.color ?? undefined }}>
                      #{t.tag.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* 财务关联数 */}
              {note._count.transactions > 0 && (
                <div className="flex items-center gap-1 text-xs text-slate-500 shrink-0">
                  <Wallet className="w-3 h-3" />
                  <span className="tabular-nums">{note._count.transactions}</span>
                </div>
              )}

              {/* 删除按钮 */}
              <button
                onClick={(e) => handleDelete(note.id, e)}
                disabled={deletingId === note.id}
                className="p-1 opacity-0 group-hover:opacity-100 text-slate-700
                           hover:text-red-500 disabled:opacity-50 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
