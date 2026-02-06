import { db } from "@/shared/db/db";
import type { LessonStepProgress } from "@/shared/types";

function nowIso() {
  return new Date().toISOString();
}

export function lessonStepProgressId({
  studentId,
  lessonId,
  stepKey
}: {
  studentId: string;
  lessonId: string;
  stepKey: string;
}) {
  return `lsp:${studentId}:${lessonId}:${stepKey}`;
}

export async function upsertLessonStepProgress({
  studentId,
  lessonId,
  stepKey,
  quizAttemptId,
  bestScore
}: {
  studentId: string;
  lessonId: string;
  stepKey: string;
  quizAttemptId?: string;
  bestScore?: number;
}) {
  const id = lessonStepProgressId({ studentId, lessonId, stepKey });
  const existing = await db.lessonStepProgress.get(id);
  const next: LessonStepProgress = existing
    ? {
        ...existing,
        completedAt: existing.completedAt || nowIso(),
        quizAttemptId: quizAttemptId ?? existing.quizAttemptId,
        bestScore: typeof bestScore === "number" ? bestScore : existing.bestScore
      }
    : {
        id,
        studentId,
        lessonId,
        stepKey,
        completedAt: nowIso(),
        quizAttemptId,
        bestScore
      };
  await db.lessonStepProgress.put(next);
  return next;
}

export async function getLessonStepProgressForLesson({
  studentId,
  lessonId
}: {
  studentId: string;
  lessonId: string;
}) {
  const all = await db.lessonStepProgress.toArray();
  return all.filter((p) => p.studentId === studentId && p.lessonId === lessonId);
}

