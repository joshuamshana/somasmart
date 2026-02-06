import type { LessonAsset, LessonBlock, LessonBlockV2, Quiz } from "@/shared/types";
import { mapLegacyBlocksToV2, normalizeBlockV2 } from "@/shared/content/lessonContent";

export type LessonStepGate = {
  quizId: string;
  requiredToContinue: true;
  passScorePct: number;
};

export type LessonStep =
  | {
      key: string;
      type: "block";
      title: string;
      sectionTitle?: string;
      blockId: string;
      blocks: Exclude<LessonBlock, { type: "step_break" } | { type: "quiz" }>[];
      quizGate?: LessonStepGate;
    }
  | {
      key: string;
      type: "pdf_page";
      title: string;
      sectionTitle?: string;
      blockId: string;
      assetId: string;
      page: number;
      pageCount: number;
      name: string;
      mime: string;
      quizGate?: LessonStepGate;
    };

export function stepKeyForBlockV2(blockId: string) {
  return `blockv2:${blockId}`;
}

export function stepKeyForPdfPageV2(blockId: string, page: number) {
  return `pdfv2:${blockId}:page:${page}`;
}

function blockTitle(block: LessonBlockV2) {
  if (block.title?.trim()) return block.title.trim();
  const media = block.components.find((c) => c.type === "media");
  if (media) return media.name || media.mediaType.toUpperCase();
  const firstText = block.components.find(
    (c): c is Extract<typeof c, { type: "text" }> => c.type === "text" && c.text.trim().length > 0
  );
  if (firstText) return firstText.text.trim().slice(0, 80);
  if (block.quizGate) return "Quiz";
  return "Step";
}

function mapComponentToLegacyBlock(component: LessonBlockV2["components"][number], blockId: string): LessonBlock | null {
  if (component.type === "text") {
    return {
      id: `${blockId}:${component.id}`,
      type: "text",
      variant: component.variant,
      text: component.text
    };
  }
  return {
    id: `${blockId}:${component.id}`,
    type: component.mediaType,
    assetId: component.assetId,
    mime: component.mime,
    name: component.name
  } satisfies LessonBlock;
}

export function buildStepsFromBlocksV2({
  blocksV2,
  assetsById
}: {
  blocksV2: LessonBlockV2[];
  assetsById: Record<string, LessonAsset | undefined>;
}): LessonStep[] {
  const steps: LessonStep[] = [];
  let sectionTitle: string | undefined = undefined;

  for (const block of blocksV2) {
    const media = block.components.filter((c) => c.type === "media");
    const mediaItem = media[0] ?? null;
    const gate = block.quizGate
      ? {
          quizId: block.quizGate.quizId,
          requiredToContinue: true as const,
          passScorePct: Number.isFinite(block.quizGate.passScorePct) ? block.quizGate.passScorePct : 70
        }
      : undefined;

    if (block.isDivider) {
      sectionTitle = block.title?.trim() || undefined;
      continue;
    }

    if (mediaItem?.mediaType === "pdf") {
      const asset = assetsById[mediaItem.assetId];
      const pageCount = Math.max(1, asset?.pageCount ?? 1);
      for (let page = 1; page <= pageCount; page++) {
        steps.push({
          key: stepKeyForPdfPageV2(block.id, page),
          type: "pdf_page",
          title: `${mediaItem.name} — Page ${page}`,
          sectionTitle,
          blockId: block.id,
          assetId: mediaItem.assetId,
          page,
          pageCount,
          name: mediaItem.name,
          mime: mediaItem.mime,
          quizGate: page === pageCount ? gate : undefined
        });
      }
      continue;
    }

    const renderedBlocks = block.components
      .map((component) => mapComponentToLegacyBlock(component, block.id))
      .filter(Boolean) as Exclude<LessonBlock, { type: "step_break" } | { type: "quiz" }>[];

    steps.push({
      key: stepKeyForBlockV2(block.id),
      type: "block",
      title: blockTitle(block),
      sectionTitle,
      blockId: block.id,
      blocks: renderedBlocks,
      quizGate: gate
    });
  }

  return steps;
}

export function buildLessonSteps({
  blocks,
  blocksV2,
  assetsById,
  quizzesById
}: {
  blocks?: LessonBlock[];
  blocksV2?: LessonBlockV2[];
  assetsById: Record<string, LessonAsset | undefined>;
  quizzesById: Record<string, Quiz | undefined>;
}): LessonStep[] {
  const candidateBlocks =
    blocksV2 ??
    mapLegacyBlocksToV2({
      blocks: blocks ?? [],
      quizzesById
    });
  const normalized = candidateBlocks.map((block) => {
    const issues = normalizeBlockV2(block);
    if (issues.length === 0) return block;
    const media = block.components.filter((c) => c.type === "media");
    const text = block.components.filter((c) => c.type === "text");
    if (media.some((m) => m.mediaType === "pdf")) {
      return {
        ...block,
        components: media.filter((m) => m.mediaType === "pdf").slice(0, 1)
      };
    }
    return {
      ...block,
      components: [...text, ...media.slice(0, 1)]
    };
  });
  return buildStepsFromBlocksV2({ blocksV2: normalized, assetsById });
}
