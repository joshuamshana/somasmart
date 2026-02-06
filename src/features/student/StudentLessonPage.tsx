import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import type { Lesson, LessonBlock, Quiz } from "@/shared/types";
import { db } from "@/shared/db/db";
import { Card } from "@/shared/ui/Card";
import { LessonPlayer } from "@/features/content/LessonPlayer";
import { useAuth } from "@/features/auth/authContext";
import { canAccessLesson } from "@/shared/access/accessEngine";
import { QuizRunner } from "@/features/student/QuizRunner";
import { touchProgress } from "@/shared/db/progressRepo";
import { getSubjectAccessDefaultsByCurriculumSubjectId } from "@/shared/db/accessDefaultsRepo";
import { Button } from "@/shared/ui/Button";

export function StudentLessonPage() {
  const { lessonId } = useParams();
  const location = useLocation();
  const search = location.search ?? "";
  const { user } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [blocks, setBlocks] = useState<LessonBlock[]>([]);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [grants, setGrants] = useState<import("@/shared/types").LicenseGrant[]>([]);
  const [startedAt] = useState(() => Date.now());
  const [subjectDefaults, setSubjectDefaults] = useState<Record<string, import("@/shared/types").AccessPolicy>>({});
  const [unlockHint, setUnlockHint] = useState<string | null>(null);

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
      const map = await getSubjectAccessDefaultsByCurriculumSubjectId();
      if (cancelled) return;
      setSubjectDefaults(map);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
    let cancelled = false;
    (async () => {
      if (!lesson) {
        if (!cancelled) setUnlockHint(null);
        return;
      }
      const parts: string[] = [];
      if (lesson.curriculumLevelId) {
        const lvl = await db.curriculumLevels.get(lesson.curriculumLevelId);
        if (lvl?.name) parts.push(lvl.name);
      }
      if (lesson.curriculumClassId) {
        const cls = await db.curriculumClasses.get(lesson.curriculumClassId);
        if (cls?.name) parts.push(cls.name);
      }
      if (lesson.curriculumSubjectId) {
        const sub = await db.curriculumSubjects.get(lesson.curriculumSubjectId);
        if (sub?.name) parts.push(sub.name);
      }
      const hint = parts.length ? parts.join(" / ") : null;
      if (cancelled) return;
      setUnlockHint(hint);
    })();
    return () => {
      cancelled = true;
    };
  }, [lesson]);

  useEffect(() => {
    return () => {
      if (!user || !lessonId) return;
      const elapsed = Math.round((Date.now() - startedAt) / 1000);
      void touchProgress({ studentId: user.id, lessonId, additionalTimeSec: elapsed });
    };
  }, [lessonId, startedAt, user]);

  const access = useMemo(() => {
    if (!lesson) return null;
    return canAccessLesson({ lesson, grants, subjectDefaultsByCurriculumSubjectId: subjectDefaults });
  }, [lesson, grants, subjectDefaults]);

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
        {unlockHint ? (
          <div className="mt-2 text-xs text-slate-400">
            Redeem a code that unlocks: <span className="font-semibold text-slate-200">{unlockHint}</span>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <Link to={`/student/payments${search}`}>
            <Button>Redeem a code</Button>
          </Link>
          <Link to={`/student/lessons${search}`}>
            <Button variant="secondary">Back to lessons</Button>
          </Link>
        </div>

        <details className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-3">
          <summary className="cursor-pointer text-sm text-slate-200">How do I get a coupon?</summary>
          <div className="mt-3 space-y-2 text-sm text-slate-300">
            <div>
              <div className="font-semibold text-slate-200">Sponsored by school</div>
              <div className="text-slate-400">Ask your School Admin to grant access for this subject.</div>
            </div>
            <div>
              <div className="font-semibold text-slate-200">Buy / redeem voucher</div>
              <div className="text-slate-400">
                Get a voucher card or coupon code, then redeem it on the Payments page.
              </div>
            </div>
            <div>
              <div className="font-semibold text-slate-200">Ask teacher/admin</div>
              <div className="text-slate-400">
                Request a class coupon from your teacher, or contact support/admin for help.
              </div>
            </div>
          </div>
        </details>
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
