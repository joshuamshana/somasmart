import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import type {
  AccessPolicy,
  CurriculumClass,
  CurriculumLevel,
  CurriculumSubject,
  Lesson,
  LessonAsset,
  LessonBlockV2,
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
import { getLessonBlocksV2, normalizeBlockV2, putLessonBlocksV2 } from "@/shared/content/lessonContent";

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

type StepId = "metadata" | "blocks" | "preview" | "submit";

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

  const [blocksV2, setBlocksV2] = useState<LessonBlockV2[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [assetsById, setAssetsById] = useState<Record<string, LessonAsset | undefined>>({});
  const [quizzesById, setQuizzesById] = useState<Record<string, Quiz>>({});

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

  const selectedBlock = useMemo(
    () => blocksV2.find((block) => block.id === selectedBlockId) ?? null,
    [blocksV2, selectedBlockId]
  );

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
      const quizzes = await db.quizzes.where("lessonId").equals(editLessonId).toArray();
      const quizMap: Record<string, Quiz> = {};
      for (const quiz of quizzes) quizMap[quiz.id] = quiz;
      const v2Blocks = await getLessonBlocksV2({ lessonId: editLessonId, quizzesById: quizMap });
      if (!l) return;
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
      setQuizzesById(quizMap);
      setBlocksV2(v2Blocks);
      setSelectedBlockId(v2Blocks.find((b) => !b.isDivider)?.id ?? v2Blocks[0]?.id ?? null);
      setDirty(false);
      setLastSavedAt(l.updatedAt ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [editLessonId, userId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ids = Array.from(
        new Set(
          blocksV2.flatMap((block) =>
            block.components
              .filter((component): component is Extract<typeof component, { type: "media" }> => component.type === "media")
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

  const subjectOptions = useMemo(
    () => subjects.filter((s) => s.classId === curriculumClassId && !s.deletedAt),
    [subjects, curriculumClassId]
  );
  const classOptions = useMemo(
    () => classes.filter((c) => c.levelId === curriculumLevelId && !c.deletedAt),
    [classes, curriculumLevelId]
  );

  useEffect(() => {
    if (editLessonId) return;
    if (!curriculumLevelId && levels[0]) setCurriculumLevelId(levels[0].id);
  }, [curriculumLevelId, editLessonId, levels]);
  useEffect(() => {
    if (editLessonId) return;
    if (!curriculumLevelId) return;
    if (!curriculumClassId && classOptions[0]) setCurriculumClassId(classOptions[0].id);
  }, [classOptions, curriculumClassId, curriculumLevelId, editLessonId]);
  useEffect(() => {
    if (editLessonId) return;
    if (!curriculumClassId) return;
    if (!curriculumSubjectId && subjectOptions[0]) setCurriculumSubjectId(subjectOptions[0].id);
  }, [curriculumClassId, curriculumSubjectId, editLessonId, subjectOptions]);

  function addBlock(template: "text" | "text_image" | "text_video" | "pdf" | "upload_quiz") {
    const nextId = newId("blockv2");
    const next: LessonBlockV2 = {
      id: nextId,
      title:
        template === "text"
          ? "Text"
          : template === "text_image"
            ? "Text + Image"
            : template === "text_video"
              ? "Text + Video"
              : template === "pdf"
                ? "PDF"
                : "Upload + Quiz",
      components: [{ id: newId("cmp"), type: "text", variant: "body", text: "" }]
    };
    if (template === "upload_quiz") {
      const quizId = newId("quiz");
      setQuizzesById((all) => ({ ...all, [quizId]: { id: quizId, lessonId, questions: [] } }));
      next.quizGate = { quizId, requiredToContinue: true, passScorePct: 70 };
      next.components = [];
    }
    if (template === "pdf") next.components = [];
    markDirty();
    setBlocksV2((all) => [...all, next]);
    setSelectedBlockId(nextId);
  }

  function addTextComponent() {
    if (!selectedBlock) return;
    const hasPdf = selectedBlock.components.some((c) => c.type === "media" && c.mediaType === "pdf");
    if (hasPdf) {
      setStatusMessage("PDF blocks are PDF-only. Remove PDF first to add text.");
      return;
    }
    markDirty();
    setBlocksV2((all) =>
      all.map((block) =>
        block.id === selectedBlock.id
          ? {
              ...block,
              components: [...block.components, { id: newId("cmp"), type: "text", variant: "body", text: "" }]
            }
          : block
      )
    );
  }

  async function attachMedia(file: File) {
    if (!selectedBlock) return;
    const kind = fileKind(file.type);
    if (!kind) {
      setStatusMessage("Unsupported file type. Use image/audio/video/pdf/pptx.");
      return;
    }
    const maxMb = limitsMb[kind] ?? 20;
    if (file.size > maxMb * 1024 * 1024) {
      setStatusMessage("File too large. Please upload a smaller file.");
      return;
    }
    let pageCount: number | undefined = undefined;
    if (kind === "pdf") {
      const ab = await file.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: ab }).promise;
      pageCount = doc.numPages;
      await doc.destroy();
    }
    const assetId = newId("asset");
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
    await db.lessonAssets.put(asset);
    setAssetsById((all) => ({ ...all, [asset.id]: asset }));

    markDirty();
    setBlocksV2((all) =>
      all.map((block) => {
        if (block.id !== selectedBlock.id) return block;
        const textComponents = block.components.filter((component) => component.type === "text");
        const nextTextComponents = kind === "pdf" ? [] : textComponents;
        return {
          ...block,
          components: [
            ...nextTextComponents,
            {
              id: newId("cmp"),
              type: "media",
              mediaType: kind,
              assetId: asset.id,
              name: file.name,
              mime: file.type
            }
          ]
        };
      })
    );
  }

  function setQuizGate(enabled: boolean) {
    if (!selectedBlock) return;
    markDirty();
    setBlocksV2((all) =>
      all.map((block) => {
        if (block.id !== selectedBlock.id) return block;
        if (!enabled) return { ...block, quizGate: undefined };
        if (block.quizGate) return block;
        const quizId = newId("quiz");
        setQuizzesById((q) => ({ ...q, [quizId]: { id: quizId, lessonId, questions: [] } }));
        return {
          ...block,
          quizGate: { quizId, requiredToContinue: true, passScorePct: 70 }
        };
      })
    );
  }

  function updateSelectedBlock(updater: (block: LessonBlockV2) => LessonBlockV2) {
    if (!selectedBlock) return;
    markDirty();
    setBlocksV2((all) => all.map((block) => (block.id === selectedBlock.id ? updater(block) : block)));
  }

  function removeSelectedBlock() {
    if (!selectedBlock) return;
    markDirty();
    setBlocksV2((all) => all.filter((block) => block.id !== selectedBlock.id));
    setSelectedBlockId((prev) => {
      if (prev !== selectedBlock.id) return prev;
      const remaining = blocksV2.filter((block) => block.id !== selectedBlock.id);
      return remaining[0]?.id ?? null;
    });
  }

  function moveSelectedBlock(dir: -1 | 1) {
    if (!selectedBlock) return;
    const idx = blocksV2.findIndex((block) => block.id === selectedBlock.id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= blocksV2.length) return;
    markDirty();
    setBlocksV2((all) => {
      const next = [...all];
      const [item] = next.splice(idx, 1);
      next.splice(target, 0, item);
      return next;
    });
  }

  function addQuestion() {
    const gate = selectedBlock?.quizGate;
    if (!gate) return;
    markDirty();
    setQuizzesById((all) => {
      const quiz = all[gate.quizId];
      if (!quiz) return all;
      const q: QuizQuestion = {
        id: newId("q"),
        prompt: "",
        options: ["", "", "", ""],
        correctOptionIndex: 0,
        explanation: "",
        conceptTags: [],
        nextSteps: [{ type: "retry_quiz" }, { type: "repeat_lesson" }]
      };
      return { ...all, [gate.quizId]: { ...quiz, questions: [...quiz.questions, q] } };
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
    if (blocksV2.length === 0) missing.push("Add at least one block");
    blocksV2.forEach((block, index) => {
      const issues = normalizeBlockV2(block);
      issues.forEach((issue) => missing.push(`Block ${index + 1}: ${issue}`));
      if (block.quizGate) {
        const quiz = quizzesById[block.quizGate.quizId];
        if (!quiz) {
          missing.push(`Block ${index + 1}: quiz is missing`);
          return;
        }
        if (quiz.questions.length === 0) missing.push(`Block ${index + 1}: quiz needs at least one question`);
        quiz.questions.forEach((q, qIndex) => {
          if (!q.prompt.trim()) missing.push(`Block ${index + 1} Q${qIndex + 1}: prompt is required`);
          if (q.options.filter((opt) => opt.trim()).length < 2) {
            missing.push(`Block ${index + 1} Q${qIndex + 1}: at least 2 options`);
          }
          if (!q.explanation.trim()) missing.push(`Block ${index + 1} Q${qIndex + 1}: explanation is required`);
        });
      }
    });
    return missing;
  }

  async function saveDraft(nextStatus: Lesson["status"] = "draft", opts?: { silent?: boolean; navigateOnSubmit?: boolean }) {
    const currentUser = user;
    setSaving(true);
    if (!opts?.silent) setStatusMessage(null);
    try {
      if (!currentUser?.schoolId) {
        if (!opts?.silent) setStatusMessage("Your teacher account is not linked to a school.");
        return;
      }
      const levelRow = curriculumLevelId ? await db.curriculumLevels.get(curriculumLevelId) : null;
      const classRow = curriculumClassId ? await db.curriculumClasses.get(curriculumClassId) : null;
      const subjectRow = curriculumSubjectId ? await db.curriculumSubjects.get(curriculumSubjectId) : null;
      const lesson: Lesson = {
        id: lessonId,
        title: title.trim(),
        schoolId: currentUser.schoolId,
        curriculumLevelId: curriculumLevelId || undefined,
        curriculumClassId: curriculumClassId || undefined,
        curriculumSubjectId: curriculumSubjectId || undefined,
        level: levelRow?.name ?? "",
        className: classRow?.name ?? "",
        subject: subjectRow?.name ?? "",
        language,
        accessPolicy,
        tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        description: description.trim(),
        status: nextStatus,
        createdByUserId: userId,
        createdAt,
        updatedAt: nowIso()
      };
      const quizzes = Object.values(quizzesById).map((quiz) => ({ ...quiz, lessonId }));

      await db.transaction("rw", [db.lessons, db.lessonContentsV2, db.lessonContents, db.quizzes], async () => {
        await db.lessons.put(lesson);
        await putLessonBlocksV2({ lessonId, blocksV2 });
        await db.lessonContents.put({ lessonId, blocks: [] });
        const existing = await db.quizzes.where("lessonId").equals(lessonId).toArray();
        const keep = new Set(quizzes.map((quiz) => quiz.id));
        await Promise.all(existing.filter((quiz) => !keep.has(quiz.id)).map((quiz) => db.quizzes.delete(quiz.id)));
        if (quizzes.length > 0) await db.quizzes.bulkPut(quizzes);
      });

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

  const steps: { id: StepId; label: string; description: string }[] = [
    { id: "metadata", label: "Metadata", description: "School, level, class, subject" },
    { id: "blocks", label: "Blocks", description: "Composite content + optional quiz gate" },
    { id: "preview", label: "Preview", description: "Step-by-step student experience" },
    { id: "submit", label: "Submit", description: "Validate and send to admin" }
  ];
  const missing = useMemo(
    () => validateAll(),
    [accessPolicy, blocksV2, curriculumClassId, curriculumLevelId, curriculumSubjectId, description, quizzesById, title, user?.schoolId]
  );
  const valid =
    Boolean(title.trim()) &&
    Boolean(description.trim()) &&
    Boolean(curriculumLevelId) &&
    Boolean(curriculumClassId) &&
    Boolean(curriculumSubjectId) &&
    Boolean(user.schoolId) &&
    blocksV2.length > 0;
  const canGoNext =
    step === "metadata"
      ? Boolean(title.trim()) &&
        Boolean(description.trim()) &&
        Boolean(curriculumLevelId) &&
        Boolean(curriculumClassId) &&
        Boolean(curriculumSubjectId) &&
        Boolean(user.schoolId)
      : step === "blocks"
        ? blocksV2.length > 0
        : true;
  const previewSteps = useMemo(() => buildLessonSteps({ blocksV2, assetsById, quizzesById }), [assetsById, blocksV2, quizzesById]);

  return (
    <div className="space-y-4">
      <PageHeader
        title={editLessonId ? "Edit lesson (v2)" : "Create lesson (v2)"}
        description="Build composite blocks (text + optional media) and optional quiz gates."
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

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-3">
          <Card title="Workflow">
            <div className="space-y-2">
              {steps.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setStep(item.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                    step === item.id ? "border-brand bg-surface2" : "border-border bg-surface hover:border-border/80"
                  }`}
                >
                  <div className="font-semibold text-text">
                    {idx + 1}. {item.label}
                  </div>
                  <div className="mt-1 text-xs text-muted">{item.description}</div>
                </button>
              ))}
            </div>
          </Card>
          <Card title="Autosave">
            <div className="text-sm text-muted">
              Status: <span className="font-semibold text-text">{saving ? "Saving…" : dirty ? "Unsaved changes" : "Saved"}</span>
            </div>
            <div className="mt-2 text-xs text-muted">
              {lastSavedAt ? `Last saved: ${new Date(lastSavedAt).toLocaleString()}` : "Not saved yet."}
            </div>
            {statusMessage ? <div className="mt-2 text-sm text-text">{statusMessage}</div> : null}
          </Card>
        </aside>

        <section className="space-y-4">
          {step === "metadata" ? (
            <Card title="Lesson metadata">
              <div className="grid gap-3 md:grid-cols-2">
                <Input label="Title" value={title} onChange={(e) => { setTitle(e.target.value); markDirty(); }} />
                <div>
                  <div className="mb-1 text-sm text-muted">School</div>
                  <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text">{school?.name ?? "School"}</div>
                </div>
                <Select label="Level" value={curriculumLevelId} onChange={(e) => { setCurriculumLevelId(e.target.value); markDirty(); }}>
                  <option value="">Select level…</option>
                  {levels.map((level) => (
                    <option key={level.id} value={level.id}>{level.name}</option>
                  ))}
                </Select>
                <Select label="Class" value={curriculumClassId} onChange={(e) => { setCurriculumClassId(e.target.value); markDirty(); }} disabled={!curriculumLevelId}>
                  <option value="">Select class…</option>
                  {classOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
                <Select label="Subject" value={curriculumSubjectId} onChange={(e) => { setCurriculumSubjectId(e.target.value); markDirty(); }} disabled={!curriculumClassId}>
                  <option value="">Select subject…</option>
                  {subjectOptions.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
                <Select label="Language" value={language} onChange={(e) => { setLanguage(e.target.value as "en" | "sw"); markDirty(); }}>
                  <option value="en">English</option>
                  <option value="sw">Swahili</option>
                </Select>
                <Select label="Access" value={accessPolicy} onChange={(e) => { setAccessPolicy(e.target.value as AccessPolicy); markDirty(); }}>
                  <option value="free">Free</option>
                  <option value="coupon">Requires coupon</option>
                </Select>
                <Input label="Tags (comma separated)" value={tags} onChange={(e) => { setTags(e.target.value); markDirty(); }} />
                <label className="block md:col-span-2">
                  <div className="mb-1 text-sm text-muted">Description</div>
                  <textarea
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-brand"
                    rows={4}
                    value={description}
                    onChange={(e) => { setDescription(e.target.value); markDirty(); }}
                  />
                </label>
              </div>
            </Card>
          ) : null}

          {step === "blocks" ? (
            <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
              <Card
                title="Blocks"
                actions={
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => addBlock("text")}>Add text</Button>
                    <Button variant="secondary" onClick={() => addBlock("text")}>Text-only</Button>
                    <Button variant="secondary" onClick={() => addBlock("text_image")}>Text + Image</Button>
                    <Button variant="secondary" onClick={() => addBlock("text_video")}>Text + Video</Button>
                    <Button variant="secondary" onClick={() => addBlock("pdf")}>PDF-only</Button>
                    <Button variant="secondary" onClick={() => addBlock("upload_quiz")}>Upload + Quiz</Button>
                  </div>
                }
              >
                <div className="space-y-2">
                  {blocksV2.map((block, index) => (
                    <button
                      key={block.id}
                      type="button"
                      onClick={() => setSelectedBlockId(block.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                        selectedBlockId === block.id ? "border-brand bg-surface2" : "border-border bg-surface hover:border-border/80"
                      }`}
                    >
                      <div className="font-semibold text-text">{index + 1}. {block.title?.trim() || "Untitled block"}</div>
                      <div className="mt-1 text-xs text-muted">
                        {block.components.map((c) => (c.type === "text" ? "Text" : c.mediaType.toUpperCase())).join(" + ") || "Gate-only"}
                      </div>
                      {block.quizGate ? <div className="mt-1 text-xs text-amber-300">Quiz gate {block.quizGate.passScorePct}%</div> : null}
                    </button>
                  ))}
                  {blocksV2.length === 0 ? <div className="text-sm text-muted">Create your first block.</div> : null}
                </div>
              </Card>

              <Card title="Block editor">
                {!selectedBlock ? (
                  <div className="text-sm text-muted">Select a block to edit.</div>
                ) : (
                  <div className="space-y-4">
                    <Input
                      label="Block title"
                      value={selectedBlock.title ?? ""}
                      onChange={(e) => updateSelectedBlock((block) => ({ ...block, title: e.target.value }))}
                    />

                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={addTextComponent}>Add Text</Button>
                      <label className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-surface2 px-4 py-2 text-sm font-medium text-text hover:bg-surface2/80">
                        Upload Media
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*,audio/*,video/mp4,video/webm,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void attachMedia(file);
                            e.currentTarget.value = "";
                          }}
                        />
                      </label>
                      <Button variant="secondary" onClick={() => moveSelectedBlock(-1)}>Up</Button>
                      <Button variant="secondary" onClick={() => moveSelectedBlock(1)}>Down</Button>
                      <Button variant="danger" onClick={removeSelectedBlock}>Remove</Button>
                    </div>

                    <div className="space-y-3">
                      {selectedBlock.components.map((component, idx) => (
                        <div key={component.id} className="rounded-lg border border-border bg-surface p-3">
                          {component.type === "text" ? (
                            <div className="space-y-2">
                              <div className="text-xs text-muted">Text component {idx + 1}</div>
                              <Select
                                label="Variant"
                                value={component.variant}
                                onChange={(e) =>
                                  updateSelectedBlock((block) => ({
                                    ...block,
                                    components: block.components.map((c) =>
                                      c.id === component.id && c.type === "text"
                                        ? { ...c, variant: e.target.value as typeof c.variant }
                                        : c
                                    )
                                  }))
                                }
                              >
                                <option value="title">Title</option>
                                <option value="subtitle">Subtitle</option>
                                <option value="heading">Heading</option>
                                <option value="body">Body</option>
                              </Select>
                              <textarea
                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-brand"
                                rows={4}
                                aria-label={`Text block ${idx + 1}`}
                                value={component.text}
                                onChange={(e) =>
                                  updateSelectedBlock((block) => ({
                                    ...block,
                                    components: block.components.map((c) =>
                                      c.id === component.id && c.type === "text" ? { ...c, text: e.target.value } : c
                                    )
                                  }))
                                }
                              />
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="text-xs text-muted">Media component</div>
                              <div className="text-sm text-text">{component.name} ({component.mediaType.toUpperCase()})</div>
                              {component.mediaType === "pdf" ? (
                                <div className="text-xs text-muted">PDF pages: {assetsById[component.assetId]?.pageCount ?? "unknown"}</div>
                              ) : null}
                            </div>
                          )}
                          <div className="mt-2">
                            <Button
                              variant="danger"
                              onClick={() =>
                                updateSelectedBlock((block) => ({
                                  ...block,
                                  components: block.components.filter((c) => c.id !== component.id)
                                }))
                              }
                            >
                              Remove component
                            </Button>
                          </div>
                        </div>
                      ))}
                      {selectedBlock.components.length === 0 ? <div className="text-sm text-muted">No components yet.</div> : null}
                    </div>

                    <div className="rounded-lg border border-border bg-surface p-3 space-y-3">
                      <label className="flex items-center gap-2 text-sm text-text">
                        <input
                          type="checkbox"
                          checked={Boolean(selectedBlock.quizGate)}
                          onChange={(e) => setQuizGate(e.target.checked)}
                        />
                        Require quiz to continue
                      </label>
                      {selectedBlock.quizGate ? (
                        <>
                          <Input
                            label="Pass score (%)"
                            value={String(selectedBlock.quizGate.passScorePct)}
                            onChange={(e) => {
                              const raw = Number(e.target.value);
                              updateSelectedBlock((block) => ({
                                ...block,
                                quizGate: block.quizGate
                                  ? { ...block.quizGate, passScorePct: Number.isFinite(raw) ? Math.max(0, Math.min(100, Math.round(raw))) : 70 }
                                  : undefined
                              }));
                            }}
                          />
                          <Button variant="secondary" onClick={addQuestion}>Add question</Button>
                          <QuizEditor
                            quiz={quizzesById[selectedBlock.quizGate.quizId]}
                            onUpdate={(quiz) => {
                              markDirty();
                              setQuizzesById((all) => ({ ...all, [quiz.id]: quiz }));
                            }}
                          />
                        </>
                      ) : null}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          ) : null}

          {step === "preview" ? (
            <Card title="Student preview">
              <LessonStepperPlayer
                steps={previewSteps}
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
          ) : null}

          {step === "submit" ? (
            <Card title="Submit checklist">
              <div className="text-sm text-muted">
                {missing.length === 0 ? "All checks passed." : "Fix the items below before submitting."}
              </div>
              {missing.length > 0 ? (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-warning">
                  {missing.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" disabled={saving || !valid} onClick={() => void saveDraft("draft")}>
                  Save draft
                </Button>
                <Button disabled={saving || missing.length > 0 || !valid} onClick={() => void saveDraft("pending_approval")}>
                  Submit for approval
                </Button>
              </div>
            </Card>
          ) : null}

          <div className="flex items-center justify-between">
            <Button
              variant="secondary"
              onClick={() => setStep((current) => steps[Math.max(0, steps.findIndex((s) => s.id === current) - 1)]!.id)}
              disabled={step === "metadata"}
            >
              Back
            </Button>
            <Button
              onClick={() => setStep((current) => steps[Math.min(steps.length - 1, steps.findIndex((s) => s.id === current) + 1)]!.id)}
              disabled={step === "submit" || !canGoNext}
            >
              Next
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

function QuizEditor({
  quiz,
  onUpdate
}: {
  quiz: Quiz | undefined;
  onUpdate: (quiz: Quiz) => void;
}) {
  if (!quiz) return <div className="text-sm text-warning">Quiz not found.</div>;
  return (
    <div className="space-y-3">
      {quiz.questions.map((q, idx) => (
        <div key={q.id} className="rounded-lg border border-border bg-surface p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold text-text">Question {idx + 1}</div>
            <Button
              variant="danger"
              onClick={() => onUpdate({ ...quiz, questions: quiz.questions.filter((x) => x.id !== q.id) })}
            >
              Remove
            </Button>
          </div>
          <div className="mt-3 space-y-2">
            <Input
              label="Prompt"
              value={q.prompt}
              onChange={(e) =>
                onUpdate({
                  ...quiz,
                  questions: quiz.questions.map((x) => (x.id === q.id ? { ...x, prompt: e.target.value } : x))
                })
              }
            />
            {q.options.map((option, optionIndex) => (
              <Input
                key={optionIndex}
                label={`Option ${optionIndex + 1}`}
                value={option}
                onChange={(e) =>
                  onUpdate({
                    ...quiz,
                    questions: quiz.questions.map((x) =>
                      x.id === q.id
                        ? { ...x, options: x.options.map((value, i) => (i === optionIndex ? e.target.value : value)) }
                        : x
                    )
                  })
                }
              />
            ))}
            <Select
              label="Correct option"
              value={String(q.correctOptionIndex)}
              onChange={(e) =>
                onUpdate({
                  ...quiz,
                  questions: quiz.questions.map((x) =>
                    x.id === q.id ? { ...x, correctOptionIndex: Number(e.target.value) } : x
                  )
                })
              }
            >
              {q.options.map((_, index) => (
                <option key={index} value={String(index)}>
                  Option {index + 1}
                </option>
              ))}
            </Select>
            <label className="block">
              <div className="mb-1 text-sm text-muted">Explanation</div>
              <textarea
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-brand"
                rows={2}
                value={q.explanation}
                onChange={(e) =>
                  onUpdate({
                    ...quiz,
                    questions: quiz.questions.map((x) => (x.id === q.id ? { ...x, explanation: e.target.value } : x))
                  })
                }
              />
            </label>
          </div>
        </div>
      ))}
      {quiz.questions.length === 0 ? <div className="text-sm text-muted">No questions yet.</div> : null}
    </div>
  );
}
