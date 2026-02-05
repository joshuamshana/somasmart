import React, { useEffect, useMemo, useState } from "react";
import type { School, User, UserStatus } from "@/shared/types";
import { db } from "@/shared/db/db";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { Button } from "@/shared/ui/Button";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { useAuth } from "@/features/auth/authContext";
import { logAudit } from "@/shared/audit/audit";
import { hashPassword } from "@/shared/security/password";
import { enqueueOutboxEvent } from "@/shared/offline/outbox";
import { Modal } from "@/shared/ui/Modal";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Toolbar } from "@/shared/ui/Toolbar";
import { DataTable } from "@/shared/ui/DataTable";

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function AdminSchoolAdminsPage() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<User[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
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
  const [createPassword, setCreatePassword] = useState("school123");
  const [createSchoolId, setCreateSchoolId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSchoolId, setEditSchoolId] = useState("");

  const [resetOpen, setResetOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("school123");

  async function refresh() {
    const users = await db.users.toArray();
    setAdmins(
      users
        .filter((u) => u.role === "school_admin" && !u.deletedAt)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    );
    const s = (await db.schools.toArray()).filter((x) => !x.deletedAt);
    setSchools(s.sort((a, b) => a.name.localeCompare(b.name)));
    if (!createSchoolId && s.length) setCreateSchoolId(s[0].id);
  }

  useEffect(() => {
    void refresh();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return admins.filter((a) => {
      if (filter !== "all" && a.status !== filter) return false;
      if (!needle) return true;
      return a.displayName.toLowerCase().includes(needle) || a.username.toLowerCase().includes(needle);
    });
  }, [admins, filter, q]);

  async function updateStatus(userId: string, status: UserStatus) {
    const row = await db.users.get(userId);
    if (!row) return;
    await db.users.put({ ...row, status });
    await enqueueOutboxEvent({ type: "user_update", payload: { userId } });
    if (user) {
      await logAudit({
        actorUserId: user.id,
        action: status === "active" ? "school_admin_activate" : "school_admin_suspend",
        entityType: "user",
        entityId: userId,
        details: { nextStatus: status }
      });
    }
    await refresh();
  }

  async function softDelete(userId: string) {
    const row = await db.users.get(userId);
    if (!row) return;
    await db.users.put({ ...row, deletedAt: nowIso(), status: "suspended" });
    await enqueueOutboxEvent({ type: "user_delete", payload: { userId } });
    if (user) {
      await logAudit({
        actorUserId: user.id,
        action: "school_admin_delete",
        entityType: "user",
        entityId: userId
      });
    }
    await refresh();
  }

  async function resetPassword(userId: string, tempPassword: string) {
    const row = await db.users.get(userId);
    if (!row) return;
    await db.users.put({ ...row, passwordHash: await hashPassword(tempPassword) });
    await enqueueOutboxEvent({ type: "user_update", payload: { userId } });
    if (user) {
      await logAudit({
        actorUserId: user.id,
        action: "user_password_reset",
        entityType: "user",
        entityId: userId,
        details: { resetPassword: true }
      });
    }
    await refresh();
  }

  async function create() {
    setMsg(null);
    const displayName = createName.trim();
    const username = createUsername.trim();
    if (!displayName) return setMsg("Enter name.");
    if (!username) return setMsg("Enter username.");
    if (!createSchoolId) return setMsg("Select school.");
    const existing = (await db.users.toArray()).find((u) => !u.deletedAt && u.username.toLowerCase() === username.toLowerCase());
    if (existing) return setMsg("Username already exists.");
    const passwordHash = await hashPassword(createPassword);
    const row: User = {
      id: newId("user"),
      role: "school_admin",
      status: "active",
      displayName,
      username,
      passwordHash,
      schoolId: createSchoolId,
      createdAt: nowIso()
    };
    await db.users.put(row);
    await enqueueOutboxEvent({ type: "user_register", payload: { userId: row.id } });
    if (user) {
      await logAudit({
        actorUserId: user.id,
        action: "school_admin_create",
        entityType: "user",
        entityId: row.id,
        details: { schoolId: createSchoolId }
      });
    }
    setCreateName("");
    setCreateUsername("");
    setMsg("School admin created.");
    await refresh();
  }

  function openEdit(a: User) {
    setEditUserId(a.id);
    setEditName(a.displayName);
    setEditSchoolId(a.schoolId ?? "");
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editUserId) return;
    const row = await db.users.get(editUserId);
    if (!row) return;
    await db.users.put({
      ...row,
      displayName: editName.trim() || row.displayName,
      schoolId: editSchoolId || undefined
    });
    await enqueueOutboxEvent({ type: "user_update", payload: { userId: editUserId } });
    if (user) {
      await logAudit({
        actorUserId: user.id,
        action: "school_admin_update",
        entityType: "user",
        entityId: editUserId
      });
    }
    await refresh();
  }

  function openReset(a: User) {
    setResetUserId(a.id);
    setResetPasswordValue("school123");
    setResetOpen(true);
  }

  return (
    <div className="space-y-4">
      <Modal
        open={editOpen}
        title="Edit school admin"
        onClose={() => {
          setEditOpen(false);
          setEditUserId(null);
        }}
      >
        <div className="space-y-3">
          <Input label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <Select label="School" value={editSchoolId} onChange={(e) => setEditSchoolId(e.target.value)}>
            <option value="">None</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
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

      <Modal
        open={resetOpen}
        title="Reset school admin password"
        onClose={() => {
          setResetOpen(false);
          setResetUserId(null);
        }}
      >
        <div className="space-y-3">
          <Input
            label="New temporary password"
            value={resetPasswordValue}
            onChange={(e) => setResetPasswordValue(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                if (resetUserId) await resetPassword(resetUserId, resetPasswordValue);
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

      <PageHeader
        title="School admins"
        description="Create and manage school administrator accounts."
      />

      <Card title="Create school admin">
        <div className="grid gap-3 md:grid-cols-4">
          <Input label="Name" value={createName} onChange={(e) => setCreateName(e.target.value)} />
          <Input label="Username" value={createUsername} onChange={(e) => setCreateUsername(e.target.value)} />
          <Input label="Temp password" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} />
          <Select label="School" value={createSchoolId} onChange={(e) => setCreateSchoolId(e.target.value)}>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="mt-3">
          <Button onClick={() => void create()}>Create</Button>
          {msg ? <span className="ml-3 text-sm text-text">{msg}</span> : null}
        </div>
      </Card>

      <Toolbar
        left={
          <div className="grid gap-3 md:grid-cols-3">
            <Input label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
            <label className="block">
              <div className="mb-1 text-sm text-muted">Status</div>
              <select
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="pending">Pending</option>
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
        columns={
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Username</th>
            <th className="px-4 py-3">School</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        }
        rows={filtered.map((a) => (
          <tr key={a.id} data-testid={`school-admin-row-${a.username}`} className="border-t border-border">
            <td className="px-4 py-3">{a.displayName}</td>
            <td className="px-4 py-3 font-mono text-xs">{a.username}</td>
            <td className="px-4 py-3 text-muted">
              {a.schoolId ? schools.find((s) => s.id === a.schoolId)?.name ?? "Unknown" : "—"}
            </td>
            <td className="px-4 py-3">{a.status}</td>
            <td className="px-4 py-3">
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" data-testid="school-admin-edit" onClick={() => openEdit(a)}>
                  Edit
                </Button>
                {a.status !== "suspended" ? (
                  <Button
                    variant="secondary"
                    data-testid="school-admin-suspend"
                    onClick={() =>
                      setConfirm({
                        title: "Suspend school admin?",
                        description: `${a.displayName} will not be able to log in.`,
                        confirmLabel: "Suspend",
                        danger: true,
                        run: async () => updateStatus(a.id, "suspended")
                      })
                    }
                  >
                    Suspend
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    data-testid="school-admin-activate"
                    onClick={() =>
                      setConfirm({
                        title: "Activate school admin?",
                        description: `${a.displayName} will regain access.`,
                        confirmLabel: "Activate",
                        run: async () => updateStatus(a.id, "active")
                      })
                    }
                  >
                    Activate
                  </Button>
                )}
                <Button variant="secondary" data-testid="school-admin-reset-password" onClick={() => openReset(a)}>
                  Reset password
                </Button>
                <Button
                  variant="danger"
                  data-testid="school-admin-delete"
                  onClick={() =>
                    setConfirm({
                      title: "Delete school admin?",
                      description: "This is irreversible.",
                      confirmLabel: "Delete",
                      danger: true,
                      requireText: "DELETE",
                      run: async () => softDelete(a.id)
                    })
                  }
                >
                  Delete
                </Button>
              </div>
            </td>
          </tr>
        ))}
        emptyTitle="No school admins"
        emptyDescription="Create a new school admin above to get started."
      />
    </div>
  );
}
