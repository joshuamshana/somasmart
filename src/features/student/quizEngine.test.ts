import { describe, expect, it } from "vitest";
import { scoreQuiz, buildTutorRecommendation } from "@/features/student/quizEngine";
import type { Quiz, QuizAttempt } from "@/shared/types";

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

describe("buildTutorRecommendation", () => {
  it("returns positive guidance when quiz is fully correct", () => {
    const quiz: Quiz = {
      id: "quiz_ok",
      lessonId: "lesson_1",
      questions: [
        {
          id: "q1",
          prompt: "1+1?",
          options: ["1", "2"],
          correctOptionIndex: 1,
          explanation: "Two",
          conceptTags: ["addition"],
          nextSteps: []
        }
      ]
    };
    const attempt: QuizAttempt = {
      id: "a1",
      studentId: "s1",
      quizId: "quiz_ok",
      score: 100,
      answersByQuestionId: { q1: 1 },
      createdAt: new Date().toISOString()
    };

    const rec = buildTutorRecommendation({ quiz, attempt });
    expect(rec.headline).toContain("Great work");
    expect(rec.next.some((n) => n.action === "browse_lessons")).toBe(true);
  });

  it("returns focus area with repeat/retry when wrong answers exist", () => {
    const quiz: Quiz = {
      id: "quiz_focus",
      lessonId: "lesson_1",
      questions: [
        {
          id: "q1",
          prompt: "3+1?",
          options: ["3", "4"],
          correctOptionIndex: 1,
          explanation: "Four",
          conceptTags: ["addition", "numbers"],
          nextSteps: []
        }
      ]
    };
    const attempt: QuizAttempt = {
      id: "a2",
      studentId: "s1",
      quizId: "quiz_focus",
      score: 0,
      answersByQuestionId: { q1: 0 },
      createdAt: new Date().toISOString()
    };

    const rec = buildTutorRecommendation({ quiz, attempt });
    expect(rec.headline).toBe("Focus area");
    expect((rec as { detail?: string }).detail).toContain("addition");
    expect(rec.next.map((n) => n.action)).toEqual(["repeat_lesson", "retry_quiz"]);
  });
});
