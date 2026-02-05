import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { OutboxEvent } from "@/shared/types";
import { db } from "@/shared/db/db";
import { MockSyncAdapter } from "@/shared/sync/mock/MockSyncAdapter";
import { getSyncMeta, syncNow as runSyncNow } from "@/shared/sync/syncEngine";
import { useAuth } from "@/features/auth/authContext";

type SyncState = {
  status: "idle" | "syncing" | "error";
  lastError?: string;
  lastSyncAt: string | null;
  queuedCount: number;
  failedCount: number;
  outbox: OutboxEvent[];
  syncNow: () => Promise<void>;
};

const SyncContext = createContext<SyncState | null>(null);

const adapter = new MockSyncAdapter();

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user, refresh: refreshAuth } = useAuth();
  const [status, setStatus] = useState<SyncState["status"]>("idle");
  const [lastError, setLastError] = useState<string | undefined>(undefined);
  const [outbox, setOutbox] = useState<OutboxEvent[]>([]);
  const [queuedCount, setQueuedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(getSyncMeta().lastSyncAt);

  async function refreshOutbox() {
    const all = await db.outboxEvents.toArray();
    setOutbox(all.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    setQueuedCount(all.filter((e) => e.syncStatus === "queued").length);
    setFailedCount(all.filter((e) => e.syncStatus === "failed").length);
    setLastSyncAt(getSyncMeta().lastSyncAt);
  }

  useEffect(() => {
    void refreshOutbox();
    const id = window.setInterval(() => void refreshOutbox(), 2000);
    return () => window.clearInterval(id);
  }, []);

  const value = useMemo<SyncState>(
    () => ({
      status,
      lastError,
      lastSyncAt,
      queuedCount,
      failedCount,
      outbox,
      async syncNow() {
        setStatus("syncing");
        setLastError(undefined);
        try {
          await runSyncNow({ adapter, currentUserId: user?.id ?? null });
          await refreshAuth();
          await refreshOutbox();
          setStatus("idle");
        } catch (err) {
          setStatus("error");
          setLastError(err instanceof Error ? err.message : "Sync failed");
        }
      }
    }),
    [failedCount, lastError, lastSyncAt, outbox, queuedCount, status, user?.id]
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error("useSync must be used within SyncProvider");
  return ctx;
}
