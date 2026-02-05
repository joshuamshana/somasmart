import React, { useMemo, useState } from "react";
import type { Lesson, LessonAsset, LessonBlock, Level, Quiz, QuizQuestion } from "@/shared/types";
import { db } from "@/shared/db/db";
import { useAuth } from "@/features/auth/authContext";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { Button } from "@/shared/ui/Button";
import { enqueueOutboxEvent } from "@/shared/offline/outbox";

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

export function TeacherLessonBuilderPage() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState<Level>("Primary");
  const [language, setLanguage] = useState<"en" | "sw">("en");
  const [tags, setTags] = useState("trial");
  const [description, setDescription] = useState("");

  const [blocks, setBlocks] = useState<LessonBlock[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);

  const [draftLessonId] = useState(() => newId("lesson"));
  const quizId = useMemo(() => newId("quiz"), []);

  if (!user) return null;
  const userId = user.id;

  async function addTextBlock() {
    setBlocks((b) => [...b, { id: newId("block"), type: "text", text: "" }]);
  }

  async function addFileBlock(file: File) {
    const MAX_FILE_BYTES = 120 * 1024 * 1024;
    if (file.size > MAX_FILE_BYTES) {
      setStatusMessage("File too large. Please upload a smaller file.");
      return;
    }
    const kind = fileKind(file.type);
    if (!kind) {
      setStatusMessage("Unsupported file type. Use image/audio/video/mp4/video/webm/pdf/pptx.");
      return;
    }
    const assetId = newId("asset");
    const asset: LessonAsset = {
      id: assetId,
      lessonId: draftLessonId,
      kind,
      name: file.name,
      mime: file.type,
      blob: file,
      createdAt: nowIso()
    };
    await db.lessonAssets.add(asset);
    let block: LessonBlock;
    if (kind === "image") block = { id: newId("block"), type: "image", assetId, mime: file.type, name: file.name };
    else if (kind === "audio") block = { id: newId("block"), type: "audio", assetId, mime: file.type, name: file.name };
    else if (kind === "video") block = { id: newId("block"), type: "video", assetId, mime: file.type, name: file.name };
    else if (kind === "pdf") block = { id: newId("block"), type: "pdf", assetId, mime: file.type, name: file.name };
    else block = { id: newId("block"), type: "pptx", assetId, mime: file.type, name: file.name };
    setBlocks((b) => [...b, block]);
  }

  function addQuestion() {
    setQuestions((q) => [
      ...q,
      {
        id: newId("q"),
        prompt: "",
        options: ["", "", "", ""],
        correctOptionIndex: 0,
        explanation: "",
        conceptTags: [],
        nextSteps: [{ type: "retry_quiz" }, { type: "repeat_lesson" }]
      }
    ]);
  }

  async function saveDraft(nextStatus: Lesson["status"] = "draft") {
    setSaving(true);
    setStatusMessage(null);
    try {
      const lesson: Lesson = {
        id: draftLessonId,
        title: title.trim(),
        subject: subject.trim(),
        level,
        language,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        description: description.trim(),
        status: nextStatus,
        createdByUserId: userId,
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      const quiz: Quiz = { id: quizId, lessonId: draftLessonId, questions };

      await db.transaction(
        "rw",
        db.lessons,
        db.lessonContents,
        db.quizzes,
        async () => {
          await db.lessons.put(lesson);
          await db.lessonContents.put({ lessonId: draftLessonId, blocks });
          await db.quizzes.put(quiz);
        }
      );
      if (nextStatus === "pending_approval") {
        await enqueueOutboxEvent({ type: "lesson_submit", payload: { lessonId: draftLessonId } });
      }
      setStatusMessage(nextStatus === "pending_approval" ? "Submitted for approval." : "Draft saved.");
    } finally {
      setSaving(false);
    }
  }

  const valid = title.trim() && subject.trim() && description.trim() && blocks.length > 0;

  return (
    <div className="space-y-4">
      <Card title="Lesson metadata">
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Select label="Level" value={level} onChange={(e) => setLevel(e.target.value as Level)}>
            <option value="Preschool">Preschool</option>
            <option value="Primary">Primary</option>
            <option value="Secondary">Secondary</option>
            <option value="Vocational">Vocational</option>
          </Select>
          <Select
            label="Language"
            value={language}
            onChange={(e) => setLanguage(e.target.value as "en" | "sw")}
          >
            <option value="en">English</option>
            <option value="sw">Swahili</option>
          </Select>
          <div className="md:col-span-2">
            <Input
              label="Tags (comma separated; include 'trial' for free lessons)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block">
              <div className="mb-1 text-sm text-slate-300">Description</div>
              <textarea
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
          </div>
        </div>
      </Card>

      <Card
        title="Lesson content blocks"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => void addTextBlock()}>
              Add text
            </Button>
            <label className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium hover:bg-slate-700">
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
        <div className="space-y-3">
          {blocks.map((b, idx) => (
            <div key={b.id} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  {idx + 1}. {b.type.toUpperCase()}
                </div>
                <Button
                  variant="danger"
                  onClick={() => setBlocks((all) => all.filter((x) => x.id !== b.id))}
                >
                  Remove
                </Button>
              </div>
              {b.type === "text" ? (
                <textarea
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
                  rows={4}
                  aria-label={`Text block ${idx + 1}`}
                  value={b.text}
                  onChange={(e) =>
                    setBlocks((all) =>
                      all.map((x) => (x.id === b.id ? { ...x, text: e.target.value } : x))
                    )
                  }
                />
              ) : (
                <div className="mt-2 text-sm text-slate-300">{"name" in b ? b.name : ""}</div>
              )}
            </div>
          ))}
          {blocks.length === 0 ? (
            <div className="text-sm text-slate-400">Add at least one content block.</div>
          ) : null}
        </div>
      </Card>

      <Card
        title="Quiz (MCQ self-test)"
        actions={
          <Button variant="secondary" onClick={addQuestion}>
            Add question
          </Button>
        }
      >
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div key={q.id} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Question {idx + 1}</div>
                <Button variant="danger" onClick={() => setQuestions((all) => all.filter((x) => x.id !== q.id))}>
                  Remove
                </Button>
              </div>
              <div className="mt-3 space-y-3">
                <Input
                  label="Prompt"
                  value={q.prompt}
                  onChange={(e) =>
                    setQuestions((all) => all.map((x) => (x.id === q.id ? { ...x, prompt: e.target.value } : x)))
                  }
                />
                <div className="grid gap-3 md:grid-cols-2">
                  {q.options.map((opt, i) => (
                    <Input
                      key={i}
                      label={`Option ${i + 1}`}
                      value={opt}
                      onChange={(e) =>
                        setQuestions((all) =>
                          all.map((x) =>
                            x.id === q.id
                              ? { ...x, options: x.options.map((o, oi) => (oi === i ? e.target.value : o)) }
                              : x
                          )
                        )
                      }
                    />
                  ))}
                </div>
                <Select
                  label="Correct option"
                  value={String(q.correctOptionIndex)}
                  onChange={(e) =>
                    setQuestions((all) =>
                      all.map((x) => (x.id === q.id ? { ...x, correctOptionIndex: Number(e.target.value) } : x))
                    )
                  }
                >
                  {q.options.map((_, i) => (
                    <option key={i} value={String(i)}>
                      Option {i + 1}
                    </option>
                  ))}
                </Select>
                <label className="block">
                  <div className="mb-1 text-sm text-slate-300">Explanation</div>
                  <textarea
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
                    rows={2}
                    value={q.explanation}
                    onChange={(e) =>
                      setQuestions((all) =>
                        all.map((x) => (x.id === q.id ? { ...x, explanation: e.target.value } : x))
                      )
                    }
                  />
                </label>
                <Input
                  label="Concept tags (comma separated)"
                  value={q.conceptTags.join(", ")}
                  onChange={(e) =>
                    setQuestions((all) =>
                      all.map((x) =>
                        x.id === q.id
                          ? { ...x, conceptTags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) }
                          : x
                      )
                    )
                  }
                />
              </div>
            </div>
          ))}
          {questions.length === 0 ? <div className="text-sm text-slate-400">Add questions for self-testing.</div> : null}
        </div>
      </Card>

      <Card title="Save & submit">
        {statusMessage ? <div className="mb-3 text-sm text-slate-200">{statusMessage}</div> : null}
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" disabled={saving || !valid} onClick={() => void saveDraft("draft")}>
            Save draft
          </Button>
          <Button disabled={saving || !valid} onClick={() => void saveDraft("pending_approval")}>
            Submit for approval
          </Button>
        </div>
        {!valid ? (
          <div className="mt-2 text-xs text-slate-500">Required: title, subject, description, at least 1 block.</div>
        ) : null}
      </Card>
    </div>
  );
}
