import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LessonStepProgress } from "@/shared/types";
import {
  getLessonStepProgressForLesson,
  lessonStepProgressId,
  upsertLessonStepProgress
} from "@/shared/db/lessonStepProgressRepo";

const { rows, putMock } = vi.hoisted(() => {
  const rows: LessonStepProgress[] = [];
  const putMock = vi.fn(async (row: LessonStepProgress) => {
    const idx = rows.findIndex((x) => x.id === row.id);
    if (idx >= 0) rows[idx] = row;
    else rows.push(row);
  });
  return { rows, putMock };
});

vi.mock("@/shared/db/db", () => ({
  db: {
    lessonStepProgress: {
      get: vi.fn(async (id: string) => rows.find((r) => r.id === id)),
      put: putMock,
      toArray: vi.fn(async () => rows)
    }
  }
}));

describe("lessonStepProgressRepo", () => {
  beforeEach(() => {
    rows.splice(0, rows.length);
    putMock.mockClear();
  });

  it("builds deterministic lesson step progress ids", () => {
    expect(lessonStepProgressId({ studentId: "s1", lessonId: "l1", stepKey: "k1" })).toBe("lsp:s1:l1:k1");
  });

  it("creates new step progress records", async () => {
    const next = await upsertLessonStepProgress({
      studentId: "s1",
      lessonId: "l1",
      stepKey: "k1",
      quizAttemptId: "qa1",
      bestScore: 60
    });

    expect(next.id).toBe("lsp:s1:l1:k1");
    expect(next.quizAttemptId).toBe("qa1");
    expect(next.bestScore).toBe(60);
    expect(next.completedAt).toBeTruthy();
    expect(putMock).toHaveBeenCalledTimes(1);
  });

  it("updates existing step progress while preserving completedAt and existing optional values", async () => {
    rows.push({
      id: "lsp:s1:l1:k1",
      studentId: "s1",
      lessonId: "l1",
      stepKey: "k1",
      completedAt: "2026-01-01T00:00:00.000Z",
      quizAttemptId: "qa1",
      bestScore: 70
    });

    const next = await upsertLessonStepProgress({
      studentId: "s1",
      lessonId: "l1",
      stepKey: "k1"
    });
    expect(next.completedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(next.quizAttemptId).toBe("qa1");
    expect(next.bestScore).toBe(70);
  });

  it("updates existing step progress when new optional values are provided", async () => {
    rows.push({
      id: "lsp:s1:l1:k1",
      studentId: "s1",
      lessonId: "l1",
      stepKey: "k1",
      completedAt: "2026-01-01T00:00:00.000Z"
    });

    const next = await upsertLessonStepProgress({
      studentId: "s1",
      lessonId: "l1",
      stepKey: "k1",
      quizAttemptId: "qa2",
      bestScore: 95
    });
    expect(next.quizAttemptId).toBe("qa2");
    expect(next.bestScore).toBe(95);
  });

  it("fills completedAt when existing row has an empty completedAt value", async () => {
    rows.push({
      id: "lsp:s1:l1:k_empty",
      studentId: "s1",
      lessonId: "l1",
      stepKey: "k_empty",
      completedAt: ""
    });

    const next = await upsertLessonStepProgress({
      studentId: "s1",
      lessonId: "l1",
      stepKey: "k_empty"
    });
    expect(next.completedAt).toBeTruthy();
  });

  it("filters lesson step progress by student and lesson", async () => {
    rows.push(
      { id: "a", studentId: "s1", lessonId: "l1", stepKey: "k1", completedAt: "2026-01-01T00:00:00.000Z" },
      { id: "b", studentId: "s2", lessonId: "l1", stepKey: "k1", completedAt: "2026-01-01T00:00:00.000Z" },
      { id: "c", studentId: "s1", lessonId: "l2", stepKey: "k1", completedAt: "2026-01-01T00:00:00.000Z" }
    );

    await expect(getLessonStepProgressForLesson({ studentId: "s1", lessonId: "l1" })).resolves.toEqual([
      rows[0]
    ]);
  });
});
