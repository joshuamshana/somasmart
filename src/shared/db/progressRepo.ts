import { db } from "@/shared/db/db";
import type { Progress } from "@/shared/types";
import { awardBadgeIfMissing, recordLearningActivity } from "@/shared/gamification/gamification";

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export async function touchProgress({
  studentId,
  lessonId,
  additionalTimeSec = 0,
  markComplete = false
}: {
  studentId: string;
  lessonId: string;
  additionalTimeSec?: number;
  markComplete?: boolean;
}) {
  const existing = (await db.progress.toArray()).find(
    (p) => p.studentId === studentId && p.lessonId === lessonId
  );

  if (!existing) {
    const progress: Progress = {
      id: newId("prog"),
      studentId,
      lessonId,
      timeSpentSec: Math.max(0, additionalTimeSec),
      lastSeenAt: nowIso(),
      completedAt: markComplete ? nowIso() : undefined
    };
    await db.progress.add(progress);
    await recordLearningActivity(studentId);
    if (markComplete) await awardBadgeIfMissing(studentId, "first_lesson_complete");
    return progress;
  }

  const wasCompleted = Boolean(existing.completedAt);
  const updated: Progress = {
    ...existing,
    timeSpentSec: existing.timeSpentSec + Math.max(0, additionalTimeSec),
    lastSeenAt: nowIso(),
    completedAt: existing.completedAt ?? (markComplete ? nowIso() : undefined)
  };
  await db.progress.put(updated);
  await recordLearningActivity(studentId);
  if (!wasCompleted && Boolean(updated.completedAt)) await awardBadgeIfMissing(studentId, "first_lesson_complete");
  return updated;
}
