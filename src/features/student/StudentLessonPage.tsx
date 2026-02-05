import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import type { Lesson, LessonBlock, Quiz } from "@/shared/types";
import { db } from "@/shared/db/db";
import { Card } from "@/shared/ui/Card";
import { LessonPlayer } from "@/features/content/LessonPlayer";
import { useAuth } from "@/features/auth/authContext";
import { canAccessLesson } from "@/shared/access/accessEngine";
import { QuizRunner } from "@/features/student/QuizRunner";
import { touchProgress } from "@/shared/db/progressRepo";

export function StudentLessonPage() {
  const { lessonId } = useParams();
  const { user } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [blocks, setBlocks] = useState<LessonBlock[]>([]);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [grants, setGrants] = useState<import("@/shared/types").LicenseGrant[]>([]);
  const [startedAt] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!lessonId) return;
      const l = await db.lessons.get(lessonId);
      const content = await db.lessonContents.get(lessonId);
      const q = (await db.quizzes.toArray()).find((qq) => qq.lessonId === lessonId) ?? null;
      if (cancelled) return;
      setLesson(l ?? null);
      setBlocks(content?.blocks ?? []);
      setQuiz(q);
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      const now = new Date().toISOString();
      const g = (await db.licenseGrants.toArray()).filter(
        (x) => x.studentId === user.id && !x.deletedAt && (!x.validUntil || x.validUntil > now)
      );
      if (cancelled) return;
      setGrants(g);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    return () => {
      if (!user || !lessonId) return;
      const elapsed = Math.round((Date.now() - startedAt) / 1000);
      void touchProgress({ studentId: user.id, lessonId, additionalTimeSec: elapsed });
    };
  }, [lessonId, startedAt, user]);

  const access = useMemo(() => {
    if (!lesson) return null;
    return canAccessLesson({ lesson, grants });
  }, [lesson, grants]);

  if (!lessonId) return <div>Missing lesson id.</div>;
  if (!lesson) return <div>Loading…</div>;
  if (!user) return null;
  const now = new Date().toISOString();
  if (lesson.deletedAt || lesson.status !== "approved" || (lesson.expiresAt && lesson.expiresAt <= now)) {
    return (
      <Card title="Lesson unavailable">
        <div className="text-sm text-slate-300">This lesson is not available.</div>
        <div className="mt-3">
          <Link className="text-sm text-sky-400 hover:underline" to="/student/lessons">
            Back to lessons
          </Link>
        </div>
      </Card>
    );
  }

  if (access && !access.allowed) {
    return (
      <Card title={lesson.title}>
        <div className="text-sm text-amber-200">{access.reason}</div>
        <div className="mt-3">
          <Link className="text-sm text-sky-400 hover:underline" to="/student/payments">
            Go to Payments / Unlock
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card title={lesson.title}>
        <div className="text-xs text-slate-400">
          {lesson.subject} • {lesson.level} • {lesson.language}
        </div>
        <div className="mt-3">
          <LessonPlayer blocks={blocks} />
        </div>
      </Card>
      {quiz ? (
        <Card title="Self Test Quiz">
          <QuizRunner
            quiz={quiz}
            studentId={user.id}
            onComplete={() => void touchProgress({ studentId: user.id, lessonId, markComplete: true })}
          />
        </Card>
      ) : (
        <Card title="Self Test Quiz">
          <div className="text-sm text-slate-300">No quiz for this lesson yet.</div>
        </Card>
      )}
    </div>
  );
}
