import React, { useEffect, useMemo, useState } from "react";
import type { AuditAction, AuditLog, User } from "@/shared/types";
import { db } from "@/shared/db/db";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Toolbar } from "@/shared/ui/Toolbar";
import { DataTable } from "@/shared/ui/DataTable";
import { formatDateTimeYmdHm } from "@/shared/format";

function download(filename: string, content: Blob) {
  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value: unknown) {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes("\"") || s.includes("\n")) return `"${s.replaceAll("\"", "\"\"")}"`;
  return s;
}

export function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [usersById, setUsersById] = useState<Record<string, User>>({});
  const [q, setQ] = useState("");
  const [action, setAction] = useState<AuditAction | "all">("all");
  const [entityType, setEntityType] = useState<AuditLog["entityType"] | "all">("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  async function refresh() {
    const allLogs = await db.auditLogs.toArray();
    setLogs(allLogs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    const users = await db.users.toArray();
    const map: Record<string, User> = {};
    users.forEach((u) => (map[u.id] = u));
    setUsersById(map);
  }

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 2000);
    return () => window.clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return logs.filter((l) => {
      if (action !== "all" && l.action !== action) return false;
      if (entityType !== "all" && l.entityType !== entityType) return false;
      if (fromDate.trim()) {
        const fromIso = new Date(`${fromDate.trim()}T00:00:00.000Z`).toISOString();
        if (l.createdAt < fromIso) return false;
      }
      if (toDate.trim()) {
        const toIso = new Date(`${toDate.trim()}T23:59:59.999Z`).toISOString();
        if (l.createdAt > toIso) return false;
      }
      if (!needle) return true;
      const actor = usersById[l.actorUserId]?.displayName ?? usersById[l.actorUserId]?.username ?? "";
      const blob = `${actor} ${l.action} ${l.entityType} ${l.entityId} ${JSON.stringify(l.details ?? {})}`.toLowerCase();
      return blob.includes(needle);
    });
  }, [action, entityType, fromDate, logs, q, toDate, usersById]);

  function exportCsv() {
    const header = ["createdAt", "actor", "action", "entityType", "entityId", "detailsJson"];
    const rows = filtered.map((l) => {
      const actor = usersById[l.actorUserId]?.displayName ?? usersById[l.actorUserId]?.username ?? l.actorUserId;
      return [
        l.createdAt,
        actor,
        l.action,
        l.entityType,
        l.entityId,
        JSON.stringify(l.details ?? {})
      ].map(csvEscape);
    });
    const body = [header.map(csvEscape).join(","), ...rows.map((r) => r.join(","))].join("\n");
    download(`somasmart-audit-${new Date().toISOString().slice(0, 10)}.csv`, new Blob([body], { type: "text/csv" }));
  }

  const actions: (AuditAction | "all")[] = useMemo(() => {
    const set = new Set<AuditAction>();
    logs.forEach((l) => set.add(l.action));
    return ["all", ...Array.from(set).sort()];
  }, [logs]);

  const entityTypes: (AuditLog["entityType"] | "all")[] = useMemo(() => {
    const set = new Set<AuditLog["entityType"]>();
    logs.forEach((l) => set.add(l.entityType));
    return ["all", ...Array.from(set).sort()];
  }, [logs]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit logs"
        description="Track admin actions for approvals, payments, user changes, and system settings."
        actions={
          <Button variant="secondary" data-testid="audit-export-csv" onClick={exportCsv}>
            Export CSV
          </Button>
        }
      />

      <Toolbar
        left={
          <div className="grid gap-3 md:grid-cols-3">
            <Input label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
            <label className="block">
              <div className="mb-1 text-sm text-muted">Action</div>
              <select
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
                value={action}
                onChange={(e) => setAction(e.target.value as AuditAction | "all")}
              >
                {actions.map((a) => (
                  <option key={a} value={a}>
                    {a === "all" ? "All" : a}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <div className="mb-1 text-sm text-muted">Entity</div>
              <select
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
                value={entityType}
                onChange={(e) => setEntityType(e.target.value as any)}
              >
                {entityTypes.map((t) => (
                  <option key={t} value={t}>
                    {t === "all" ? "All" : t}
                  </option>
                ))}
              </select>
            </label>
            <Input label="From (YYYY-MM-DD)" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <Input label="To (YYYY-MM-DD)" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        }
        right={
          <div>
            Showing <span className="text-text">{filtered.length}</span> logs
          </div>
        }
      />

      <div data-testid="audit-table">
        <DataTable
          columns={
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          }
          rows={filtered.map((l) => {
            const actor =
              usersById[l.actorUserId]?.displayName ?? usersById[l.actorUserId]?.username ?? l.actorUserId;
            return (
              <tr key={l.id} className="border-t border-border" data-testid={`audit-row-${l.id}`}>
                <td className="px-4 py-3 text-xs text-muted">{formatDateTimeYmdHm(l.createdAt)}</td>
                <td className="px-4 py-3">{actor}</td>
                <td className="px-4 py-3 font-mono text-xs">{l.action}</td>
                <td className="px-4 py-3 font-mono text-xs">
                  {l.entityType}:{l.entityId}
                </td>
                <td className="px-4 py-3 text-xs text-muted">{l.details ? JSON.stringify(l.details) : "—"}</td>
              </tr>
            );
          })}
          emptyTitle="No audit logs"
          emptyDescription="Try adjusting filters or date range."
        />
      </div>
    </div>
  );
}
