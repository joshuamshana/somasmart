import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Progress } from "@/shared/types";
import { touchProgress } from "@/shared/db/progressRepo";

const { rows, addMock, putMock, recordLearningActivityMock, awardBadgeMock } = vi.hoisted(() => {
  const rows: Progress[] = [];
  const addMock = vi.fn(async (row: Progress) => {
    rows.push(row);
  });
  const putMock = vi.fn(async (row: Progress) => {
    const idx = rows.findIndex((x) => x.id === row.id);
    if (idx >= 0) rows[idx] = row;
    else rows.push(row);
  });
  const recordLearningActivityMock = vi.fn(async () => {});
  const awardBadgeMock = vi.fn(async () => {});
  return { rows, addMock, putMock, recordLearningActivityMock, awardBadgeMock };
});

vi.mock("@/shared/db/db", () => ({
  db: {
    progress: {
      toArray: vi.fn(async () => rows),
      add: addMock,
      put: putMock
    }
  }
}));

vi.mock("@/shared/gamification/gamification", () => ({
  recordLearningActivity: recordLearningActivityMock,
  awardBadgeIfMissing: awardBadgeMock
}));

describe("touchProgress", () => {
  beforeEach(() => {
    rows.splice(0, rows.length);
    addMock.mockClear();
    putMock.mockClear();
    recordLearningActivityMock.mockClear();
    awardBadgeMock.mockClear();
  });

  it("creates progress row and ignores negative time", async () => {
    const result = await touchProgress({
      studentId: "student_1",
      lessonId: "lesson_1",
      additionalTimeSec: -50
    });

    expect(result.timeSpentSec).toBe(0);
    expect(addMock).toHaveBeenCalledTimes(1);
    expect(recordLearningActivityMock).toHaveBeenCalledWith("student_1");
    expect(awardBadgeMock).not.toHaveBeenCalled();
  });

  it("increments existing progress and marks completion once", async () => {
    rows.push({
      id: "prog_1",
      studentId: "student_1",
      lessonId: "lesson_1",
      timeSpentSec: 20,
      lastSeenAt: new Date(Date.now() - 60_000).toISOString()
    });

    const first = await touchProgress({
      studentId: "student_1",
      lessonId: "lesson_1",
      additionalTimeSec: 30,
      markComplete: true
    });

    expect(first.timeSpentSec).toBe(50);
    expect(first.completedAt).toBeTruthy();
    expect(awardBadgeMock).toHaveBeenCalledTimes(1);

    await touchProgress({
      studentId: "student_1",
      lessonId: "lesson_1",
      additionalTimeSec: 10,
      markComplete: true
    });
    expect(awardBadgeMock).toHaveBeenCalledTimes(1);
  });
});
