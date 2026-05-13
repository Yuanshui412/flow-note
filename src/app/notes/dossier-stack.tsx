"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FileText, ChevronUp, ChevronDown, X, ArrowRight, Wallet, Plus, Trash2 } from "lucide-react";
import type { Prisma } from "@prisma/client";

// ─── Types ───

type NoteCard = Prisma.NoteGetPayload<{
  include: {
    author: { select: { name: true } };
    tags: { include: { tag: { select: { name: true; color: true } } } };
    _count: { select: { transactions: true } };
  };
}>;

interface Props {
  notes: NoteCard[];
  workspaceId: string;
}

// ─── Single Card ───

function NoteDossierCard({
  note,
  index,
  activeIndex,
  isExtracted,
  isScrollingFast,
  total,
  onSelect,
}: {
  note: NoteCard;
  index: number;
  activeIndex: number;
  isExtracted: boolean;
  isScrollingFast: boolean;
  total: number;
  onSelect: (index: number) => void;
}) {
  const diff = index - activeIndex;
  const isSelected = diff === 0;

  // 3D spatial transforms (bird's eye view like dossier_spatial_stack)
  const opacity = isExtracted ? (isSelected ? 1 : 0) : Math.max(0, 1 - Math.abs(diff) * 0.18);
  const scale = isExtracted ? (isSelected ? 0.82 : 0.85) : Math.max(0.75, 1 - Math.abs(diff) * 0.04);
  const blur = isExtracted ? (isSelected ? 0 : 8) : Math.min(6, Math.abs(diff) * 1.2);

  const baseRotateX = -40;
  const rotateX = isExtracted && isSelected ? 10 : baseRotateX;
  const rotateY = isExtracted && isSelected ? 5 : diff * -1;
  const rotateZ = isExtracted && isSelected ? -1 : diff * -0.3;

  const gapAmount = isScrollingFast || isExtracted ? 0 : (diff === 0 ? 0 : Math.sign(diff) * 90);

  const yOffset = isExtracted && isSelected ? -60 : diff * 50 + gapAmount;
  const zOffset = isExtracted && isSelected ? 400 : diff * 80 + Math.abs(gapAmount) * 0.5;
  const xOffset = isExtracted && isSelected ? -160 : diff * -10;

  // Preview text: first 80 chars of note content
  let preview = "";
  try {
    const blocks = typeof note.content === "string" ? JSON.parse(note.content) : note.content;
    if (Array.isArray(blocks)) {
      preview = blocks
        .map((b: any) => b.content)
        .join(" ")
        .slice(0, 80);
    }
  } catch { /* ignore */ }

  const tagColor = note.tags[0]?.tag.color ?? undefined;

  return (
    <motion.div
      layoutId={`note-${note.id}`}
      onClick={(e) => { e.stopPropagation(); onSelect(index); }}
      initial={false}
      animate={{
        z: zOffset, y: yOffset, x: xOffset,
        scale, opacity, rotateX, rotateY, rotateZ,
        filter: `blur(${blur}px)`,
      }}
      transition={{
        type: "spring",
        stiffness: isScrollingFast ? 120 : 55,
        damping: isScrollingFast ? 25 : 20,
        mass: 1.1,
      }}
      className="absolute notion-card cursor-pointer preserve-3d"
      style={{
        width: "clamp(320px, 60vw, 580px)",
        aspectRatio: "16/10",
        zIndex: isExtracted && isSelected ? 500 : 100 + index,
        pointerEvents: isExtracted && !isSelected ? "none" : "auto",
        transformOrigin: "center center",
        padding: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Delete button — visible on card hover */}
      <button
        onClick={async (e) => {
          e.stopPropagation();
          if (!confirm("确定删除这篇笔记？")) return;
          await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
          window.location.reload();
        }}
        style={{
          position: "absolute", top: 12, right: 12, zIndex: 20,
          width: 28, height: 28, borderRadius: 4,
          border: "1px solid rgba(0,0,0,0.1)", background: "#fff",
          display: "none", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
        }}
        className="dossier-delete-btn"
      >
        <Trash2 size={13} style={{ color: "#a39e98" }} />
      </button>

      {/* Content area */}
      <div style={{ flex: 1, padding: "28px 32px", display: "flex", flexDirection: "column" }}>
        {/* Category row */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
            fontSize: 11, fontWeight: 600, letterSpacing: "0.2em",
            color: "#0075de", textTransform: "uppercase",
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0075de" }} />
          {note.tags[0]?.tag.name ?? "笔记"}
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: 24, fontWeight: 700, letterSpacing: "-0.5px",
            color: "rgba(0,0,0,0.95)", lineHeight: 1.2, marginBottom: 12,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {note.title}
        </h2>

        {/* Preview */}
        {preview && (
          <p
            style={{
              fontSize: 14, color: "#615d59", lineHeight: 1.5,
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
              overflow: "hidden", flex: 1,
            }}
          >
            {preview}
          </p>
        )}

        {/* Meta footer */}
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            paddingTop: 16, marginTop: "auto",
            borderTop: "1px solid rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "#a39e98" }}>
            <span>{note.author.name}</span>
            <span>·</span>
            <span>{new Date(note.updatedAt).toLocaleDateString("zh-CN")}</span>
            {note._count.transactions > 0 && (
              <>
                <span>·</span>
                <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <Wallet size={11} /> {note._count.transactions}
                </span>
              </>
            )}
          </div>
          <div
            style={{
              width: 32, height: 32, borderRadius: "50%",
              border: "1px solid rgba(0,0,0,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <ChevronUp size={14} style={{ color: "#615d59" }} />
          </div>
        </div>
      </div>

      {/* Subtle grid pattern overlay (from dossier_spatial_stack) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.02,
          backgroundImage:
            "linear-gradient(rgba(0,0,0,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,1) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />
    </motion.div>
  );
}

// ─── Main DossierStack ───

export function DossierStack({ notes, workspaceId }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isExtracted, setIsExtracted] = useState(false);
  const [isScrollingFast, setIsScrollingFast] = useState(false);
  const scrollEndTimer = useRef<ReturnType<typeof setTimeout>>();

  function handleCreate() {
    window.location.href = "/notes/new";
  }

  useEffect(() => {
    setIsScrollingFast(true);
    if (scrollEndTimer.current) clearTimeout(scrollEndTimer.current);
    scrollEndTimer.current = setTimeout(() => setIsScrollingFast(false), 400);
    return () => { if (scrollEndTimer.current) clearTimeout(scrollEndTimer.current); };
  }, [activeIndex]);

  // Keyboard: arrows + Enter
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isExtracted) {
        if (e.key === "Escape") setIsExtracted(false);
        return;
      }
      if (e.key === "ArrowUp") setActiveIndex((p) => Math.max(0, p - 1));
      if (e.key === "ArrowDown") setActiveIndex((p) => Math.min(notes.length - 1, p + 1));
      if (e.key === "Enter") setIsExtracted(true);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isExtracted, notes.length]);

  // Scroll wheel navigation
  const lastScroll = useRef(0);
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (isExtracted) return;
      if (Date.now() - lastScroll.current < 200) return;
      if (Math.abs(e.deltaY) > 30) {
        if (e.deltaY > 0) setActiveIndex((p) => Math.min(notes.length - 1, p + 1));
        else setActiveIndex((p) => Math.max(0, p - 1));
        lastScroll.current = Date.now();
      }
    },
    [isExtracted, notes.length]
  );

  const handleSelect = (index: number) => {
    if (index === activeIndex) {
      setIsExtracted((p) => !p);
    } else {
      setActiveIndex(index);
      setIsExtracted(false);
    }
  };

  const activeNote = notes[activeIndex];

  if (notes.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "120px 24px" }}>
        <FileText size={32} style={{ color: "#a39e98", marginBottom: 16 }} />
        <p style={{ fontSize: 16, color: "#615d59" }}>暂无笔记</p>
      </div>
    );
  }

  return (
    <div
      onWheel={handleWheel}
      style={{
        position: "relative",
        width: "100%",
        height: "calc(100vh - 48px - 48px)",
        overflow: "hidden",
        background: "#f6f5f4",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <header
        style={{
          position: "relative", zIndex: 50,
          padding: "12px 32px 8px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11, fontWeight: 600, letterSpacing: "0.3em",
              color: "#a39e98", textTransform: "uppercase", marginBottom: 4,
            }}
          >
            Archive / {String(activeIndex + 1).padStart(3, "0")}
          </div>
          <h1
            style={{
              fontSize: 28, fontWeight: 700, letterSpacing: "-1px",
              color: "rgba(0,0,0,0.95)",
            }}
          >
            笔记档案
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {isExtracted && (
            <button
              onClick={() => setIsExtracted(false)}
              className="notion-btn-secondary"
              style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 14 }}
            >
              <X size={14} /> 关闭
            </button>
          )}
          <button
            onClick={handleCreate}
            className="notion-btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 14 }}
          >
            <Plus size={14} /> 新建
          </button>
          {isExtracted && activeNote && (
            <a
              href={`/notes/${activeNote.id}`}
              className="notion-btn-primary"
              style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 4, fontSize: 14 }}
            >
              编辑 <ArrowRight size={14} />
            </a>
          )}
        </div>
      </header>

      {/* 3D Card Field */}
      <main
        style={{
          position: "relative",
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          perspective: 1800,
        }}
      >
        <div
          className="preserve-3d"
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
          }}
        >
          {/* Index dots (like dossier_spatial_stack) */}
          {!isExtracted && notes.length > 1 && (
            <div
              style={{
                position: "absolute",
                left: 24,
                top: "50%",
                transform: "translateY(-50%)",
                display: "flex",
                flexDirection: "column",
                gap: 24,
                pointerEvents: "none",
              }}
            >
              {notes.map((note, idx) => {
                const shortTitle = note.title.length > 10
                  ? note.title.slice(0, 10) + "..."
                  : note.title;
                return (
                  <div key={note.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <motion.div
                      animate={{
                        scale: idx === activeIndex ? 1.4 : 1,
                        opacity: idx === activeIndex ? 1 : 0.2,
                        background: idx === activeIndex ? "#0075de" : "#a39e98",
                      }}
                      style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0 }}
                    />
                    <span
                      style={{
                        fontSize: 11,
                        color: idx === activeIndex ? "rgba(0,0,0,0.95)" : "#a39e98",
                        fontWeight: idx === activeIndex ? 600 : 400,
                        maxWidth: 80,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={note.title}
                    >
                      {shortTitle}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Cards Stack */}
          <div
            className="preserve-3d"
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {notes.map((note, index) => (
              <NoteDossierCard
                key={note.id}
                note={note}
                index={index}
                activeIndex={activeIndex}
                isExtracted={isExtracted}
                isScrollingFast={isScrollingFast}
                total={notes.length}
                onSelect={handleSelect}
              />
            ))}
          </div>

          {/* Extracted detail panel */}
          <AnimatePresence>
            {isExtracted && activeNote && (
              <motion.div
                initial={{ opacity: 0, x: 80 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 80 }}
                transition={{ type: "spring", stiffness: 200, damping: 25 }}
                style={{
                  position: "absolute",
                  right: 0, top: 0, bottom: 0,
                  width: "clamp(320px, 42%, 500px)",
                  zIndex: 600,
                  background: "rgba(255,255,255,0.92)",
                  backdropFilter: "blur(20px)",
                  borderLeft: "1px solid rgba(0,0,0,0.1)",
                  padding: "40px 32px",
                  overflowY: "auto",
                }}
              >
                <div
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    marginBottom: 32,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11, fontWeight: 600, letterSpacing: "0.3em",
                      color: "#0075de", textTransform: "uppercase",
                    }}
                  >
                    档案详情
                  </span>
                  <button
                    onClick={() => setIsExtracted(false)}
                    style={{
                      width: 36, height: 36, borderRadius: "50%",
                      border: "1px solid rgba(0,0,0,0.1)",
                      background: "#fff", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <X size={16} style={{ color: "#615d59" }} />
                  </button>
                </div>

                <h2
                  style={{
                    fontSize: 32, fontWeight: 700, letterSpacing: "-1px",
                    color: "rgba(0,0,0,0.95)", lineHeight: 1.1, marginBottom: 16,
                  }}
                >
                  {activeNote.title}
                </h2>

                <div style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
                  {activeNote.tags.map((t) => (
                    <span key={t.tag.name} className="notion-badge">{t.tag.name}</span>
                  ))}
                </div>

                <div
                  style={{ height: 1, background: "rgba(0,0,0,0.1)", marginBottom: 24 }}
                />

                <div
                  style={{
                    fontSize: 16, lineHeight: 1.7, color: "rgba(0,0,0,0.95)",
                    marginBottom: 32,
                  }}
                >
                  {(() => {
                    try {
                      const blocks = typeof activeNote.content === "string"
                        ? JSON.parse(activeNote.content) : activeNote.content;
                      if (Array.isArray(blocks)) {
                        return blocks.map((b: any, i: number) => (
                          <p key={i} style={{ margin: "0 0 8px" }}>
                            {b.type === "heading" ? <strong>{b.content}</strong> : b.content}
                          </p>
                        ));
                      }
                    } catch { /* ignore */ }
                    return <p style={{ color: "#a39e98" }}>无法预览内容</p>;
                  })()}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div
                    style={{
                      padding: "16px 20px", borderRadius: 12,
                      background: "#f6f5f4", border: "1px solid rgba(0,0,0,0.08)",
                    }}
                  >
                    <div style={{ fontSize: 11, color: "#a39e98", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                      创建时间
                    </div>
                    <div style={{ fontSize: 14, color: "rgba(0,0,0,0.95)" }}>
                      {new Date(activeNote.createdAt).toLocaleDateString("zh-CN")}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "16px 20px", borderRadius: 12,
                      background: "#f6f5f4", border: "1px solid rgba(0,0,0,0.08)",
                    }}
                  >
                    <div style={{ fontSize: 11, color: "#a39e98", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                      关联交易
                    </div>
                    <div style={{ fontSize: 14, color: "rgba(0,0,0,0.95)" }}>
                      {activeNote._count.transactions} 笔
                    </div>
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer progress bar */}
      <footer
        style={{
          position: "relative", zIndex: 50,
          padding: "20px 32px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}
      >
        <span style={{ fontSize: 11, color: "#a39e98", textTransform: "uppercase", letterSpacing: "0.15em" }}>
          共 {notes.length} 篇笔记
        </span>
        <div
          style={{
            width: 160, height: 3, borderRadius: 2,
            background: "rgba(0,0,0,0.08)", overflow: "hidden",
          }}
        >
          <motion.div
            animate={{ width: `${((activeIndex + 1) / notes.length) * 100}%` }}
            style={{ height: "100%", borderRadius: 2, background: "#0075de" }}
          />
        </div>
        <span
          style={{
            fontSize: 11, color: "#a39e98", fontVariantNumeric: "tabular-nums",
          }}
        >
          {activeIndex + 1}/{notes.length}
        </span>
      </footer>

      {/* Scroll hint (first visit only) */}
      {!isExtracted && notes.length > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: "absolute", bottom: 80, left: "50%", transform: "translateX(-50%)",
            zIndex: 50, display: "flex", flexDirection: "column",
            alignItems: "center", gap: 4, pointerEvents: "none",
          }}
        >
          <ChevronUp size={14} style={{ color: "#a39e98" }} />
          <span style={{ fontSize: 10, color: "#a39e98", textTransform: "uppercase", letterSpacing: "0.2em" }}>
            滚轮浏览
          </span>
          <ChevronDown size={14} style={{ color: "#a39e98" }} />
        </motion.div>
      )}
    </div>
  );
}
