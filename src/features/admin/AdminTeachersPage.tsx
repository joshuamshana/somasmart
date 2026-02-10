import React, { useEffect, useMemo, useState } from "react";
import type { User, UserStatus } from "@/shared/types";
import { db } from "@/shared/db/db";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import { enqueueOutboxEvent } from "@/shared/offline/outbox";
import { useAuth } from "@/features/auth/authContext";
import { logAudit } from "@/shared/audit/audit";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { Modal } from "@/shared/ui/Modal";
import { hashPassword } from "@/shared/security/password";
import { Select } from "@/shared/ui/Select";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Toolbar } from "@/shared/ui/Toolbar";
import { DataTable } from "@/shared/ui/DataTable";
import { StatusPill } from "@/shared/ui/StatusPill";
import { formatDateYmd } from "@/shared/format";
import { isDobInRangeForRole, isValidMobile, normalizeMobile } from "@/shared/kyc/kyc";

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

type BaseKycDraft = {
  mobile: string;
  country: string;
  region: string;
  street: string;
  dateOfBirth: string;
  gender: "" | "male" | "female" | "other" | "prefer_not_to_say";
};

function blankBaseKycDraft(): BaseKycDraft {
  return { mobile: "", country: "", region: "", street: "", dateOfBirth: "", gender: "" };
}

function validateBaseKycDraft(role: "teacher" | "admin" | "school_admin", input: BaseKycDraft) {
  if (!input.mobile.trim() || !isValidMobile(input.mobile)) return "Enter a valid mobile number.";
  if (!input.country.trim()) return "Enter country.";
  if (!input.region.trim()) return "Enter region.";
  if (!input.street.trim()) return "Enter street.";
  if (!input.dateOfBirth.trim()) return "Enter date of birth.";
  if (!isDobInRangeForRole(role, input.dateOfBirth.trim())) return "Must be at least 18 years old.";
  return null;
}

export function AdminTeachersPage() {
  const { user } = useAuth();
  const [teachers, setTeachers] = useState<User[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<UserStatus | "all">("all");
  const [confirm, setConfirm] = useState<null | {
    title: string;
    description?: string;
    confirmLabel: string;
    danger?: boolean;
    requireText?: string;
    run: () => Promise<void>;
  }>(null);

  const [createName, setCreateName] = useState("");
  const [createUsername, setCreateUsername] = useState("");
  const [createPassword, setCreatePassword] = useState("teacher123");
  const [createStatus, setCreateStatus] = useState<UserStatus>("pending");
  const [createKyc, setCreateKyc] = useState<BaseKycDraft>(() => blankBaseKycDraft());
  const [msgCreate, setMsgCreate] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editKyc, setEditKyc] = useState<BaseKycDraft>(() => blankBaseKycDraft());
  const [editError, setEditError] = useState<string | null>(null);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("teacher123");

  async function refresh() {
    const users = await db.users.toArray();
    setTeachers(
      users
        .filter((u) => u.role === "teacher" && !u.deletedAt)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    );
  }

  useEffect(() => {
    void refresh();
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return teachers.filter((t) => {
      if (filter !== "all" && t.status !== filter) return false;
      if (!qq) return true;
      return t.displayName.toLowerCase().includes(qq) || t.username.toLowerCase().includes(qq);
    });
  }, [teachers, q, filter]);

  async function updateStatus(userId: string, status: UserStatus) {
    const u = await db.users.get(userId);
    if (!u) return;
    await db.users.put({ ...u, status });
    await enqueueOutboxEvent({ type: "user_update", payload: { userId } });
    await enqueueOutboxEvent({
      type: status === "active" ? "teacher_approved" : "teacher_suspended",
      payload: { userId, status }
    });
    if (user) {
      const action =
        status === "active" ? (u.status === "suspended" ? "teacher_activate" : "teacher_approve") : "teacher_suspend";
      await logAudit({
        actorUserId: user.id,
        action,
        entityType: "user",
        entityId: userId,
        details: { nextStatus: status }
      });
    }
    await refresh();
  }

  async function remove(userId: string) {
    const u = await db.users.get(userId);
    if (!u) return;
    await db.users.put({ ...u, deletedAt: new Date().toISOString() });
    await enqueueOutboxEvent({ type: "user_delete", payload: { userId } });
    if (user) {
      await logAudit({
        actorUserId: user.id,
        action: "teacher_delete",
        entityType: "user",
        entityId: userId
      });
    }
    await refresh();
  }

  async function createTeacher() {
    setMsgCreate(null);
    const displayName = createName.trim();
    const username = createUsername.trim();
    if (!displayName) return setMsgCreate("Enter teacher name.");
    if (!username) return setMsgCreate("Enter username.");
    const createValidation = validateBaseKycDraft("teacher", createKyc);
    if (createValidation) return setMsgCreate(createValidation);
    const existing = (await db.users.toArray()).find((u) => !u.deletedAt && u.username.toLowerCase() === username.toLowerCase());
    if (existing) return setMsgCreate("Username already exists.");
    const row: User = {
      id: newId("user"),
      role: "teacher",
      status: createStatus,
      displayName,
      username,
      passwordHash: await hashPassword(createPassword),
      kyc: {
        mobile: normalizeMobile(createKyc.mobile),
        address: {
          country: createKyc.country.trim(),
          region: createKyc.region.trim(),
          street: createKyc.street.trim()
        },
        dateOfBirth: createKyc.dateOfBirth.trim(),
        gender: createKyc.gender || undefined,
        updatedAt: nowIso()
      },
      createdAt: nowIso()
    };
    await db.users.put(row);
    await enqueueOutboxEvent({ type: "user_register", payload: { userId: row.id } });
    if (user) {
      await logAudit({ actorUserId: user.id, action: "teacher_create", entityType: "user", entityId: row.id });
    }
    setCreateName("");
    setCreateUsername("");
    setCreateKyc(blankBaseKycDraft());
    setMsgCreate("Teacher created.");
    await refresh();
  }

  function openEdit(t: User) {
    setEditUserId(t.id);
    setEditName(t.displayName);
    setEditKyc({
      mobile: t.kyc?.mobile ?? "",
      country: t.kyc?.address.country ?? "",
      region: t.kyc?.address.region ?? "",
      street: t.kyc?.address.street ?? "",
      dateOfBirth: t.kyc?.dateOfBirth ?? "",
      gender: t.kyc?.gender ?? ""
    });
    setEditError(null);
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editUserId) return false;
    const row = await db.users.get(editUserId);
    if (!row) return false;
    const editValidation = validateBaseKycDraft("teacher", editKyc);
    if (editValidation) {
      setEditError(editValidation);
      return false;
    }
    setEditError(null);
    await db.users.put({
      ...row,
      displayName: editName.trim() || row.displayName,
      kyc: {
        mobile: normalizeMobile(editKyc.mobile),
        address: {
          country: editKyc.country.trim(),
          region: editKyc.region.trim(),
          street: editKyc.street.trim()
        },
        dateOfBirth: editKyc.dateOfBirth.trim(),
        gender: editKyc.gender || undefined,
        updatedAt: nowIso()
      }
    });
    await enqueueOutboxEvent({ type: "user_update", payload: { userId: editUserId } });
    if (user) {
      await logAudit({ actorUserId: user.id, action: "teacher_update", entityType: "user", entityId: editUserId });
    }
    await refresh();
    return true;
  }

  function openReset(t: User) {
    setResetUserId(t.id);
    setResetPassword("teacher123");
    setResetOpen(true);
  }

  async function doReset() {
    if (!resetUserId) return;
    const row = await db.users.get(resetUserId);
    if (!row) return;
    await db.users.put({ ...row, passwordHash: await hashPassword(resetPassword) });
    await enqueueOutboxEvent({ type: "user_update", payload: { userId: resetUserId } });
    if (user) {
      await logAudit({ actorUserId: user.id, action: "user_password_reset", entityType: "user", entityId: resetUserId });
    }
    await refresh();
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Teacher management" description="Approve, suspend, edit, and remove teacher accounts." />
      <Modal
        open={editOpen}
        title="Edit teacher"
        onClose={() => {
          setEditOpen(false);
          setEditUserId(null);
          setEditError(null);
        }}
      >
        <div className="space-y-3">
          <Input label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <Input label="Mobile" value={editKyc.mobile} onChange={(e) => setEditKyc((prev) => ({ ...prev, mobile: e.target.value }))} />
          <Input label="Country" value={editKyc.country} onChange={(e) => setEditKyc((prev) => ({ ...prev, country: e.target.value }))} />
          <Input label="Region" value={editKyc.region} onChange={(e) => setEditKyc((prev) => ({ ...prev, region: e.target.value }))} />
          <Input label="Street" value={editKyc.street} onChange={(e) => setEditKyc((prev) => ({ ...prev, street: e.target.value }))} />
          <Input
            label="Date of birth"
            type="date"
            value={editKyc.dateOfBirth}
            onChange={(e) => setEditKyc((prev) => ({ ...prev, dateOfBirth: e.target.value }))}
          />
          <Select
            label="Gender (optional)"
            value={editKyc.gender}
            onChange={(e) => setEditKyc((prev) => ({ ...prev, gender: e.target.value as BaseKycDraft["gender"] }))}
          >
            <option value="">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </Select>
          {editError ? <div className="rounded-md bg-status-danger-bg px-3 py-2 text-sm text-status-danger">{editError}</div> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const saved = await saveEdit();
                if (!saved) return;
                setEditOpen(false);
              }}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={resetOpen}
        title="Reset teacher password"
        onClose={() => {
          setResetOpen(false);
          setResetUserId(null);
        }}
      >
        <div className="space-y-3">
          <Input label="New temporary password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                await doReset();
                setResetOpen(false);
              }}
            >
              Reset password
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

      <Card title="Create teacher">
        <div className="grid gap-3 md:grid-cols-4">
          <Input label="Name" value={createName} onChange={(e) => setCreateName(e.target.value)} />
          <Input label="Username" value={createUsername} onChange={(e) => setCreateUsername(e.target.value)} />
          <Input label="Temp password" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} />
          <Select label="Status" value={createStatus} onChange={(e) => setCreateStatus(e.target.value as any)}>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </Select>
          <Input label="Mobile" value={createKyc.mobile} onChange={(e) => setCreateKyc((prev) => ({ ...prev, mobile: e.target.value }))} />
          <Input label="Country" value={createKyc.country} onChange={(e) => setCreateKyc((prev) => ({ ...prev, country: e.target.value }))} />
          <Input label="Region" value={createKyc.region} onChange={(e) => setCreateKyc((prev) => ({ ...prev, region: e.target.value }))} />
          <Input label="Street" value={createKyc.street} onChange={(e) => setCreateKyc((prev) => ({ ...prev, street: e.target.value }))} />
          <Input
            label="Date of birth"
            type="date"
            value={createKyc.dateOfBirth}
            onChange={(e) => setCreateKyc((prev) => ({ ...prev, dateOfBirth: e.target.value }))}
          />
          <Select
            label="Gender (optional)"
            value={createKyc.gender}
            onChange={(e) => setCreateKyc((prev) => ({ ...prev, gender: e.target.value as BaseKycDraft["gender"] }))}
          >
            <option value="">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </Select>
          <div className="md:col-span-4">
            <Button onClick={() => void createTeacher()}>Create</Button>
            {msgCreate ? <span className="ml-3 text-sm text-text">{msgCreate}</span> : null}
          </div>
        </div>
      </Card>
      <Toolbar
        left={
          <div className="grid gap-3 md:grid-cols-3">
            <Input label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
            <label className="block">
              <div className="mb-1 text-sm text-muted">Status</div>
              <select
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-brand"
                value={filter}
                onChange={(e) => setFilter(e.target.value as UserStatus | "all")}
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="active">Approved</option>
                <option value="suspended">Suspended</option>
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

      <DataTable
        emptyTitle="No teachers found"
        columns={
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Username</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Joined</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        }
        rows={
          <>
            {filtered.map((t) => (
              <tr key={t.id} data-testid={`teacher-row-${t.username}`} className="border-t border-border bg-surface">
                <td className="px-4 py-3">{t.displayName}</td>
                <td className="px-4 py-3 font-mono text-xs">{t.username}</td>
                <td className="px-4 py-3" data-testid="teacher-status">
                  <StatusPill value={t.status} />
                </td>
                <td className="px-4 py-3">{formatDateYmd(t.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" data-testid="teacher-edit" onClick={() => openEdit(t)}>
                      Edit
                    </Button>
                    <Button variant="secondary" data-testid="teacher-reset-password" onClick={() => openReset(t)}>
                      Reset password
                    </Button>
                    {t.status !== "active" ? (
                      <Button
                        variant="secondary"
                        data-testid="teacher-approve"
                        onClick={() =>
                          setConfirm({
                            title: "Approve teacher?",
                            description: `${t.displayName} will be able to upload lessons.`,
                            confirmLabel: "Approve",
                            run: async () => updateStatus(t.id, "active")
                          })
                        }
                      >
                        Approve
                      </Button>
                    ) : null}
                    {t.status !== "suspended" ? (
                      <Button
                        variant="secondary"
                        data-testid="teacher-suspend"
                        onClick={() =>
                          setConfirm({
                            title: "Suspend teacher?",
                            description: `${t.displayName} will be blocked from uploading lessons and logging in.`,
                            confirmLabel: "Suspend",
                            danger: true,
                            run: async () => updateStatus(t.id, "suspended")
                          })
                        }
                      >
                        Suspend
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        data-testid="teacher-activate"
                        onClick={() =>
                          setConfirm({
                            title: "Activate teacher?",
                            description: `${t.displayName} will regain access.`,
                            confirmLabel: "Activate",
                            run: async () => updateStatus(t.id, "active")
                          })
                        }
                      >
                        Activate
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      data-testid="teacher-delete"
                      onClick={() =>
                        setConfirm({
                          title: "Delete teacher?",
                          description: "This is irreversible. The teacher account will be removed from active lists.",
                          confirmLabel: "Delete",
                          danger: true,
                          requireText: "DELETE",
                          run: async () => remove(t.id)
                        })
                      }
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </>
        }
      />
    </div>
  );
}
