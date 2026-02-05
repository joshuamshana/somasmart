import type { Lesson, LicenseGrant, LicenseScope } from "@/shared/types";

function isExpired(validUntil?: string) {
  if (!validUntil) return false;
  return new Date(validUntil).getTime() < Date.now();
}

function scopeAllowsLesson(scope: LicenseScope, lesson: Lesson) {
  if (scope.type === "full") return true;
  if (scope.type === "level") return scope.level === lesson.level;
  if (scope.type === "subject") return scope.subject.toLowerCase() === lesson.subject.toLowerCase();
  return false;
}

export function canAccessLesson({
  lesson,
  grants
}: {
  lesson: Lesson;
  grants: LicenseGrant[];
}): { allowed: true } | { allowed: false; reason: string } {
  if (lesson.tags.includes("trial")) return { allowed: true };
  const active = grants.filter((g) => !isExpired(g.validUntil));
  const ok = active.some((g) => scopeAllowsLesson(g.scope, lesson));
  if (ok) return { allowed: true };
  return { allowed: false, reason: "Locked. Redeem a code or get sponsored access." };
}

