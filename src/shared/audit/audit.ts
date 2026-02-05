import { db } from "@/shared/db/db";
import type { AuditAction, AuditLog } from "@/shared/types";

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export async function logAudit({
  actorUserId,
  action,
  entityType,
  entityId,
  details
}: {
  actorUserId: string;
  action: AuditAction;
  entityType: AuditLog["entityType"];
  entityId: string;
  details?: Record<string, unknown>;
}) {
  const row: AuditLog = {
    id: newId("audit"),
    actorUserId,
    action,
    entityType,
    entityId,
    createdAt: nowIso(),
    details
  };
  await db.auditLogs.add(row);
  return row;
}

