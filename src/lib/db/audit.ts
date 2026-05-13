import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

type AuditAction = "note.create" | "note.update" | "note.delete" | "note.restore"
  | "transaction.create" | "budget.create" | "budget.update";

type AuditTarget = "note" | "transaction" | "budget";

interface AuditParams {
  workspaceId: string;
  actorId: string;
  action: AuditAction;
  targetType: AuditTarget;
  targetId: string;
  metadata?: Record<string, unknown>;
}

/**
 * 写一条审计日志。fire-and-forget（不阻塞主流程）
 */
export function writeAuditLog(params: AuditParams) {
  prisma.auditLog
    .create({
      data: {
        workspaceId: params.workspaceId,
        actorId: params.actorId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    })
    .catch((err) => console.error("[audit] 写入失败:", err));
}
