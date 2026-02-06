import React, { useMemo, useState } from "react";
import type { LessonAsset, Quiz, QuizAttempt } from "@/shared/types";
import { LessonPlayer } from "@/features/content/LessonPlayer";
import type { LessonStep } from "@/features/content/lessonSteps";
import { PdfViewer } from "@/features/content/PdfViewer";
import { QuizRunner } from "@/features/student/QuizRunner";
import { QuizPreview } from "@/features/teacher/QuizPreview";
import { canAdvance, isStepComplete } from "@/features/student/lessonProgressEngine";
import { Button } from "@/shared/ui/Button";

export function LessonStepperPlayer({
  steps,
  mode,
  studentId,
  completedStepKeys,
  bestScoreByQuizId,
  quizzesById,
  assetsById,
  initialStepIndex = 0,
  onMarkStepComplete,
  onQuizAttempt,
  onPdfNumPages,
  onFinish
}: {
  steps: LessonStep[];
  mode: "student" | "preview";
  studentId?: string;
  completedStepKeys: Set<string>;
  bestScoreByQuizId: Record<string, number | undefined>;
  quizzesById: Record<string, Quiz | undefined>;
  assetsById: Record<string, LessonAsset | undefined>;
  initialStepIndex?: number;
  onMarkStepComplete?: (stepKey: string, extra?: { quizAttemptId?: string; bestScore?: number }) => void | Promise<void>;
  onQuizAttempt?: (attempt: QuizAttempt) => void;
  onPdfNumPages?: (assetId: string, n: number) => void;
  onFinish?: () => void | Promise<void>;
}) {
  const [activeIndex, setActiveIndex] = useState(() => Math.min(Math.max(0, initialStepIndex), Math.max(0, steps.length - 1)));
  const activeStep = steps[activeIndex] ?? null;

  const progressState = useMemo(
    () => ({ completedStepKeys, bestScoreByQuizId }),
    [completedStepKeys, bestScoreByQuizId]
  );

  const canGoNext = activeStep ? canAdvance(activeStep, progressState).ok : false;
  const isLast = activeIndex >= steps.length - 1;

  async function next() {
    if (!activeStep) return;
    if (!canAdvance(activeStep, progressState).ok) return;
    await onMarkStepComplete?.(activeStep.key);

    if (isLast) {
      await onFinish?.();
      return;
    }

    setActiveIndex((i) => Math.min(steps.length - 1, i + 1));
  }

  function back() {
    setActiveIndex((i) => Math.max(0, i - 1));
  }

  const showOutline = steps.length <= 10;

  function renderStep() {
    if (!activeStep) return <div className="text-sm text-muted">No steps.</div>;

    if (activeStep.type === "pdf_page") {
      const asset = assetsById[activeStep.assetId];
      return (
        <div className="space-y-3">
          {!asset ? (
            <div className="text-sm text-muted">Loading PDF…</div>
          ) : (
            <PdfViewer
              blob={asset.blob}
              page={activeStep.page}
              onNumPages={(n) => onPdfNumPages?.(activeStep.assetId, n)}
            />
          )}
          <QuizGate
            step={activeStep}
            mode={mode}
            quizzesById={quizzesById}
            bestScoreByQuizId={bestScoreByQuizId}
            studentId={studentId}
            onQuizAttempt={onQuizAttempt}
            onMarkStepComplete={onMarkStepComplete}
          />
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {activeStep.blocks.length > 0 ? <LessonPlayer blocks={activeStep.blocks} /> : null}
        <QuizGate
          step={activeStep}
          mode={mode}
          quizzesById={quizzesById}
          bestScoreByQuizId={bestScoreByQuizId}
          studentId={studentId}
          onQuizAttempt={onQuizAttempt}
          onMarkStepComplete={onMarkStepComplete}
        />
      </div>
    );
  }

  const currentTitle = activeStep?.title ?? "Lesson";

  return (
    <div className="space-y-4">
      {showOutline ? (
        <div className="rounded-xl border border-border bg-surface p-3">
          <div className="mb-2 text-xs font-semibold text-muted">Progress</div>
          <div className="grid gap-2">
            {steps.map((s, idx) => {
              const complete = isStepComplete(s, progressState);
              const isActive = idx === activeIndex;
              const canSelect = mode !== "student" || idx <= activeIndex || complete;
              return (
                <button
                  key={s.key}
                  type="button"
                  className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm ${
                    isActive ? "border-brand bg-surface2" : "border-border bg-surface hover:border-border/80"
                  } ${canSelect ? "" : "opacity-50"}`}
                  disabled={!canSelect}
                  onClick={() => setActiveIndex(idx)}
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-text">
                      {idx + 1}. {s.title}
                    </div>
                    {s.sectionTitle ? <div className="truncate text-xs text-muted">{s.sectionTitle}</div> : null}
                  </div>
                  <div className="shrink-0 text-xs text-muted">{complete ? "Done" : isActive ? "Now" : ""}</div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-text">{currentTitle}</div>
              <div className="mt-1 text-xs text-muted">
                Step {activeIndex + 1} of {steps.length}
              </div>
            </div>
            <div className="w-40 rounded-full bg-surface2">
              <div
                className="h-2 rounded-full bg-brand"
                style={{ width: `${Math.round(((activeIndex + 1) / Math.max(1, steps.length)) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface p-4">{renderStep()}</div>

      <div className="sticky bottom-0 z-10 -mx-2 rounded-t-2xl border border-border bg-surface/95 p-3 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <Button variant="secondary" onClick={back} disabled={activeIndex === 0}>
            Back
          </Button>
          <div className="flex items-center gap-2">
            {mode === "student" && activeStep && !canGoNext ? (
              <div className="hidden text-xs text-amber-200 md:block">{canAdvance(activeStep, progressState).reason}</div>
            ) : null}
            <Button onClick={() => void next()} disabled={mode === "student" ? !canGoNext : false}>
              {isLast ? "Finish" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuizGate({
  step,
  mode,
  quizzesById,
  bestScoreByQuizId,
  studentId,
  onQuizAttempt,
  onMarkStepComplete
}: {
  step: LessonStep;
  mode: "student" | "preview";
  quizzesById: Record<string, Quiz | undefined>;
  bestScoreByQuizId: Record<string, number | undefined>;
  studentId?: string;
  onQuizAttempt?: (attempt: QuizAttempt) => void;
  onMarkStepComplete?: (stepKey: string, extra?: { quizAttemptId?: string; bestScore?: number }) => void | Promise<void>;
}) {
  const gate = step.quizGate;
  if (!gate) return null;
  const quiz = quizzesById[gate.quizId];
  const best = bestScoreByQuizId[gate.quizId];
  const passed = typeof best === "number" && best >= gate.passScorePct;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-surface p-3">
        <div className="text-sm font-semibold text-text">Pass: {gate.passScorePct}% to continue</div>
        <div className="mt-1 text-xs text-muted">
          Best score:{" "}
          <span className={passed ? "font-semibold text-emerald-300" : "font-semibold text-amber-200"}>
            {typeof best === "number" ? `${best}%` : "—"}
          </span>
        </div>
      </div>
      {!quiz ? (
        <div className="text-sm text-muted">Quiz unavailable.</div>
      ) : mode === "student" ? (
        <QuizRunner
          quiz={quiz}
          studentId={studentId ?? ""}
          onComplete={async (attempt) => {
            onQuizAttempt?.(attempt);
            if (attempt.score >= gate.passScorePct) {
              await onMarkStepComplete?.(step.key, {
                quizAttemptId: attempt.id,
                bestScore: attempt.score
              });
            }
          }}
        />
      ) : (
        <QuizPreview quiz={quiz} />
      )}
    </div>
  );
}
