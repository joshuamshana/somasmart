import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import type { Lesson, LessonAsset, LessonBlockV2, Quiz, User } from "@/shared/types";
import { db } from "@/shared/db/db";
import { useAuth } from "@/features/auth/authContext";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { StatusPill } from "@/shared/ui/StatusPill";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { enqueueOutboxEvent } from "@/shared/offline/outbox";
import { logAudit } from "@/shared/audit/audit";
import { buildLessonSteps } from "@/features/content/lessonSteps";
import { LessonStepperPlayer } from "@/features/content/LessonStepperPlayer";
import { getLessonBlocksV2, mapLegacyBlocksToV2 } from "@/shared/content/lessonContent";

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function bumpTitle(title: string) {
  const match = title.match(/\(v(\d+)\)$/i);
  if (match) {
    const next = Number(match[1]) + 1;
    return title.replace(/\(v\d+\)$/i, `(v${next})`);
  }
  return `${title} (v2)`;
}

export function AdminLessonReviewPage() {
  const params = useParams();
  const lessonId = params.lessonId ?? null;
  const location = useLocation();
  const search = location.search ?? "";
  const nav = useNavigate();
  const { user } = useAuth();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [teacher, setTeacher] = useState<User | null>(null);
  const [blocksV2, setBlocksV2] = useState<LessonBlockV2[]>([]);
  const [assetsById, setAssetsById] = useState<Record<string, LessonAsset | undefined>>({});
  const [quizzesById, setQuizzesById] = useState<Record<string, Quiz | undefined>>({});
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<null | {
    title: string;
    description?: string;
    confirmLabel: string;
    danger?: boolean;
    requireText?: string;
    run: () => Promise<void>;
  }>(null);

  async function refresh() {
    if (!lessonId) return;
    setLoading(true);

    const selectedLesson = await db.lessons.get(lessonId);
    if (!selectedLesson || selectedLesson.deletedAt) {
      setLesson(null);
      setTeacher(null);
      setBlocksV2([]);
      setAssetsById({});
      setQuizzesById({});
      setFeedback("");
      setLoading(false);
      return;
    }

    const selectedTeacher = await db.users.get(selectedLesson.createdByUserId);
    const quizzes = await db.quizzes.where("lessonId").equals(lessonId).toArray();
    const quizMap: Record<string, Quiz | undefined> = {};
    for (const quiz of quizzes) quizMap[quiz.id] = quiz;

    const nextBlocks = await getLessonBlocksV2({ lessonId, quizzesById: quizMap });
    const assetIds = Array.from(
      new Set(
        nextBlocks.flatMap((block) =>
          block.components
            .filter((component): component is Extract<typeof component, { type: "media" }> => component.type === "media")
            .map((component) => component.assetId)
        )
      )
    );
    const assets = await Promise.all(assetIds.map((id) => db.lessonAssets.get(id)));
    const assetMap: Record<string, LessonAsset | undefined> = {};
    for (let i = 0; i < assetIds.length; i++) assetMap[assetIds[i]!] = (assets[i] ?? undefined) as LessonAsset | undefined;

    setLesson(selectedLesson);
    setTeacher(selectedTeacher ?? null);
    setBlocksV2(nextBlocks);
    setAssetsById(assetMap);
    setQuizzesById(quizMap);
    setFeedback(selectedLesson.adminFeedback ?? "");
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, [lessonId]);

  const steps = useMemo(() => buildLessonSteps({ blocksV2, assetsById, quizzesById }), [assetsById, blocksV2, quizzesById]);

  async function approve() {
    if (!lessonId) return;
    const current = await db.lessons.get(lessonId);
    if (!current) return;

    const next = {
      ...current,
      status: "approved" as const,
      adminFeedback: feedback.trim() || undefined,
      updatedAt: nowIso()
    };

    await db.lessons.put(next);
    await enqueueOutboxEvent({ type: "lesson_approved", payload: { lessonId } });

    if (user) {
      await logAudit({
        actorUserId: user.id,
        action: "lesson_approve",
        entityType: "lesson",
        entityId: lessonId,
        details: { feedback: feedback.trim() || undefined }
      });
    }

    await refresh();
  }

  async function reject() {
    if (!lessonId) return;
    const current = await db.lessons.get(lessonId);
    if (!current) return;

    const next = {
      ...current,
      status: "rejected" as const,
      adminFeedback: feedback.trim() || "Please revise.",
      updatedAt: nowIso()
    };

    await db.lessons.put(next);
    await enqueueOutboxEvent({ type: "lesson_rejected", payload: { lessonId } });

    if (user) {
      await logAudit({
        actorUserId: user.id,
        action: "lesson_reject",
        entityType: "lesson",
        entityId: lessonId,
        details: { feedback: feedback.trim() || "Please revise." }
      });
    }

    await refresh();
  }

  async function unpublish() {
    if (!lessonId) return;
    const current = await db.lessons.get(lessonId);
    if (!current) return;

    const next = {
      ...current,
      status: "unpublished" as const,
      updatedAt: nowIso()
    };

    await db.lessons.put(next);
    await enqueueOutboxEvent({ type: "lesson_upsert", payload: { lessonId } });

    if (user) {
      await logAudit({
        actorUserId: user.id,
        action: "lesson_unpublish",
        entityType: "lesson",
        entityId: lessonId,
        details: { unpublished: true }
      });
    }

    await refresh();
  }

  async function softDelete() {
    if (!lessonId) return;
    const current = await db.lessons.get(lessonId);
    if (!current) return;

    await db.lessons.put({ ...current, deletedAt: nowIso(), updatedAt: nowIso() });
    await enqueueOutboxEvent({ type: "lesson_upsert", payload: { lessonId } });

    if (user) {
      await logAudit({
        actorUserId: user.id,
        action: "lesson_delete",
        entityType: "lesson",
        entityId: lessonId,
        details: { deleted: true }
      });
    }

    nav(`/admin/lessons${search}`);
  }

  async function createNewVersionFromApproved() {
    if (!lessonId) return;
    const current = await db.lessons.get(lessonId);
    const content = await db.lessonContents.get(lessonId);
    const contentV2 = await db.lessonContentsV2.get(lessonId);
    if (!current) return;

    const assets = await db.lessonAssets.where("lessonId").equals(lessonId).toArray();
    const quizzes = await db.quizzes.where("lessonId").equals(lessonId).toArray();

    const nextLessonId = newId("lesson");
    const assetIdMap: Record<string, string> = {};
    for (const asset of assets) assetIdMap[asset.id] = newId("asset");
    const quizIdMap: Record<string, string> = {};
    for (const quiz of quizzes) quizIdMap[quiz.id] = newId("quiz");

    const baseBlocksV2 =
      contentV2?.version === 2
        ? contentV2.blocksV2
        : mapLegacyBlocksToV2({
            blocks: content?.blocks ?? [],
            quizzesById: Object.fromEntries(quizzes.map((quiz) => [quiz.id, quiz]))
          });

    const nextBlocksV2: LessonBlockV2[] = baseBlocksV2.map((block) => ({
      ...block,
      id: newId("blockv2"),
      components: block.components.map((component) =>
        component.type === "media"
          ? {
              ...component,
              id: newId("cmp"),
              assetId: assetIdMap[component.assetId] ?? component.assetId
            }
          : { ...component, id: newId("cmp") }
      ),
      quizGate: block.quizGate
        ? {
            ...block.quizGate,
            quizId: quizIdMap[block.quizGate.quizId] ?? block.quizGate.quizId
          }
        : undefined
    }));

    const nextLesson: Lesson = {
      ...current,
      id: nextLessonId,
      title: bumpTitle(current.title),
      status: "draft",
      adminFeedback: undefined,
      expiresAt: undefined,
      deletedAt: undefined,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };

    const nextAssets = assets.map((asset) => ({
      ...asset,
      id: assetIdMap[asset.id] ?? newId("asset"),
      lessonId: nextLessonId,
      createdAt: nowIso()
    }));

    const nextQuizzes = quizzes.map((quiz) => ({
      ...quiz,
      id: quizIdMap[quiz.id] ?? newId("quiz"),
      lessonId: nextLessonId,
      questions: quiz.questions.map((question) => ({ ...question, id: newId("q") }))
    }));

    await db.transaction("rw", [db.lessons, db.lessonContents, db.lessonContentsV2, db.lessonAssets, db.quizzes], async () => {
      await db.lessons.put(nextLesson);
      await db.lessonContents.put({ lessonId: nextLessonId, blocks: content?.blocks ?? [] });
      await db.lessonContentsV2.put({ lessonId: nextLessonId, version: 2, blocksV2: nextBlocksV2 });
      if (nextAssets.length) await db.lessonAssets.bulkPut(nextAssets as any);
      if (nextQuizzes.length) await db.quizzes.bulkPut(nextQuizzes as any);
    });

    await enqueueOutboxEvent({ type: "lesson_upsert_full", payload: { lessonId: nextLessonId } });

    if (user) {
      await logAudit({
        actorUserId: user.id,
        action: "lesson_update",
        entityType: "lesson",
        entityId: nextLessonId,
        details: { versionedFrom: lessonId }
      });
    }

    nav(`/admin/lessons/${nextLessonId}/review${search}`);
  }

  if (!lessonId) {
    return <div className="text-sm text-text-subtle">Missing lesson id.</div>;
  }

  if (loading) {
    return <div className="text-sm text-text-subtle">Loading lesson review...</div>;
  }

  if (!lesson) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-text-subtle">Lesson not found or has been removed.</div>
        <Link to={`/admin/lessons${search}`}>
          <Button variant="secondary">Back to lessons</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="section-rhythm">
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title ?? ""}
        description={confirm?.description}
        confirmLabel={confirm?.confirmLabel ?? "Confirm"}
        danger={confirm?.danger}
        requireText={confirm?.requireText}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          const run = confirm?.run;
          setConfirm(null);
          if (run) await run();
        }}
      />

      <PageHeader
        title="Lesson review"
        description={`Review ${lesson.title} and decide publication status.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to={`/admin/lessons${search}`}>
              <Button variant="secondary" tone="neutral">
                Back to lessons
              </Button>
            </Link>
            <Link to={`/admin/lessons/${lesson.id}/preview${search}`}>
              <Button variant="secondary" tone="neutral">
                Preview as student
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card title="Lesson preview">
          <LessonStepperPlayer
            steps={steps}
            mode="preview"
            completedStepKeys={new Set()}
            bestScoreByQuizId={{}}
            quizzesById={quizzesById}
            assetsById={assetsById}
            onPdfNumPages={async (assetId, pages) => {
              const existing = assetsById[assetId];
              if (!existing || existing.pageCount === pages) return;
              const nextAsset = { ...existing, pageCount: pages };
              await db.lessonAssets.put(nextAsset);
              setAssetsById((all) => ({ ...all, [assetId]: nextAsset }));
            }}
          />
        </Card>

        <div className="space-y-4">
          <Card title="Review summary" paper="secondary">
            <div className="space-y-3 text-sm text-text-body">
              <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-paper p-3">
                <span className="text-text-subtle">Status</span>
                <StatusPill value={lesson.status.replaceAll("_", " ")} />
              </div>
              <div className="grid gap-2">
                <div>
                  <span className="text-text-subtle">Teacher:</span> {teacher?.displayName ?? "Unknown"}
                </div>
                <div>
                  <span className="text-text-subtle">Curriculum:</span> {lesson.level} • {lesson.className ?? "-"} • {lesson.subject}
                </div>
                <div>
                  <span className="text-text-subtle">Language:</span> {String(lesson.language)}
                </div>
                <div>
                  <span className="text-text-subtle">Access:</span>{" "}
                  {lesson.accessPolicy ?? (lesson.tags.includes("trial") ? "free" : "coupon")}
                </div>
                <div>
                  <span className="text-text-subtle">Tags:</span> {(lesson.tags ?? []).join(", ") || "-"}
                </div>
                <div>
                  <span className="text-text-subtle">Updated:</span> {new Date(lesson.updatedAt).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-text-subtle">Description</div>
                <div className="mt-1 rounded-md border border-border-subtle bg-paper p-3 text-sm text-text-body">
                  {lesson.description || "-"}
                </div>
              </div>
            </div>
          </Card>

          <Card title="Feedback to teacher" paper="secondary">
            <label className="block">
              <textarea
                className="w-full rounded-md border border-border-subtle bg-paper px-3 py-2 text-sm text-text-title outline-none focus:border-brand"
                rows={4}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
            </label>
          </Card>

          <Card title="Decision" paper="secondary">
            <div className="mb-3 text-sm text-text-subtle">Select an action based on lesson quality and policy readiness.</div>
            <div className="flex flex-wrap gap-2">
              {lesson.status === "pending_approval" ? (
                <>
                  <Button onClick={() => void approve()}>Approve</Button>
                  <Button variant="danger" onClick={() => void reject()}>
                    Reject
                  </Button>
                </>
              ) : null}

              {lesson.status === "approved" ? (
                <>
                  <Button
                    variant="secondary"
                    data-testid="lesson-create-version"
                    onClick={() =>
                      setConfirm({
                        title: "Create new version?",
                        description: "A new draft copy will be created for the teacher to edit and resubmit.",
                        confirmLabel: "Create version",
                        run: async () => createNewVersionFromApproved()
                      })
                    }
                  >
                    Create new version
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setConfirm({
                        title: "Unpublish lesson?",
                        description: "Students will no longer see this lesson.",
                        confirmLabel: "Unpublish",
                        danger: true,
                        run: async () => unpublish()
                      })
                    }
                  >
                    Unpublish
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() =>
                      setConfirm({
                        title: "Delete lesson?",
                        description: "This is irreversible. The lesson will be removed from active lists.",
                        confirmLabel: "Delete",
                        danger: true,
                        requireText: "DELETE",
                        run: async () => softDelete()
                      })
                    }
                  >
                    Delete
                  </Button>
                </>
              ) : null}

              {lesson.status !== "pending_approval" && lesson.status !== "approved" ? (
                <div className="text-sm text-text-subtle">No direct decision actions for this status.</div>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
