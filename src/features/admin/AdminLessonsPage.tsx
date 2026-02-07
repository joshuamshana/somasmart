import React, { useEffect, useMemo, useState } from "react";
import type { Lesson, LessonAsset, LessonBlockV2, Quiz, User } from "@/shared/types";
import { db } from "@/shared/db/db";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { enqueueOutboxEvent } from "@/shared/offline/outbox";
import { useAuth } from "@/features/auth/authContext";
import { logAudit } from "@/shared/audit/audit";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  const m = title.match(/\(v(\d+)\)$/i);
  if (m) {
    const next = Number(m[1]) + 1;
    return title.replace(/\(v\d+\)$/i, `(v${next})`);
  }
  return `${title} (v2)`;
}

export function AdminLessonsPage() {
  const location = useLocation();
  const search = location.search ?? "";
  const nav = useNavigate();
  const { user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [teachersById, setTeachersById] = useState<Record<string, User>>({});
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [blocksV2, setBlocksV2] = useState<LessonBlockV2[]>([]);
  const [assetsById, setAssetsById] = useState<Record<string, LessonAsset | undefined>>({});
  const [quizzesById, setQuizzesById] = useState<Record<string, Quiz | undefined>>({});
  const [feedback, setFeedback] = useState("");
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [confirm, setConfirm] = useState<null | {
    title: string;
    description?: string;
    confirmLabel: string;
    danger?: boolean;
    requireText?: string;
    run: () => Promise<void>;
  }>(null);

  async function refresh() {
    const allLessons = await db.lessons.toArray();
    setLessons(allLessons.filter((l) => !l.deletedAt).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    const users = await db.users.toArray();
    const map: Record<string, User> = {};
    users.filter((u) => !u.deletedAt).forEach((u) => (map[u.id] = u));
    setTeachersById(map);
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!selectedLessonId) {
        setBlocksV2([]);
        setAssetsById({});
        setQuizzesById({});
        setFeedback("");
        setSelectedLesson(null);
        return;
      }
      const lesson = await db.lessons.get(selectedLessonId);
      const quizzes = await db.quizzes.where("lessonId").equals(selectedLessonId).toArray();
      const quizMap: Record<string, Quiz | undefined> = {};
      for (const q of quizzes) quizMap[q.id] = q;
      const nextBlocks = await getLessonBlocksV2({ lessonId: selectedLessonId, quizzesById: quizMap });
      const ids = Array.from(
        new Set(
          nextBlocks
            .flatMap((b) =>
              b.components
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
      const assets = await Promise.all(ids.map((id) => db.lessonAssets.get(id)));
      const assetMap: Record<string, LessonAsset | undefined> = {};
      for (let i = 0; i < ids.length; i++) assetMap[ids[i]!] = (assets[i] ?? undefined) as LessonAsset | undefined;
      if (cancelled) return;
      setBlocksV2(nextBlocks);
      setAssetsById(assetMap);
      setQuizzesById(quizMap);
      setFeedback(lesson?.adminFeedback ?? "");
      setSelectedLesson(lesson ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedLessonId]);

  const pending = useMemo(() => lessons.filter((l) => l.status === "pending_approval"), [lessons]);
  const approved = useMemo(() => lessons.filter((l) => l.status === "approved"), [lessons]);
  const rejected = useMemo(() => lessons.filter((l) => l.status === "rejected" || l.status === "unpublished"), [lessons]);
  const steps = useMemo(() => buildLessonSteps({ blocksV2, assetsById, quizzesById }), [assetsById, blocksV2, quizzesById]);

  async function approve(lessonId: string) {
    const l = await db.lessons.get(lessonId);
    if (!l) return;
    const next = {
      ...l,
      status: "approved" as const,
      adminFeedback: feedback.trim() || undefined,
      updatedAt: nowIso()
    };
    await db.lessons.put(next);
    setSelectedLesson((cur) => (cur?.id === lessonId ? next : cur));
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

  async function reject(lessonId: string) {
    const l = await db.lessons.get(lessonId);
    if (!l) return;
    const next = {
      ...l,
      status: "rejected" as const,
      adminFeedback: feedback.trim() || "Please revise.",
      updatedAt: nowIso()
    };
    await db.lessons.put(next);
    setSelectedLesson((cur) => (cur?.id === lessonId ? next : cur));
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

  async function unpublish(lessonId: string) {
    const l = await db.lessons.get(lessonId);
    if (!l) return;
    const next = { ...l, status: "unpublished" as const, updatedAt: nowIso() };
    await db.lessons.put(next);
    setSelectedLesson((cur) => (cur?.id === lessonId ? next : cur));
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
    setSelectedLessonId(lessonId);
  }

  async function softDelete(lessonId: string) {
    const l = await db.lessons.get(lessonId);
    if (!l) return;
    await db.lessons.put({ ...l, deletedAt: nowIso(), updatedAt: nowIso() });
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
    await refresh();
    setSelectedLessonId(null);
  }

  async function createNewVersionFromApproved(lessonId: string) {
    const l = await db.lessons.get(lessonId);
    const content = await db.lessonContents.get(lessonId);
    const contentV2 = await db.lessonContentsV2.get(lessonId);
    if (!l) return;

    const assets = await db.lessonAssets.where("lessonId").equals(lessonId).toArray();
    const quizzes = await db.quizzes.where("lessonId").equals(lessonId).toArray();

    const nextLessonId = newId("lesson");
    const assetIdMap: Record<string, string> = {};
    for (const a of assets) assetIdMap[a.id] = newId("asset");
    const quizIdMap: Record<string, string> = {};
    for (const q of quizzes) quizIdMap[q.id] = newId("quiz");

    const baseBlocksV2 =
      contentV2?.version === 2
        ? contentV2.blocksV2
        : mapLegacyBlocksToV2({
            blocks: content?.blocks ?? [],
            quizzesById: Object.fromEntries(quizzes.map((q) => [q.id, q]))
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
      ...l,
      id: nextLessonId,
      title: bumpTitle(l.title),
      status: "draft",
      adminFeedback: undefined,
      expiresAt: undefined,
      deletedAt: undefined,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };

    const nextAssets = assets.map((a) => ({
      ...a,
      id: assetIdMap[a.id] ?? newId("asset"),
      lessonId: nextLessonId,
      createdAt: nowIso()
    }));

    const nextQuizzes = quizzes.map((quiz) => ({
      ...quiz,
      id: quizIdMap[quiz.id] ?? newId("quiz"),
      lessonId: nextLessonId,
      questions: quiz.questions.map((q: any) => ({ ...q, id: newId("q") }))
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

    await refresh();
    setSelectedLessonId(nextLessonId);
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
        title="Lessons"
        description="Approve teacher submissions and manage published lesson content."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" tone="neutral" onClick={() => void refresh()}>
              Refresh
            </Button>
            <Link to="/sync">
              <Button variant="secondary" tone="neutral">Sync</Button>
            </Link>
            {selectedLessonId ? (
              <Button
                variant="secondary"
                tone="neutral"
                onClick={() => nav(`/admin/lessons/${selectedLessonId}/preview${search}`)}
              >
                Preview as student
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4 lg:col-span-1">
        <Card title="Pending lessons" paper="secondary">
          <div className="space-y-2">
            {pending.map((l) => (
              <button
                key={l.id}
                data-testid={`lesson-item-${l.id}`}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                  selectedLessonId === l.id
                    ? "border-action-primary bg-action-primary/10"
                    : "border-border-subtle bg-paper hover:border-border-strong"
                }`}
                onClick={() => setSelectedLessonId(l.id)}
              >
                <div className="font-semibold text-text-title">{l.title}</div>
                <div className="mt-1 text-xs text-text-subtle">
                  {teachersById[l.createdByUserId]?.displayName ?? "Unknown"} • {l.subject} • {l.level}
                </div>
              </button>
            ))}
            {pending.length === 0 ? (
              <div className="text-sm text-text-subtle">
                No pending lessons. If teachers submitted lessons on another device, run Sync.
              </div>
            ) : null}
          </div>
        </Card>
        <Card title="Approved lessons" paper="secondary">
          <div className="space-y-2">
            {approved.map((l) => (
              <button
                key={l.id}
                data-testid={`lesson-item-${l.id}`}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                  selectedLessonId === l.id
                    ? "border-action-primary bg-action-primary/10"
                    : "border-border-subtle bg-paper hover:border-border-strong"
                }`}
                onClick={() => setSelectedLessonId(l.id)}
              >
                <div className="font-semibold text-text-title">{l.title}</div>
                <div className="mt-1 text-xs text-text-subtle">
                  {teachersById[l.createdByUserId]?.displayName ?? "Unknown"} • {l.subject} • {l.level}
                </div>
              </button>
            ))}
            {approved.length === 0 ? <div className="text-sm text-text-subtle">No approved lessons.</div> : null}
          </div>
        </Card>
        <Card title="Summary" paper="secondary">
          <div className="text-sm text-text-subtle">Approved: {approved.length}</div>
          <div className="text-sm text-text-subtle">Rejected: {rejected.length}</div>
        </Card>
      </div>

      <div className="space-y-4 lg:col-span-2">
        <Card title="Lesson review">
          {!selectedLessonId ? (
            <div className="text-sm text-text-subtle">Select a pending lesson to preview and approve/reject.</div>
          ) : (
            <>
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
              {selectedLesson ? (
                <div className="mt-4 grid gap-2 text-sm text-text-body">
                  <div>
                    <span className="text-text-subtle">Title:</span> {selectedLesson.title}
                  </div>
                  <div>
                    <span className="text-text-subtle">Curriculum:</span>{" "}
                    {selectedLesson.level} • {selectedLesson.className ?? "—"} • {selectedLesson.subject}
                  </div>
                  <div>
                    <span className="text-text-subtle">Language:</span> {String(selectedLesson.language)}
                  </div>
                  <div>
                    <span className="text-text-subtle">Access:</span> {selectedLesson.accessPolicy ?? (selectedLesson.tags.includes("trial") ? "free" : "coupon")}
                  </div>
                  <div>
                    <span className="text-text-subtle">Tags:</span> {(selectedLesson.tags ?? []).join(", ") || "—"}
                  </div>
                  <div>
                    <span className="text-text-subtle">Expires:</span>{" "}
                    {selectedLesson.expiresAt ? new Date(selectedLesson.expiresAt).toLocaleDateString() : "—"}
                  </div>
                  <div className="text-text-subtle">Description</div>
                  <div className="rounded-md border border-border-subtle bg-paper-2 p-3 text-sm text-text-body">
                    {selectedLesson.description || "—"}
                  </div>
                </div>
              ) : null}
              <div className="mt-4">
                <label className="block">
                  <div className="mb-1 text-sm text-text-subtle">Feedback to teacher</div>
                  <textarea
                    className="w-full rounded-md border border-border-subtle bg-paper px-3 py-2 text-sm text-text-title outline-none focus:border-brand"
                    rows={3}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  />
                </label>
              </div>
              <div className="mt-4 flex gap-2">
                {selectedLesson?.status === "pending_approval" ? (
                  <>
                    <Button onClick={() => void approve(selectedLessonId)}>Approve</Button>
                    <Button variant="danger" onClick={() => void reject(selectedLessonId)}>
                      Reject
                    </Button>
                  </>
                ) : null}
                {selectedLesson?.status === "approved" ? (
                  <>
                    <Button
                      variant="secondary"
                      data-testid="lesson-create-version"
                      onClick={() =>
                        setConfirm({
                          title: "Create new version?",
                          description: "A new draft copy will be created for the teacher to edit and resubmit.",
                          confirmLabel: "Create version",
                          run: async () => createNewVersionFromApproved(selectedLessonId)
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
                          run: async () => unpublish(selectedLessonId)
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
                          run: async () => softDelete(selectedLessonId)
                        })
                      }
                    >
                      Delete
                    </Button>
                  </>
                ) : null}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
    </div>
  );
}
