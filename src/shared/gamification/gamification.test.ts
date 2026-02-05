import { describe, expect, it } from "vitest";
import type { Streak } from "@/shared/types";
import { computeNextStreak } from "@/shared/gamification/gamification";

describe("computeNextStreak", () => {
  it("starts at 1 when no existing streak", () => {
    const next = computeNextStreak(null, "2026-02-04");
    expect(next.currentStreakDays).toBe(1);
    expect(next.lastActiveDate).toBe("2026-02-04");
  });

  it("keeps the same streak when already active today", () => {
    const existing: Streak = {
      studentId: "s1",
      currentStreakDays: 5,
      lastActiveDate: "2026-02-04",
      updatedAt: "2026-02-04T00:00:00.000Z"
    };
    const next = computeNextStreak(existing, "2026-02-04");
    expect(next.currentStreakDays).toBe(5);
    expect(next.lastActiveDate).toBe("2026-02-04");
  });

  it("increments streak when last active was yesterday", () => {
    const existing: Streak = {
      studentId: "s1",
      currentStreakDays: 2,
      lastActiveDate: "2026-02-03",
      updatedAt: "2026-02-03T00:00:00.000Z"
    };
    const next = computeNextStreak(existing, "2026-02-04");
    expect(next.currentStreakDays).toBe(3);
    expect(next.lastActiveDate).toBe("2026-02-04");
  });

  it("resets streak when last active was earlier than yesterday", () => {
    const existing: Streak = {
      studentId: "s1",
      currentStreakDays: 10,
      lastActiveDate: "2026-02-01",
      updatedAt: "2026-02-01T00:00:00.000Z"
    };
    const next = computeNextStreak(existing, "2026-02-04");
    expect(next.currentStreakDays).toBe(1);
    expect(next.lastActiveDate).toBe("2026-02-04");
  });
});

