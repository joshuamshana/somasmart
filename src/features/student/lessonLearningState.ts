import type { Progress } from "@/shared/types";

export type LessonLearningState = "new" | "in_progress" | "completed";

export function getLessonLearningState(progress: Progress | undefined): LessonLearningState {
  if (!progress) return "new";
  if (progress.completedAt) return "completed";
  return "in_progress";
}
