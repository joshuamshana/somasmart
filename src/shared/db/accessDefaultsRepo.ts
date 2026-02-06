import type { AccessPolicy } from "@/shared/types";
import { db } from "@/shared/db/db";

const PREFIX = "access.subjectDefault.";

export async function getSubjectAccessDefaultsByCurriculumSubjectId(): Promise<Record<string, AccessPolicy>> {
  const rows = await db.settings.toArray();
  const out: Record<string, AccessPolicy> = {};
  for (const s of rows) {
    if (!s.key.startsWith(PREFIX)) continue;
    const curriculumSubjectId = s.key.slice(PREFIX.length).trim();
    if (!curriculumSubjectId) continue;
    const policy = (s.value as any)?.policy as AccessPolicy | undefined;
    if (policy === "free" || policy === "coupon") out[curriculumSubjectId] = policy;
  }
  return out;
}

