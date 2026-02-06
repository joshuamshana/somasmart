import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import type {
  AccessPolicy,
  CurriculumClass,
  CurriculumLevel,
  CurriculumSubject,
  Lesson,
  LessonAsset,
  LessonBlock,
  Quiz,
  QuizQuestion,
  School
} from "@/shared/types";
import { db } from "@/shared/db/db";
import { useAuth } from "@/features/auth/authContext";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { Button } from "@/shared/ui/Button";
import { enqueueOutboxEvent } from "@/shared/offline/outbox";
import { PageHeader } from "@/shared/ui/PageHeader";
import { toast } from "@/shared/ui/toastStore";
import { buildLessonSteps } from "@/features/content/lessonSteps";
import { LessonStepperPlayer } from "@/features/content/LessonStepperPlayer";
import * as pdfjs from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min?url";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker as string;

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function fileKind(mime: string): LessonAsset["kind"] | null {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "video/mp4" || mime === "video/webm") return "video";
  if (mime === "application/pdf") return "pdf";
  if (mime === "application/vnd.openxmlformats-officedocument.presentationml.presentation") return "pptx";
  return null;
}

type StepId = "metadata" | "blocks" | "quiz" | "preview" | "submit";

export function TeacherLessonBuilderPage() {
  const { user } = useAuth();
  const params = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const search = location.search ?? "";
  const editLessonId = params.lessonId ?? null;
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [step, setStep] = useState<StepId>("metadata");
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [curriculumLevelId, setCurriculumLevelId] = useState<string>("");
  const [curriculumClassId, setCurriculumClassId] = useState<string>("");
  const [curriculumSubjectId, setCurriculumSubjectId] = useState<string>("");
  const [language, setLanguage] = useState<"en" | "sw">("en");
  const [accessPolicy, setAccessPolicy] = useState<AccessPolicy>("coupon");
  const [tags, setTags] = useState("");
  const [description, setDescription] = useState("");
  const [createdAt, setCreatedAt] = useState(() => nowIso());

  const [blocks, setBlocks] = useState<LessonBlock[]>([]);
  const [assetsById, setAssetsById] = useState<Record<string, LessonAsset | undefined>>({});
  const [quizzesById, setQuizzesById] = useState<Record<string, Quiz>>({});
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);

  const [lessonId] = useState(() => editLessonId ?? newId("lesson"));
  const [levels, setLevels] = useState<CurriculumLevel[]>([]);
  const [classes, setClasses] = useState<CurriculumClass[]>([]);
  const [subjects, setSubjects] = useState<CurriculumSubject[]>([]);
  const [curriculumReady, setCurriculumReady] = useState(false);
  const [school, setSchool] = useState<School | null>(null);
  const [limitsMb, setLimitsMb] = useState<Record<LessonAsset["kind"], number>>({
    image: 10,
    audio: 20,
    video: 50,
    pdf: 20,
    pptx: 20
  });

  if (!user) return null;
  const userId = user.id;

  function markDirty() {
    setDirty(true);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const lvls = (await db.curriculumLevels.toArray()).filter((l) => !l.deletedAt);
      const cls = (await db.curriculumClasses.toArray()).filter((c) => !c.deletedAt);
      const subs = (await db.curriculumSubjects.toArray()).filter((s) => !s.deletedAt);
      const settings = await db.settings.toArray();
      const get = (k: string) => settings.find((s) => s.key === k)?.value;
      const nextLimits = {
        image: Number(get("media.maxUploadMb.image") ?? 10),
        audio: Number(get("media.maxUploadMb.audio") ?? 20),
        video: Number(get("media.maxUploadMb.video") ?? 50),
        pdf: Number(get("media.maxUploadMb.pdf") ?? 20),
        pptx: Number(get("media.maxUploadMb.pptx") ?? 20)
      } satisfies Record<LessonAsset["kind"], number>;

      const sc = user.schoolId ? await db.schools.get(user.schoolId) : null;
      if (cancelled) return;
      setLevels(lvls.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)));
      setClasses(cls.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)));
      setSubjects(subs.sort((a, b) => a.name.localeCompare(b.name)));
      setLimitsMb(nextLimits);
      setSchool(sc ?? null);
      setCurriculumReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user.schoolId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!editLessonId) return;
      const l = await db.lessons.get(editLessonId);
      const content = await db.lessonContents.get(editLessonId);
      const quizzes = await db.quizzes.where("lessonId").equals(editLessonId).toArray();
      if (!l || !content) return;
      if (l.createdByUserId !== userId) {
        setStatusMessage("You can’t edit this lesson.");
        return;
      }
      if (cancelled) return;
      setTitle(l.title);
      setLanguage((l.language as "en" | "sw") ?? "en");
      setTags((l.tags ?? []).join(", "));
      setAccessPolicy(l.accessPolicy ?? (l.tags?.includes("trial") ? "free" : "coupon"));
      setDescription(l.description ?? "");
      setCurriculumSubjectId(l.curriculumSubjectId ?? "");
      setCurriculumLevelId(l.curriculumLevelId ?? "");
      setCurriculumClassId(l.curriculumClassId ?? "");
      setCreatedAt(l.createdAt);
      const nextBlocks = (content.blocks ?? []) as LessonBlock[];
      setBlocks(nextBlocks);
      const assetIds = Array.from(
        new Set(
          nextBlocks
            .filter((b): b is Extract<LessonBlock, { assetId: string }> => "assetId" in b)
            .map((b) => b.assetId)
        )
      );
      const assets = await Promise.all(assetIds.map((id) => db.lessonAssets.get(id)));
      const assetMap: Record<string, LessonAsset | undefined> = {};
      for (let i = 0; i < assetIds.length; i++) assetMap[assetIds[i]!] = (assets[i] ?? undefined) as LessonAsset | undefined;
      setAssetsById(assetMap);
      const quizMap: Record<string, Quiz> = {};
      for (const q of quizzes) quizMap[q.id] = q;
      setQuizzesById(quizMap);
      setSelectedQuizId(quizzes[0]?.id ?? null);
      setDirty(false);
      setLastSavedAt(l.updatedAt ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [editLessonId]);

  async function addTextBlock() {
    markDirty();
    setBlocks((b) => [...b, { id: newId("block"), type: "text", variant: "body", text: "" }]);
  }

  async function addStepBreakBlock() {
    markDirty();
    setBlocks((b) => [...b, { id: newId("block"), type: "step_break", title: "" }]);
  }

  async function addQuizStepBlock() {
    const id = newId("quiz");
    const quiz: Quiz = { id, lessonId, questions: [] };
    markDirty();
    setQuizzesById((m) => ({ ...m, [id]: quiz }));
    setSelectedQuizId(id);
    setBlocks((b) => [
      ...b,
      { id: newId("block"), type: "quiz", quizId: id, title: "Quiz", requiredToContinue: true, passScorePct: 70 }
    ]);
  }

  async function addFileBlock(file: File) {
    const kind = fileKind(file.type);
    if (!kind) {
      setStatusMessage("Unsupported file type. Use image/audio/video/mp4/video/webm/pdf/pptx.");
      return;
    }
    const maxMb = limitsMb[kind] ?? 20;
    const maxBytes = maxMb * 1024 * 1024;
    if (file.size > maxBytes) {
      setStatusMessage("File too large. Please upload a smaller file.");
      return;
    }
    const assetId = newId("asset");
    let pageCount: number | undefined = undefined;
    if (kind === "pdf") {
      try {
        const ab = await file.arrayBuffer();
        const doc = await pdfjs.getDocument({ data: ab }).promise;
        pageCount = doc.numPages;
        await doc.destroy();
      } catch {
        pageCount = undefined;
      }
    }
    const asset: LessonAsset = {
      id: assetId,
      lessonId,
      kind,
      name: file.name,
      mime: file.type,
      blob: file,
      pageCount,
      createdAt: nowIso()
    };
    await db.lessonAssets.add(asset);
    setAssetsById((m) => ({ ...m, [assetId]: asset }));
    let block: LessonBlock;
    if (kind === "image") block = { id: newId("block"), type: "image", assetId, mime: file.type, name: file.name };
    else if (kind === "audio") block = { id: newId("block"), type: "audio", assetId, mime: file.type, name: file.name };
    else if (kind === "video") block = { id: newId("block"), type: "video", assetId, mime: file.type, name: file.name };
    else if (kind === "pdf") block = { id: newId("block"), type: "pdf", assetId, mime: file.type, name: file.name };
    else block = { id: newId("block"), type: "pptx", assetId, mime: file.type, name: file.name };
    markDirty();
    setBlocks((b) => [...b, block]);
  }

  function addQuestion() {
    if (!selectedQuizId) {
      setStatusMessage("Add a quiz step first, then edit questions.");
      return;
    }
    markDirty();
    const nextQ: QuizQuestion = {
      id: newId("q"),
      prompt: "",
      options: ["", "", "", ""],
      correctOptionIndex: 0,
      explanation: "",
      conceptTags: [],
      nextSteps: [{ type: "retry_quiz" }, { type: "repeat_lesson" }]
    };
    setQuizzesById((m) => {
      const quiz = m[selectedQuizId];
      if (!quiz) return m;
      return { ...m, [selectedQuizId]: { ...quiz, questions: [...(quiz.questions ?? []), nextQ] } };
    });
  }

  function validateAll() {
    const missing: string[] = [];
    if (!user?.schoolId) missing.push("School");
    if (!title.trim()) missing.push("Title");
    if (!description.trim()) missing.push("Description");
    if (!curriculumLevelId) missing.push("Level");
    if (!curriculumClassId) missing.push("Class");
    if (!curriculumSubjectId) missing.push("Subject");
    if (blocks.length === 0) missing.push("At least 1 content block");
    const quizzes = Object.values(quizzesById);
    for (const [qi, quiz] of quizzes.entries()) {
      if ((quiz.questions ?? []).length === 0) missing.push(`Quiz ${qi + 1}: at least 1 question`);
      for (const [i, q] of (quiz.questions ?? []).entries()) {
        if (!q.prompt.trim()) missing.push(`Quiz ${qi + 1} Q${i + 1}: prompt`);
        const opts = q.options.map((o) => o.trim()).filter(Boolean);
        if (opts.length < 2) missing.push(`Quiz ${qi + 1} Q${i + 1}: at least 2 options`);
        if (!q.explanation.trim()) missing.push(`Quiz ${qi + 1} Q${i + 1}: explanation`);
      }
    }
    return missing;
  }

  async function saveDraft(
    nextStatus: Lesson["status"] = "draft",
    opts?: { silent?: boolean; navigateOnSubmit?: boolean }
  ) {
    setSaving(true);
    if (!opts?.silent) setStatusMessage(null);
    try {
      const u = user;
      if (!u) return;
      if (!u.schoolId) {
        if (!opts?.silent) {
          setStatusMessage("Your teacher account is not linked to a school. Contact your School Admin.");
        }
        return;
      }
      const levelRow = curriculumLevelId ? await db.curriculumLevels.get(curriculumLevelId) : null;
      const classRow = curriculumClassId ? await db.curriculumClasses.get(curriculumClassId) : null;
      const subjectRow = curriculumSubjectId ? await db.curriculumSubjects.get(curriculumSubjectId) : null;
      const lesson: Lesson = {
        id: lessonId,
        title: title.trim(),
        schoolId: u.schoolId,
        curriculumLevelId: curriculumLevelId || undefined,
        curriculumClassId: curriculumClassId || undefined,
        curriculumSubjectId: curriculumSubjectId || undefined,
        level: levelRow?.name ?? "",
        className: classRow?.name ?? "",
        subject: subjectRow?.name ?? "",
        language,
        accessPolicy,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        description: description.trim(),
        status: nextStatus,
        createdByUserId: userId,
        createdAt,
        updatedAt: nowIso()
      };
      const quizzes = Object.values(quizzesById).map((q) => ({ ...q, lessonId }));

      await db.transaction(
        "rw",
        db.lessons,
        db.lessonContents,
        db.quizzes,
        async () => {
          await db.lessons.put(lesson);
          await db.lessonContents.put({ lessonId, blocks });
          const existing = await db.quizzes.where("lessonId").equals(lessonId).toArray();
          const toDelete = existing.filter((q) => !quizzesById[q.id]).map((q) => q.id);
          if (toDelete.length) {
            await Promise.all(toDelete.map((id) => db.quizzes.delete(id)));
          }
          if (quizzes.length) {
            await db.quizzes.bulkPut(quizzes);
          }
        }
      );
      if (nextStatus === "pending_approval") {
        await enqueueOutboxEvent({ type: "lesson_submit", payload: { lessonId } });
      }
      setDirty(false);
      setLastSavedAt(lesson.updatedAt);
      if (!opts?.silent) {
        setStatusMessage(nextStatus === "pending_approval" ? "Submitted for approval." : "Draft saved.");
        toast.success(nextStatus === "pending_approval" ? "Lesson submitted." : "Draft saved.");
      }
      if (nextStatus === "pending_approval" && opts?.navigateOnSubmit !== false) {
        nav(`/teacher/lessons${search}`);
      }
    } finally {
      setSaving(false);
    }
  }

  const subjectOptions = useMemo(() => {
    return subjects.filter((s) => s.classId === curriculumClassId && !s.deletedAt);
  }, [subjects, curriculumClassId]);

  const classOptions = useMemo(() => {
    return classes.filter((c) => c.levelId === curriculumLevelId && !c.deletedAt);
  }, [classes, curriculumLevelId]);

  // Default selections for new lessons (keep edits untouched).
  useEffect(() => {
    if (editLessonId) return;
    if (!curriculumLevelId && levels[0]) setCurriculumLevelId(levels[0].id);
  }, [editLessonId, curriculumLevelId, levels]);

  useEffect(() => {
    if (editLessonId) return;
    if (!curriculumLevelId) return;
    if (!curriculumClassId && classOptions[0]) setCurriculumClassId(classOptions[0].id);
  }, [editLessonId, curriculumLevelId, curriculumClassId, classOptions]);

  useEffect(() => {
    if (editLessonId) return;
    if (!curriculumClassId) return;
    if (!curriculumSubjectId && subjectOptions[0]) setCurriculumSubjectId(subjectOptions[0].id);
  }, [editLessonId, curriculumClassId, curriculumSubjectId, subjectOptions]);

  useEffect(() => {
    if (!curriculumReady) return;
    if (curriculumClassId) {
      const stillValid = classOptions.some((c) => c.id === curriculumClassId);
      if (!stillValid) setCurriculumClassId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curriculumReady, curriculumLevelId]);

  useEffect(() => {
    if (!curriculumReady) return;
    if (!curriculumSubjectId) return;
    const stillValid = subjectOptions.some((s) => s.id === curriculumSubjectId);
    if (!stillValid) setCurriculumSubjectId("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curriculumReady, curriculumClassId]);

  const valid =
    title.trim() &&
    description.trim() &&
    blocks.length > 0 &&
    Boolean(curriculumSubjectId) &&
    Boolean(curriculumClassId) &&
    Boolean(curriculumLevelId) &&
    Boolean(user?.schoolId);

  // Autosave draft while editing (offline-first).
  useEffect(() => {
    if (!dirty) return;
    if (!curriculumReady) return;
    const id = window.setInterval(() => {
      void saveDraft("draft", { silent: true, navigateOnSubmit: false });
    }, 7000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curriculumReady, dirty, title, description, blocks, quizzesById, curriculumLevelId, curriculumClassId, curriculumSubjectId, language, accessPolicy, tags]);

  function moveBlock(id: string, dir: -1 | 1) {
    markDirty();
    setBlocks((all) => {
      const idx = all.findIndex((b) => b.id === id);
      if (idx < 0) return all;
      const next = idx + dir;
      if (next < 0 || next >= all.length) return all;
      const copy = [...all];
      const [it] = copy.splice(idx, 1);
      copy.splice(next, 0, it);
      return copy;
    });
  }

  function removeBlock(id: string) {
    markDirty();
    setBlocks((all) => all.filter((b) => b.id !== id));
  }

  function duplicateBlock(id: string) {
    markDirty();
    setBlocks((all) => {
      const idx = all.findIndex((b) => b.id === id);
      if (idx < 0) return all;
      const original = all[idx] as any;
      const copy = { ...original, id: newId("block") };
      return [...all.slice(0, idx + 1), copy, ...all.slice(idx + 1)];
    });
  }

  // Very small HTML5 drag/drop reorder (no deps).
  const [dragId, setDragId] = useState<string | null>(null);
  function onDragStart(id: string) {
    setDragId(id);
  }
  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    markDirty();
    setBlocks((all) => {
      const from = all.findIndex((b) => b.id === dragId);
      const to = all.findIndex((b) => b.id === targetId);
      if (from < 0 || to < 0) return all;
      const copy = [...all];
      const [it] = copy.splice(from, 1);
      copy.splice(to, 0, it);
      return copy;
    });
    setDragId(null);
  }

  const missing = useMemo(
    () => validateAll(),
    [title, description, curriculumLevelId, curriculumClassId, curriculumSubjectId, blocks.length, quizzesById, user?.schoolId]
  );

  const steps: { id: StepId; label: string; description: string }[] = [
    { id: "metadata", label: "Metadata", description: "School, level, class, subject" },
    { id: "blocks", label: "Blocks", description: "Text, images, audio, video, PDF, PPTX" },
    { id: "quiz", label: "Quiz", description: "MCQ self-test" },
    { id: "preview", label: "Preview", description: "See what students will see" },
    { id: "submit", label: "Submit", description: "Validate and send to admin" }
  ];

  function canGoNext() {
    if (step === "metadata") {
      return (
        Boolean(user?.schoolId) &&
        Boolean(title.trim()) &&
        Boolean(description.trim()) &&
        Boolean(curriculumLevelId) &&
        Boolean(curriculumClassId) &&
        Boolean(curriculumSubjectId)
      );
    }
    if (step === "blocks") return blocks.length > 0;
    return true;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={editLessonId ? "Edit lesson" : "Create lesson"}
        description="Choose curriculum metadata first, then add blocks and quiz for self-testing."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={saving || !valid} onClick={() => void saveDraft("draft")}>
              Save draft
            </Button>
            <Button disabled={saving || !valid} onClick={() => void saveDraft("pending_approval")}>
              Submit for approval
            </Button>
          </div>
        }
      />

      {!user.schoolId ? (
        <Card title="School required">
          <div className="text-sm text-muted">
            Your teacher account is not linked to a school. Contact your School Admin to assign your school before creating lessons.
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-3">
          <Card title="Lesson workflow">
            <div className="space-y-2">
              {steps.map((s, idx) => {
                const active = s.id === step;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStep(s.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                      active ? "border-brand bg-surface2" : "border-border bg-surface hover:border-border/80"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-text">
                        {idx + 1}. {s.label}
                      </div>
                      {s.id === "submit" && missing.length > 0 ? (
                        <span className="text-xs text-warning">{missing.length} issues</span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-xs text-muted">{s.description}</div>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card title="Autosave">
            <div className="text-sm text-muted">
              Status:{" "}
              <span className="font-semibold text-text">
                {saving ? "Saving…" : dirty ? "Unsaved changes" : "Saved"}
              </span>
            </div>
            <div className="mt-2 text-xs text-muted">
              {lastSavedAt ? `Last saved: ${new Date(lastSavedAt).toLocaleString()}` : "Not saved yet."}
            </div>
            {statusMessage ? <div className="mt-3 text-sm text-text">{statusMessage}</div> : null}
          </Card>
        </aside>

        <section className="min-w-0 space-y-4">
          {step === "metadata" ? (
            <Card title="Lesson metadata">
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  label="Title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    markDirty();
                  }}
                />
                <div>
                  <div className="mb-1 text-sm text-muted">School</div>
                  <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text">
                    {school?.name ?? "School"}
                  </div>
                </div>
                <Select
                  label="Level"
                  value={curriculumLevelId}
                  onChange={(e) => {
                    setCurriculumLevelId(e.target.value);
                    setCurriculumClassId("");
                    setCurriculumSubjectId("");
                    markDirty();
                  }}
                >
                  <option value="">Select level…</option>
                  {levels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Class"
                  value={curriculumClassId}
                  onChange={(e) => {
                    setCurriculumClassId(e.target.value);
                    setCurriculumSubjectId("");
                    markDirty();
                  }}
                  disabled={!curriculumLevelId}
                >
                  <option value="">Select class…</option>
                  {classOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Subject"
                  value={curriculumSubjectId}
                  onChange={(e) => {
                    setCurriculumSubjectId(e.target.value);
                    markDirty();
                  }}
                  disabled={!curriculumClassId}
                >
                  <option value="">Select subject…</option>
                  {subjectOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Language"
                  value={language}
                  onChange={(e) => {
                    setLanguage(e.target.value as "en" | "sw");
                    markDirty();
                  }}
                >
                  <option value="en">English</option>
                  <option value="sw">Swahili</option>
                </Select>
                <Select
                  label="Access"
                  value={accessPolicy}
                  onChange={(e) => {
                    setAccessPolicy(e.target.value as AccessPolicy);
                    markDirty();
                  }}
                >
                  <option value="free">Free</option>
                  <option value="coupon">Requires coupon</option>
                </Select>
                <div className="md:col-span-2">
                  <Input
                    label="Tags (comma separated)"
                    value={tags}
                    onChange={(e) => {
                      setTags(e.target.value);
                      markDirty();
                    }}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block">
                    <div className="mb-1 text-sm text-muted">Description</div>
                    <textarea
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-brand"
                      rows={4}
                      value={description}
                      onChange={(e) => {
                        setDescription(e.target.value);
                        markDirty();
                      }}
                    />
                  </label>
                </div>
              </div>
              {levels.length === 0 || classOptions.length === 0 || subjectOptions.length === 0 ? (
                <div className="mt-3 text-sm text-warning">
                  Curriculum is not configured for this selection. Ask an admin to configure Level/Class/Subject in Admin → Settings.
                </div>
              ) : null}
            </Card>
          ) : null}

          {step === "blocks" ? (
            <Card
              title="Lesson content blocks"
              actions={
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={() => void addTextBlock()}>
                    Add text
                  </Button>
                  <Button variant="secondary" onClick={() => void addStepBreakBlock()}>
                    Add step break
                  </Button>
                  <Button variant="secondary" onClick={() => void addQuizStepBlock()}>
                    Add quiz step
                  </Button>
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-surface2 px-4 py-2 text-sm font-medium text-text hover:bg-surface2/80">
                    Upload file
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,audio/*,video/mp4,video/webm,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void addFileBlock(f);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
              }
            >
              <div className="mb-3 text-xs text-muted">
                Upload limits: image {limitsMb.image}MB • audio {limitsMb.audio}MB • video {limitsMb.video}MB • PDF{" "}
                {limitsMb.pdf}MB • PPTX {limitsMb.pptx}MB
              </div>
              <div className="space-y-3">
                {blocks.map((b, idx) => (
                  <div
                    key={b.id}
                    className={`rounded-lg border bg-surface p-3 ${dragId === b.id ? "border-brand" : "border-border"}`}
                    draggable
                    onDragStart={() => onDragStart(b.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDrop(b.id)}
                    aria-label={`Block ${idx + 1}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="cursor-grab select-none text-xs text-muted" title="Drag to reorder">
                          ☰
                        </span>
                        <div className="text-xs text-muted">
                          {idx + 1}. {b.type.toUpperCase()}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={() => moveBlock(b.id, -1)} disabled={idx === 0}>
                          Up
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => moveBlock(b.id, 1)}
                          disabled={idx === blocks.length - 1}
                        >
                          Down
                        </Button>
                        <Button variant="secondary" onClick={() => duplicateBlock(b.id)}>
                          Duplicate
                        </Button>
                        <Button variant="danger" onClick={() => removeBlock(b.id)}>
                          Remove
                        </Button>
                      </div>
                    </div>
                    {b.type === "text" ? (
                      <div className="mt-2 space-y-2">
                        <Select
                          label={`Text type (block ${idx + 1})`}
                          value={b.variant}
                          onChange={(e) => {
                            markDirty();
                            setBlocks((all) =>
                              all.map((x) => (x.id === b.id ? { ...x, variant: e.target.value as any } : x))
                            );
                          }}
                        >
                          <option value="title">Title</option>
                          <option value="subtitle">Subtitle</option>
                          <option value="heading">Heading</option>
                          <option value="body">Body</option>
                        </Select>
                        <textarea
                          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-brand"
                          rows={5}
                          aria-label={`Text block ${idx + 1}`}
                          value={b.text}
                          onChange={(e) => {
                            markDirty();
                            setBlocks((all) =>
                              all.map((x) => (x.id === b.id ? { ...x, text: e.target.value } : x))
                            );
                          }}
                        />
                      </div>
                    ) : b.type === "step_break" ? (
                      <div className="mt-2">
                        <Input
                          label="Section title"
                          value={b.title ?? ""}
                          onChange={(e) => {
                            markDirty();
                            setBlocks((all) =>
                              all.map((x) => (x.id === b.id ? { ...x, title: e.target.value } : x))
                            );
                          }}
                        />
                      </div>
                    ) : b.type === "quiz" ? (
                      <div className="mt-2 space-y-2">
                        <div className="grid gap-3 md:grid-cols-2">
                          <Input
                            label="Quiz step title"
                            value={b.title ?? ""}
                            onChange={(e) => {
                              markDirty();
                              setBlocks((all) =>
                                all.map((x) => (x.id === b.id ? { ...x, title: e.target.value } : x))
                              );
                            }}
                          />
                          <Input
                            label="Pass score (%)"
                            value={String(b.passScorePct ?? 70)}
                            onChange={(e) => {
                              const raw = Number(e.target.value);
                              const pct = Number.isFinite(raw) ? Math.max(0, Math.min(100, Math.round(raw))) : 70;
                              markDirty();
                              setBlocks((all) =>
                                all.map((x) => (x.id === b.id ? { ...x, passScorePct: pct } : x))
                              );
                            }}
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setSelectedQuizId(b.quizId);
                              setStep("quiz");
                            }}
                          >
                            Edit questions
                          </Button>
                          <div className="text-xs text-muted">Quiz ID: {b.quizId}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 text-sm text-muted">{"name" in b ? b.name : ""}</div>
                    )}
                  </div>
                ))}
                {blocks.length === 0 ? <div className="text-sm text-muted">Add at least one content block.</div> : null}
              </div>
            </Card>
          ) : null}

          {step === "quiz" ? (
            <Card
              title="Quizzes (MCQ self-test)"
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="secondary" onClick={() => void addQuizStepBlock()}>
                    Add quiz step
                  </Button>
                  <Button variant="secondary" onClick={addQuestion} disabled={!selectedQuizId}>
                    Add question
                  </Button>
                </div>
              }
            >
              {Object.keys(quizzesById).length === 0 ? (
                <div className="text-sm text-muted">
                  No quizzes yet. Add a quiz step in Blocks to gate progress, then edit its questions here.
                </div>
              ) : (
                <div className="space-y-4">
                  <Select
                    label="Select quiz"
                    value={selectedQuizId ?? ""}
                    onChange={(e) => setSelectedQuizId(e.target.value || null)}
                  >
                    <option value="">Select quiz…</option>
                    {Object.keys(quizzesById)
                      .sort((a, b) => a.localeCompare(b))
                      .map((id) => {
                        const label = (() => {
                          const qb = blocks.find(
                            (b): b is Extract<LessonBlock, { type: "quiz" }> => b.type === "quiz" && b.quizId === id
                          );
                          return qb?.title?.trim() || id;
                        })();
                        return (
                          <option key={id} value={id}>
                            {label}
                          </option>
                        );
                      })}
                  </Select>

                  {selectedQuizId && quizzesById[selectedQuizId] ? (
                    <div className="space-y-4">
                      {quizzesById[selectedQuizId]!.questions.map((q, idx) => (
                        <div key={q.id} className="rounded-lg border border-border bg-surface p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-semibold text-text">Question {idx + 1}</div>
                            <Button
                              variant="danger"
                              onClick={() => {
                                markDirty();
                                setQuizzesById((m) => {
                                  const quiz = m[selectedQuizId];
                                  if (!quiz) return m;
                                  return {
                                    ...m,
                                    [selectedQuizId]: { ...quiz, questions: quiz.questions.filter((x) => x.id !== q.id) }
                                  };
                                });
                              }}
                            >
                              Remove
                            </Button>
                          </div>

                          <div className="mt-3 space-y-3">
                            <Input
                              label="Prompt"
                              value={q.prompt}
                              onChange={(e) => {
                                markDirty();
                                setQuizzesById((m) => {
                                  const quiz = m[selectedQuizId];
                                  if (!quiz) return m;
                                  return {
                                    ...m,
                                    [selectedQuizId]: {
                                      ...quiz,
                                      questions: quiz.questions.map((x) => (x.id === q.id ? { ...x, prompt: e.target.value } : x))
                                    }
                                  };
                                });
                              }}
                            />

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="text-sm text-muted">Options</div>
                                <Button
                                  variant="secondary"
                                  onClick={() => {
                                    markDirty();
                                    setQuizzesById((m) => {
                                      const quiz = m[selectedQuizId];
                                      if (!quiz) return m;
                                      return {
                                        ...m,
                                        [selectedQuizId]: {
                                          ...quiz,
                                          questions: quiz.questions.map((x) =>
                                            x.id === q.id ? { ...x, options: [...x.options, ""] } : x
                                          )
                                        }
                                      };
                                    });
                                  }}
                                >
                                  Add option
                                </Button>
                              </div>

                              <div className="grid gap-3 md:grid-cols-2">
                                {q.options.map((opt, i) => (
                                  <div key={i} className="space-y-1">
                                    <Input
                                      label={`Option ${i + 1}`}
                                      value={opt}
                                      onChange={(e) => {
                                        markDirty();
                                        setQuizzesById((m) => {
                                          const quiz = m[selectedQuizId];
                                          if (!quiz) return m;
                                          return {
                                            ...m,
                                            [selectedQuizId]: {
                                              ...quiz,
                                              questions: quiz.questions.map((x) =>
                                                x.id !== q.id
                                                  ? x
                                                  : { ...x, options: x.options.map((o, oi) => (oi === i ? e.target.value : o)) }
                                              )
                                            }
                                          };
                                        });
                                      }}
                                    />
                                    {q.options.length > 2 ? (
                                      <button
                                        type="button"
                                        className="text-xs text-danger hover:underline"
                                        onClick={() => {
                                          markDirty();
                                          setQuizzesById((m) => {
                                            const quiz = m[selectedQuizId];
                                            if (!quiz) return m;
                                            return {
                                              ...m,
                                              [selectedQuizId]: {
                                                ...quiz,
                                                questions: quiz.questions.map((x) => {
                                                  if (x.id !== q.id) return x;
                                                  const nextOptions = x.options.filter((_, oi) => oi !== i);
                                                  const nextCorrect = Math.min(x.correctOptionIndex, nextOptions.length - 1);
                                                  return { ...x, options: nextOptions, correctOptionIndex: nextCorrect };
                                                })
                                              }
                                            };
                                          });
                                        }}
                                      >
                                        Remove option
                                      </button>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <Select
                              label="Correct option"
                              value={String(q.correctOptionIndex)}
                              onChange={(e) => {
                                markDirty();
                                setQuizzesById((m) => {
                                  const quiz = m[selectedQuizId];
                                  if (!quiz) return m;
                                  return {
                                    ...m,
                                    [selectedQuizId]: {
                                      ...quiz,
                                      questions: quiz.questions.map((x) =>
                                        x.id === q.id ? { ...x, correctOptionIndex: Number(e.target.value) } : x
                                      )
                                    }
                                  };
                                });
                              }}
                            >
                              {q.options.map((_, i) => (
                                <option key={i} value={String(i)}>
                                  Option {i + 1}
                                </option>
                              ))}
                            </Select>

                            <label className="block">
                              <div className="mb-1 text-sm text-muted">Explanation</div>
                              <textarea
                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-brand"
                                rows={2}
                                value={q.explanation}
                                onChange={(e) => {
                                  markDirty();
                                  setQuizzesById((m) => {
                                    const quiz = m[selectedQuizId];
                                    if (!quiz) return m;
                                    return {
                                      ...m,
                                      [selectedQuizId]: {
                                        ...quiz,
                                        questions: quiz.questions.map((x) => (x.id === q.id ? { ...x, explanation: e.target.value } : x))
                                      }
                                    };
                                  });
                                }}
                              />
                            </label>

                            <Input
                              label="Concept tags (comma separated)"
                              value={q.conceptTags.join(", ")}
                              onChange={(e) => {
                                markDirty();
                                setQuizzesById((m) => {
                                  const quiz = m[selectedQuizId];
                                  if (!quiz) return m;
                                  return {
                                    ...m,
                                    [selectedQuizId]: {
                                      ...quiz,
                                      questions: quiz.questions.map((x) =>
                                        x.id === q.id
                                          ? {
                                              ...x,
                                              conceptTags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean)
                                            }
                                          : x
                                      )
                                    }
                                  };
                                });
                              }}
                            />
                          </div>
                        </div>
                      ))}

                      {quizzesById[selectedQuizId]!.questions.length === 0 ? (
                        <div className="text-sm text-muted">Add questions for self-testing.</div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="text-sm text-muted">Select a quiz to edit its questions.</div>
                  )}
                </div>
              )}
            </Card>
          ) : null}

          {step === "preview" ? (
            <div className="space-y-4">
              <Card title="Lesson preview">
                {blocks.length === 0 ? (
                  <div className="text-sm text-muted">No blocks yet.</div>
                ) : (
                  <LessonStepperPlayer
                    steps={buildLessonSteps({ blocks, assetsById, quizzesById })}
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
                )}
              </Card>
            </div>
          ) : null}

          {step === "submit" ? (
            <Card title="Submit checklist">
              <div className="text-sm text-muted">
                {missing.length === 0 ? "All checks passed." : "Fix the items below before submitting for approval."}
              </div>
              {missing.length > 0 ? (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-warning">
                  {missing.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => void saveDraft("draft")} disabled={saving || !valid}>
                  Save draft
                </Button>
                <Button
                  onClick={() => void saveDraft("pending_approval")}
                  disabled={saving || missing.length > 0 || !valid}
                >
                  Submit for approval
                </Button>
              </div>
            </Card>
          ) : null}

          <div className="flex items-center justify-between">
            <Button
              variant="secondary"
              onClick={() => {
                const idx = steps.findIndex((s) => s.id === step);
                if (idx > 0) setStep(steps[idx - 1].id);
              }}
              disabled={step === "metadata"}
            >
              Back
            </Button>
            <div className="text-xs text-muted">
              {dirty ? "Unsaved changes" : "Saved"} • Lesson ID: <span className="font-mono">{lessonId}</span>
            </div>
            <Button
              onClick={() => {
                if (!canGoNext()) return;
                const idx = steps.findIndex((s) => s.id === step);
                if (idx < steps.length - 1) setStep(steps[idx + 1].id);
              }}
              disabled={step === "submit" || !canGoNext()}
            >
              Next
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
