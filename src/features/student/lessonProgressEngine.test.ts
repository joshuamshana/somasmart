import { describe, expect, it } from "vitest";
import type { LessonStep } from "@/features/content/lessonSteps";
import { canAdvance, isLessonComplete, isStepComplete, nextIncompleteStepIndex } from "@/features/student/lessonProgressEngine";

describe("lessonProgressEngine", () => {
  it("content step completes only after it is marked complete", () => {
    const step: LessonStep = {
      key: "block:b1",
      type: "content",
      title: "Reading",
      block: { id: "b1", type: "text", variant: "body", text: "Hi" }
    };
    const state = { completedStepKeys: new Set<string>(), bestScoreByQuizId: {} };
    expect(isStepComplete(step, state)).toBe(false);
    expect(canAdvance(step, state).ok).toBe(true);

    const state2 = { ...state, completedStepKeys: new Set<string>(["block:b1"]) };
    expect(isStepComplete(step, state2)).toBe(true);
    expect(canAdvance(step, state2).ok).toBe(true);
  });

  it("quiz step blocks until a passing attempt exists", () => {
    const quizStep: LessonStep = {
      key: "quiz:legacy:q1",
      type: "quiz",
      title: "Quiz",
      quizId: "q1",
      requiredToContinue: true,
      passScorePct: 70,
      blockId: "legacy_q1"
    };
    const state = { completedStepKeys: new Set<string>(), bestScoreByQuizId: { q1: 60 } };
    expect(canAdvance(quizStep, state).ok).toBe(false);

    const state2 = { ...state, bestScoreByQuizId: { q1: 70 } };
    expect(canAdvance(quizStep, state2).ok).toBe(true);
  });

  it("lesson completes only after all steps are complete", () => {
    const steps: LessonStep[] = [
      { key: "block:a", type: "content", title: "A", block: { id: "a", type: "text", variant: "body", text: "a" } },
      { key: "quiz:legacy:q1", type: "quiz", title: "Quiz", quizId: "q1", requiredToContinue: true, passScorePct: 70, blockId: "legacy_q1" }
    ];
    const state1 = { completedStepKeys: new Set<string>(["block:a"]), bestScoreByQuizId: { q1: 60 } };
    expect(isLessonComplete(steps, state1)).toBe(false);
    const state2 = { completedStepKeys: new Set<string>(["block:a"]), bestScoreByQuizId: { q1: 80 } };
    expect(isLessonComplete(steps, state2)).toBe(true);
  });

  it("resumes at first incomplete step", () => {
    const steps: LessonStep[] = [
      { key: "block:1", type: "content", title: "1", block: { id: "1", type: "text", variant: "body", text: "1" } },
      { key: "block:2", type: "content", title: "2", block: { id: "2", type: "text", variant: "body", text: "2" } }
    ];
    const state = { completedStepKeys: new Set<string>(["block:1"]), bestScoreByQuizId: {} };
    expect(nextIncompleteStepIndex(steps, state)).toBe(1);
  });
});
