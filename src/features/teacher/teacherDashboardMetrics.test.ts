import { describe, it, expect } from "vitest";
import type { Lesson, Notification, Progress, Quiz, QuizAttempt } from "@/shared/types";
import {
  buildNeedsAttentionLessons,
  buildUnreadNotifications,
  computeTeacherEngagementMetrics
} from "@/features/teacher/teacherDashboardMetrics";

function lesson(id: string, status: Lesson["status"]): Lesson {
  const now = new Date().toISOString();
  return {
    id,
    title: id,
    schoolId: "school",
    subject: "Math",
    className: "Class 1",
    level: "Primary",
    language: "en",
    tags: [],
    description: "",
    status,
    createdByUserId: "teacher_1",
    createdAt: now,
    updatedAt: now
  };
}

describe("teacherDashboardMetrics", () => {
  it("selects rejected/unpublished lessons for attention", () => {
    const rows = [
      lesson("a", "approved"),
      lesson("b", "rejected"),
      lesson("c", "unpublished"),
      lesson("d", "draft")
    ];
    const result = buildNeedsAttentionLessons(rows);
    expect(result.map((x) => x.id)).toEqual(["b", "c"]);
  });

  it("returns unread notifications sorted newest first", () => {
    const notifications: Notification[] = [
      { id: "1", userId: "u", type: "system", title: "old", createdAt: "2026-01-01T10:00:00.000Z", readAt: undefined },
      { id: "2", userId: "u", type: "system", title: "read", createdAt: "2026-01-02T10:00:00.000Z", readAt: "2026-01-03T00:00:00Z" },
      { id: "3", userId: "u", type: "system", title: "new", createdAt: "2026-01-03T10:00:00.000Z", readAt: undefined }
    ];
    const result = buildUnreadNotifications(notifications);
    expect(result.map((n) => n.id)).toEqual(["3", "1"]);
  });

  it("computes engagement summary from teacher lessons only", () => {
    const lessons = [lesson("l1", "approved"), lesson("l2", "draft")];
    const progressRows: Progress[] = [
      {
        id: "p1",
        studentId: "s1",
        lessonId: "l1",
        timeSpentSec: 20,
        lastSeenAt: "2026-01-03T10:00:00.000Z",
        completedAt: "2026-01-03T10:05:00.000Z"
      },
      {
        id: "p2",
        studentId: "s2",
        lessonId: "l2",
        timeSpentSec: 10,
        lastSeenAt: "2026-01-04T10:00:00.000Z"
      },
      {
        id: "p3",
        studentId: "s3",
        lessonId: "other",
        timeSpentSec: 10,
        lastSeenAt: "2026-01-10T10:00:00.000Z"
      }
    ];
    const quizzes: Quiz[] = [
      { id: "q1", lessonId: "l1", questions: [] },
      { id: "q2", lessonId: "other", questions: [] }
    ];
    const attempts: QuizAttempt[] = [
      { id: "a1", studentId: "s1", quizId: "q1", score: 80, answersByQuestionId: {}, createdAt: "2026-01-04T10:00:00.000Z" },
      { id: "a2", studentId: "s2", quizId: "q1", score: 100, answersByQuestionId: {}, createdAt: "2026-01-04T11:00:00.000Z" },
      { id: "a3", studentId: "s1", quizId: "q2", score: 0, answersByQuestionId: {}, createdAt: "2026-01-04T12:00:00.000Z" }
    ];

    const metrics = computeTeacherEngagementMetrics({ lessons, progressRows, quizzes, attempts });
    expect(metrics.views).toBe(2);
    expect(metrics.completions).toBe(1);
    expect(metrics.avgScore).toBe(90);
    expect(metrics.lastActivityAt).toBe("2026-01-04T10:00:00.000Z");
  });
});
