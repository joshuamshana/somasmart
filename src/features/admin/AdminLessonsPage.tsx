import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { Lesson, User } from "@/shared/types";
import { db } from "@/shared/db/db";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { PageHeader } from "@/shared/ui/PageHeader";
import { DataTable } from "@/shared/ui/DataTable";
import { Toolbar } from "@/shared/ui/Toolbar";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { StatusPill } from "@/shared/ui/StatusPill";
import { ResponsiveCollection } from "@/shared/ui/ResponsiveCollection";

export function AdminLessonsPage() {
  const location = useLocation();
  const search = location.search ?? "";

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [teachersById, setTeachersById] = useState<Record<string, User>>({});
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<Lesson["status"] | "all">("all");

  async function refresh() {
    const allLessons = await db.lessons.toArray();
    setLessons(allLessons.filter((lesson) => !lesson.deletedAt).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));

    const users = await db.users.toArray();
    const map: Record<string, User> = {};
    users
      .filter((user) => !user.deletedAt)
      .forEach((user) => {
        map[user.id] = user;
      });
    setTeachersById(map);
  }

  useEffect(() => {
    void refresh();
  }, []);

  const statusCounts = useMemo(
    () =>
      lessons.reduce(
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
      ),
    [lessons]
  );

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return lessons.filter((lesson) => {
      if (statusFilter !== "all" && lesson.status !== statusFilter) return false;
      if (!query) return true;
      const teacherName = teachersById[lesson.createdByUserId]?.displayName ?? "";
      return (
        lesson.title.toLowerCase().includes(query) ||
        lesson.subject.toLowerCase().includes(query) ||
        lesson.level.toLowerCase().includes(query) ||
        teacherName.toLowerCase().includes(query)
      );
    });
  }, [lessons, q, statusFilter, teachersById]);

  const suggestedAction =
    statusCounts.pending_approval > 0
      ? `Review ${statusCounts.pending_approval} pending lesson${statusCounts.pending_approval > 1 ? "s" : ""} first.`
      : statusCounts.rejected > 0 || statusCounts.unpublished > 0
        ? "Check rejected or unpublished lessons and decide on next governance action."
        : "All lessons are stable. Use table filters to inspect versions and quality.";

  return (
    <div className="section-rhythm">
      <PageHeader
        title="Lessons"
        description="Use the queue to open each lesson in a dedicated review screen for preview and approval decisions."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" tone="neutral" onClick={() => void refresh()}>
              Refresh
            </Button>
            <Link to="/sync">
              <Button variant="secondary" tone="neutral">
                Sync
              </Button>
            </Link>
          </div>
        }
      />

      <Card title="Review queue" paper="secondary">
        <div className="text-sm text-text-subtle">{suggestedAction}</div>
      </Card>

      <Toolbar
        left={
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Search lessons" value={q} onChange={(e) => setQ(e.target.value)} />
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as Lesson["status"] | "all")}
            >
              <option value="all">All</option>
              <option value="pending_approval">Pending approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="unpublished">Unpublished</option>
              <option value="draft">Draft</option>
            </Select>
            <div className="md:col-span-2">
              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant={statusFilter === "all" ? "primary" : "secondary"} onClick={() => setStatusFilter("all")}>
                  All ({lessons.length})
                </Button>
                <Button
                  variant={statusFilter === "pending_approval" ? "primary" : "secondary"}
                  onClick={() => setStatusFilter("pending_approval")}
                >
                  Pending ({statusCounts.pending_approval})
                </Button>
                <Button
                  variant={statusFilter === "approved" ? "primary" : "secondary"}
                  onClick={() => setStatusFilter("approved")}
                >
                  Approved ({statusCounts.approved})
                </Button>
                <Button
                  variant={statusFilter === "rejected" ? "primary" : "secondary"}
                  onClick={() => setStatusFilter("rejected")}
                >
                  Rejected ({statusCounts.rejected})
                </Button>
                <Button
                  variant={statusFilter === "unpublished" ? "primary" : "secondary"}
                  onClick={() => setStatusFilter("unpublished")}
                >
                  Unpublished ({statusCounts.unpublished})
                </Button>
              </div>
            </div>
          </div>
        }
        right={`Showing ${filtered.length}`}
      />

      <div className="lg:hidden">
        <ResponsiveCollection
          ariaLabel="Admin lessons"
          viewMode="list"
          items={filtered}
          getKey={(lesson) => lesson.id}
          columns={[
            {
              key: "title",
              header: "Title",
              render: (lesson) => lesson.title
            }
          ]}
          renderListItem={(lesson) => (
            <>
              <div className="text-sm font-semibold text-text-title">{lesson.title}</div>
              <div className="text-xs text-text-subtle">{teachersById[lesson.createdByUserId]?.displayName ?? "Unknown"}</div>
              <div className="text-xs text-text-subtle">
                {lesson.subject} • {lesson.level} • {lesson.className ?? "-"}
              </div>
              <div className="flex items-center gap-2">
                <StatusPill value={lesson.status.replaceAll("_", " ")} />
                <span className="text-xs text-text-subtle">{new Date(lesson.updatedAt).toLocaleDateString()}</span>
              </div>
              {lesson.adminFeedback ? (
                <div className="rounded border border-status-warning-border bg-status-warning-bg p-2 text-xs text-status-warning">
                  Admin feedback: {lesson.adminFeedback}
                </div>
              ) : null}
              <Link to={`/admin/lessons/${lesson.id}/review${search}`}>
                <Button data-testid={`lesson-item-mobile-${lesson.id}`} variant="primary">
                  Open review
                </Button>
              </Link>
            </>
          )}
          emptyTitle="No lessons found"
          emptyDescription="No lessons match the selected filters."
        />
      </div>

      <div className="hidden lg:block">
        <DataTable
          columns={
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Teacher</th>
              <th className="px-4 py-3">Curriculum</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          }
          rows={
            <>
              {filtered.map((lesson) => (
                <tr key={lesson.id} className="border-t border-border-subtle">
                  <td className="px-4 py-3">
                    <div className="text-sm font-semibold text-text-title">{lesson.title}</div>
                    {lesson.adminFeedback ? (
                      <div className="mt-2 rounded border border-status-warning-border bg-status-warning-bg p-2 text-xs text-status-warning">
                        Admin feedback: {lesson.adminFeedback}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-body">
                    {teachersById[lesson.createdByUserId]?.displayName ?? "Unknown"}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-subtle">
                    {lesson.subject} • {lesson.level} • {lesson.className ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill value={lesson.status.replaceAll("_", " ")} />
                  </td>
                  <td className="px-4 py-3 text-xs text-text-subtle">{new Date(lesson.updatedAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <Link to={`/admin/lessons/${lesson.id}/review${search}`}>
                      <Button
                        data-testid={`lesson-item-${lesson.id}`}
                        variant={lesson.status === "pending_approval" ? "primary" : "secondary"}
                      >
                        Open review
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </>
          }
          emptyTitle="No lessons found"
          emptyDescription="No lessons match the selected filters."
        />
      </div>
    </div>
  );
}
