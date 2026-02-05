import { describe, expect, it } from "vitest";
import { scoreQuiz } from "@/features/student/quizEngine";
import type { Quiz } from "@/shared/types";

describe("scoreQuiz", () => {
  it("scores 100% when all correct", () => {
    const quiz: Quiz = {
      id: "q1",
      lessonId: "l1",
      questions: [
        { id: "a", prompt: "p", options: ["x"], correctOptionIndex: 0, explanation: "", conceptTags: [], nextSteps: [] }
      ]
    };
    const res = scoreQuiz(quiz, { a: 0 });
    expect(res.score).toBe(100);
    expect(res.correct).toBe(1);
  });

  it("scores 0% when wrong", () => {
    const quiz: Quiz = {
      id: "q1",
      lessonId: "l1",
      questions: [
        { id: "a", prompt: "p", options: ["x", "y"], correctOptionIndex: 1, explanation: "", conceptTags: [], nextSteps: [] }
      ]
    };
    const res = scoreQuiz(quiz, { a: 0 });
    expect(res.score).toBe(0);
    expect(res.correct).toBe(0);
  });
});

