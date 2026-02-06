import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import type { Lesson, LessonAsset, LessonBlockV2, Progress, Quiz, QuizAttempt } from "@/shared/types";
import { db } from "@/shared/db/db";
import { Card } from "@/shared/ui/Card";
import { useAuth } from "@/features/auth/authContext";
import { canAccessLesson } from "@/shared/access/accessEngine";
import { touchProgress } from "@/shared/db/progressRepo";
import { getSubjectAccessDefaultsByCurriculumSubjectId } from "@/shared/db/accessDefaultsRepo";
import { Button } from "@/shared/ui/Button";
import { buildLessonSteps } from "@/features/content/lessonSteps";
import { LessonStepperPlayer } from "@/features/content/LessonStepperPlayer";
import { getLessonStepProgressForLesson, upsertLessonStepProgress } from "@/shared/db/lessonStepProgressRepo";
import { isLessonComplete, nextIncompleteStepIndex } from "@/features/student/lessonProgressEngine";
import { getLessonBlocksV2 } from "@/shared/content/lessonContent";

export function StudentLessonPage() {
  const { lessonId } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const search = location.search ?? "";
  const { user } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [blocksV2, setBlocksV2] = useState<LessonBlockV2[]>([]);
  const [assetsById, setAssetsById] = useState<Record<string, LessonAsset | undefined>>({});
  const [quizzesById, setQuizzesById] = useState<Record<string, Quiz | undefined>>({});
  const [completedStepKeys, setCompletedStepKeys] = useState<Set<string>>(new Set());
  const [bestScoreByQuizId, setBestScoreByQuizId] = useState<Record<string, number | undefined>>({});
  const [grants, setGrants] = useState<import("@/shared/types").LicenseGrant[]>([]);
  const [startedAt] = useState(() => Date.now());
  const [subjectDefaults, setSubjectDefaults] = useState<Record<string, import("@/shared/types").AccessPolicy>>({});
  const [unlockHint, setUnlockHint] = useState<string | null>(null);
  const [progressRow, setProgressRow] = useState<Progress | null>(null);
  const [isReplayMode, setIsReplayMode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!lessonId) return;
      const l = await db.lessons.get(lessonId);
      const q = await db.quizzes.where("lessonId").equals(lessonId).toArray();
      const quizMap: Record<string, Quiz | undefined> = {};
      for (const quiz of q) quizMap[quiz.id] = quiz;
      const contentV2 = await getLessonBlocksV2({ lessonId, quizzesById: quizMap });
      if (cancelled) return;
      setLesson(l ?? null);
      setQuizzesById(quizMap);
      setBlocksV2(contentV2);
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ids = Array.from(
        new Set(
          blocksV2.flatMap((block) =>
            block.components
              .filter(
                (
                  component
                ): component is {
                  id: string;
                  type: "media";
                  mediaType: "image" | "audio" | "video" | "pdf" | "pptx";
                  assetId: string;
                  name: string;
                  mime: string;
                } => component.type === "media"
              )
              .map((component) => component.assetId)
          )
        )
      );
      if (ids.length === 0) {
        if (!cancelled) setAssetsById({});
        return;
      }
      const assets = await Promise.all(ids.map((id) => db.lessonAssets.get(id)));
      if (cancelled) return;
      const map: Record<string, LessonAsset | undefined> = {};
      for (let i = 0; i < ids.length; i++) map[ids[i]!] = (assets[i] ?? undefined) as LessonAsset | undefined;
      setAssetsById(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [blocksV2]);

  const steps = useMemo(() => buildLessonSteps({ blocksV2, assetsById, quizzesById }), [assetsById, blocksV2, quizzesById]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!lessonId || !user) return;

      const rows = await getLessonStepProgressForLesson({ studentId: user.id, lessonId });
      const completed = new Set(rows.map((r) => r.stepKey));

      const quizIds = Object.keys(quizzesById);
      const attemptsAll = await db.quizAttempts.where("studentId").equals(user.id).toArray();
      const attempts = attemptsAll.filter((a) => quizIds.includes(a.quizId));
      const best: Record<string, number | undefined> = {};
      for (const a of attempts) best[a.quizId] = Math.max(best[a.quizId] ?? -Infinity, a.score);

      if (cancelled) return;
      setCompletedStepKeys(completed);
      setBestScoreByQuizId(best);
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId, quizzesById, user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!lessonId || !user) return;
      const progress = (await db.progress.toArray()).find((p) => p.studentId === user.id && p.lessonId === lessonId) ?? null;
      if (cancelled) return;
      setProgressRow(progress);
      setIsReplayMode(!progress?.completedAt);
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId, user]);

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

  const initialStepIndex = useMemo(() => {
    if (!steps.length) return 0;
    if (isReplayMode && progressRow?.completedAt) return 0;
    return nextIncompleteStepIndex(steps, { completedStepKeys, bestScoreByQuizId });
  }, [bestScoreByQuizId, completedStepKeys, isReplayMode, progressRow?.completedAt, steps]);

  useEffect(() => {
    if (!user || !lessonId || !lesson) return;

    const now = new Date().toISOString();
    const available = !lesson.deletedAt && lesson.status === "approved" && (!lesson.expiresAt || lesson.expiresAt > now);
    if (!available) return;

    if (access && !access.allowed) return;
    if (!steps.length) return;

    const complete = isLessonComplete(steps, { completedStepKeys, bestScoreByQuizId });
    if (!complete) return;

    void touchProgress({ studentId: user.id, lessonId, markComplete: true });
  }, [access, bestScoreByQuizId, completedStepKeys, lesson, lessonId, steps, user]);

  if (!lessonId) return <div>Missing lesson id.</div>;
  if (!lesson) return <div>Loading…</div>;
  if (!user) return null;
  const studentId = user.id;
  const stableLessonId = lessonId as string;
  const now = new Date().toISOString();
  if (lesson.deletedAt || lesson.status !== "approved" || (lesson.expiresAt && lesson.expiresAt <= now)) {
    return (
      <Card title="Lesson unavailable">
        <div className="text-sm text-muted">This lesson is not available.</div>
        <div className="mt-3">
          <Link className="text-sm text-link hover:underline" to="/student/lessons">
            Back to lessons
          </Link>
        </div>
      </Card>
    );
  }

  if (access && !access.allowed) {
    return (
      <Card title={lesson.title}>
        <div className="text-sm text-warning-text">{access.reason}</div>
        {unlockHint ? (
          <div className="mt-2 text-xs text-muted">
            Redeem a code that unlocks: <span className="font-semibold text-text">{unlockHint}</span>
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

        <details className="mt-4 rounded-lg border border-border bg-surface p-3">
          <summary className="cursor-pointer text-sm text-text">How do I get a coupon?</summary>
          <div className="mt-3 space-y-2 text-sm text-muted">
            <div>
              <div className="font-semibold text-text">Sponsored by school</div>
              <div className="text-muted">Ask your School Admin to grant access for this subject.</div>
            </div>
            <div>
              <div className="font-semibold text-text">Buy / redeem voucher</div>
              <div className="text-muted">
                Get a voucher card or coupon code, then redeem it on the Payments page.
              </div>
            </div>
            <div>
              <div className="font-semibold text-text">Ask teacher/admin</div>
              <div className="text-muted">
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
        <div className="text-xs text-muted">
          {lesson.subject} • {lesson.level} • {lesson.language}
        </div>
        {progressRow?.completedAt && !isReplayMode ? (
          <div className="mt-3 rounded-lg border border-success-border bg-success-surface p-3">
            <div className="text-sm font-semibold text-success-text">Completed lesson</div>
            <div className="mt-1 text-xs text-success-text">
              Finished on {new Date(progressRow.completedAt).toLocaleString()}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => setIsReplayMode(true)}>Replay lesson</Button>
              <Link to={`/student/progress${search}`}>
                <Button variant="secondary">View progress</Button>
              </Link>
            </div>
          </div>
        ) : null}
        <div className="mt-3">
          {progressRow?.completedAt && !isReplayMode ? null : (
            <LessonStepperPlayer
              key={`${lessonId}:${isReplayMode ? "replay" : "learn"}`}
              steps={steps}
              mode="student"
              studentId={studentId}
              completedStepKeys={completedStepKeys}
              bestScoreByQuizId={bestScoreByQuizId}
              quizzesById={quizzesById}
              assetsById={assetsById}
              initialStepIndex={initialStepIndex}
              onPdfNumPages={async (assetId, n) => {
                const existing = assetsById[assetId];
                if (!existing) return;
                if (existing.pageCount === n) return;
                const nextAsset = { ...existing, pageCount: n };
                await db.lessonAssets.put(nextAsset);
                setAssetsById((m) => ({ ...m, [assetId]: nextAsset }));
              }}
              onMarkStepComplete={async (stepKey, extra) => {
                await upsertLessonStepProgress({
                  studentId,
                  lessonId: stableLessonId,
                  stepKey,
                  quizAttemptId: extra?.quizAttemptId,
                  bestScore: extra?.bestScore
                });
                setCompletedStepKeys((prev) => new Set([...prev, stepKey]));
              }}
              onQuizAttempt={(attempt: QuizAttempt) => {
                setBestScoreByQuizId((m) => ({
                  ...m,
                  [attempt.quizId]: Math.max(m[attempt.quizId] ?? -Infinity, attempt.score)
                }));
              }}
              onFinish={async () => {
                const nextProgress = await touchProgress({ studentId, lessonId: stableLessonId, markComplete: true });
                setProgressRow(nextProgress);
                nav(`/student/progress${search}`);
              }}
            />
          )}
        </div>
      </Card>
    </div>
  );
}
