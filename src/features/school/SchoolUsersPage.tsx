import React, { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/features/auth/authContext";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { Button } from "@/shared/ui/Button";
import { db } from "@/shared/db/db";
import type { User, UserStatus } from "@/shared/types";
import { hashPassword } from "@/shared/security/password";
import { enqueueOutboxEvent } from "@/shared/offline/outbox";

const schema = z.object({
  role: z.enum(["student", "teacher"]),
  displayName: z.string().min(1, "Required"),
  username: z.string().min(3, "Min 3 characters"),
  password: z.string().min(6, "Min 6 characters")
});

type FormValues = z.infer<typeof schema>;

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function SchoolUsersPage() {
  const { user } = useAuth();
  const [all, setAll] = useState<User[]>([]);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: "student" }
  });

  async function refresh() {
    if (!user?.schoolId) return;
    const users = await db.users.toArray();
    setAll(users.filter((u) => u.schoolId === user.schoolId && (u.role === "student" || u.role === "teacher")));
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return all;
    return all.filter((u) => u.username.toLowerCase().includes(qq) || u.displayName.toLowerCase().includes(qq));
  }, [all, q]);

  async function updateStatus(userId: string, status: UserStatus) {
    const u = await db.users.get(userId);
    if (!u) return;
    // School admins can manage student status, but teacher lifecycle is managed by System Admin.
    if (u.role === "teacher") return;
    await db.users.put({ ...u, status });
    await enqueueOutboxEvent({ type: "user_update", payload: { userId } });
    await refresh();
  }

  if (!user?.schoolId) {
    return <Card title="School users">This account is not linked to a school.</Card>;
  }

  return (
    <div className="space-y-4">
      <Card title="Create user">
        <form
          className="grid gap-3 md:grid-cols-4"
          onSubmit={handleSubmit(async (values) => {
            setMsg(null);
            const existing = (await db.users.toArray()).find(
              (u) => u.username.toLowerCase() === values.username.trim().toLowerCase()
            );
            if (existing) {
              setMsg("Username already exists.");
              return;
            }
            const passwordHash = await hashPassword(values.password);
            const created: User = {
              id: newId("user"),
              role: values.role,
              status: values.role === "teacher" ? "pending" : "active",
              displayName: values.displayName.trim(),
              username: values.username.trim(),
              passwordHash,
              schoolId: user.schoolId,
              createdAt: nowIso()
            };
            await db.users.add(created);
            await enqueueOutboxEvent({ type: "user_register", payload: { userId: created.id } });
            if (created.role === "teacher") {
              await enqueueOutboxEvent({ type: "teacher_register", payload: { userId: created.id } });
            }
            await refresh();
            reset({ role: values.role, displayName: "", username: "", password: "" });
            setMsg(values.role === "teacher" ? "Teacher created (pending admin approval)." : "Student created.");
          })}
        >
          <Select label="Role" error={errors.role?.message} {...register("role")}>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </Select>
          <Input label="Full name" error={errors.displayName?.message} {...register("displayName")} />
          <Input label="Username" error={errors.username?.message} {...register("username")} />
          <Input label="Password" type="password" error={errors.password?.message} {...register("password")} />
          <div className="md:col-span-4 flex items-center gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create"}
            </Button>
            {msg ? <div className="text-sm text-text">{msg}</div> : null}
          </div>
        </form>
      </Card>

      <Card title="Users">
        <div className="mb-3">
          <Input label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="py-2">Name</th>
                <th className="py-2">Username</th>
                <th className="py-2">Role</th>
                <th className="py-2">Status</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="py-2">{u.displayName}</td>
                  <td className="py-2 font-mono text-xs">{u.username}</td>
                  <td className="py-2">{u.role}</td>
                  <td className="py-2">{u.status}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-2">
                      {u.role === "teacher" ? (
                        <div className="text-xs text-muted">Managed by System Admin</div>
                      ) : u.status !== "suspended" ? (
                          <Button variant="secondary" onClick={() => void updateStatus(u.id, "suspended")}>
                            Suspend
                          </Button>
                        ) : (
                          <Button variant="secondary" onClick={() => void updateStatus(u.id, "active")}>
                            Activate
                          </Button>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 ? <div className="text-sm text-muted">No users found.</div> : null}
        </div>
      </Card>
    </div>
  );
}
