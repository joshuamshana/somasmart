import React, { useEffect, useMemo, useState } from "react";
import type { School, User } from "@/shared/types";
import { db } from "@/shared/db/db";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import { useAuth } from "@/features/auth/authContext";
import { logAudit } from "@/shared/audit/audit";
import { hashPassword } from "@/shared/security/password";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { enqueueOutboxEvent } from "@/shared/offline/outbox";
import { PageHeader } from "@/shared/ui/PageHeader";
import { DataTable } from "@/shared/ui/DataTable";

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function generateSchoolCode() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let s = "SOMA";
  for (let i = 0; i < 4; i++) s += letters[Math.floor(Math.random() * letters.length)];
  return s;
}

export function AdminSchoolsPage() {
  const { user } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [q, setQ] = useState("");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [schoolAdmins, setSchoolAdmins] = useState<User[]>([]);
  const [minorsMessagingEnabled, setMinorsMessagingEnabled] = useState(false);
  const [confirm, setConfirm] = useState<null | {
    title: string;
    description?: string;
    confirmLabel: string;
    danger?: boolean;
    requireText?: string;
    run: () => Promise<void>;
  }>(null);

  const [name, setName] = useState("");
  const [code, setCode] = useState(generateSchoolCode());

  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [rosterUsers, setRosterUsers] = useState<User[]>([]);

  const [adminName, setAdminName] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("password123");
  const [msgCreate, setMsgCreate] = useState<string | null>(null);
  const [msgDetails, setMsgDetails] = useState<string | null>(null);

  async function refresh() {
    const all = await db.schools.toArray();
    setSchools(all.filter((s) => !s.deletedAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    const users = await db.users.toArray();
    setSchoolAdmins(users.filter((u) => u.role === "school_admin" && !u.deletedAt));
    setRosterUsers(
      users
        .filter((u) => !u.deletedAt && (u.role === "teacher" || u.role === "student"))
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
    );
  }

  useEffect(() => {
    void refresh();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return schools;
    return schools.filter((s) => s.name.toLowerCase().includes(needle) || s.code.toLowerCase().includes(needle));
  }, [q, schools]);

  const selected = useMemo(() => schools.find((s) => s.id === selectedSchoolId) ?? null, [schools, selectedSchoolId]);
  const adminsForSelected = useMemo(
    () => schoolAdmins.filter((u) => (selected ? u.schoolId === selected.id : false)),
    [schoolAdmins, selected]
  );
  const usersForSelected = useMemo(() => rosterUsers, [rosterUsers]);

  useEffect(() => {
    setMinorsMessagingEnabled(Boolean(selected?.messagingEnabledForMinors));
  }, [selected?.id, selected?.messagingEnabledForMinors]);

  useEffect(() => {
    setEditName(selected?.name ?? "");
    setEditCode(selected?.code ?? "");
  }, [selected?.id]);

  async function createSchool() {
    setMsgCreate(null);
    const n = name.trim();
    const c = code.trim().toUpperCase();
    if (!n) return setMsgCreate("Enter a school name.");
    if (!c) return setMsgCreate("Enter a school code.");
    const existing = (await db.schools.toArray()).find((s) => !s.deletedAt && s.code.toUpperCase() === c);
    if (existing) return setMsgCreate("School code already exists.");

    const school: School = {
      id: newId("school"),
      name: n,
      code: c,
      messagingEnabledForMinors: false,
      createdAt: nowIso()
    };
    await db.schools.add(school);
    await enqueueOutboxEvent({ type: "school_upsert", payload: { schoolId: school.id } });
    if (user) {
      await logAudit({
        actorUserId: user.id,
        action: "school_create",
        entityType: "school",
        entityId: school.id,
        details: { code: school.code }
      });
    }
    setName("");
    setCode(generateSchoolCode());
    await refresh();
    setSelectedSchoolId(school.id);
    setMsgCreate("School created.");
  }

  async function regenerateCode() {
    if (!selected) return;
    setMsgDetails(null);
    const next = generateSchoolCode();
    const existing = (await db.schools.toArray()).find((s) => !s.deletedAt && s.code.toUpperCase() === next);
    if (existing) return setMsgDetails("Please try again (generated duplicate code).");
    await db.schools.put({ ...selected, code: next });
    await enqueueOutboxEvent({ type: "school_upsert", payload: { schoolId: selected.id } });
    if (user) {
      await logAudit({
        actorUserId: user.id,
        action: "school_regenerate_code",
        entityType: "school",
        entityId: selected.id,
        details: { nextCode: next }
      });
    }
    await refresh();
    setSelectedSchoolId(selected.id);
    setMsgDetails("School code regenerated.");
  }

  async function toggleMinorsMessaging(next: boolean) {
    if (!selected) return;
    await db.schools.put({ ...selected, messagingEnabledForMinors: next });
    await enqueueOutboxEvent({ type: "school_upsert", payload: { schoolId: selected.id } });
    if (user) {
      await logAudit({
        actorUserId: user.id,
        action: "school_toggle_minors_messaging",
        entityType: "school",
        entityId: selected.id,
        details: { messagingEnabledForMinors: next }
      });
    }
    await refresh();
    setSelectedSchoolId(selected.id);
  }

  async function updateSchool() {
    if (!selected) return;
    setMsgDetails(null);
    const n = editName.trim();
    const c = editCode.trim().toUpperCase();
    if (!n) return setMsgDetails("Enter a school name.");
    if (!c) return setMsgDetails("Enter a school code.");
    const existing = (await db.schools.toArray()).find(
      (s) => !s.deletedAt && s.id !== selected.id && s.code.toUpperCase() === c
    );
    if (existing) return setMsgDetails("School code already exists.");
    await db.schools.put({ ...selected, name: n, code: c });
    await enqueueOutboxEvent({ type: "school_upsert", payload: { schoolId: selected.id } });
    if (user) {
      await logAudit({
        actorUserId: user.id,
        action: "school_update",
        entityType: "school",
        entityId: selected.id,
        details: { update: true, name: n, code: c }
      });
    }
    await refresh();
    setSelectedSchoolId(selected.id);
    setMsgDetails("School updated.");
  }

  async function deleteSchool() {
    if (!selected) return;
    setMsgDetails(null);
    await db.transaction("rw", [db.schools, db.users], async () => {
      await db.schools.put({ ...selected, deletedAt: nowIso() });
      const users = await db.users.toArray();
      for (const u of users) {
        if (u.schoolId === selected.id) await db.users.put({ ...u, schoolId: undefined });
      }
    });
    await enqueueOutboxEvent({ type: "school_upsert", payload: { schoolId: selected.id } });
    if (user) {
      await logAudit({
        actorUserId: user.id,
        action: "school_delete",
        entityType: "school",
        entityId: selected.id,
        details: { deleted: true }
      });
    }
    await refresh();
    setSelectedSchoolId(null);
    setMsgDetails("School deleted.");
  }

  async function moveUserToSchool(targetUserId: string, nextSchoolId?: string) {
    const u = await db.users.get(targetUserId);
    if (!u) return;
    await db.users.put({ ...u, schoolId: nextSchoolId });
    await enqueueOutboxEvent({ type: "user_update", payload: { userId: u.id } });
    if (user) {
      await logAudit({
        actorUserId: user.id,
        action: "user_move_school",
        entityType: "user",
        entityId: u.id,
        details: { schoolId: nextSchoolId ?? null }
      });
    }
    await refresh();
    if (selected) setSelectedSchoolId(selected.id);
  }

  async function createSchoolAdmin() {
    if (!selected) return;
    setMsgDetails(null);
    const displayName = adminName.trim();
    const username = adminUsername.trim();
    if (!displayName) return setMsgDetails("Enter school admin name.");
    if (!username) return setMsgDetails("Enter school admin username.");
    const existingUser = (await db.users.toArray()).find(
      (u) => !u.deletedAt && u.username.toLowerCase() === username.toLowerCase()
    );
    if (existingUser) return setMsgDetails("Username already exists.");

    const passwordHash = await hashPassword(adminPassword);
    const schoolAdmin: User = {
      id: newId("user"),
      role: "school_admin",
      status: "active",
      displayName,
      username,
      passwordHash,
      schoolId: selected.id,
      createdAt: nowIso()
    };
    await db.users.add(schoolAdmin);
    await enqueueOutboxEvent({ type: "user_register", payload: { userId: schoolAdmin.id } });
    if (user) {
      await logAudit({
        actorUserId: user.id,
        action: "school_admin_create",
        entityType: "user",
        entityId: schoolAdmin.id,
        details: { role: "school_admin", schoolId: selected.id }
      });
    }
    setAdminName("");
    setAdminUsername("");
    await refresh();
    setMsgDetails("School admin created.");
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
        title="Schools"
        description="Create schools, regenerate codes, and manage roster membership."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <Card title="Schools">
            <Input label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="mt-3 space-y-2">
              {filtered.map((s) => (
                <button
                  key={s.id}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                    selectedSchoolId === s.id
                      ? "border-brand bg-surface2"
                      : "border-border bg-surface hover:border-border/80"
                  }`}
                  onClick={() => setSelectedSchoolId(s.id)}
                >
                  <div className="font-semibold">{s.name}</div>
                  <div className="mt-1 text-xs text-muted">
                    Code: <span className="font-mono">{s.code}</span>
                  </div>
                </button>
              ))}
              {filtered.length === 0 ? <div className="text-sm text-muted">No schools.</div> : null}
            </div>
          </Card>

          <Card title="Create school">
            <div className="space-y-3">
              <Input label="School name" value={name} onChange={(e) => setName(e.target.value)} />
              <Input label="School code" value={code} onChange={(e) => setCode(e.target.value)} />
              <Button onClick={() => void createSchool()}>Create</Button>
              {msgCreate ? <div className="text-sm text-text">{msgCreate}</div> : null}
            </div>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Card title="School details">
            {!selected ? (
              <div className="text-sm text-muted">Select a school to manage.</div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-2 text-sm text-muted md:grid-cols-2">
                  <Input label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
                  <Input label="Code" value={editCode} onChange={(e) => setEditCode(e.target.value)} />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    data-testid="school-regenerate-code"
                    onClick={() =>
                      setConfirm({
                        title: "Regenerate school code?",
                        description: "Students and staff will need the new code to join this school.",
                        confirmLabel: "Regenerate",
                        danger: true,
                        run: async () => regenerateCode()
                      })
                    }
                  >
                    Regenerate code
                  </Button>
                  <Button variant="secondary" data-testid="school-save" onClick={() => void updateSchool()}>
                    Save changes
                  </Button>
                  <Button
                    variant="danger"
                    data-testid="school-delete"
                    onClick={() =>
                      setConfirm({
                        title: "Delete school?",
                        description: "This is irreversible. Users will be unassigned from this school.",
                        confirmLabel: "Delete school",
                        danger: true,
                        requireText: "DELETE",
                        run: deleteSchool
                      })
                    }
                  >
                    Delete school
                  </Button>
                </div>

                <label className="flex items-center gap-2 text-sm text-muted">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={minorsMessagingEnabled}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setConfirm({
                        title: "Change minors messaging setting?",
                        description: next
                          ? "Messaging will be enabled for minors in this school."
                          : "Messaging will be disabled for minors in this school.",
                        confirmLabel: next ? "Enable" : "Disable",
                        danger: !next,
                        run: async () => {
                          setMinorsMessagingEnabled(next);
                          await toggleMinorsMessaging(next);
                        }
                      });
                    }}
                  />
                  Enable messaging for minors (school-level)
                </label>

                <div className="border-t border-border pt-4">
                  <div className="text-sm font-semibold">School admins</div>
                  <div className="mt-2 space-y-1 text-sm text-muted">
                    {adminsForSelected.map((a) => (
                      <div key={a.id}>
                        {a.displayName} (<span className="font-mono text-xs">{a.username}</span>)
                      </div>
                    ))}
                    {adminsForSelected.length === 0 ? (
                      <div className="text-sm text-muted">No school admins yet.</div>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <Input label="Admin name" value={adminName} onChange={(e) => setAdminName(e.target.value)} />
                    <Input
                      label="Admin username"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                    />
                    <Input
                      label="Temp password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                    />
                  </div>
                  <div className="mt-3">
                    <Button variant="secondary" onClick={() => void createSchoolAdmin()}>
                      Create school admin
                    </Button>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <div className="text-sm font-semibold">Roster</div>
                  <div className="mt-2 text-sm text-muted">Move teachers/students into or out of this school.</div>
                  <div className="mt-3">
                    <DataTable
                      columns={
                        <tr>
                          <th className="px-3 py-2">User</th>
                          <th className="px-3 py-2">Role</th>
                          <th className="px-3 py-2">Move to</th>
                        </tr>
                      }
                      rows={usersForSelected.map((u) => (
                        <tr key={u.id} data-testid={`school-roster-row-${u.username}`} className="border-t border-border">
                          <td className="px-3 py-2">
                            {u.displayName}{" "}
                            <span className="font-mono text-xs text-muted">({u.username})</span>
                          </td>
                          <td className="px-3 py-2">{u.role}</td>
                          <td className="px-3 py-2">
                            <select
                              data-testid="school-roster-move"
                              className="w-full rounded-lg border border-border bg-surface px-2 py-1 text-sm text-text"
                              value={u.schoolId ?? ""}
                              onChange={(e) => {
                                const next = e.target.value || undefined;
                                const nextName = next ? schools.find((s) => s.id === next)?.name ?? "Unknown" : "None";
                                setConfirm({
                                  title: "Move user?",
                                  description: `${u.displayName} will be assigned to: ${nextName}`,
                                  confirmLabel: "Move",
                                  run: async () => moveUserToSchool(u.id, next)
                                });
                              }}
                            >
                              <option value="">None</option>
                              {schools.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                      emptyTitle="No users assigned"
                      emptyDescription="No teachers or students are assigned to this school yet."
                    />
                  </div>
                </div>

                {msgDetails ? <div className="text-sm text-text">{msgDetails}</div> : null}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
