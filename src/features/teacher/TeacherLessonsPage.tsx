import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Lesson } from "@/shared/types";
import { db } from "@/shared/db/db";
import { useAuth } from "@/features/auth/authContext";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { enqueueOutboxEvent } from "@/shared/offline/outbox";

export function TeacherLessonsPage() {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);

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

  return (
    <div className="space-y-4">
      <Card
        title="My Lessons"
        actions={
          <Link to="/teacher/lessons/new">
            <Button>Upload Lesson</Button>
          </Link>
        }
      >
        <div className="text-sm text-slate-300">
          Draft → Submit for approval → Admin approves → Students can learn offline.
        </div>
      </Card>
      <div className="grid gap-3">
        {lessons.map((l) => (
          <div key={l.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">{l.title}</div>
                <div className="mt-1 text-xs text-slate-400">
                  {l.subject} • {l.level} • {l.language}
                </div>
                {l.adminFeedback ? (
                  <div className="mt-2 rounded border border-amber-700 bg-amber-950 p-2 text-xs text-amber-200">
                    Admin feedback: {l.adminFeedback}
                  </div>
                ) : null}
                {l.status === "rejected" || l.status === "unpublished" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => void resubmit(l.id)}>
                      Resubmit
                    </Button>
                    <Button variant="danger" onClick={() => void remove(l.id)}>
                      Delete
                    </Button>
                  </div>
                ) : (
                  <div className="mt-3">
                    <Button variant="danger" onClick={() => void remove(l.id)}>
                      Delete
                    </Button>
                  </div>
                )}
              </div>
              <div className="rounded bg-slate-800 px-2 py-1 text-xs">{l.status}</div>
            </div>
          </div>
        ))}
        {lessons.length === 0 ? <div className="text-sm text-slate-400">No lessons yet.</div> : null}
      </div>
    </div>
  );
}
