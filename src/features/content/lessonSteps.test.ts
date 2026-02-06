import { describe, expect, it } from "vitest";
import type { LessonAsset, LessonBlockV2 } from "@/shared/types";
import { buildLessonSteps, buildStepsFromBlocksV2 } from "@/features/content/lessonSteps";
import { mapLegacyBlocksToV2, normalizeBlockV2 } from "@/shared/content/lessonContent";

describe("normalizeBlockV2", () => {
  it("flags PDF mixed with text", () => {
    const block: LessonBlockV2 = {
      id: "b1",
      components: [
        { id: "t1", type: "text", variant: "body", text: "Intro" },
        {
          id: "m1",
          type: "media",
          mediaType: "pdf",
          assetId: "a1",
          name: "notes.pdf",
          mime: "application/pdf"
        }
      ]
    };
    expect(normalizeBlockV2(block)).toContain("PDF blocks must be PDF-only.");
  });

  it("flags more than one media component", () => {
    const block: LessonBlockV2 = {
      id: "b1",
      components: [
        { id: "m1", type: "media", mediaType: "image", assetId: "a1", name: "img", mime: "image/png" },
        { id: "m2", type: "media", mediaType: "video", assetId: "a2", name: "vid", mime: "video/mp4" }
      ]
    };
    expect(normalizeBlockV2(block)).toContain("Block can include at most one media component.");
  });
});

describe("buildStepsFromBlocksV2", () => {
  it("builds a single step for non-pdf composite blocks", () => {
    const blocksV2: LessonBlockV2[] = [
      {
        id: "b1",
        title: "Composite",
        components: [
          { id: "t1", type: "text", variant: "heading", text: "Title" },
          { id: "t2", type: "text", variant: "body", text: "Body" },
          { id: "m1", type: "media", mediaType: "video", assetId: "a1", name: "lesson.mp4", mime: "video/mp4" }
        ]
      }
    ];
    const steps = buildStepsFromBlocksV2({ blocksV2, assetsById: {} });
    expect(steps).toHaveLength(1);
    expect(steps[0]?.type).toBe("block");
    expect(steps[0]?.key).toBe("blockv2:b1");
  });

  it("builds one step per PDF page and puts gate on last page", () => {
    const asset: LessonAsset = {
      id: "a_pdf",
      lessonId: "l1",
      kind: "pdf",
      name: "doc.pdf",
      mime: "application/pdf",
      blob: new Blob([]),
      pageCount: 4,
      createdAt: new Date().toISOString()
    };
    const blocksV2: LessonBlockV2[] = [
      {
        id: "b_pdf",
        components: [
          { id: "m1", type: "media", mediaType: "pdf", assetId: "a_pdf", name: "doc.pdf", mime: "application/pdf" }
        ],
        quizGate: { quizId: "q1", requiredToContinue: true, passScorePct: 70 }
      }
    ];
    const steps = buildStepsFromBlocksV2({ blocksV2, assetsById: { a_pdf: asset } });
    expect(steps).toHaveLength(4);
    expect(steps.map((s) => s.key)).toEqual([
      "pdfv2:b_pdf:page:1",
      "pdfv2:b_pdf:page:2",
      "pdfv2:b_pdf:page:3",
      "pdfv2:b_pdf:page:4"
    ]);
    expect(steps[2]?.quizGate).toBeUndefined();
    expect(steps[3]?.quizGate?.quizId).toBe("q1");
  });
});

describe("legacy mapping fallback", () => {
  it("maps legacy quiz block to v2 quiz gate", () => {
    const blocksV2 = mapLegacyBlocksToV2({
      blocks: [{ id: "qb", type: "quiz", quizId: "q1", requiredToContinue: true }],
      quizzesById: {}
    });
    expect(blocksV2).toHaveLength(1);
    expect(blocksV2[0]?.quizGate?.quizId).toBe("q1");
  });

  it("buildLessonSteps accepts legacy blocks", () => {
    const steps = buildLessonSteps({
      blocks: [{ id: "txt1", type: "text", variant: "body", text: "Hello" }],
      assetsById: {},
      quizzesById: {}
    });
    expect(steps).toHaveLength(1);
    expect(steps[0]?.type).toBe("block");
  });
});

