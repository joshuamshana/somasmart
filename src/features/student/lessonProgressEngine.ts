import type { LessonStep } from "@/features/content/lessonSteps";

export type LessonProgressState = {
  completedStepKeys: Set<string>;
  bestScoreByQuizId: Record<string, number | undefined>;
};

export function isStepComplete(step: LessonStep, state: LessonProgressState) {
  if (step.type === "quiz") {
    const best = state.bestScoreByQuizId[step.quizId];
    return typeof best === "number" && best >= step.passScorePct;
  }
  return state.completedStepKeys.has(step.key);
}

export function canAdvance(step: LessonStep, state: LessonProgressState) {
  if (step.type === "quiz") {
    if (isStepComplete(step, state)) return { ok: true as const };
    return { ok: false as const, reason: `Pass ${step.passScorePct}% to continue` };
  }
  // Content/PDF steps are marked complete when the user clicks Next.
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
