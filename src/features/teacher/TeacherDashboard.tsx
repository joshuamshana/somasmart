import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/authContext";
import { db } from "@/shared/db/db";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import type { Lesson, Notification, Progress, QuizAttempt, Quiz } from "@/shared/types";
import { StatusPill } from "@/shared/ui/StatusPill";
import { useSync } from "@/shared/sync/SyncContext";

export function TeacherDashboard() {
  const { user } = useAuth();
  const { lastSyncAt, queuedCount, failedCount, syncNow, status: syncStatus } = useSync();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [metrics, setMetrics] = useState<{
    views: number;
    completions: number;
    avgScore: number | null;
    lastActivityAt: string | null;
  }>({ views: 0, completions: 0, avgScore: null, lastActivityAt: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      const mine = (await db.lessons.toArray()).filter((l) => l.createdByUserId === user.id && !l.deletedAt);
      const myNotifs = (await db.notifications.toArray())
        .filter((n) => n.userId === user.id && !n.readAt)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5);

      const lessonIds = mine.map((l) => l.id);
      const progress = (await db.progress.toArray()).filter((p) => lessonIds.includes(p.lessonId)) as Progress[];

      const quizzes = (await db.quizzes.toArray()).filter((q) => lessonIds.includes(q.lessonId)) as Quiz[];
      const quizIds = quizzes.map((q) => q.id);
      const attempts = (await db.quizAttempts.toArray()).filter((a) => quizIds.includes(a.quizId)) as QuizAttempt[];

      const views = progress.length;
      const completions = progress.filter((p) => Boolean(p.completedAt)).length;
      const avgScore =
        attempts.length > 0 ? attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length : null;
      const lastActivityAt = progress.reduce<string | null>(
        (max, p) => (!max || p.lastSeenAt > max ? p.lastSeenAt : max),
        null
      );

      if (cancelled) return;
      setLessons(mine.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
      setNotifications(myNotifs);
      setMetrics({ views, completions, avgScore, lastActivityAt });
    })();
    return () => {
      cancelled = true;
    };
  }, [user, lastSyncAt]);

  if (!user) return null;

  const stats = useMemo(() => {
    const by = (s: Lesson["status"]) => lessons.filter((l) => l.status === s).length;
    return {
      total: lessons.length,
      draft: by("draft"),
      pending: by("pending_approval"),
      approved: by("approved"),
      rejected: by("rejected"),
      unpublished: by("unpublished")
    };
  }, [lessons]);

  const needsAttention = useMemo(() => {
    return lessons
      .filter((l) => l.status === "rejected" || l.status === "unpublished")
      .slice(0, 5);
  }, [lessons]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Teacher dashboard"
        description="Create lessons for your school and track engagement."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/teacher/lessons/new">
              <Button>Create lesson</Button>
            </Link>
            <Link to="/teacher/lessons">
              <Button variant="secondary">My lessons</Button>
            </Link>
            <Button variant="secondary" onClick={() => void syncNow()} disabled={syncStatus === "syncing"}>
              {syncStatus === "syncing" ? "Syncing…" : "Sync now"}
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-6">
        <Card title="Total">{stats.total}</Card>
        <Card title="Draft">{stats.draft}</Card>
        <Card title="Pending">{stats.pending}</Card>
        <Card title="Approved">{stats.approved}</Card>
        <Card title="Rejected">{stats.rejected}</Card>
        <Card title="Unpublished">{stats.unpublished}</Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Needs attention">
          {needsAttention.length === 0 ? (
            <div className="text-sm text-muted">No rejected or unpublished lessons.</div>
          ) : (
            <div className="space-y-3">
              {needsAttention.map((l) => (
                <div key={l.id} className="rounded-lg border border-border bg-surface2 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-text">{l.title}</div>
                      <div className="mt-1 text-xs text-muted">
                        <span className="font-mono">{l.level}</span> • {l.subject}
                      </div>
                      {l.adminFeedback ? (
                        <div className="mt-2 text-xs text-warning">Feedback: {l.adminFeedback}</div>
                      ) : null}
                    </div>
                    <StatusPill value={l.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link to={`/teacher/lessons/${l.id}/edit`}>
                      <Button variant="secondary">Open</Button>
                    </Link>
                    <Link to="/teacher/lessons">
                      <Button variant="secondary">All lessons</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Engagement summary">
          <div className="grid gap-3 text-sm">
            <div className="flex items-center justify-between">
              <div className="text-muted">Views</div>
              <div className="font-semibold text-text">{metrics.views}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-muted">Completions</div>
              <div className="font-semibold text-text">{metrics.completions}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-muted">Avg quiz score</div>
              <div className="font-semibold text-text">
                {metrics.avgScore === null ? "—" : `${Math.round(metrics.avgScore)}%`}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-muted">Last activity</div>
              <div className="font-semibold text-text">
                {metrics.lastActivityAt ? new Date(metrics.lastActivityAt).toLocaleString() : "—"}
              </div>
            </div>
          </div>
        </Card>

        <Card title="Notifications">
          {notifications.length === 0 ? (
            <div className="text-sm text-muted">No unread notifications.</div>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <div key={n.id} className="rounded-lg border border-border bg-surface2 p-3">
                  <div className="text-sm font-semibold text-text">{n.title}</div>
                  {n.body ? <div className="mt-1 text-sm text-muted">{n.body}</div> : null}
                  <div className="mt-2 text-xs text-muted">{new Date(n.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3">
            <Link to="/notifications">
              <Button variant="secondary">Open notifications</Button>
            </Link>
          </div>
        </Card>
      </div>

      <Card title="Sync status">
        <div className="grid gap-3 md:grid-cols-4 text-sm">
          <div>
            <div className="text-muted">Last sync</div>
            <div className="mt-1 font-semibold text-text">
              {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : "Never"}
            </div>
          </div>
          <div>
            <div className="text-muted">Queued</div>
            <div className="mt-1 font-semibold text-text">{queuedCount}</div>
          </div>
          <div>
            <div className="text-muted">Failed</div>
            <div className="mt-1 font-semibold text-text">{failedCount}</div>
          </div>
          <div className="self-end">
            <Link to="/sync">
              <Button variant="secondary">Open sync</Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
