import type { LessonAsset, LessonBlock, Quiz } from "@/shared/types";

export type LessonStep =
  | {
      key: string;
      type: "content";
      title: string;
      sectionTitle?: string;
      block: Exclude<LessonBlock, { type: "step_break" } | { type: "quiz" }>;
    }
  | {
      key: string;
      type: "pdf_page";
      title: string;
      sectionTitle?: string;
      assetId: string;
      page: number;
      pageCount: number;
      name: string;
      mime: string;
      blockId: string;
    }
  | {
      key: string;
      type: "quiz";
      title: string;
      sectionTitle?: string;
      quizId: string;
      requiredToContinue: true;
      passScorePct: number;
      blockId: string;
    };

export function stepKeyForBlock(blockId: string) {
  return `block:${blockId}`;
}

export function stepKeyForPdfPage(blockId: string, page: number) {
  return `pdf:${blockId}:page:${page}`;
}

export function stepKeyForQuizBlock(blockId: string, quizId: string) {
  return `quiz:${blockId}:${quizId}`;
}

function titleFromTextBlock(block: Extract<LessonBlock, { type: "text" }>) {
  const raw = (block.text ?? "").trim();
  const firstLine = raw.split("\n")[0]?.trim() ?? "";
  if (block.variant === "title" || block.variant === "subtitle" || block.variant === "heading") {
    return firstLine || "Reading";
  }
  return firstLine ? firstLine.slice(0, 80) : "Reading";
}

export function buildLessonSteps({
  blocks,
  assetsById,
  quizzesById
}: {
  blocks: LessonBlock[];
  assetsById: Record<string, LessonAsset | undefined>;
  quizzesById: Record<string, Quiz | undefined>;
}): LessonStep[] {
  const steps: LessonStep[] = [];
  let sectionTitle: string | undefined = undefined;

  const hasExplicitQuizSteps = blocks.some((b) => b.type === "quiz");

  for (const block of blocks) {
    if (block.type === "step_break") {
      const t = (block.title ?? "").trim();
      sectionTitle = t ? t : undefined;
      continue;
    }

    if (block.type === "quiz") {
      const passScorePct = typeof block.passScorePct === "number" ? block.passScorePct : 70;
      steps.push({
        key: stepKeyForQuizBlock(block.id, block.quizId),
        type: "quiz",
        title: (block.title ?? "").trim() || "Quiz",
        sectionTitle,
        quizId: block.quizId,
        requiredToContinue: true,
        passScorePct,
        blockId: block.id
      });
      continue;
    }

    if (block.type === "pdf") {
      const asset = assetsById[block.assetId];
      const pageCount = Math.max(1, asset?.pageCount ?? 1);
      for (let page = 1; page <= pageCount; page++) {
        steps.push({
          key: stepKeyForPdfPage(block.id, page),
          type: "pdf_page",
          title: `${block.name} — Page ${page}`,
          sectionTitle,
          assetId: block.assetId,
          page,
          pageCount,
          name: block.name,
          mime: block.mime,
          blockId: block.id
        });
      }
      continue;
    }

    let title = "Step";
    if (block.type === "text") title = titleFromTextBlock(block);
    else if ("name" in block) title = block.name;

    steps.push({
      key: stepKeyForBlock(block.id),
      type: "content",
      title,
      sectionTitle,
      block
    });
  }

  if (!hasExplicitQuizSteps) {
    const legacyQuizzes = Object.values(quizzesById).filter(Boolean) as Quiz[];
    legacyQuizzes.sort((a, b) => a.id.localeCompare(b.id));
    for (const quiz of legacyQuizzes) {
      steps.push({
        key: `quiz:legacy:${quiz.id}`,
        type: "quiz",
        title: "Quiz",
        sectionTitle,
        quizId: quiz.id,
        requiredToContinue: true,
        passScorePct: 70,
        blockId: `legacy_${quiz.id}`
      });
    }
  }

  return steps;
}

