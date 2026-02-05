import React, { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { Button } from "@/shared/ui/Button";
import { db } from "@/shared/db/db";
import type { Coupon, Level, LicenseScope } from "@/shared/types";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { Modal } from "@/shared/ui/Modal";
import { enqueueOutboxEvent } from "@/shared/offline/outbox";
import { DataTable } from "@/shared/ui/DataTable";
import { formatDateYmd } from "@/shared/format";

const schema = z.object({
  code: z.string().min(3),
  scopeType: z.enum(["full", "level", "subject"]),
  level: z.enum(["Preschool", "Primary", "Secondary", "Vocational"]).optional(),
  subject: z.string().optional(),
  daysValid: z.coerce.number().int().min(1).max(365),
  maxRedemptions: z.coerce.number().int().min(1).max(100000)
});

type FormValues = z.infer<typeof schema>;

function nowIso() {
  return new Date().toISOString();
}

function plusDays(days: number) {
  return new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();
}

export function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | {
    title: string;
    description?: string;
    confirmLabel: string;
    danger?: boolean;
    requireText?: string;
    run: () => Promise<void>;
  }>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editCode, setEditCode] = useState<string | null>(null);
  const [editScopeType, setEditScopeType] = useState<"full" | "level" | "subject">("full");
  const [editLevel, setEditLevel] = useState<Level>("Primary");
  const [editSubject, setEditSubject] = useState("");
  const [editValidFrom, setEditValidFrom] = useState("");
  const [editValidUntil, setEditValidUntil] = useState("");
  const [editMaxRedemptions, setEditMaxRedemptions] = useState("1");
  const [editActive, setEditActive] = useState(true);
  const [editMsg, setEditMsg] = useState<string | null>(null);

  const [bulkPrefix, setBulkPrefix] = useState("SOMA");
  const [bulkCount, setBulkCount] = useState(10);
  const [bulkDaysValid, setBulkDaysValid] = useState(30);
  const [bulkMaxRedemptions, setBulkMaxRedemptions] = useState(1);
  const [bulkScopeType, setBulkScopeType] = useState<"full" | "level" | "subject">("full");
  const [bulkLevel, setBulkLevel] = useState<Level>("Primary");
  const [bulkSubject, setBulkSubject] = useState("");
  const [bulkMsg, setBulkMsg] = useState<string | null>(null);

  const {
    register,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { scopeType: "full", daysValid: 30, maxRedemptions: 1000 }
  });

  const scopeType = watch("scopeType");

  async function refresh() {
    const rows = await db.coupons.toArray();
    setCoupons(rows.filter((c) => !c.deletedAt).sort((a, b) => b.validUntil.localeCompare(a.validUntil)));
  }

  useEffect(() => {
    void refresh();
  }, []);

  const scopeHint = useMemo(() => {
    if (scopeType === "full") return "Unlocks all content";
    if (scopeType === "level") return "Unlocks a level";
    return "Unlocks a subject";
  }, [scopeType]);

  async function deactivate(code: string) {
    const c = await db.coupons.get(code);
    if (!c) return;
    await db.coupons.put({ ...c, active: false });
    await enqueueOutboxEvent({ type: "coupon_upsert", payload: { code } });
    await refresh();
  }

  async function softDelete(code: string) {
    const c = await db.coupons.get(code);
    if (!c) return;
    await db.coupons.put({ ...c, deletedAt: nowIso(), active: false });
    await enqueueOutboxEvent({ type: "coupon_upsert", payload: { code } });
    await refresh();
  }

  function openEdit(c: Coupon) {
    setEditCode(c.code);
    setEditScopeType(c.scope.type);
    setEditLevel(c.scope.type === "level" ? c.scope.level : "Primary");
    setEditSubject(c.scope.type === "subject" ? c.scope.subject : "");
    setEditValidFrom(c.validFrom.slice(0, 10));
    setEditValidUntil(c.validUntil.slice(0, 10));
    setEditMaxRedemptions(String(c.maxRedemptions));
    setEditActive(Boolean(c.active));
    setEditMsg(null);
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editCode) return;
    setEditMsg(null);
    const c = await db.coupons.get(editCode);
    if (!c) return;
    const scope: LicenseScope =
      editScopeType === "full"
        ? { type: "full" }
        : editScopeType === "level"
          ? { type: "level", level: editLevel }
          : { type: "subject", subject: editSubject.trim() };
    if (scope.type === "subject" && !scope.subject) return setEditMsg("Enter subject.");
    const validFromIso = editValidFrom.trim()
      ? new Date(`${editValidFrom.trim()}T00:00:00.000Z`).toISOString()
      : c.validFrom;
    const validUntilIso = editValidUntil.trim()
      ? new Date(`${editValidUntil.trim()}T23:59:59.999Z`).toISOString()
      : c.validUntil;
    if (new Date(validUntilIso).getTime() <= new Date(validFromIso).getTime()) {
      return setEditMsg("Valid until must be after valid from.");
    }
    const max = Math.max(1, Math.min(100000, Number(editMaxRedemptions || "1")));
    await db.coupons.put({
      ...c,
      scope,
      validFrom: validFromIso,
      validUntil: validUntilIso,
      maxRedemptions: max,
      active: editActive
    });
    await enqueueOutboxEvent({ type: "coupon_upsert", payload: { code: c.code } });
    await refresh();
  }

  function downloadCsv(filename: string, rows: string[][]) {
    const body = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
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

  function randomCode(prefix: string) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let tail = "";
    for (let i = 0; i < 8; i++) tail += chars[Math.floor(Math.random() * chars.length)];
    return `${prefix}${tail}`.toUpperCase();
  }

  function buildBulkScope(): LicenseScope {
    if (bulkScopeType === "full") return { type: "full" };
    if (bulkScopeType === "level") return { type: "level", level: bulkLevel };
    return { type: "subject", subject: bulkSubject.trim() };
  }

  return (
    <div className="space-y-4">
      <Modal
        open={editOpen}
        title="Edit coupon/voucher"
        onClose={() => {
          setEditOpen(false);
          setEditCode(null);
        }}
      >
        <div className="space-y-3">
          <div className="text-xs text-muted">
            Code: <span className="font-mono text-text">{editCode}</span>
          </div>
          <Select label="Scope" value={editScopeType} onChange={(e) => setEditScopeType(e.target.value as any)}>
            <option value="full">Full access</option>
            <option value="level">Level</option>
            <option value="subject">Subject</option>
          </Select>
          {editScopeType === "level" ? (
            <Select label="Level" value={editLevel} onChange={(e) => setEditLevel(e.target.value as any)}>
              <option value="Preschool">Preschool</option>
              <option value="Primary">Primary</option>
              <option value="Secondary">Secondary</option>
              <option value="Vocational">Vocational</option>
            </Select>
          ) : editScopeType === "subject" ? (
            <Input label="Subject" value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Valid from (YYYY-MM-DD)" value={editValidFrom} onChange={(e) => setEditValidFrom(e.target.value)} />
            <Input label="Valid until (YYYY-MM-DD)" value={editValidUntil} onChange={(e) => setEditValidUntil(e.target.value)} />
          </div>
          <Input
            label="Max redemptions"
            value={editMaxRedemptions}
            onChange={(e) => setEditMaxRedemptions(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" className="h-4 w-4" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
            Active
          </label>
          {editMsg ? <div className="text-sm text-rose-400">{editMsg}</div> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                await saveEdit();
                setEditOpen(false);
              }}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>
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
      <Card title="Create coupon / voucher">
        <form
          className="grid gap-3 md:grid-cols-3"
          onSubmit={handleSubmit(async (values) => {
            setMsg(null);
            const code = values.code.trim().toUpperCase();
            const existing = await db.coupons.get(code);
            if (existing) {
              setMsg("Code already exists.");
              return;
            }
            let scope: LicenseScope = { type: "full" };
            if (values.scopeType === "level") scope = { type: "level", level: (values.level ?? "Primary") as Level };
            if (values.scopeType === "subject") scope = { type: "subject", subject: (values.subject ?? "").trim() };
            const coupon: Coupon = {
              code,
              scope,
              validFrom: nowIso(),
              validUntil: plusDays(values.daysValid),
              maxRedemptions: values.maxRedemptions,
              redeemedByStudentIds: [],
              active: true
            };
            await db.coupons.add(coupon);
            await enqueueOutboxEvent({ type: "coupon_upsert", payload: { code: coupon.code } });
            await refresh();
            reset({ scopeType: values.scopeType, daysValid: values.daysValid, maxRedemptions: values.maxRedemptions, code: "" });
            setMsg("Coupon created.");
          })}
        >
          <Input label="Code" error={errors.code?.message} {...register("code")} />
          <Select label="Scope" error={errors.scopeType?.message} {...register("scopeType")}>
            <option value="full">Full access</option>
            <option value="level">Level</option>
            <option value="subject">Subject</option>
          </Select>
          {scopeType === "level" ? (
            <Select label="Level" error={errors.level?.message} {...register("level")}>
              <option value="Preschool">Preschool</option>
              <option value="Primary">Primary</option>
              <option value="Secondary">Secondary</option>
              <option value="Vocational">Vocational</option>
            </Select>
          ) : scopeType === "subject" ? (
            <Input label="Subject" error={errors.subject?.message} {...register("subject")} />
          ) : (
            <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted">
              {scopeHint}
            </div>
          )}
          <Input label="Valid days" error={errors.daysValid?.message} {...register("daysValid")} />
          <Input label="Max redemptions" error={errors.maxRedemptions?.message} {...register("maxRedemptions")} />
          <div className="self-end md:col-span-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create"}
            </Button>
            {msg ? <span className="ml-3 text-sm text-text">{msg}</span> : null}
          </div>
        </form>
      </Card>

      <Card title="Bulk generate">
        <div className="grid gap-3 md:grid-cols-4">
          <Input label="Prefix" value={bulkPrefix} onChange={(e) => setBulkPrefix(e.target.value)} />
          <Input
            label="Count"
            type="number"
            value={String(bulkCount)}
            onChange={(e) => setBulkCount(Number(e.target.value))}
          />
          <Input
            label="Valid days"
            type="number"
            value={String(bulkDaysValid)}
            onChange={(e) => setBulkDaysValid(Number(e.target.value))}
          />
          <Input
            label="Max redemptions per code"
            type="number"
            value={String(bulkMaxRedemptions)}
            onChange={(e) => setBulkMaxRedemptions(Number(e.target.value))}
          />
          <label className="block">
            <div className="mb-1 text-sm text-muted">Scope</div>
            <select
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-brand"
              value={bulkScopeType}
              onChange={(e) => setBulkScopeType(e.target.value as any)}
            >
              <option value="full">Full access</option>
              <option value="level">Level</option>
              <option value="subject">Subject</option>
            </select>
          </label>
          {bulkScopeType === "level" ? (
            <label className="block">
              <div className="mb-1 text-sm text-muted">Level</div>
              <select
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-brand"
                value={bulkLevel}
                onChange={(e) => setBulkLevel(e.target.value as Level)}
              >
                <option value="Preschool">Preschool</option>
                <option value="Primary">Primary</option>
                <option value="Secondary">Secondary</option>
                <option value="Vocational">Vocational</option>
              </select>
            </label>
          ) : bulkScopeType === "subject" ? (
            <Input label="Subject" value={bulkSubject} onChange={(e) => setBulkSubject(e.target.value)} />
          ) : (
            <div />
          )}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() =>
              setConfirm({
                title: "Generate bulk codes?",
                description: `This will create ${bulkCount} new active codes.`,
                confirmLabel: "Generate",
                run: async () => {
                  setBulkMsg(null);
                  const count = Math.max(1, Math.min(5000, Math.floor(bulkCount)));
                  const prefix = bulkPrefix.trim().toUpperCase() || "SOMA";
                  const scope = buildBulkScope();
                  if (scope.type === "subject" && !scope.subject) {
                    setBulkMsg("Enter subject for subject scope.");
                    return;
                  }
                  const existing = new Set((await db.coupons.toArray()).map((c) => c.code));
                  const batchId = `batch_${crypto.randomUUID()}`;
                  const created: Coupon[] = [];
                  let attempts = 0;
                  while (created.length < count && attempts < count * 10) {
                    attempts++;
                    const code = randomCode(prefix);
                    if (existing.has(code)) continue;
                    existing.add(code);
                    created.push({
                      code,
                      scope,
                      validFrom: nowIso(),
                      validUntil: plusDays(Math.max(1, Math.min(365, bulkDaysValid))),
                      maxRedemptions: Math.max(1, Math.min(100000, bulkMaxRedemptions)),
                      redeemedByStudentIds: [],
                      active: true,
                      batchId
                    });
                  }
                  await db.coupons.bulkAdd(created);
                  await enqueueOutboxEvent({
                    type: "coupons_bulk_upsert",
                    payload: { codes: created.map((c) => c.code) }
                  });
                  await refresh();
                  downloadCsv(
                    `somasmart-codes-${batchId}.csv`,
                    [["code", "scope", "validUntil", "maxRedemptions", "batchId"], ...created.map((c) => [c.code, formatScope(c.scope), c.validUntil, String(c.maxRedemptions), c.batchId ?? ""])]
                  );
                  setBulkMsg(`Generated ${created.length} codes (batch ${batchId}) and downloaded CSV.`);
                }
              })
            }
          >
            Generate + Download CSV
          </Button>
          {bulkMsg ? <span className="text-sm text-text">{bulkMsg}</span> : null}
        </div>
      </Card>

      <Card title="Coupons">
        <DataTable
          columns={
            <tr>
              <th className="py-2">Code</th>
              <th className="py-2">Scope</th>
              <th className="py-2">Valid until</th>
              <th className="py-2">Used</th>
              <th className="py-2">Status</th>
              <th className="py-2">Action</th>
            </tr>
          }
          rows={coupons.map((c) => (
            <tr key={c.code} data-testid={`coupon-row-${c.code}`} className="border-t border-border">
              <td className="py-2 font-mono text-xs">{c.code}</td>
              <td className="py-2">{formatScope(c.scope)}</td>
              <td className="py-2">{formatDateYmd(c.validUntil)}</td>
              <td className="py-2">
                {c.redeemedByStudentIds.length}/{c.maxRedemptions}
              </td>
              <td className="py-2">{c.active ? "active" : "inactive"}</td>
              <td className="py-2">
                <Button variant="secondary" data-testid="coupon-edit" onClick={() => openEdit(c)}>
                  Edit
                </Button>
                {c.active ? (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setConfirm({
                        title: "Deactivate code?",
                        description: "This code will no longer be redeemable.",
                        confirmLabel: "Deactivate",
                        danger: true,
                        run: async () => deactivate(c.code)
                      })
                    }
                  >
                    Deactivate
                  </Button>
                ) : null}
                <span className="ml-2">
                  <Button
                    variant="danger"
                    onClick={() =>
                      setConfirm({
                        title: "Delete code?",
                        description: "This is irreversible. The code will be removed from active lists.",
                        confirmLabel: "Delete",
                        danger: true,
                        requireText: "DELETE",
                        run: async () => softDelete(c.code)
                      })
                    }
                  >
                    Delete
                  </Button>
                </span>
              </td>
            </tr>
          ))}
          emptyTitle="No coupons yet"
          emptyDescription="Create a code above or bulk-generate a new batch."
        />
      </Card>
    </div>
  );
}

function formatScope(scope: LicenseScope) {
  if (scope.type === "full") return "full";
  if (scope.type === "level") return `level:${scope.level}`;
  return `subject:${scope.subject}`;
}
