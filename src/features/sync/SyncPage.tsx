import React from "react";
import { Link } from "react-router-dom";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { useSync } from "@/shared/sync/SyncContext";
import { getEffectiveSyncConnection } from "@/shared/sync/config";

export function SyncPage() {
  const { mode, status, lastError, lastSyncAt, queuedCount, failedCount, outbox, syncNow } = useSync();
  const connection = getEffectiveSyncConnection();
  const sourceLabel = connection.hasRuntimeOverride ? "runtime override" : "env/default";

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
        <div className="grid gap-2 text-sm text-muted md:grid-cols-3">
          <div data-testid="sync-last-sync">
            Last sync:{" "}
            <span className="text-text">
              {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : "Never"}
            </span>
          </div>
          <div data-testid="sync-queued">
            Outbox queued: <span className="text-text">{queuedCount}</span>
          </div>
          <div data-testid="sync-failed">
            Outbox failed: <span className="text-text">{failedCount}</span>
          </div>
        </div>
        {lastError ? <div className="mt-3 text-sm text-danger-text">Sync error: {lastError}</div> : null}
        <div className="mt-2 text-xs text-muted">
          Sync adapter: <span className="font-mono">{mode}</span>.{" "}
          {mode === "mock" ? (
            <>
              This mode uses a local mock server stored in IndexedDB (<span className="font-mono">somasmart_server_mock</span>).
            </>
          ) : (
            <>This mode sends push/pull requests to your configured backend API.</>
          )}
        </div>
        {mode === "api" ? (
          <div className="mt-2 text-xs text-muted">
            Endpoint: <span className="font-mono">{connection.baseUrl}</span>. Project key:{" "}
            <span className="font-mono">{connection.projectKey}</span>. Source:{" "}
            <span className="font-mono">{sourceLabel}</span>.{" "}
            <Link className="text-action-primary-active underline" to="/help/backend-integration">
              Integration guide
            </Link>
            .
          </div>
        ) : null}
      </Card>

      <Card title="Outbox events">
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="py-2">Time</th>
                <th className="py-2">Type</th>
                <th className="py-2">Status</th>
                <th className="py-2">Error</th>
              </tr>
            </thead>
            <tbody>
              {outbox.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="py-2">{new Date(e.createdAt).toLocaleString()}</td>
                  <td className="py-2">{e.type}</td>
                  <td className="py-2">{e.syncStatus}</td>
                  <td className="py-2 text-danger-text">{e.lastError ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {outbox.length === 0 ? <div className="text-sm text-muted">No events queued.</div> : null}
        </div>
      </Card>
    </div>
  );
}
