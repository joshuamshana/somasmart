import { db } from "@/shared/db/db";
import type { LessonBlock, LessonBlockV2, LessonContentV2, Quiz } from "@/shared/types";

function defaultBlockTitle(block: LessonBlockV2) {
  if (block.title?.trim()) return block.title.trim();
  if (block.isDivider) return "Section";
  const media = block.components.find((c) => c.type === "media");
  if (media) return media.mediaType.toUpperCase();
  const txt = block.components.find(
    (c): c is Extract<typeof c, { type: "text" }> => c.type === "text" && c.text.trim().length > 0
  );
  if (txt) return txt.text.trim().slice(0, 60);
  if (block.quizGate) return "Quiz";
  return "Step";
}

export function mapLegacyBlocksToV2({
  blocks,
  quizzesById
}: {
  blocks: LessonBlock[];
  quizzesById: Record<string, Quiz | undefined>;
}) {
  const out: LessonBlockV2[] = [];
  const hasLegacyQuizBlocks = blocks.some((b) => b.type === "quiz");

  for (const block of blocks) {
    if (block.type === "step_break") {
      out.push({
        id: block.id,
        title: block.title,
        isDivider: true,
        components: []
      });
      continue;
    }
    if (block.type === "quiz") {
      out.push({
        id: block.id,
        title: block.title ?? "Quiz",
        components: [],
        quizGate: {
          quizId: block.quizId,
          requiredToContinue: true,
          passScorePct: typeof block.passScorePct === "number" ? block.passScorePct : 70
        }
      });
      continue;
    }
    if (block.type === "text") {
      out.push({
        id: block.id,
        title: defaultBlockTitle({ id: block.id, components: [block] }),
        components: [{ id: `${block.id}_text`, type: "text", variant: block.variant, text: block.text }]
      });
      continue;
    }
    out.push({
      id: block.id,
      title: block.name,
      components: [
        {
          id: `${block.id}_media`,
          type: "media",
          mediaType: block.type,
          assetId: block.assetId,
          name: block.name,
          mime: block.mime
        }
      ]
    });
  }

  if (!hasLegacyQuizBlocks) {
    const quizzes = Object.values(quizzesById).filter(Boolean) as Quiz[];
    quizzes.sort((a, b) => a.id.localeCompare(b.id));
    for (const q of quizzes) {
      out.push({
        id: `legacy_gate_${q.id}`,
        title: "Quiz",
        components: [],
        quizGate: { quizId: q.id, requiredToContinue: true, passScorePct: 70 }
      });
    }
  }

  return out;
}

export function normalizeBlockV2(block: LessonBlockV2) {
  const issues: string[] = [];
  const media = block.components.filter((c) => c.type === "media");
  const text = block.components.filter((c) => c.type === "text");

  if (media.length > 1) issues.push("Block can include at most one media component.");
  const hasPdf = media.some((c) => c.mediaType === "pdf");
  if (hasPdf && (text.length > 0 || media.length > 1)) issues.push("PDF blocks must be PDF-only.");
  if (block.quizGate) {
    if (!block.quizGate.quizId) issues.push("Quiz gate is missing quiz id.");
    if (!Number.isFinite(block.quizGate.passScorePct)) issues.push("Quiz gate pass score is invalid.");
  }
  return issues;
}

export async function getLessonBlocksV2({
  lessonId,
  quizzesById
}: {
  lessonId: string;
  quizzesById: Record<string, Quiz | undefined>;
}) {
  const v2 = await db.lessonContentsV2.get(lessonId);
  if (v2?.version === 2) return v2.blocksV2;

  const legacy = await db.lessonContents.get(lessonId);
  return mapLegacyBlocksToV2({ blocks: legacy?.blocks ?? [], quizzesById });
}

export async function putLessonBlocksV2({
  lessonId,
  blocksV2
}: {
  lessonId: string;
  blocksV2: LessonBlockV2[];
}) {
  const payload: LessonContentV2 = { lessonId, version: 2, blocksV2 };
  await db.lessonContentsV2.put(payload);
  return payload;
}
