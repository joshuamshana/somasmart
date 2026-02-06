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

  async function submit(lessonId: string) {
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

  const statusCounts = useMemo(() => {
    return lessons.reduce(
      (acc, lesson) => {
        acc[lesson.status] += 1;
        return acc;
      },
      {
        draft: 0,
        pending_approval: 0,
        approved: 0,
        rejected: 0,
        unpublished: 0
      } as Record<Lesson["status"], number>
    );
  }, [lessons]);

  const suggestedAction =
    statusCounts.rejected > 0 || statusCounts.unpublished > 0
      ? "Address rejected or unpublished lessons first to restore student access."
      : statusCounts.draft > 0
        ? "Submit your drafts for approval so students can see them."
        : "Create a new lesson to keep your catalog fresh.";

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

      <Card title="Suggested next step">
        <div className="text-sm text-muted">{suggestedAction}</div>
      </Card>

      <Toolbar
        left={
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
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
            <div className="md:col-span-2">
              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant={statusFilter === "all" ? "primary" : "secondary"} onClick={() => setStatusFilter("all")}>
                  All ({lessons.length})
                </Button>
                <Button
                  variant={statusFilter === "draft" ? "primary" : "secondary"}
                  onClick={() => setStatusFilter("draft")}
                >
                  Draft ({statusCounts.draft})
                </Button>
                <Button
                  variant={statusFilter === "pending_approval" ? "primary" : "secondary"}
                  onClick={() => setStatusFilter("pending_approval")}
                >
                  Pending ({statusCounts.pending_approval})
                </Button>
                <Button
                  variant={statusFilter === "rejected" ? "primary" : "secondary"}
                  onClick={() => setStatusFilter("rejected")}
                >
                  Rejected ({statusCounts.rejected})
                </Button>
              </div>
            </div>
          </div>
        }
        right={`Showing ${filtered.length}`}
      />

      <div className="space-y-3 lg:hidden">
        {filtered.map((l) => (
          <Card key={l.id} title={l.title}>
            <div className="space-y-3">
              <div className="text-sm text-muted">
                {l.subject} • {l.level} • {l.language}
              </div>
              <div className="text-xs text-muted">Updated: {new Date(l.updatedAt).toLocaleString()}</div>
              <StatusPill value={l.status} />
              {l.adminFeedback ? (
                <div className="rounded border border-warning/30 bg-warning/10 p-2 text-xs text-warning">
                  Admin feedback: {l.adminFeedback}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Link to={`/teacher/lessons/${l.id}/edit`}>
                  <Button variant="secondary">Open</Button>
                </Link>
                {l.status === "draft" ? (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setConfirm({
                        title: "Submit lesson for approval?",
                        description: "This will send your draft to admin for review.",
                        confirmLabel: "Submit",
                        run: async () => submit(l.id)
                      })
                    }
                  >
                    Submit
                  </Button>
                ) : null}
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
            </div>
          </Card>
        ))}
        {filtered.length === 0 ? (
          <Card title="No lessons found">
            <div className="text-sm text-muted">Create your first lesson to start publishing offline content.</div>
          </Card>
        ) : null}
      </div>

      <div className="hidden lg:block">
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
                      {l.status === "draft" ? (
                        <Button
                          variant="secondary"
                          onClick={() =>
                            setConfirm({
                              title: "Submit lesson for approval?",
                              description: "This will send your draft to admin for review.",
                              confirmLabel: "Submit",
                              run: async () => submit(l.id)
                            })
                          }
                        >
                          Submit
                        </Button>
                      ) : null}
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
      </div>

      <Card title="Tip">
        <div className="text-sm text-muted">
          Use <span className="font-mono text-text">trial</span> in tags for free lessons.
        </div>
      </Card>
    </div>
  );
}
