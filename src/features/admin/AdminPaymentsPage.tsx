import React, { useEffect, useMemo, useState } from "react";
import type { Level, LicenseGrant, LicenseScope, Payment, PaymentStatus, User } from "@/shared/types";
import { db } from "@/shared/db/db";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { enqueueOutboxEvent } from "@/shared/offline/outbox";
import { useAuth } from "@/features/auth/authContext";
import { logAudit } from "@/shared/audit/audit";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { PageHeader } from "@/shared/ui/PageHeader";
import { formatDateTimeYmdHm } from "@/shared/format";

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function plusDays(days: number) {
  return new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();
}

export function AdminPaymentsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [usersById, setUsersById] = useState<Record<string, User>>({});
  const [filter, setFilter] = useState<PaymentStatus | "all">("pending");
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | {
    title: string;
    description?: string;
    confirmLabel: string;
    danger?: boolean;
    requireText?: string;
    run: () => Promise<void>;
  }>(null);

  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");

  const [scopeType, setScopeType] = useState<"full" | "level" | "subject">("full");
  const [level, setLevel] = useState<Level>("Primary");
  const [subject, setSubject] = useState("");
  const [daysValid, setDaysValid] = useState(30);

  async function refresh() {
    const all = await db.payments.toArray();
    setPayments(all.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    const users = await db.users.toArray();
    const map: Record<string, User> = {};
    users.filter((u) => !u.deletedAt).forEach((u) => (map[u.id] = u));
    setUsersById(map);
  }

  useEffect(() => {
    void refresh();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return payments;
    return payments.filter((p) => p.status === filter);
  }, [filter, payments]);

  const selected = useMemo(
    () => payments.find((p) => p.id === selectedPaymentId) ?? null,
    [payments, selectedPaymentId]
  );

  function buildScope(): LicenseScope {
    if (scopeType === "full") return { type: "full" };
    if (scopeType === "level") return { type: "level", level };
    return { type: "subject", subject: subject.trim() };
  }

  async function verify(payment: Payment) {
    setMsg(null);
    if (payment.method !== "mobile_money" || payment.status !== "pending") return;
    const scope = buildScope();
    if (scope.type === "subject" && !scope.subject) {
      setMsg("Enter a subject.");
      return;
    }

    const updated: Payment = { ...payment, status: "verified" };
    const grant: LicenseGrant = {
      id: newId("grant"),
      studentId: payment.studentId,
      scope,
      validUntil: plusDays(Math.max(1, Math.min(365, daysValid))),
      sourcePaymentId: payment.id,
      createdAt: nowIso()
    };

    await db.transaction("rw", [db.payments, db.licenseGrants], async () => {
      await db.payments.put(updated);
      await db.licenseGrants.put(grant);
    });
    await enqueueOutboxEvent({ type: "payment_verified", payload: { paymentId: payment.id, grantId: grant.id } });
    if (user) {
      await logAudit({
        actorUserId: user.id,
        action: "payment_verify",
        entityType: "payment",
        entityId: payment.id,
        details: { scope, validUntil: grant.validUntil }
      });
    }
    await refresh();
    setMsg("Payment verified and access granted.");
  }

  async function reject(payment: Payment) {
    setMsg(null);
    if (payment.method !== "mobile_money" || payment.status !== "pending") return;
    const updated: Payment = { ...payment, status: "rejected" };
    await db.payments.put(updated);
    await enqueueOutboxEvent({ type: "payment_rejected", payload: { paymentId: payment.id } });
    if (user) {
      await logAudit({
        actorUserId: user.id,
        action: "payment_reject",
        entityType: "payment",
        entityId: payment.id,
        details: { reference: payment.reference }
      });
    }
    await refresh();
    setMsg("Payment rejected.");
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
        title="Payments"
        description="Review pending mobile money payments and export payment records."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <Card title="Payments">
          <label className="block">
            <div className="mb-1 text-sm text-muted">Filter</div>
            <select
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
              value={filter}
              onChange={(e) => setFilter(e.target.value as PaymentStatus | "all")}
            >
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
              <option value="all">All</option>
            </select>
          </label>
          <div className="mt-3 space-y-2">
            {filtered.map((p) => (
              <button
                key={p.id}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                  selectedPaymentId === p.id
                    ? "border-brand bg-surface2"
                    : "border-border bg-surface hover:border-border/80"
                }`}
                onClick={() => setSelectedPaymentId(p.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-mono text-xs">{p.method}</div>
                  <div className="rounded bg-surface2 px-2 py-1 text-xs text-text">{p.status}</div>
                </div>
                <div className="mt-1 text-xs text-muted">
                  {usersById[p.studentId]?.displayName ?? p.studentId} • {formatDateTimeYmdHm(p.createdAt)}
                </div>
                <div className="mt-1 text-xs text-muted">Ref: {p.reference}</div>
              </button>
            ))}
            {filtered.length === 0 ? <div className="text-sm text-muted">No payments.</div> : null}
          </div>
        </Card>
      </div>

        <div className="space-y-4 lg:col-span-2">
          <Card title="Verify mobile money">
          {!selected ? (
            <div className="text-sm text-muted">Select a payment to review.</div>
          ) : (
            <>
              <div className="grid gap-2 text-sm text-muted md:grid-cols-2">
                <div>
                  Student:{" "}
                  <span className="text-text">{usersById[selected.studentId]?.displayName ?? selected.studentId}</span>
                </div>
                <div>
                  Method: <span className="text-text">{selected.method}</span>
                </div>
                <div>
                  Status: <span className="text-text">{selected.status}</span>
                </div>
                <div>
                  Reference: <span className="text-text">{selected.reference}</span>
                </div>
              </div>

              {selected.method === "mobile_money" && selected.status === "pending" ? (
                <div className="mt-4 space-y-3">
                  <div className="grid gap-3 md:grid-cols-3">
                    <Select label="Scope" value={scopeType} onChange={(e) => setScopeType(e.target.value as any)}>
                      <option value="full">Full access</option>
                      <option value="level">Level</option>
                      <option value="subject">Subject</option>
                    </Select>
                    {scopeType === "level" ? (
                      <Select label="Level" value={level} onChange={(e) => setLevel(e.target.value as Level)}>
                        <option value="Preschool">Preschool</option>
                        <option value="Primary">Primary</option>
                        <option value="Secondary">Secondary</option>
                        <option value="Vocational">Vocational</option>
                      </Select>
                    ) : scopeType === "subject" ? (
                      <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
                    ) : (
                      <div />
                    )}
                    <Input
                      label="Valid days"
                      type="number"
                      value={String(daysValid)}
                      onChange={(e) => setDaysValid(Number(e.target.value))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() =>
                        setConfirm({
                          title: "Verify payment?",
                          description: "This will unlock access for the student.",
                          confirmLabel: "Verify",
                          run: async () => verify(selected)
                        })
                      }
                    >
                      Verify
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() =>
                        setConfirm({
                          title: "Reject payment?",
                          description: "The student will be notified and access will remain locked.",
                          confirmLabel: "Reject",
                          danger: true,
                          run: async () => reject(selected)
                        })
                      }
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 text-sm text-muted">Only pending mobile money payments can be verified.</div>
              )}

              {msg ? <div className="mt-3 text-sm text-text">{msg}</div> : null}
            </>
          )}
        </Card>

        <Card title="Export payments CSV">
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="From (YYYY-MM-DD)" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} />
            <Input label="To (YYYY-MM-DD)" value={exportTo} onChange={(e) => setExportTo(e.target.value)} />
          </div>
          <div className="mt-3">
            <Button
              variant="secondary"
              onClick={async () => {
                const from = exportFrom.trim() ? new Date(`${exportFrom.trim()}T00:00:00.000Z`).toISOString() : null;
                const to = exportTo.trim() ? new Date(`${exportTo.trim()}T23:59:59.999Z`).toISOString() : null;
                const rows = await db.payments.toArray();
                const filtered = rows.filter((p) => {
                  if (from && p.createdAt < from) return false;
                  if (to && p.createdAt > to) return false;
                  return true;
                });
                const header = ["createdAt", "student", "method", "status", "reference", "paymentId"];
                const csv = [
                  header,
                  ...filtered.map((p) => [
                    p.createdAt,
                    usersById[p.studentId]?.displayName ?? p.studentId,
                    p.method,
                    p.status,
                    p.reference,
                    p.id
                  ])
                ]
                  .map((r) => r.map(csvEscape).join(","))
                  .join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `somasmart-payments-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download CSV
            </Button>
          </div>
        </Card>
      </div>
      </div>
    </div>
  );
}

function csvEscape(value: unknown) {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes("\"") || s.includes("\n")) return `"${s.replaceAll("\"", "\"\"")}"`;
  return s;
}
