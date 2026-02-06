import { describe, expect, it } from "vitest";
import { canAccessLesson } from "@/shared/access/accessEngine";
import type { Lesson, LicenseGrant } from "@/shared/types";

const lesson: Lesson = {
  id: "l1",
  title: "t",
  subject: "Math",
  level: "Primary",
  language: "en",
  tags: [],
  description: "",
  status: "approved",
  createdByUserId: "u1",
  curriculumSubjectId: "sub_1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

describe("canAccessLesson", () => {
  it("allows legacy trial-tagged lessons without grants", () => {
    const res = canAccessLesson({ lesson: { ...lesson, tags: ["trial"] }, grants: [] });
    expect(res.allowed).toBe(true);
  });

  it("denies by default without grants", () => {
    const res = canAccessLesson({ lesson, grants: [] });
    expect(res.allowed).toBe(false);
  });

  it("allows with full grant", () => {
    const g: LicenseGrant = {
      id: "g1",
      studentId: "s1",
      scope: { type: "full" },
      validUntil: new Date(Date.now() + 1000).toISOString(),
      createdAt: new Date().toISOString()
    };
    const res = canAccessLesson({ lesson, grants: [g] });
    expect(res.allowed).toBe(true);
  });

  it("allows when lesson override policy is free", () => {
    const res = canAccessLesson({ lesson: { ...lesson, accessPolicy: "free" }, grants: [] });
    expect(res.allowed).toBe(true);
  });

  it("lesson override free beats subject default coupon", () => {
    const res = canAccessLesson({
      lesson: { ...lesson, accessPolicy: "free" },
      grants: [],
      subjectDefaultsByCurriculumSubjectId: { [lesson.curriculumSubjectId!]: "coupon" }
    });
    expect(res.allowed).toBe(true);
  });

  it("subject default free allows without grants when lesson has no override", () => {
    const res = canAccessLesson({
      lesson,
      grants: [],
      subjectDefaultsByCurriculumSubjectId: { [lesson.curriculumSubjectId!]: "free" }
    });
    expect(res.allowed).toBe(true);
  });

  it("curriculum_subject grant unlocks matching lessons", () => {
    const g: LicenseGrant = {
      id: "g2",
      studentId: "s1",
      scope: { type: "curriculum_subject", curriculumSubjectId: lesson.curriculumSubjectId! },
      validUntil: new Date(Date.now() + 1000).toISOString(),
      createdAt: new Date().toISOString()
    };
    const res = canAccessLesson({ lesson, grants: [g] });
    expect(res.allowed).toBe(true);
  });
});
