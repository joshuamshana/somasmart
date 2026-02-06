import type { Lesson, Notification, Progress, Quiz, QuizAttempt } from "@/shared/types";

export function buildNeedsAttentionLessons(lessons: Lesson[]) {
  return lessons.filter((l) => l.status === "rejected" || l.status === "unpublished").slice(0, 5);
}

export function buildUnreadNotifications(notifications: Notification[]) {
  return notifications
    .filter((n) => !n.readAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);
}

export function computeTeacherEngagementMetrics({
  lessons,
  progressRows,
  quizzes,
  attempts
}: {
  lessons: Lesson[];
  progressRows: Progress[];
  quizzes: Quiz[];
  attempts: QuizAttempt[];
}) {
  const lessonIds = new Set(lessons.map((l) => l.id));
  const filteredProgress = progressRows.filter((p) => lessonIds.has(p.lessonId));

  const quizIds = new Set(quizzes.filter((q) => lessonIds.has(q.lessonId)).map((q) => q.id));
  const filteredAttempts = attempts.filter((a) => quizIds.has(a.quizId));

  const views = filteredProgress.length;
  const completions = filteredProgress.filter((p) => Boolean(p.completedAt)).length;
  const avgScore =
    filteredAttempts.length > 0
      ? filteredAttempts.reduce((sum, a) => sum + a.score, 0) / filteredAttempts.length
      : null;
  const lastActivityAt = filteredProgress.reduce<string | null>(
    (max, p) => (!max || p.lastSeenAt > max ? p.lastSeenAt : max),
    null
  );

  return { views, completions, avgScore, lastActivityAt };
}

