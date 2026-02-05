import React, { useEffect, useMemo, useState } from "react";
import type { Message, SupportStatus, User } from "@/shared/types";
import { db } from "@/shared/db/db";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import { useAuth } from "@/features/auth/authContext";
import { logAudit } from "@/shared/audit/audit";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Toolbar } from "@/shared/ui/Toolbar";
import { DataTable } from "@/shared/ui/DataTable";
import { StatusPill } from "@/shared/ui/StatusPill";

export function AdminSupportPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [usersById, setUsersById] = useState<Record<string, User>>({});
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<SupportStatus | "all">("open");

  async function refresh() {
    const rows = await db.messages.toArray();
    const supportRows = rows.map((m) => ({ ...m, supportStatus: m.supportStatus ?? "open" as const }));
    setMessages(supportRows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    const users = await db.users.toArray();
    const map: Record<string, User> = {};
    users.filter((u) => !u.deletedAt).forEach((u) => (map[u.id] = u));
    setUsersById(map);
  }

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 2000);
    return () => window.clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return messages.filter((m) => {
      const status = (m.supportStatus ?? "open") as SupportStatus;
      if (filter !== "all" && status !== filter) return false;
      if (!needle) return true;
      const from = usersById[m.fromUserId]?.displayName ?? usersById[m.fromUserId]?.username ?? m.fromUserId;
      const to = usersById[m.toUserId]?.displayName ?? usersById[m.toUserId]?.username ?? m.toUserId;
      const blob = `${from} ${to} ${m.body}`.toLowerCase();
      return blob.includes(needle);
    });
  }, [filter, messages, q, usersById]);

  async function assign(messageId: string) {
    if (!user) return;
    const m = await db.messages.get(messageId);
    if (!m) return;
    await db.messages.put({ ...m, supportStatus: m.supportStatus ?? "open", assignedAdminUserId: user.id });
    await logAudit({
      actorUserId: user.id,
      action: "support_assign",
      entityType: "settings",
      entityId: messageId,
      details: { assignedAdminUserId: user.id }
    });
    await refresh();
  }

  async function resolve(messageId: string) {
    if (!user) return;
    const m = await db.messages.get(messageId);
    if (!m) return;
    await db.messages.put({ ...m, supportStatus: "resolved" });
    await logAudit({
      actorUserId: user.id,
      action: "support_resolve",
      entityType: "settings",
      entityId: messageId
    });
    await refresh();
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Support desk" description="Triage and resolve messages from students and teachers." />

      <Toolbar
        left={
          <div className="grid gap-3 md:grid-cols-3">
            <Input label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
            <label className="block">
              <div className="mb-1 text-sm text-muted">Status</div>
              <select
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-brand"
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
              >
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
                <option value="all">All</option>
              </select>
            </label>
          </div>
        }
        right={
          <div>
            Showing <span className="text-text">{filtered.length}</span>
          </div>
        }
      />

      <div data-testid="support-table">
        <DataTable
          emptyTitle="No support messages"
          columns={
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">From</th>
              <th className="px-4 py-3">To</th>
              <th className="px-4 py-3">Message</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Assigned</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          }
          rows={
            <>
              {filtered.map((m) => {
                const from =
                  usersById[m.fromUserId]?.displayName ?? usersById[m.fromUserId]?.username ?? m.fromUserId;
                const to =
                  usersById[m.toUserId]?.displayName ?? usersById[m.toUserId]?.username ?? m.toUserId;
                const status = (m.supportStatus ?? "open") as SupportStatus;
                const assigned = m.assignedAdminUserId
                  ? usersById[m.assignedAdminUserId]?.username ?? m.assignedAdminUserId
                  : "—";
                return (
                  <tr key={m.id} className="border-t border-border bg-surface" data-testid={`support-row-${m.id}`}>
                    <td className="px-4 py-3 text-xs text-muted">{m.createdAt}</td>
                    <td className="px-4 py-3">{from}</td>
                    <td className="px-4 py-3">{to}</td>
                    <td className="px-4 py-3 whitespace-pre-wrap text-text">{m.body}</td>
                    <td className="px-4 py-3">
                      <StatusPill value={status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{assigned}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={() => void assign(m.id)} disabled={!user}>
                          Assign to me
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => void resolve(m.id)}
                          disabled={!user || status === "resolved"}
                        >
                          Resolve
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </>
          }
        />
      </div>
    </div>
  );
}
