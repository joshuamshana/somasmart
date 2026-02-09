export const LESSON_BUILDER_STEP_QUERY_KEY = "step";

export const LESSON_BUILDER_STEPS = ["metadata", "blocks", "preview", "submit"] as const;

export type LessonBuilderStepId = (typeof LESSON_BUILDER_STEPS)[number];

export function isLessonBuilderStepId(value: string | null | undefined): value is LessonBuilderStepId {
  return LESSON_BUILDER_STEPS.includes((value ?? "") as LessonBuilderStepId);
}

export function getStepFromSearch(search: string): LessonBuilderStepId {
  const params = new URLSearchParams(search);
  const raw = params.get(LESSON_BUILDER_STEP_QUERY_KEY);
  return isLessonBuilderStepId(raw) ? raw : "metadata";
}

export function withStepInSearch(search: string, step: LessonBuilderStepId) {
  const params = new URLSearchParams(search);
  params.set(LESSON_BUILDER_STEP_QUERY_KEY, step);
  const next = params.toString();
  return next ? `?${next}` : "";
}
