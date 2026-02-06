import type { Lesson } from "@/shared/types";

export type LessonStatusCounts = {
  total: number;
  draft: number;
  pending: number;
  approved: number;
  rejected: number;
  unpublished: number;
};

export type LessonStatusStats = LessonStatusCounts & {
  recent7d: LessonStatusCounts;
};

function countByStatus(lessons: Lesson[], status: Lesson["status"]) {
  return lessons.filter((l) => l.status === status).length;
}

function isRecent(updatedAtIso: string, nowMs: number, windowDays: number) {
  const t = Date.parse(updatedAtIso);
  if (!Number.isFinite(t)) return false;
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  return t >= nowMs - windowMs;
}

export function computeLessonStatusStats({
  lessons,
  nowMs = Date.now(),
  windowDays = 7
}: {
  lessons: Lesson[];
  nowMs?: number;
  windowDays?: number;
}): LessonStatusStats {
  const total = lessons.length;
  const draft = countByStatus(lessons, "draft");
  const pending = countByStatus(lessons, "pending_approval");
  const approved = countByStatus(lessons, "approved");
  const rejected = countByStatus(lessons, "rejected");
  const unpublished = countByStatus(lessons, "unpublished");

  const recent = lessons.filter((l) => isRecent(l.updatedAt, nowMs, windowDays));
  const recentTotal = recent.length;
  const recentDraft = countByStatus(recent, "draft");
  const recentPending = countByStatus(recent, "pending_approval");
  const recentApproved = countByStatus(recent, "approved");
  const recentRejected = countByStatus(recent, "rejected");
  const recentUnpublished = countByStatus(recent, "unpublished");

  return {
    total,
    draft,
    pending,
    approved,
    rejected,
    unpublished,
    recent7d: {
      total: recentTotal,
      draft: recentDraft,
      pending: recentPending,
      approved: recentApproved,
      rejected: recentRejected,
      unpublished: recentUnpublished
    }
  };
}

