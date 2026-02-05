import React, { useEffect, useMemo, useState } from "react";
import type { LicenseGrant, User } from "@/shared/types";
import { db } from "@/shared/db/db";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { useAuth } from "@/features/auth/authContext";
import { logAudit } from "@/shared/audit/audit";
import { enqueueOutboxEvent } from "@/shared/offline/outbox";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Toolbar } from "@/shared/ui/Toolbar";
import { DataTable } from "@/shared/ui/DataTable";
import { formatDateYmd } from "@/shared/format";

function addDays(fromIso: string | undefined, days: number) {
  const now = Date.now();
  const base = fromIso ? Math.max(now, new Date(fromIso).getTime()) : now;
  return new Date(base + days * 24 * 3600 * 1000).toISOString();
}

export function AdminLicensesPage() {
  const { user } = useAuth();
  const [grants, setGrants] = useState<LicenseGrant[]>([]);
  const [usersById, setUsersById] = useState<Record<string, User>>({});
  const [q, setQ] = useState("");
  const [extendDays, setExtendDays] = useState(30);
  const [confirm, setConfirm] = useState<null | {
    title: string;
    description?: string;
    confirmLabel: string;
    danger?: boolean;
    requireText?: string;
    run: () => Promise<void>;
  }>(null);

  async function refresh() {
    const rows = await db.licenseGrants.toArray();
    setGrants(rows.filter((g) => !g.deletedAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    const users = await db.users.toArray();
    const map: Record<string, User> = {};
    users.filter((u) => !u.deletedAt).forEach((u) => (map[u.id] = u));
    setUsersById(map);
  }

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 2500);
    return () => window.clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return grants;
    return grants.filter((g) => {
      const student = usersById[g.studentId]?.displayName ?? usersById[g.studentId]?.username ?? g.studentId;
      const blob = `${student} ${JSON.stringify(g.scope)} ${g.validUntil ?? ""} ${g.sourcePaymentId ?? ""}`.toLowerCase();
      return blob.includes(needle);
    });
  }, [grants, q, usersById]);

  async function revoke(grantId: string) {
    const g = await db.licenseGrants.get(grantId);
    if (!g) return;
    await db.licenseGrants.put({ ...g, deletedAt: new Date().toISOString() });
    await enqueueOutboxEvent({ type: "license_grant_upsert", payload: { grantId } });
    if (user) {
      await logAudit({
        actorUserId: user.id,
        action: "license_grant_revoke",
        entityType: "licenseGrant",
        entityId: grantId,
        details: { studentId: g.studentId, scope: g.scope }
      });
    }
    await refresh();
  }

  async function extend(grantId: string, days: number) {
    const g = await db.licenseGrants.get(grantId);
    if (!g) return;
    const nextUntil = addDays(g.validUntil, Math.max(1, Math.min(365, days)));
    await db.licenseGrants.put({ ...g, validUntil: nextUntil });
    await enqueueOutboxEvent({ type: "license_grant_upsert", payload: { grantId } });
    if (user) {
      await logAudit({
        actorUserId: user.id,
        action: "license_grant_extend",
        entityType: "licenseGrant",
        entityId: grantId,
        details: { studentId: g.studentId, validUntil: nextUntil }
      });
    }
    await refresh();
  }

  return (
    <div className="space-y-4">
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title ?? ""}
        description={confirm?.description}
        confirmLabel={confirm?.confirmLabel ?? "Confirm"}
        danger={confirm?.danger}
        requireText={confirm?.requireText}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          const run = confirm?.run;
          setConfirm(null);
          if (run) await run();
        }}
      />

      <PageHeader
        title="License grants"
        description="Extend or revoke access granted to students."
      />

      <Toolbar
        left={
          <div className="grid gap-3 md:grid-cols-3">
            <Input label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
            <Input
              label="Extend days"
              type="number"
              value={String(extendDays)}
              onChange={(e) => setExtendDays(Number(e.target.value))}
            />
          </div>
        }
        right={
          <div>
            Showing <span className="text-text">{filtered.length}</span>
          </div>
        }
      />

      <DataTable
        columns={
          <tr>
            <th className="px-4 py-3">Student</th>
            <th className="px-4 py-3">Scope</th>
            <th className="px-4 py-3">Valid until</th>
            <th className="px-4 py-3">Source</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        }
        rows={filtered.map((g) => {
          const student = usersById[g.studentId]?.displayName ?? usersById[g.studentId]?.username ?? g.studentId;
          return (
            <tr key={g.id} data-testid={`grant-row-${g.id}`} className="border-t border-border">
              <td className="px-4 py-3">{student}</td>
              <td className="px-4 py-3 font-mono text-xs">{JSON.stringify(g.scope)}</td>
              <td className="px-4 py-3">{g.validUntil ? formatDateYmd(g.validUntil) : "—"}</td>
              <td className="px-4 py-3 font-mono text-xs">{g.sourcePaymentId ?? "—"}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    data-testid="grant-extend"
                    onClick={() =>
                      setConfirm({
                        title: "Extend access?",
                        description: `Extend by ${extendDays} days.`,
                        confirmLabel: "Extend",
                        run: async () => extend(g.id, extendDays)
                      })
                    }
                  >
                    Extend
                  </Button>
                  <Button
                    variant="danger"
                    data-testid="grant-revoke"
                    onClick={() =>
                      setConfirm({
                        title: "Revoke access?",
                        description: "This student will lose access granted by this license.",
                        confirmLabel: "Revoke",
                        danger: true,
                        run: async () => revoke(g.id)
                      })
                    }
                  >
                    Revoke
                  </Button>
                </div>
              </td>
            </tr>
          );
        })}
        emptyTitle="No license grants"
        emptyDescription="License grants appear here after coupon redemptions, sponsorships, or verified payments."
      />
    </div>
  );
}
