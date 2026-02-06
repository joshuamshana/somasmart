import { describe, expect, it } from "vitest";
import type { Progress } from "@/shared/types";
import { getLessonLearningState } from "@/features/student/lessonLearningState";

function progress(overrides: Partial<Progress> = {}): Progress {
  return {
    id: "prog_1",
    studentId: "student_1",
    lessonId: "lesson_1",
    timeSpentSec: 60,
    lastSeenAt: "2026-02-06T10:00:00.000Z",
    ...overrides
  };
}

describe("getLessonLearningState", () => {
  it("returns new when no progress row exists", () => {
    expect(getLessonLearningState(undefined)).toBe("new");
  });

  it("returns in_progress when progress exists but not completed", () => {
    expect(getLessonLearningState(progress())).toBe("in_progress");
  });

  it("returns completed when completedAt is present", () => {
    expect(getLessonLearningState(progress({ completedAt: "2026-02-06T10:05:00.000Z" }))).toBe("completed");
  });
});
