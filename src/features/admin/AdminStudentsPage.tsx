import React, { useEffect, useMemo, useState } from "react";
import type { School, User, UserStatus } from "@/shared/types";
import { db } from "@/shared/db/db";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import { useAuth } from "@/features/auth/authContext";
import { logAudit } from "@/shared/audit/audit";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { enqueueOutboxEvent } from "@/shared/offline/outbox";
import { Modal } from "@/shared/ui/Modal";
import { Select } from "@/shared/ui/Select";
import { hashPassword } from "@/shared/security/password";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Toolbar } from "@/shared/ui/Toolbar";
import { DataTable } from "@/shared/ui/DataTable";
import { StatusPill } from "@/shared/ui/StatusPill";
import { formatDateYmd } from "@/shared/format";

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function AdminStudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<User[]>([]);
  const [schoolsById, setSchoolsById] = useState<Record<string, School>>({});
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
  const [createPassword, setCreatePassword] = useState("student123");
  const [createSchoolId, setCreateSchoolId] = useState<string>("");
  const [createIsMinor, setCreateIsMinor] = useState(false);
  const [msgCreate, setMsgCreate] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSchoolId, setEditSchoolId] = useState<string>("");
  const [editIsMinor, setEditIsMinor] = useState(false);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("student123");

  async function refresh() {
    const users = await db.users.toArray();
    setStudents(
      users
        .filter((u) => u.role === "student" && !u.deletedAt)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    );
    const schools = await db.schools.toArray();
    const map: Record<string, School> = {};
    const active = schools.filter((s) => !s.deletedAt);
    active.forEach((s) => (map[s.id] = s));
    setSchoolsById(map);
    setSchools(active.sort((a, b) => a.name.localeCompare(b.name)));
    if (!createSchoolId && active.length) setCreateSchoolId(active[0].id);
  }

  useEffect(() => {
    void refresh();
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return students.filter((s) => {
      if (filter !== "all" && s.status !== filter) return false;
      if (!qq) return true;
      return s.displayName.toLowerCase().includes(qq) || s.username.toLowerCase().includes(qq);
    });
  }, [students, q, filter]);

  async function updateStatus(userId: string, status: UserStatus) {
    const u = await db.users.get(userId);
    if (!u) return;
    await db.users.put({ ...u, status });
    await enqueueOutboxEvent({ type: "user_update", payload: { userId } });
    if (user) {
      const action = status === "active" ? "student_activate" : "student_suspend";
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
    await db.users.put({ ...u, deletedAt: nowIso() });
    await enqueueOutboxEvent({ type: "user_delete", payload: { userId } });
    if (user) {
      await logAudit({
        actorUserId: user.id,
        action: "student_delete",
        entityType: "user",
        entityId: userId
      });
    }
    await refresh();
  }

  async function createStudent() {
    setMsgCreate(null);
    const displayName = createName.trim();
    const username = createUsername.trim();
    if (!displayName) return setMsgCreate("Enter student name.");
    if (!username) return setMsgCreate("Enter username.");
    const existing = (await db.users.toArray()).find((u) => !u.deletedAt && u.username.toLowerCase() === username.toLowerCase());
    if (existing) return setMsgCreate("Username already exists.");
    const row: User = {
      id: newId("user"),
      role: "student",
      status: "active",
      displayName,
      username,
      passwordHash: await hashPassword(createPassword),
      schoolId: createSchoolId || undefined,
      isMinor: createIsMinor || undefined,
      createdAt: nowIso()
    };
    await db.users.put(row);
    await enqueueOutboxEvent({ type: "user_register", payload: { userId: row.id } });
    if (user) {
      await logAudit({
        actorUserId: user.id,
        action: "student_create",
        entityType: "user",
        entityId: row.id
      });
    }
    setCreateName("");
    setCreateUsername("");
    setMsgCreate("Student created.");
    await refresh();
  }

  function openEdit(s: User) {
    setEditUserId(s.id);
    setEditName(s.displayName);
    setEditSchoolId(s.schoolId ?? "");
    setEditIsMinor(Boolean(s.isMinor));
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editUserId) return;
    const row = await db.users.get(editUserId);
    if (!row) return;
    await db.users.put({
      ...row,
      displayName: editName.trim() || row.displayName,
      schoolId: editSchoolId || undefined,
      isMinor: editIsMinor || undefined
    });
    await enqueueOutboxEvent({ type: "user_update", payload: { userId: editUserId } });
    if (user) {
      await logAudit({
        actorUserId: user.id,
        action: "student_update",
        entityType: "user",
        entityId: editUserId
      });
    }
    await refresh();
  }

  function openReset(s: User) {
    setResetUserId(s.id);
    setResetPassword("student123");
    setResetOpen(true);
  }

  async function doReset() {
    if (!resetUserId) return;
    const row = await db.users.get(resetUserId);
    if (!row) return;
    await db.users.put({ ...row, passwordHash: await hashPassword(resetPassword) });
    await enqueueOutboxEvent({ type: "user_update", payload: { userId: resetUserId } });
    if (user) {
      await logAudit({
        actorUserId: user.id,
        action: "user_password_reset",
        entityType: "user",
        entityId: resetUserId
      });
    }
    await refresh();
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Student management" description="Manage students: create, suspend, edit, and remove accounts." />
      <Modal
        open={editOpen}
        title="Edit student"
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
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" className="h-4 w-4" checked={editIsMinor} onChange={(e) => setEditIsMinor(e.target.checked)} />
            Student is a minor
          </label>
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
        title="Reset student password"
        onClose={() => {
          setResetOpen(false);
          setResetUserId(null);
        }}
      >
        <div className="space-y-3">
          <Input
            label="New temporary password"
            value={resetPassword}
            onChange={(e) => setResetPassword(e.target.value)}
          />
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

      <Card title="Create student">
        <div className="grid gap-3 md:grid-cols-3">
          <Input label="Name" value={createName} onChange={(e) => setCreateName(e.target.value)} />
          <Input label="Username" value={createUsername} onChange={(e) => setCreateUsername(e.target.value)} />
          <Input
            label="Temp password"
            value={createPassword}
            onChange={(e) => setCreatePassword(e.target.value)}
          />
          <Select label="School" value={createSchoolId} onChange={(e) => setCreateSchoolId(e.target.value)}>
            <option value="">None</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <label className="flex items-center gap-2 text-sm text-muted self-end">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={createIsMinor}
              onChange={(e) => setCreateIsMinor(e.target.checked)}
            />
            Minor
          </label>
          <div className="self-end">
            <Button onClick={() => void createStudent()}>Create</Button>
          </div>
        </div>
        {msgCreate ? <div className="mt-3 text-sm text-text">{msgCreate}</div> : null}
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
        emptyTitle="No students found"
        columns={
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Username</th>
            <th className="px-4 py-3">School</th>
            <th className="px-4 py-3">Minor</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Joined</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        }
        rows={
          <>
            {filtered.map((s) => (
              <tr key={s.id} data-testid={`student-row-${s.username}`} className="border-t border-border bg-surface">
                <td className="px-4 py-3">{s.displayName}</td>
                <td className="px-4 py-3 font-mono text-xs">{s.username}</td>
                <td className="px-4 py-3 text-muted">{s.schoolId ? schoolsById[s.schoolId]?.name ?? "Unknown" : "—"}</td>
                <td className="px-4 py-3">{s.isMinor ? "Yes" : "No"}</td>
                <td className="px-4 py-3" data-testid="student-status">
                  <StatusPill value={s.status} />
                </td>
                <td className="px-4 py-3">{formatDateYmd(s.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" data-testid="student-edit" onClick={() => openEdit(s)}>
                      Edit
                    </Button>
                    <Button variant="secondary" data-testid="student-reset-password" onClick={() => openReset(s)}>
                      Reset password
                    </Button>
                    {s.status !== "suspended" ? (
                      <Button
                        variant="secondary"
                        data-testid="student-suspend"
                        onClick={() =>
                          setConfirm({
                            title: "Suspend student?",
                            description: `${s.displayName} will not be able to log in.`,
                            confirmLabel: "Suspend",
                            danger: true,
                            run: async () => updateStatus(s.id, "suspended")
                          })
                        }
                      >
                        Suspend
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        data-testid="student-activate"
                        onClick={() =>
                          setConfirm({
                            title: "Activate student?",
                            description: `${s.displayName} will regain access.`,
                            confirmLabel: "Activate",
                            run: async () => updateStatus(s.id, "active")
                          })
                        }
                      >
                        Activate
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      data-testid="student-delete"
                      onClick={() =>
                        setConfirm({
                          title: "Delete student?",
                          description: "This is irreversible. The student account will be removed from active lists.",
                          confirmLabel: "Delete",
                          danger: true,
                          requireText: "DELETE",
                          run: async () => remove(s.id)
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
