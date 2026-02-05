import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Lesson } from "@/shared/types";
import { db } from "@/shared/db/db";
import { useAuth } from "@/features/auth/authContext";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { enqueueOutboxEvent } from "@/shared/offline/outbox";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Toolbar } from "@/shared/ui/Toolbar";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { DataTable } from "@/shared/ui/DataTable";
import { StatusPill } from "@/shared/ui/StatusPill";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";

export function TeacherLessonsPage() {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<Lesson["status"] | "all">("all");
  const [confirm, setConfirm] = useState<null | {
    title: string;
    description?: string;
    confirmLabel: string;
    danger?: boolean;
    run: () => Promise<void>;
  }>(null);

  async function refresh() {
    if (!user) return;
    const mine = (await db.lessons.toArray()).filter((l) => l.createdByUserId === user.id && !l.deletedAt);
    setLessons(mine.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user) return null;

  async function resubmit(lessonId: string) {
    const l = await db.lessons.get(lessonId);
    if (!l) return;
    await db.lessons.put({
      ...l,
      status: "pending_approval",
      adminFeedback: undefined,
      updatedAt: new Date().toISOString()
    });
    await enqueueOutboxEvent({ type: "lesson_submit", payload: { lessonId } });
    await refresh();
  }

  async function remove(lessonId: string) {
    const l = await db.lessons.get(lessonId);
    if (!l) return;
    await db.lessons.put({ ...l, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    await refresh();
  }

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return lessons.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (!qq) return true;
      return l.title.toLowerCase().includes(qq) || l.subject.toLowerCase().includes(qq);
    });
  }, [lessons, q, statusFilter]);

  return (
    <div className="space-y-4">
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title ?? ""}
        description={confirm?.description}
        confirmLabel={confirm?.confirmLabel ?? "Confirm"}
        danger={confirm?.danger}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          const run = confirm?.run;
          setConfirm(null);
          if (run) await run();
        }}
      />

      <PageHeader
        title="My lessons"
        description="Draft → Submit for approval → Admin approves → Students can learn offline."
        actions={
          <Link to="/teacher/lessons/new">
            <Button>Upload lesson</Button>
          </Link>
        }
      />

      <Toolbar
        left={
          <div className="grid gap-3 md:grid-cols-3">
            <Input label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
            <div>
              <Select
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as Lesson["status"] | "all")}
              >
                <option value="all">All</option>
                <option value="draft">Draft</option>
                <option value="pending_approval">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="unpublished">Unpublished</option>
              </Select>
            </div>
          </div>
        }
        right={`Showing ${filtered.length}`}
      />

      <DataTable
        columns={
          <tr>
            <th className="px-4 py-3">Title</th>
            <th className="px-4 py-3">Metadata</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        }
        rows={
          <>
            {filtered.map((l) => (
              <tr key={l.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <div className="text-sm font-semibold text-text">{l.title}</div>
                  {l.adminFeedback ? (
                    <div className="mt-2 rounded border border-warning/30 bg-warning/10 p-2 text-xs text-warning">
                      Admin feedback: {l.adminFeedback}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-sm text-muted">
                  <div>
                    {l.subject} • {l.level} • {l.language}
                  </div>
                  <div className="mt-1 text-xs">Updated: {new Date(l.updatedAt).toLocaleString()}</div>
                </td>
                <td className="px-4 py-3">
                  <StatusPill value={l.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/teacher/lessons/${l.id}/edit`}>
                      <Button variant="secondary">Open</Button>
                    </Link>
                    {l.status === "rejected" || l.status === "unpublished" ? (
                      <Button
                        variant="secondary"
                        onClick={() =>
                          setConfirm({
                            title: "Resubmit lesson?",
                            description: "This will send the latest draft to admin for review.",
                            confirmLabel: "Resubmit",
                            run: async () => resubmit(l.id)
                          })
                        }
                      >
                        Resubmit
                      </Button>
                    ) : null}
                    <Button
                      variant="danger"
                      onClick={() =>
                        setConfirm({
                          title: "Delete lesson?",
                          description: "This removes the lesson from your list (soft delete).",
                          confirmLabel: "Delete",
                          danger: true,
                          run: async () => remove(l.id)
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
        emptyTitle="No lessons found"
        emptyDescription="Create your first lesson to start publishing offline content."
      />

      <Card title="Tip">
        <div className="text-sm text-muted">
          Use <span className="font-mono text-text">trial</span> in tags for free lessons.
        </div>
      </Card>
    </div>
  );
}
