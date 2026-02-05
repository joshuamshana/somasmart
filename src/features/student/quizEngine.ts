import type { Quiz, QuizAttempt } from "@/shared/types";

export function scoreQuiz(quiz: Quiz, answersByQuestionId: Record<string, number>) {
  const total = quiz.questions.length;
  const correct = quiz.questions.reduce((acc, q) => {
    const a = answersByQuestionId[q.id];
    return acc + (a === q.correctOptionIndex ? 1 : 0);
  }, 0);
  const score = total === 0 ? 0 : Math.round((correct / total) * 100);
  return { total, correct, score };
}

export function buildTutorRecommendation({
  quiz,
  attempt
}: {
  quiz: Quiz;
  attempt: QuizAttempt;
}) {
  const wrongQs = quiz.questions.filter((q) => attempt.answersByQuestionId[q.id] !== q.correctOptionIndex);
  if (wrongQs.length === 0) {
    return {
      headline: "Great work!",
      next: [{ label: "Try a new lesson", action: "browse_lessons" as const }]
    };
  }
  const top = wrongQs[0];
  const tags = top.conceptTags.join(", ");
  return {
    headline: "Focus area",
    detail: tags ? `We recommend practicing: ${tags}` : "We recommend repeating the lesson and retrying the quiz.",
    next: [
      { label: "Repeat lesson", action: "repeat_lesson" as const },
      { label: "Retry quiz", action: "retry_quiz" as const }
    ]
  };
}

