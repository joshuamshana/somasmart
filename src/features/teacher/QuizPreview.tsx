import React, { useMemo, useState } from "react";
import type { Quiz } from "@/shared/types";
import { scoreQuiz, buildTutorRecommendation } from "@/features/student/quizEngine";
import { Button } from "@/shared/ui/Button";

function nowIso() {
  return new Date().toISOString();
}

export function QuizPreview({ quiz }: { quiz: Quiz }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const summary = useMemo(() => scoreQuiz(quiz, answers), [quiz, answers]);

  if (quiz.questions.length === 0) return <div className="text-sm text-muted">No quiz questions.</div>;

  return (
    <div className="space-y-4">
      {quiz.questions.map((q, idx) => {
        const selected = answers[q.id];
        const correct = selected === q.correctOptionIndex;
        const hasAnswer = typeof selected === "number";
        return (
          <div key={q.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="text-sm font-semibold text-text">
              {idx + 1}. {q.prompt || "Untitled question"}
            </div>
            <div className="mt-3 grid gap-2">
              {q.options.map((opt, i) => (
                <label
                  key={i}
                  className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                    selected === i ? "border-brand" : "border-border hover:border-border/80"
                  }`}
                >
                  <input
                    type="radio"
                    name={`preview_${q.id}`}
                    checked={selected === i}
                    onChange={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                  />
                  <span className="text-text">{opt || `Option ${i + 1}`}</span>
                </label>
              ))}
            </div>
            {submitted && hasAnswer ? (
              <div
                className={`mt-3 rounded-lg p-3 text-sm ${
                  correct ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                }`}
              >
                <div className="font-semibold">{correct ? "Correct" : "Incorrect"}</div>
                <div className="mt-1 text-text">{q.explanation || "No explanation provided."}</div>
              </div>
            ) : null}
          </div>
        );
      })}

      <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
        <div className="text-sm text-muted">
          Score (preview): <span className="font-semibold text-text">{summary.score}%</span>
        </div>
        <Button onClick={() => setSubmitted(true)} disabled={submitted}>
          {submitted ? "Submitted" : "Submit Quiz"}
        </Button>
      </div>

      {submitted ? (
        <TutorFeedback quiz={quiz} answers={answers} score={summary.score} />
      ) : null}
    </div>
  );
}

function TutorFeedback({
  quiz,
  answers,
  score
}: {
  quiz: Quiz;
  answers: Record<string, number>;
  score: number;
}) {
  const attempt = useMemo(
    () => ({
      id: "preview",
      studentId: "preview",
      quizId: quiz.id,
      score,
      answersByQuestionId: answers,
      createdAt: nowIso()
    }),
    [answers, quiz.id, score]
  );
  const rec = buildTutorRecommendation({ quiz, attempt });
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-base font-semibold text-text">AI Tutor (preview)</div>
      <div className="mt-1 text-sm text-muted">{rec.headline}</div>
      {"detail" in rec && rec.detail ? <div className="mt-2 text-sm text-muted">{rec.detail}</div> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {rec.next.map((n) => (
          <span key={n.action} className="rounded bg-surface2 px-2 py-1 text-xs text-text">
            {n.label}
          </span>
        ))}
      </div>
      <div className="mt-3 text-xs text-muted">Preview does not write quiz attempts.</div>
    </div>
  );
}

