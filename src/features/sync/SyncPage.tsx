import React from "react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { useSync } from "@/shared/sync/SyncContext";

export function SyncPage() {
  const { status, lastError, lastSyncAt, queuedCount, failedCount, outbox, syncNow } = useSync();

  return (
    <div className="space-y-4">
      <div data-testid="sync-status" data-status={status} className="sr-only">
        {status}
      </div>
      <Card
        title="Sync"
        actions={
          <Button onClick={() => void syncNow()} disabled={status === "syncing"}>
            {status === "syncing" ? "Syncing…" : "Sync now"}
          </Button>
        }
      >
        <div className="grid gap-2 text-sm text-slate-300 md:grid-cols-3">
          <div data-testid="sync-last-sync">
            Last sync:{" "}
            <span className="text-slate-100">
              {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : "Never"}
            </span>
          </div>
          <div data-testid="sync-queued">
            Outbox queued: <span className="text-slate-100">{queuedCount}</span>
          </div>
          <div data-testid="sync-failed">
            Outbox failed: <span className="text-slate-100">{failedCount}</span>
          </div>
        </div>
        {lastError ? <div className="mt-3 text-sm text-rose-300">Sync error: {lastError}</div> : null}
        <div className="mt-2 text-xs text-slate-500">
          This MVP uses a local mock server stored in IndexedDB (<span className="font-mono">somasmart_server_mock</span>)
          to simulate periodic sync.
        </div>
      </Card>

      <Card title="Outbox events">
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs text-slate-400">
              <tr>
                <th className="py-2">Time</th>
                <th className="py-2">Type</th>
                <th className="py-2">Status</th>
                <th className="py-2">Error</th>
              </tr>
            </thead>
            <tbody>
              {outbox.map((e) => (
                <tr key={e.id} className="border-t border-slate-800">
                  <td className="py-2">{new Date(e.createdAt).toLocaleString()}</td>
                  <td className="py-2">{e.type}</td>
                  <td className="py-2">{e.syncStatus}</td>
                  <td className="py-2 text-rose-300">{e.lastError ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {outbox.length === 0 ? <div className="text-sm text-slate-400">No events queued.</div> : null}
        </div>
      </Card>
    </div>
  );
}
