import { db } from "@/shared/db/db";
import type { OutboxEvent } from "@/shared/types";

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export async function enqueueOutboxEvent(event: Omit<OutboxEvent, "id" | "createdAt" | "syncStatus">) {
  const row: OutboxEvent = {
    id: newId("evt"),
    createdAt: nowIso(),
    syncStatus: "queued",
    ...event
  };
  await db.outboxEvents.add(row);
  return row;
}

