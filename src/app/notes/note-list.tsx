"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Plus, Trash2, FileText } from "lucide-react";
import type { Prisma } from "@prisma/client";

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

export function NoteList({ notes, workspaceId }: Props) {
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [items, setItems] = useState(notes);

  async function handleDelete(noteId: string, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (!confirm("确定删除这篇笔记？")) return;
    setDeletingId(noteId);
    const res = await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
    if (res.ok) setItems(items.filter((n) => n.id !== noteId));
    else alert("删除失败");
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
    if (data.success) window.location.href = `/notes/${data.data.id}`;
  }

  const filtered = q
    ? items.filter((n) => n.title.toLowerCase().includes(q.toLowerCase()))
    : items;

  return (
    <div>
      {/* Search bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          paddingBottom: 20,
          marginBottom: 24,
          borderBottom: "1px solid rgba(0,0,0,0.1)",
        }}
      >
        <Search size={16} style={{ color: "#a39e98", flexShrink: 0 }} />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索笔记..."
          style={{
            flex: 1,
            border: "none",
            background: "transparent",
            fontSize: 16,
            color: "rgba(0,0,0,0.95)",
            outline: "none",
          }}
        />
        <span style={{ fontSize: 14, color: "#a39e98", fontVariantNumeric: "tabular-nums" }}>
          {filtered.length}/{items.length}
        </span>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="notion-btn-primary"
          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 14 }}
        >
          <Plus size={14} /> 新建
        </button>
      </div>

      {/* Note grid */}
      {filtered.length === 0 ? (
        <p style={{ textAlign: "center", padding: "64px 0", color: "#a39e98", fontSize: 14 }}>
          暂无笔记，点击「新建」开始
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {filtered.map((note) => (
            <Link
              key={note.id}
              href={`/notes/${note.id}`}
              className="notion-card group"
              style={{
                padding: "20px 24px",
                textDecoration: "none",
                display: "block",
                position: "relative",
                transition: "box-shadow 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  "0px 1px 3px rgba(0,0,0,0.01), 0px 3px 7px rgba(0,0,0,0.02), 0px 7px 15px rgba(0,0,0,0.02), 0px 14px 28px rgba(0,0,0,0.04), 0px 23px 52px rgba(0,0,0,0.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "";
              }}
            >
              {/* Title */}
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "rgba(0,0,0,0.95)",
                  marginBottom: 12,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                <FileText size={16} style={{ marginRight: 8, color: "#a39e98", verticalAlign: "middle" }} />
                {note.title}
              </div>

              {/* Meta */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, color: "#615d59" }}>
                <span>{note.author.name}</span>
                <span>·</span>
                <span>{new Date(note.updatedAt).toLocaleDateString("zh-CN")}</span>
                {note.tags.map((t) => (
                  <span key={t.tag.name} className="notion-badge">
                    {t.tag.name}
                  </span>
                ))}
              </div>

              {/* Delete */}
              <button
                onClick={(e) => handleDelete(note.id, e)}
                disabled={deletingId === note.id}
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  padding: 4,
                  border: "none",
                  background: "transparent",
                  color: "#a39e98",
                  cursor: "pointer",
                  opacity: 0,
                  transition: "opacity 0.15s ease",
                }}
                className="group-hover:opacity-100"
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              >
                <Trash2 size={14} />
              </button>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
