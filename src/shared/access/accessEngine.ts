import type { AccessPolicy, Lesson, LicenseGrant, LicenseScope } from "@/shared/types";

function isExpired(validUntil?: string) {
  if (!validUntil) return false;
  return new Date(validUntil).getTime() < Date.now();
}

function scopeAllowsLesson(scope: LicenseScope, lesson: Lesson) {
  if (scope.type === "full") return true;
  if (scope.type === "level") return scope.level === lesson.level;
  if (scope.type === "subject") return scope.subject.toLowerCase() === lesson.subject.toLowerCase();
  if (scope.type === "curriculum_subject") {
    return Boolean(lesson.curriculumSubjectId) && scope.curriculumSubjectId === lesson.curriculumSubjectId;
  }
  return false;
}

export function getLessonEffectiveAccessPolicy({
  lesson,
  subjectDefaultsByCurriculumSubjectId
}: {
  lesson: Lesson;
  subjectDefaultsByCurriculumSubjectId?: Record<string, AccessPolicy>;
}): AccessPolicy {
  if (lesson.accessPolicy) return lesson.accessPolicy;

  // Backward-compatibility: legacy "trial" tag means free.
  if (lesson.tags.includes("trial")) return "free";

  const sid = lesson.curriculumSubjectId;
  if (sid && subjectDefaultsByCurriculumSubjectId?.[sid]) return subjectDefaultsByCurriculumSubjectId[sid]!;

  // Safe default.
  return "coupon";
}

export function canAccessLesson({
  lesson,
  grants,
  subjectDefaultsByCurriculumSubjectId
}: {
  lesson: Lesson;
  grants: LicenseGrant[];
  subjectDefaultsByCurriculumSubjectId?: Record<string, AccessPolicy>;
}): { allowed: true } | { allowed: false; reason: string } {
  const policy = getLessonEffectiveAccessPolicy({ lesson, subjectDefaultsByCurriculumSubjectId });
  if (policy === "free") return { allowed: true };

  const active = grants.filter((g) => !isExpired(g.validUntil));
  const ok = active.some((g) => scopeAllowsLesson(g.scope, lesson));
  if (ok) return { allowed: true };
  return { allowed: false, reason: "Locked. Redeem a code or get sponsored access." };
}
