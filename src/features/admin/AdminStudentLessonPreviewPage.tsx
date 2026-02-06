import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import type { Lesson, LessonAsset, LessonBlockV2, Quiz } from "@/shared/types";
import { db } from "@/shared/db/db";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { getSubjectAccessDefaultsByCurriculumSubjectId } from "@/shared/db/accessDefaultsRepo";
import { getLessonEffectiveAccessPolicy } from "@/shared/access/accessEngine";
import { Select } from "@/shared/ui/Select";
import { buildLessonSteps } from "@/features/content/lessonSteps";
import { LessonStepperPlayer } from "@/features/content/LessonStepperPlayer";
import { getLessonBlocksV2 } from "@/shared/content/lessonContent";

type PreviewMode = "unlocked" | "locked";

export function AdminStudentLessonPreviewPage() {
  const params = useParams();
  const lessonId = params.lessonId ?? null;
  const location = useLocation();
  const search = location.search ?? "";

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [blocksV2, setBlocksV2] = useState<LessonBlockV2[]>([]);
  const [assetsById, setAssetsById] = useState<Record<string, LessonAsset | undefined>>({});
  const [quizzesById, setQuizzesById] = useState<Record<string, Quiz | undefined>>({});
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

  const steps = useMemo(() => buildLessonSteps({ blocksV2, assetsById, quizzesById }), [assetsById, blocksV2, quizzesById]);

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
          <div className="text-sm text-warning-text">Locked. This is what a student without access sees.</div>
          {unlockHint ? (
            <div className="mt-2 text-xs text-muted">
              Redeem a code that unlocks: <span className="font-semibold text-text">{unlockHint}</span>
            </div>
          ) : null}

          <details className="mt-4 rounded-lg border border-border bg-surface p-3">
            <summary className="cursor-pointer text-sm text-text">How do I get a coupon?</summary>
            <div className="mt-3 space-y-2 text-sm text-muted">
              <div>
                <div className="font-semibold text-text">Sponsored by school</div>
                <div className="text-muted">Ask your School Admin to grant access for this subject.</div>
              </div>
              <div>
                <div className="font-semibold text-text">Buy / redeem voucher</div>
                <div className="text-muted">Get a voucher/coupon code, then redeem it on the Payments page.</div>
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
      ) : (
        <>
          <Card title={lesson.title}>
            <div className="text-xs text-muted">
              {lesson.subject} • {lesson.level} • {lesson.language}
            </div>
            <div className="mt-3">
              <LessonStepperPlayer
                steps={steps}
                mode="preview"
                completedStepKeys={new Set()}
                bestScoreByQuizId={{}}
                quizzesById={quizzesById}
                assetsById={assetsById}
                onPdfNumPages={async (assetId, n) => {
                  const existing = assetsById[assetId];
                  if (!existing) return;
                  if (existing.pageCount === n) return;
                  const nextAsset = { ...existing, pageCount: n };
                  await db.lessonAssets.put(nextAsset);
                  setAssetsById((m) => ({ ...m, [assetId]: nextAsset }));
                }}
              />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
