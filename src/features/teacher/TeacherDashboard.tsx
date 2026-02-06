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
import { computeLessonStatusStats } from "@/features/teacher/lessonStatusStats";
import {
  buildNeedsAttentionLessons,
  buildUnreadNotifications,
  computeTeacherEngagementMetrics
} from "@/features/teacher/teacherDashboardMetrics";

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
      const myNotifs = buildUnreadNotifications((await db.notifications.toArray()).filter((n) => n.userId === user.id));

      const progress = (await db.progress.toArray()) as Progress[];
      const quizzes = (await db.quizzes.toArray()) as Quiz[];
      const attempts = (await db.quizAttempts.toArray()) as QuizAttempt[];
      const { views, completions, avgScore, lastActivityAt } = computeTeacherEngagementMetrics({
        lessons: mine,
        progressRows: progress,
        quizzes,
        attempts
      });

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
    return computeLessonStatusStats({ lessons });
  }, [lessons]);

  const needsAttention = useMemo(() => {
    return buildNeedsAttentionLessons(lessons);
  }, [lessons]);

  const suggestedAction = useMemo(() => {
    if (needsAttention.length > 0) {
      return {
        title: "Review rejected lessons first",
        detail: "Address admin feedback and resubmit to move lessons back into review.",
        to: "/teacher/lessons",
        cta: "Open lessons"
      };
    }
    if (stats.draft > 0) {
      return {
        title: "Submit your draft lessons",
        detail: "Drafts are not visible to learners until you submit for approval.",
        to: "/teacher/lessons",
        cta: "Review drafts"
      };
    }
    return {
      title: "Create your next lesson",
      detail: "Use templates in the lesson creator to publish faster with consistent structure.",
      to: "/teacher/lessons/new",
      cta: "Start lesson"
    };
  }, [needsAttention.length, stats.draft]);

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

      <Card title="Suggested next step">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-text">{suggestedAction.title}</div>
            <div className="mt-1 text-sm text-muted">{suggestedAction.detail}</div>
          </div>
          <Link to={suggestedAction.to}>
            <Button>{suggestedAction.cta}</Button>
          </Link>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Card title="Total">
          <div className="text-2xl font-semibold">{stats.total}</div>
          <div className="mt-1 text-xs text-muted">{stats.recent7d.total} updated last 7d</div>
        </Card>
        <Card title="Draft">
          <div className="text-2xl font-semibold">{stats.draft}</div>
          <div className="mt-1 text-xs text-muted">{stats.recent7d.draft} updated last 7d</div>
        </Card>
        <Card title="Pending">
          <div className="text-2xl font-semibold">{stats.pending}</div>
          <div className="mt-1 text-xs text-muted">{stats.recent7d.pending} updated last 7d</div>
        </Card>
        <Card title="Approved">
          <div className="text-2xl font-semibold">{stats.approved}</div>
          <div className="mt-1 text-xs text-muted">{stats.recent7d.approved} updated last 7d</div>
        </Card>
        <Card title="Rejected">
          <div className="text-2xl font-semibold">{stats.rejected}</div>
          <div className="mt-1 text-xs text-muted">{stats.recent7d.rejected} updated last 7d</div>
        </Card>
        <Card title="Unpublished">
          <div className="text-2xl font-semibold">{stats.unpublished}</div>
          <div className="mt-1 text-xs text-muted">{stats.recent7d.unpublished} updated last 7d</div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-5">
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
        </div>

        <div className="xl:col-span-3">
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
                <div className="font-semibold text-text text-right">
                  {metrics.lastActivityAt ? new Date(metrics.lastActivityAt).toLocaleString() : "—"}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="xl:col-span-4">
          <Card title={`Notifications (${notifications.length})`}>
            {notifications.length === 0 ? (
              <div className="text-sm text-muted">No unread notifications.</div>
            ) : (
              <div className="max-h-[360px] space-y-3 overflow-auto pr-1">
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
      </div>

      <Card title="Sync status">
        <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
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
