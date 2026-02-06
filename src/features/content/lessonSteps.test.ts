import { describe, expect, it } from "vitest";
import { buildLessonSteps } from "@/features/content/lessonSteps";
import type { LessonAsset, LessonBlock, Quiz } from "@/shared/types";

describe("buildLessonSteps", () => {
  it("makes 1 step per content block", () => {
    const blocks: LessonBlock[] = [{ id: "b1", type: "text", variant: "body", text: "Hello" }];
    const steps = buildLessonSteps({ blocks, assetsById: {}, quizzesById: {} });
    expect(steps).toHaveLength(1);
    expect(steps[0]?.type).toBe("content");
    expect(steps[0]?.key).toBe("block:b1");
  });

  it("expands PDF into 1 step per page when pageCount is present", () => {
    const pdfAsset: LessonAsset = {
      id: "a1",
      lessonId: "l1",
      kind: "pdf",
      name: "notes.pdf",
      mime: "application/pdf",
      blob: new Blob([]),
      pageCount: 3,
      createdAt: new Date().toISOString()
    };
    const blocks: LessonBlock[] = [{ id: "b_pdf", type: "pdf", assetId: "a1", mime: "application/pdf", name: "notes.pdf" }];
    const steps = buildLessonSteps({ blocks, assetsById: { a1: pdfAsset }, quizzesById: {} });
    expect(steps).toHaveLength(3);
    expect(steps.map((s) => s.key)).toEqual(["pdf:b_pdf:page:1", "pdf:b_pdf:page:2", "pdf:b_pdf:page:3"]);
  });

  it("uses default passScorePct=70 for quiz blocks", () => {
    const blocks: LessonBlock[] = [{ id: "qb1", type: "quiz", quizId: "q1", requiredToContinue: true }];
    const steps = buildLessonSteps({ blocks, assetsById: {}, quizzesById: {} });
    expect(steps).toHaveLength(1);
    expect(steps[0]?.type).toBe("quiz");
    expect(steps[0] && steps[0].type === "quiz" ? steps[0].passScorePct : null).toBe(70);
  });

  it("appends legacy quiz as final step when no quiz blocks exist", () => {
    const quiz: Quiz = { id: "q_legacy", lessonId: "l1", questions: [] };
    const blocks: LessonBlock[] = [{ id: "b1", type: "text", variant: "body", text: "Hello" }];
    const steps = buildLessonSteps({ blocks, assetsById: {}, quizzesById: { [quiz.id]: quiz } });
    expect(steps).toHaveLength(2);
    expect(steps[1]?.type).toBe("quiz");
    expect(steps[1]?.key).toBe("quiz:legacy:q_legacy");
  });
});

