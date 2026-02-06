import type { LessonStep } from "@/features/content/lessonSteps";

export type LessonProgressState = {
  completedStepKeys: Set<string>;
  bestScoreByQuizId: Record<string, number | undefined>;
};

function hasPassedGate(step: LessonStep, state: LessonProgressState) {
  const gate = step.quizGate;
  if (!gate) return true;
  const best = state.bestScoreByQuizId[gate.quizId];
  return typeof best === "number" && best >= gate.passScorePct;
}

export function isStepComplete(step: LessonStep, state: LessonProgressState) {
  if (!hasPassedGate(step, state)) return false;
  return step.quizGate ? true : state.completedStepKeys.has(step.key);
}

export function canAdvance(step: LessonStep, state: LessonProgressState) {
  if (step.quizGate && !hasPassedGate(step, state)) {
    return { ok: false as const, reason: `Pass ${step.quizGate.passScorePct}% to continue` };
  }
  return { ok: true as const };
}

export function isLessonComplete(steps: LessonStep[], state: LessonProgressState) {
  return steps.every((s) => isStepComplete(s, state));
}

export function nextIncompleteStepIndex(steps: LessonStep[], state: LessonProgressState) {
  const idx = steps.findIndex((s) => !isStepComplete(s, state));
  if (idx === -1) return Math.max(0, steps.length - 1);
  return idx;
}
