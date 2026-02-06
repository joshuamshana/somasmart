import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import type { Lesson, LessonBlock, Quiz } from "@/shared/types";
import { db } from "@/shared/db/db";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { LessonPlayer } from "@/features/content/LessonPlayer";
import { QuizPreview } from "@/features/teacher/QuizPreview";
import { Button } from "@/shared/ui/Button";
import { getSubjectAccessDefaultsByCurriculumSubjectId } from "@/shared/db/accessDefaultsRepo";
import { getLessonEffectiveAccessPolicy } from "@/shared/access/accessEngine";
import { Select } from "@/shared/ui/Select";

type PreviewMode = "unlocked" | "locked";

export function AdminStudentLessonPreviewPage() {
  const params = useParams();
  const lessonId = params.lessonId ?? null;
  const location = useLocation();
  const search = location.search ?? "";

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [blocks, setBlocks] = useState<LessonBlock[]>([]);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [subjectDefaults, setSubjectDefaults] = useState<Record<string, import("@/shared/types").AccessPolicy>>({});
  const [unlockHint, setUnlockHint] = useState<string | null>(null);
  const [mode, setMode] = useState<PreviewMode>("unlocked");

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

  const policy = useMemo(() => {
    if (!lesson) return null;
    return getLessonEffectiveAccessPolicy({ lesson, subjectDefaultsByCurriculumSubjectId: subjectDefaults });
  }, [lesson, subjectDefaults]);

  if (!lessonId) return <div>Missing lesson id.</div>;
  if (!lesson) return <div>Loading…</div>;

  const showLocked = mode === "locked" && policy !== "free";

  return (
    <div className="space-y-4">
      <PageHeader
        title="Student preview"
        description={
          <span>
            Admin-only preview that renders the lesson like a student experience. Status:{" "}
            <span className="font-mono text-text">{lesson.status}</span>
          </span>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to={`/admin/lessons${search}`}>
              <Button variant="secondary">Back</Button>
            </Link>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Select
            label="Preview mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as PreviewMode)}
          >
            <option value="unlocked">Unlocked (see content)</option>
            <option value="locked">Locked (no coupon)</option>
          </Select>
          <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted">
            Effective access: <span className="font-semibold text-text">{policy ?? "—"}</span>
          </div>
        </div>
      </PageHeader>

      {showLocked ? (
        <Card title={lesson.title}>
          <div className="text-sm text-amber-200">Locked. This is what a student without access sees.</div>
          {unlockHint ? (
            <div className="mt-2 text-xs text-slate-400">
              Redeem a code that unlocks: <span className="font-semibold text-slate-200">{unlockHint}</span>
            </div>
          ) : null}

          <details className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-3">
            <summary className="cursor-pointer text-sm text-slate-200">How do I get a coupon?</summary>
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              <div>
                <div className="font-semibold text-slate-200">Sponsored by school</div>
                <div className="text-slate-400">Ask your School Admin to grant access for this subject.</div>
              </div>
              <div>
                <div className="font-semibold text-slate-200">Buy / redeem voucher</div>
                <div className="text-slate-400">Get a voucher/coupon code, then redeem it on the Payments page.</div>
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
      ) : (
        <>
          <Card title={lesson.title}>
            <div className="text-xs text-slate-400">
              {lesson.subject} • {lesson.level} • {lesson.language}
            </div>
            <div className="mt-3">
              <LessonPlayer blocks={blocks} />
            </div>
          </Card>
          {quiz ? (
            <Card title="Self Test Quiz (preview)">
              <QuizPreview quiz={quiz} />
            </Card>
          ) : (
            <Card title="Self Test Quiz (preview)">
              <div className="text-sm text-slate-300">No quiz for this lesson yet.</div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

