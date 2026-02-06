import { describe, it, expect } from "vitest";
import type { Lesson } from "@/shared/types";
import { computeLessonStatusStats } from "@/features/teacher/lessonStatusStats";

function lesson(partial: Partial<Lesson> & Pick<Lesson, "id" | "status" | "updatedAt">): Lesson {
  return {
    id: partial.id,
    title: partial.title ?? "T",
    schoolId: partial.schoolId ?? "school",
    subject: partial.subject ?? "Math",
    className: partial.className ?? "Class 1",
    level: partial.level ?? "Primary",
    language: partial.language ?? "en",
    tags: partial.tags ?? [],
    description: partial.description ?? "",
    status: partial.status,
    createdByUserId: partial.createdByUserId ?? "teacher",
    createdAt: partial.createdAt ?? partial.updatedAt,
    updatedAt: partial.updatedAt,
    adminFeedback: partial.adminFeedback,
    expiresAt: partial.expiresAt,
    deletedAt: partial.deletedAt,
    curriculumLevelId: partial.curriculumLevelId,
    curriculumClassId: partial.curriculumClassId,
    curriculumSubjectId: partial.curriculumSubjectId,
    accessPolicy: partial.accessPolicy
  };
}

describe("computeLessonStatusStats", () => {
  it("counts totals and last-7-days updates by status", () => {
    const nowMs = Date.UTC(2026, 1, 6, 12, 0, 0);
    const recent = new Date(nowMs - 2 * 24 * 60 * 60 * 1000).toISOString();
    const old = new Date(nowMs - 10 * 24 * 60 * 60 * 1000).toISOString();

    const lessons: Lesson[] = [
      lesson({ id: "a", status: "draft", updatedAt: recent }),
      lesson({ id: "b", status: "pending_approval", updatedAt: recent }),
      lesson({ id: "c", status: "approved", updatedAt: old }),
      lesson({ id: "d", status: "rejected", updatedAt: recent }),
      lesson({ id: "e", status: "unpublished", updatedAt: old })
    ];

    const stats = computeLessonStatusStats({ lessons, nowMs, windowDays: 7 });

    expect(stats.total).toBe(5);
    expect(stats.draft).toBe(1);
    expect(stats.pending).toBe(1);
    expect(stats.approved).toBe(1);
    expect(stats.rejected).toBe(1);
    expect(stats.unpublished).toBe(1);

    expect(stats.recent7d.total).toBe(3);
    expect(stats.recent7d.draft).toBe(1);
    expect(stats.recent7d.pending).toBe(1);
    expect(stats.recent7d.approved).toBe(0);
    expect(stats.recent7d.rejected).toBe(1);
    expect(stats.recent7d.unpublished).toBe(0);
  });
});

