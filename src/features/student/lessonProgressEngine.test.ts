import { describe, expect, it } from "vitest";
import type { LessonStep } from "@/features/content/lessonSteps";
import { canAdvance, isLessonComplete, isStepComplete, nextIncompleteStepIndex } from "@/features/student/lessonProgressEngine";

describe("lessonProgressEngine", () => {
  it("content step completes only after it is marked complete", () => {
    const step: LessonStep = {
      key: "blockv2:b1",
      type: "block",
      title: "Reading",
      blockId: "b1",
      blocks: [{ id: "b1:t1", type: "text", variant: "body", text: "Hi" }]
    };
    const state = { completedStepKeys: new Set<string>(), bestScoreByQuizId: {} };
    expect(isStepComplete(step, state)).toBe(false);
    expect(canAdvance(step, state).ok).toBe(true);

    const state2 = { ...state, completedStepKeys: new Set<string>(["blockv2:b1"]) };
    expect(isStepComplete(step, state2)).toBe(true);
    expect(canAdvance(step, state2).ok).toBe(true);
  });

  it("gated step blocks until a passing attempt exists", () => {
    const quizStep: LessonStep = {
      key: "blockv2:q1",
      type: "block",
      title: "Quiz",
      blockId: "qblock",
      blocks: [],
      quizGate: { quizId: "q1", requiredToContinue: true, passScorePct: 70 }
    };
    const state = { completedStepKeys: new Set<string>(), bestScoreByQuizId: { q1: 60 } };
    expect(canAdvance(quizStep, state).ok).toBe(false);

    const state2 = { ...state, bestScoreByQuizId: { q1: 70 } };
    expect(canAdvance(quizStep, state2).ok).toBe(true);
  });

  it("lesson completes only after all steps are complete", () => {
    const steps: LessonStep[] = [
      { key: "blockv2:a", type: "block", title: "A", blockId: "a", blocks: [{ id: "a:t1", type: "text", variant: "body", text: "a" }] },
      {
        key: "blockv2:q1",
        type: "block",
        title: "Quiz",
        blockId: "q1",
        blocks: [],
        quizGate: { quizId: "q1", requiredToContinue: true, passScorePct: 70 }
      }
    ];
    const state1 = { completedStepKeys: new Set<string>(["blockv2:a"]), bestScoreByQuizId: { q1: 60 } };
    expect(isLessonComplete(steps, state1)).toBe(false);
    const state2 = { completedStepKeys: new Set<string>(["blockv2:a"]), bestScoreByQuizId: { q1: 80 } };
    expect(isLessonComplete(steps, state2)).toBe(true);
  });

  it("resumes at first incomplete step", () => {
    const steps: LessonStep[] = [
      { key: "blockv2:1", type: "block", title: "1", blockId: "1", blocks: [{ id: "1:t1", type: "text", variant: "body", text: "1" }] },
      { key: "blockv2:2", type: "block", title: "2", blockId: "2", blocks: [{ id: "2:t1", type: "text", variant: "body", text: "2" }] }
    ];
    const state = { completedStepKeys: new Set<string>(["blockv2:1"]), bestScoreByQuizId: {} };
    expect(nextIncompleteStepIndex(steps, state)).toBe(1);
  });
});
