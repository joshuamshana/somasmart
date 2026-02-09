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
import { ActionBar } from "@/shared/ui/ActionBar";
import { toast } from "@/shared/ui/toastStore";
import { buildLessonSteps } from "@/features/content/lessonSteps";
import { LessonStepperPlayer } from "@/features/content/LessonStepperPlayer";
import { getLessonBlocksV2, normalizeBlockV2, putLessonBlocksV2 } from "@/shared/content/lessonContent";
import { loadPdfJs } from "@/shared/content/pdfRuntime";
import { ResponsiveCollection } from "@/shared/ui/ResponsiveCollection";
import { SectionTabs } from "@/shared/ui/SectionTabs";
import { ContextActionStrip } from "@/shared/ui/ContextActionStrip";
import {
  getStepFromSearch,
  LESSON_BUILDER_STEP_QUERY_KEY,
  type LessonBuilderStepId,
  withStepInSearch
} from "@/features/teacher/lessonBuilderStepQuery";

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

type StepId = LessonBuilderStepId;
type BlockRow = { block: LessonBlockV2; index: number };
type ComponentRow = { component: LessonBlockV2["components"][number]; index: number };
type QuestionRow = { question: QuizQuestion; index: number };

export function TeacherLessonBuilderPage() {
  const { user } = useAuth();
  const params = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const search = location.search ?? "";
  const queryStep = getStepFromSearch(search);
  const listSearch = useMemo(() => {
    const params = new URLSearchParams(search);
    params.delete(LESSON_BUILDER_STEP_QUERY_KEY);
    const next = params.toString();
    return next ? `?${next}` : "";
  }, [search]);
  const editLessonId = params.lessonId ?? null;

  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
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
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
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
  const step = queryStep;

  function markDirty() {
    setDirty(true);
  }

  function setStep(nextStep: StepId) {
    if (nextStep === step) return;
    nav(
      {
        pathname: location.pathname,
        search: withStepInSearch(search, nextStep)
      },
      { replace: true }
    );
  }

  const selectedBlock = useMemo(
    () => blocksV2.find((block) => block.id === selectedBlockId) ?? null,
    [blocksV2, selectedBlockId]
  );

  const selectedQuiz = useMemo(
    () => (selectedBlock?.quizGate ? quizzesById[selectedBlock.quizGate.quizId] : undefined),
    [quizzesById, selectedBlock?.quizGate, selectedBlock?.quizGate?.quizId]
  );

  const selectedComponent = useMemo(
    () => selectedBlock?.components.find((component) => component.id === selectedComponentId) ?? null,
    [selectedBlock?.components, selectedComponentId]
  );

  const selectedQuestion = useMemo(
    () => selectedQuiz?.questions.find((question) => question.id === selectedQuestionId) ?? null,
    [selectedQuestionId, selectedQuiz?.questions]
  );

  const blockRows = useMemo<BlockRow[]>(() => blocksV2.map((block, index) => ({ block, index })), [blocksV2]);
  const componentRows = useMemo<ComponentRow[]>(
    () => selectedBlock?.components.map((component, index) => ({ component, index })) ?? [],
    [selectedBlock?.components]
  );
  const questionRows = useMemo<QuestionRow[]>(
    () => selectedQuiz?.questions.map((question, index) => ({ question, index })) ?? [],
    [selectedQuiz?.questions]
  );

  const selectedComponentIndex = useMemo(
    () => componentRows.findIndex((row) => row.component.id === selectedComponentId),
    [componentRows, selectedComponentId]
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
        setStatusMessage("You can\'t edit this lesson.");
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
      setSelectedComponentId(null);
      setSelectedQuestionId(null);
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

  useEffect(() => {
    if (!selectedBlock) {
      setSelectedComponentId(null);
      setSelectedQuestionId(null);
      return;
    }

    setSelectedComponentId((prev) => {
      if (prev && selectedBlock.components.some((component) => component.id === prev)) return prev;
      return selectedBlock.components[0]?.id ?? null;
    });

    const quiz = selectedBlock.quizGate ? quizzesById[selectedBlock.quizGate.quizId] : undefined;
    setSelectedQuestionId((prev) => {
      if (!quiz) return null;
      if (prev && quiz.questions.some((question) => question.id === prev)) return prev;
      return quiz.questions[0]?.id ?? null;
    });
  }, [quizzesById, selectedBlock]);

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
    const initialComponentId = newId("cmp");
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
      components: [{ id: initialComponentId, type: "text", variant: "body", text: "" }]
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
    setSelectedComponentId(next.components[0]?.id ?? null);
    setSelectedQuestionId(null);
  }

  function addTextComponent() {
    if (!selectedBlock) return;
    const hasPdf = selectedBlock.components.some((component) => component.type === "media" && component.mediaType === "pdf");
    if (hasPdf) {
      setStatusMessage("PDF blocks are PDF-only. Remove PDF first to add text.");
      return;
    }

    const nextComponentId = newId("cmp");
    markDirty();
    setBlocksV2((all) =>
      all.map((block) =>
        block.id === selectedBlock.id
          ? {
              ...block,
              components: [...block.components, { id: nextComponentId, type: "text", variant: "body", text: "" }]
            }
          : block
      )
    );
    setSelectedComponentId(nextComponentId);
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
    let pageCount: number | undefined;
    if (kind === "pdf") {
      const pdfjs = await loadPdfJs();
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

    const mediaComponentId = newId("cmp");
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
              id: mediaComponentId,
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
    setSelectedComponentId(mediaComponentId);
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
    if (!enabled) setSelectedQuestionId(null);
  }

  function updateSelectedBlock(updater: (block: LessonBlockV2) => LessonBlockV2) {
    if (!selectedBlock) return;
    markDirty();
    setBlocksV2((all) => all.map((block) => (block.id === selectedBlock.id ? updater(block) : block)));
  }

  function removeBlockById(blockId: string) {
    markDirty();
    setBlocksV2((all) => all.filter((block) => block.id !== blockId));
    setSelectedBlockId((prev) => {
      if (prev !== blockId) return prev;
      const remaining = blocksV2.filter((block) => block.id !== blockId);
      return remaining[0]?.id ?? null;
    });
    setSelectedComponentId(null);
    setSelectedQuestionId(null);
  }

  function removeSelectedBlock() {
    if (!selectedBlock) return;
    removeBlockById(selectedBlock.id);
  }

  function moveBlockById(blockId: string, dir: -1 | 1) {
    const idx = blocksV2.findIndex((block) => block.id === blockId);
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

  function moveSelectedBlock(dir: -1 | 1) {
    if (!selectedBlock) return;
    moveBlockById(selectedBlock.id, dir);
  }

  function removeComponent(componentId: string) {
    if (!selectedBlock) return;
    updateSelectedBlock((block) => ({
      ...block,
      components: block.components.filter((component) => component.id !== componentId)
    }));
    setSelectedComponentId((prev) => (prev === componentId ? null : prev));
  }

  function updateQuizForSelectedBlock(updater: (quiz: Quiz) => Quiz) {
    const gate = selectedBlock?.quizGate;
    if (!gate) return;
    markDirty();
    setQuizzesById((all) => {
      const quiz = all[gate.quizId];
      if (!quiz) return all;
      return { ...all, [quiz.id]: updater(quiz) };
    });
  }

  function addQuestion() {
    const gate = selectedBlock?.quizGate;
    if (!gate) return;
    const questionId = newId("q");
    const question: QuizQuestion = {
      id: questionId,
      prompt: "",
      options: ["", "", "", ""],
      correctOptionIndex: 0,
      explanation: "",
      conceptTags: [],
      nextSteps: [{ type: "retry_quiz" }, { type: "repeat_lesson" }]
    };
    updateQuizForSelectedBlock((quiz) => ({ ...quiz, questions: [...quiz.questions, question] }));
    setSelectedQuestionId(questionId);
  }

  function removeQuestion(questionId: string) {
    updateQuizForSelectedBlock((quiz) => ({
      ...quiz,
      questions: quiz.questions.filter((question) => question.id !== questionId)
    }));
    setSelectedQuestionId((prev) => (prev === questionId ? null : prev));
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
        quiz.questions.forEach((question, qIndex) => {
          if (!question.prompt.trim()) missing.push(`Block ${index + 1} Q${qIndex + 1}: prompt is required`);
          if (question.options.filter((opt) => opt.trim()).length < 2) {
            missing.push(`Block ${index + 1} Q${qIndex + 1}: at least 2 options`);
          }
          if (!question.explanation.trim()) missing.push(`Block ${index + 1} Q${qIndex + 1}: explanation is required`);
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
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
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
        nav(`/teacher/lessons${listSearch}`);
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
  const stepIndex = steps.findIndex((item) => item.id === step);

  return (
    <div className="section-rhythm">
      <PageHeader
        title={editLessonId ? "Edit lesson (v2)" : "Create lesson (v2)"}
        description="Build composite blocks (text + optional media) and optional quiz gates."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" tone="neutral" disabled={saving || !valid} onClick={() => void saveDraft("draft")}>
              Save draft
            </Button>
            <Button disabled={saving || !valid} onClick={() => void saveDraft("pending_approval")}>
              Submit for approval
            </Button>
          </div>
        }
      >
        <SectionTabs
          ariaLabel="Lesson builder sections"
          items={steps.map((item, index) => ({ key: item.id, label: `${index + 1}. ${item.label}` }))}
          activeKey={step}
          onChange={(key) => setStep(key as StepId)}
          scrollOnSmall
        />
      </PageHeader>

      {step === "blocks" ? (
        <ContextActionStrip
          title="Add block type"
          ariaLabel="Block type actions"
          actions={
            <>
              <Button variant="secondary" onClick={() => addBlock("text")}>
                Add text
              </Button>
              <Button variant="secondary" onClick={() => addBlock("text_image")}>
                Text + Image
              </Button>
              <Button variant="secondary" onClick={() => addBlock("text_video")}>
                Text + Video
              </Button>
              <Button variant="secondary" onClick={() => addBlock("pdf")}>
                PDF-only
              </Button>
              <Button variant="secondary" onClick={() => addBlock("upload_quiz")}>
                Upload + Quiz
              </Button>
            </>
          }
        />
      ) : null}

      <section
        id={`section-panel-${step}`}
        role="tabpanel"
        aria-labelledby={`section-tab-${step}`}
        className="space-y-4"
        data-testid={`lesson-step-panel-${step}`}
      >
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
                <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text">{school?.name ?? "School"}</div>
              </div>
              <Select
                label="Level"
                value={curriculumLevelId}
                onChange={(e) => {
                  setCurriculumLevelId(e.target.value);
                  markDirty();
                }}
              >
                <option value="">Select level...</option>
                {levels.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.name}
                  </option>
                ))}
              </Select>
              <Select
                label="Class"
                value={curriculumClassId}
                onChange={(e) => {
                  setCurriculumClassId(e.target.value);
                  markDirty();
                }}
                disabled={!curriculumLevelId}
              >
                <option value="">Select class...</option>
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
                <option value="">Select subject...</option>
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
              <Input
                label="Tags (comma separated)"
                value={tags}
                onChange={(e) => {
                  setTags(e.target.value);
                  markDirty();
                }}
              />
              <label className="block md:col-span-2">
                <div className="mb-1 text-sm text-muted">Description</div>
                <textarea
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-action-primary"
                  rows={4}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    markDirty();
                  }}
                />
              </label>
            </div>
          </Card>
        ) : null}

        {step === "blocks" ? (
          <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="space-y-3 xl:sticky xl:top-[88px] xl:self-start">
              <Card title="Block list" className="bg-rail-surface">
                <div className="space-y-3">
                  <div className="rounded-lg border border-border-subtle bg-collection-muted p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-text-subtle">Predictive hint</div>
                    <div className="mt-1 text-sm text-text-body">
                      {blocksV2.some((block) => block.quizGate)
                        ? "You already have quiz-gated steps. Keep explanatory text before each gate."
                        : "Add one quiz gate near the end to verify lesson understanding before finish."}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-wide text-text-subtle">Step list</div>
                    <div className="text-xs text-text-subtle">{blocksV2.length} blocks</div>
                  </div>
                  <ResponsiveCollection
                    ariaLabel="Lesson blocks"
                    items={blockRows}
                    viewMode="list"
                    getKey={(row) => row.block.id}
                    selectedKey={selectedBlockId}
                    onSelect={(row) => setSelectedBlockId(row.block.id)}
                    columns={[
                      {
                        key: "title",
                        header: "Block",
                        render: (row) => (
                          <div className="font-semibold text-text-title">{row.index + 1}. {row.block.title?.trim() || "Untitled block"}</div>
                        )
                      }
                    ]}
                    actions={[
                      {
                        label: "Up",
                        tone: "secondary",
                        disabled: (row) => row.index === 0,
                        onAction: (row) => moveBlockById(row.block.id, -1)
                      },
                      {
                        label: "Down",
                        tone: "secondary",
                        disabled: (row) => row.index === blockRows.length - 1,
                        onAction: (row) => moveBlockById(row.block.id, 1)
                      },
                      {
                        label: "Remove",
                        tone: "destructive",
                        onAction: (row) => removeBlockById(row.block.id)
                      }
                    ]}
                    renderListItem={(row) => (
                      <>
                        <div className="font-semibold text-text-title">{row.index + 1}. {row.block.title?.trim() || "Untitled block"}</div>
                        <div className="text-xs text-text-subtle">
                          {row.block.components
                            .map((component) => (component.type === "text" ? "Text" : component.mediaType.toUpperCase()))
                            .join(" + ") || "Gate-only"}
                        </div>
                        <div className="text-xs text-text-subtle">
                          {row.block.quizGate ? `Quiz gate ${row.block.quizGate.passScorePct}%` : "No quiz gate"}
                        </div>
                      </>
                    )}
                    emptyTitle="No blocks yet"
                    emptyDescription="Create your first block from a quick template."
                  />
                </div>
              </Card>
              <Card title="Autosave" paper="inset" density="compact">
                <div className="text-sm text-text-subtle">
                  Status: <span className="font-semibold text-text-title">{saving ? "Saving..." : dirty ? "Unsaved changes" : "Saved"}</span>
                </div>
                <div className="mt-2 text-xs text-text-subtle">
                  {lastSavedAt ? `Last saved: ${new Date(lastSavedAt).toLocaleString()}` : "Not saved yet."}
                </div>
                {statusMessage ? <div className="mt-2 text-sm text-text-title">{statusMessage}</div> : null}
              </Card>
            </aside>

            <Card title="Block editor">
              {!selectedBlock ? (
                <div className="text-sm text-text-subtle">Select a block to edit.</div>
              ) : (
                <div className="space-y-4">
                  <Input
                    label="Block title"
                    value={selectedBlock.title ?? ""}
                    onChange={(e) => updateSelectedBlock((block) => ({ ...block, title: e.target.value }))}
                  />

                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={addTextComponent}>
                      Add Text
                    </Button>
                    <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-border-subtle bg-action-secondary px-4 text-sm font-semibold text-action-secondary-fg hover:bg-action-secondary-hover">
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
                    <Button variant="secondary" onClick={() => moveSelectedBlock(-1)}>
                      Up
                    </Button>
                    <Button variant="secondary" onClick={() => moveSelectedBlock(1)}>
                      Down
                    </Button>
                    <Button variant="danger" onClick={removeSelectedBlock}>
                      Remove
                    </Button>
                  </div>

                  <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                    <div className="space-y-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-text-subtle">Components</div>
                      <ResponsiveCollection
                        ariaLabel="Block components"
                        items={componentRows}
                        getKey={(row) => row.component.id}
                        selectedKey={selectedComponentId}
                        onSelect={(row) => setSelectedComponentId(row.component.id)}
                        columns={[
                          {
                            key: "type",
                            header: "Type",
                            className: "w-36",
                            render: (row) => (
                              <span className="font-semibold text-text-title">
                                {row.component.type === "text" ? "Text" : row.component.mediaType.toUpperCase()}
                              </span>
                            )
                          },
                          {
                            key: "summary",
                            header: "Summary",
                            render: (row) =>
                              row.component.type === "text" ? (
                                <span className="text-sm text-text-body">
                                  {row.component.text.trim() ? row.component.text.slice(0, 120) : "No text yet."}
                                </span>
                              ) : (
                                <span className="text-sm text-text-body">{row.component.name}</span>
                              )
                          }
                        ]}
                        actions={[
                          {
                            label: "Remove",
                            tone: "destructive",
                            onAction: (row) => removeComponent(row.component.id)
                          }
                        ]}
                        renderListItem={(row) => (
                          <>
                            <div className="text-sm font-semibold text-text-title">
                              {row.index + 1}. {row.component.type === "text" ? "Text" : row.component.mediaType.toUpperCase()}
                            </div>
                            <div className="text-xs text-text-subtle">
                              {row.component.type === "text" ? row.component.text.slice(0, 120) || "No text yet." : row.component.name}
                            </div>
                          </>
                        )}
                        emptyTitle="No components"
                        emptyDescription="Add text or upload media to start composing this block."
                      />

                      <div className="rounded-lg border border-border-subtle bg-collection-muted p-4">
                        {!selectedComponent ? (
                          <div className="text-sm text-text-subtle">Select a component to edit.</div>
                        ) : selectedComponent.type === "text" ? (
                          <div className="space-y-3">
                            <Select
                              label="Variant"
                              value={selectedComponent.variant}
                              onChange={(e) =>
                                updateSelectedBlock((block) => ({
                                  ...block,
                                  components: block.components.map((component) =>
                                    component.id === selectedComponent.id && component.type === "text"
                                      ? { ...component, variant: e.target.value as typeof component.variant }
                                      : component
                                  )
                                }))
                              }
                            >
                              <option value="title">Title</option>
                              <option value="subtitle">Subtitle</option>
                              <option value="heading">Heading</option>
                              <option value="body">Body</option>
                            </Select>

                            <label className="block">
                              <div className="mb-1 text-sm text-text-subtle">Text</div>
                              <textarea
                                className="w-full rounded-lg border border-border-subtle bg-paper px-3 py-2 text-sm text-text-body outline-none focus:border-action-primary"
                                rows={5}
                                aria-label={`Text block ${selectedComponentIndex + 1}`}
                                value={selectedComponent.text}
                                onChange={(e) =>
                                  updateSelectedBlock((block) => ({
                                    ...block,
                                    components: block.components.map((component) =>
                                      component.id === selectedComponent.id && component.type === "text"
                                        ? { ...component, text: e.target.value }
                                        : component
                                    )
                                  }))
                                }
                              />
                            </label>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-wide text-text-subtle">Media component</div>
                              <div className="mt-1 text-sm text-text-title">{selectedComponent.name}</div>
                              <div className="text-xs text-text-subtle">{selectedComponent.mediaType.toUpperCase()}</div>
                              {selectedComponent.mediaType === "pdf" ? (
                                <div className="mt-1 text-xs text-text-subtle">
                                  PDF pages: {assetsById[selectedComponent.assetId]?.pageCount ?? "unknown"}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        )}

                        {selectedComponent ? (
                          <div className="mt-3">
                            <Button variant="danger" onClick={() => removeComponent(selectedComponent.id)}>
                              Remove component
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-3 rounded-lg border border-border-subtle bg-collection-muted p-4">
                      <label className="flex items-center gap-2 text-sm text-text-body">
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
                                  ? {
                                      ...block.quizGate,
                                      passScorePct: Number.isFinite(raw) ? Math.max(0, Math.min(100, Math.round(raw))) : 70
                                    }
                                  : undefined
                              }));
                            }}
                          />

                          <Button variant="secondary" onClick={addQuestion}>
                            Add question
                          </Button>

                          <ResponsiveCollection
                            ariaLabel="Quiz questions"
                            items={questionRows}
                            getKey={(row) => row.question.id}
                            selectedKey={selectedQuestionId}
                            onSelect={(row) => setSelectedQuestionId(row.question.id)}
                            columns={[
                              {
                                key: "prompt",
                                header: "Prompt",
                                render: (row) => (
                                  <span className="text-sm text-text-body">{row.question.prompt.trim() || "Untitled question"}</span>
                                )
                              },
                              {
                                key: "correct",
                                header: "Correct",
                                className: "w-28",
                                render: (row) => <span className="text-xs text-text-subtle">Option {row.question.correctOptionIndex + 1}</span>
                              }
                            ]}
                            actions={[
                              {
                                label: "Remove",
                                tone: "destructive",
                                onAction: (row) => removeQuestion(row.question.id)
                              }
                            ]}
                            renderListItem={(row) => (
                              <>
                                <div className="text-sm font-semibold text-text-title">Question {row.index + 1}</div>
                                <div className="text-xs text-text-subtle">{row.question.prompt.trim() || "Untitled question"}</div>
                                <div className="text-xs text-text-subtle">Correct: Option {row.question.correctOptionIndex + 1}</div>
                              </>
                            )}
                            emptyTitle="No questions yet"
                            emptyDescription="Add at least one question to enable gated progression."
                          />

                          {selectedQuestion ? (
                            <div className="rounded-lg border border-border-subtle bg-paper p-4">
                              <div className="mb-3 flex items-center justify-between gap-2">
                                <div className="text-sm font-semibold text-text-title">Question editor</div>
                                <Button variant="danger" size="sm" onClick={() => removeQuestion(selectedQuestion.id)}>
                                  Remove question
                                </Button>
                              </div>
                              <div className="space-y-2">
                                <Input
                                  label="Prompt"
                                  value={selectedQuestion.prompt}
                                  onChange={(e) =>
                                    updateQuizForSelectedBlock((quiz) => ({
                                      ...quiz,
                                      questions: quiz.questions.map((question) =>
                                        question.id === selectedQuestion.id ? { ...question, prompt: e.target.value } : question
                                      )
                                    }))
                                  }
                                />

                                {selectedQuestion.options.map((option, optionIndex) => (
                                  <Input
                                    key={optionIndex}
                                    label={`Option ${optionIndex + 1}`}
                                    value={option}
                                    onChange={(e) =>
                                      updateQuizForSelectedBlock((quiz) => ({
                                        ...quiz,
                                        questions: quiz.questions.map((question) =>
                                          question.id === selectedQuestion.id
                                            ? {
                                                ...question,
                                                options: question.options.map((value, idx) =>
                                                  idx === optionIndex ? e.target.value : value
                                                )
                                              }
                                            : question
                                        )
                                      }))
                                    }
                                  />
                                ))}

                                <Select
                                  label="Correct option"
                                  value={String(selectedQuestion.correctOptionIndex)}
                                  onChange={(e) =>
                                    updateQuizForSelectedBlock((quiz) => ({
                                      ...quiz,
                                      questions: quiz.questions.map((question) =>
                                        question.id === selectedQuestion.id
                                          ? { ...question, correctOptionIndex: Number(e.target.value) }
                                          : question
                                      )
                                    }))
                                  }
                                >
                                  {selectedQuestion.options.map((_, index) => (
                                    <option key={index} value={String(index)}>
                                      Option {index + 1}
                                    </option>
                                  ))}
                                </Select>

                                <label className="block">
                                  <div className="mb-1 text-sm text-text-subtle">Explanation</div>
                                  <textarea
                                    className="w-full rounded-lg border border-border-subtle bg-paper px-3 py-2 text-sm text-text-body outline-none focus:border-action-primary"
                                    rows={2}
                                    value={selectedQuestion.explanation}
                                    onChange={(e) =>
                                      updateQuizForSelectedBlock((quiz) => ({
                                        ...quiz,
                                        questions: quiz.questions.map((question) =>
                                          question.id === selectedQuestion.id
                                            ? { ...question, explanation: e.target.value }
                                            : question
                                        )
                                      }))
                                    }
                                  />
                                </label>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-lg border border-border-subtle bg-paper p-4 text-sm text-text-subtle">
                              Select a question to edit.
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-sm text-text-subtle">
                          No gate enabled. Learners can proceed after reviewing this step.
                        </div>
                      )}
                    </div>
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
            <div className="text-sm text-text-subtle">{missing.length === 0 ? "All checks passed." : "Fix the items below before submitting."}</div>
            {missing.length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-status-warning">
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

        {step !== "blocks" ? (
          <Card title="Autosave" paper="inset" density="compact">
            <div className="text-sm text-text-subtle">
              Status: <span className="font-semibold text-text-title">{saving ? "Saving..." : dirty ? "Unsaved changes" : "Saved"}</span>
            </div>
            <div className="mt-2 text-xs text-text-subtle">
              {lastSavedAt ? `Last saved: ${new Date(lastSavedAt).toLocaleString()}` : "Not saved yet."}
            </div>
            {statusMessage ? <div className="mt-2 text-sm text-text-title">{statusMessage}</div> : null}
          </Card>
        ) : null}

        <ActionBar stickyOnSmall className="mb-2">
          <Button
            variant="secondary"
            tone="neutral"
            onClick={() => setStep(steps[Math.max(0, stepIndex - 1)]!.id)}
            disabled={step === "metadata"}
          >
            Back
          </Button>
          <Button onClick={() => setStep(steps[Math.min(steps.length - 1, stepIndex + 1)]!.id)} disabled={step === "submit" || !canGoNext}>
            Next
          </Button>
        </ActionBar>
      </section>
    </div>
  );
}
