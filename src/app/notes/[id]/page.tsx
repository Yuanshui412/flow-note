import { prisma } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import { NoteEditor } from "./note-editor";

interface Props {
  params: { id: string };
}

/**
 * Server Component — 笔记详情页
 *
 * 职责：查数据库 → 传数据给 Client Component 编辑器
 * 不包含任何交互逻辑
 */
export default async function NoteDetailPage({ params }: Props) {
  const note = await prisma.note.findUnique({
    where: { id: params.id, deletedAt: null },
    select: {
      id: true,
      title: true,
      content: true,
      version: true,
    },
  });

  if (!note) {
    notFound();
  }

  return (
    <NoteEditor
      note={{
        id: note.id,
        title: note.title,
        content: JSON.parse(note.content) as NoteEditorBlock[],
        version: note.version,
      }}
    />
  );
}

type NoteEditorBlock = {
  id: string;
  type: "heading" | "paragraph" | "list" | "quote" | "code";
  content: string;
};
