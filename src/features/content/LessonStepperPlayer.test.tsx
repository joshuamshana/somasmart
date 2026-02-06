import React, { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LessonStepperPlayer } from "@/features/content/LessonStepperPlayer";
import type { LessonStep } from "@/features/content/lessonSteps";
import type { LessonAsset, Quiz, QuizAttempt } from "@/shared/types";

vi.mock("@/features/student/QuizRunner", () => ({
  QuizRunner: ({ onComplete }: { onComplete?: (a: QuizAttempt) => void }) => (
    <button
      type="button"
      onClick={() =>
        onComplete?.({
          id: "attempt_1",
          studentId: "s1",
          quizId: "q1",
          score: 80,
          answersByQuestionId: {},
          createdAt: new Date().toISOString()
        })
      }
    >
      Mock submit pass
    </button>
  )
}));

describe("LessonStepperPlayer", () => {
  it("marks content step complete on Next, blocks on quiz until passed, then finishes", async () => {
    const user = userEvent.setup();
    const steps: LessonStep[] = [
      {
        key: "blockv2:b1",
        type: "block",
        title: "Reading",
        blockId: "b1",
        blocks: [{ id: "b1:t1", type: "text", variant: "body", text: "Hello" }]
      },
      {
        key: "blockv2:b2",
        type: "block",
        title: "Quiz",
        blockId: "b2",
        blocks: [],
        quizGate: { quizId: "q1", requiredToContinue: true, passScorePct: 70 }
      }
    ];
    const quiz: Quiz = { id: "q1", lessonId: "l1", questions: [] };
    const quizzesById: Record<string, Quiz | undefined> = { q1: quiz };
    const assetsById: Record<string, LessonAsset | undefined> = {};
    const onFinish = vi.fn();
    const onMark = vi.fn(async (_stepKey: string) => undefined);

    function Harness() {
      const [completed, setCompleted] = useState<Set<string>>(new Set());
      const [best, setBest] = useState<Record<string, number | undefined>>({});
      return (
        <LessonStepperPlayer
          steps={steps}
          mode="student"
          studentId="s1"
          completedStepKeys={completed}
          bestScoreByQuizId={best}
          quizzesById={quizzesById}
          assetsById={assetsById}
          onMarkStepComplete={async (stepKey) => {
            onMark(stepKey);
            setCompleted((prev) => new Set([...prev, stepKey]));
          }}
          onQuizAttempt={(attempt) => setBest((m) => ({ ...m, [attempt.quizId]: attempt.score }))}
          onFinish={onFinish}
        />
      );
    }

    render(<Harness />);
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(onMark).toHaveBeenCalledWith("blockv2:b1");

    // quiz step: next should be disabled until pass
    expect(screen.getByRole("button", { name: "Finish" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Mock submit pass" }));

    expect(screen.getByRole("button", { name: "Finish" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Finish" }));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
