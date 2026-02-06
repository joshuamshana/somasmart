import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuizRunner } from "@/features/student/QuizRunner";
import type { Quiz } from "@/shared/types";

const mocks = vi.hoisted(() => ({
  addAttempt: vi.fn(async () => undefined)
}));

vi.mock("@/shared/db/db", () => ({
  db: {
    quizAttempts: {
      add: mocks.addAttempt
    }
  }
}));

vi.mock("@/shared/gamification/gamification", () => ({
  awardBadgeIfMissing: vi.fn(async () => undefined),
  recordLearningActivity: vi.fn(async () => undefined)
}));

describe("QuizRunner", () => {
  beforeEach(() => {
    mocks.addAttempt.mockClear();
  });

  it("submits and calls onComplete", async () => {
    const user = userEvent.setup();
    const quiz: Quiz = {
      id: "q1",
      lessonId: "l1",
      questions: [
        {
          id: "q",
          prompt: "1+1?",
          options: ["1", "2"],
          correctOptionIndex: 1,
          explanation: "2",
          conceptTags: [],
          nextSteps: []
        }
      ]
    };
    const onComplete = vi.fn();
    render(<QuizRunner quiz={quiz} studentId="s1" onComplete={onComplete} />);
    await user.click(screen.getByLabelText("2"));
    await user.click(screen.getByRole("button", { name: "Submit Quiz" }));

    expect(mocks.addAttempt).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("allows retry and resubmit", async () => {
    const user = userEvent.setup();
    const quiz: Quiz = {
      id: "q1",
      lessonId: "l1",
      questions: [
        {
          id: "q",
          prompt: "1+1?",
          options: ["1", "2"],
          correctOptionIndex: 1,
          explanation: "2",
          conceptTags: [],
          nextSteps: []
        }
      ]
    };
    render(<QuizRunner quiz={quiz} studentId="s1" />);
    await user.click(screen.getByLabelText("2"));
    await user.click(screen.getByRole("button", { name: "Submit Quiz" }));
    expect(mocks.addAttempt).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Retry quiz" }));
    await user.click(screen.getByLabelText("2"));
    await user.click(screen.getByRole("button", { name: "Submit Quiz" }));
    expect(mocks.addAttempt).toHaveBeenCalledTimes(2);
  });
});
