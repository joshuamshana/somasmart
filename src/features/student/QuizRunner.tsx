import React, { useMemo, useState } from "react";
import type { Quiz, QuizAttempt } from "@/shared/types";
import { db } from "@/shared/db/db";
import { Button } from "@/shared/ui/Button";
import { scoreQuiz, buildTutorRecommendation } from "@/features/student/quizEngine";
import { awardBadgeIfMissing, recordLearningActivity } from "@/shared/gamification/gamification";

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function QuizRunner({
  quiz,
  studentId,
  onComplete
}: {
  quiz: Quiz;
  studentId: string;
  onComplete?: (attempt: QuizAttempt) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const summary = useMemo(() => scoreQuiz(quiz, answers), [quiz, answers]);

  async function submit() {
    const attempt: QuizAttempt = {
      id: newId("attempt"),
      studentId,
      quizId: quiz.id,
      score: summary.score,
      answersByQuestionId: answers,
      createdAt: nowIso()
    };
    await db.quizAttempts.add(attempt);
    await recordLearningActivity(studentId);
    await awardBadgeIfMissing(studentId, "first_quiz_submit");
    setSubmitted(true);
    onComplete?.(attempt);
  }

  function retry() {
    setAnswers({});
    setSubmitted(false);
  }

  if (quiz.questions.length === 0) return <div className="text-sm text-muted">No quiz questions.</div>;

  return (
    <div className="space-y-4">
      {quiz.questions.map((q, idx) => {
        const selected = answers[q.id];
        const correct = selected === q.correctOptionIndex;
        const hasAnswer = typeof selected === "number";
        return (
          <div key={q.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="text-sm font-semibold">
              {idx + 1}. {q.prompt}
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
                    name={q.id}
                    checked={selected === i}
                    onChange={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
            {submitted && hasAnswer ? (
              <div className={`mt-3 rounded-lg p-3 text-sm ${correct ? "bg-success-surface text-success-text" : "bg-danger-surface text-danger-text"}`}>
                <div className="font-semibold">{correct ? "Correct" : "Incorrect"}</div>
                <div className="mt-1">{q.explanation}</div>
              </div>
            ) : null}
          </div>
        );
      })}

      <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
        <div className="text-sm text-muted">
          Score (preview): <span className="font-semibold">{summary.score}%</span>
        </div>
        <div className="flex items-center gap-2">
          {submitted ? (
            <Button variant="secondary" onClick={retry}>
              Retry quiz
            </Button>
          ) : null}
          <Button onClick={submit} disabled={submitted}>
            {submitted ? "Submitted" : "Submit Quiz"}
          </Button>
        </div>
      </div>

      {submitted ? (
        <TutorFeedback quiz={quiz} answers={answers} studentId={studentId} score={summary.score} />
      ) : null}
    </div>
  );
}

function TutorFeedback({
  quiz,
  answers,
  studentId,
  score
}: {
  quiz: Quiz;
  answers: Record<string, number>;
  studentId: string;
  score: number;
}) {
  const attempt: QuizAttempt = {
    id: "preview",
    studentId,
    quizId: quiz.id,
    score,
    answersByQuestionId: answers,
    createdAt: nowIso()
  };
  const rec = buildTutorRecommendation({ quiz, attempt });
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-base font-semibold">AI Tutor</div>
      <div className="mt-1 text-sm text-muted">{rec.headline}</div>
      {"detail" in rec && rec.detail ? <div className="mt-2 text-sm text-muted">{rec.detail}</div> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {rec.next.map((n) => (
          <span key={n.action} className="rounded bg-surface2 px-2 py-1 text-xs text-text">
            {n.label}
          </span>
        ))}
      </div>
      <div className="mt-3 text-xs text-muted">
        Offline tutor in MVP: explanations come from the quiz content pack.
      </div>
    </div>
  );
}
